"""FastAPI Router for Enterprise Defensive Integration & SIEM-SOAR Webhook Gateway (Module 3.9).

Security & RBAC Enforcement:
- integration:view  -> viewer, analyst, incident_responder, security_administrator
- integration:test  -> analyst, incident_responder, security_administrator
- integration:retry -> incident_responder, security_administrator
- integration:admin -> security_administrator only
- Level-3 Governor governance for SOAR containment dispatches.
- Strict SSRF pre-flight validation on all registered URLs.
- Complete secret masking and audit logging to SystemEvent.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.audit.service import record_operator_audit
from app.auth.dependencies import require_permission
from app.auth.registry import Operator
from app.database import get_db
from app.incident_command.governor import default_governor
from app.integrations.dispatcher import default_dispatcher
from app.integrations.ssrf import SSRFValidationError, validate_destination_url
from app.integrations.storage import (
    default_integration_storage,
    generate_endpoint_secret,
    mask_secret,
)
from app.schemas import (
    DlqListResponse,
    DlqRecord,
    IntegrationMetricsResponse,
    SoarBlockRequest,
    TestPingRequest,
    TestPingResponse,
    WebhookEndpointCreate,
    WebhookEndpointCreateResponse,
    WebhookEndpointResponse,
    WebhookEndpointUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/integrations",
    tags=["Enterprise Integrations & SIEM-SOAR Gateway"],
)


# =============================================================================
# Endpoint Management
# =============================================================================

@router.get(
    "/endpoints",
    response_model=list[WebhookEndpointResponse],
    summary="List all registered webhook endpoints",
)
def list_endpoints(
    operator: Operator = Depends(require_permission("integration:view")),
) -> list[WebhookEndpointResponse]:
    """Retrieve all configured webhook endpoints with masked secrets."""
    endpoints = default_integration_storage.list_endpoints(mask=True)
    return [WebhookEndpointResponse(**ep) for ep in endpoints]


@router.get(
    "/endpoints/{endpoint_id}",
    response_model=WebhookEndpointResponse,
    summary="Get single webhook endpoint details",
)
def get_endpoint(
    endpoint_id: str,
    operator: Operator = Depends(require_permission("integration:view")),
) -> WebhookEndpointResponse:
    """Retrieve details for a specific webhook endpoint with masked secret."""
    ep = default_integration_storage.get_endpoint(endpoint_id, mask=True)
    if not ep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook endpoint '{endpoint_id}' not found.",
        )
    return WebhookEndpointResponse(**ep)


@router.post(
    "/endpoints",
    response_model=WebhookEndpointCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new webhook target",
)
def create_endpoint(
    payload: WebhookEndpointCreate,
    operator: Operator = Depends(require_permission("integration:admin")),
    db: Session = Depends(get_db),
) -> WebhookEndpointCreateResponse:
    """Register a new outbound webhook target.

    Performs SSRF validation and generates a cryptographic signing secret.
    The secret is returned strictly once upon creation.
    """
    # 1. Pre-flight SSRF Validation
    try:
        validate_destination_url(payload.target_url)
    except SSRFValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Target URL failed SSRF validation: {e}",
        )

    endpoint_id = f"ep_{uuid.uuid4().hex[:12]}"
    secret = generate_endpoint_secret()
    now_iso = datetime.now(timezone.utc).isoformat()

    endpoint_dict = {
        "id": endpoint_id,
        "name": payload.name,
        "target_url": payload.target_url,
        "description": payload.description,
        "enabled": payload.enabled,
        "events": payload.events,
        "format": payload.format,
        "custom_headers": payload.custom_headers,
        "secret": secret,
        "created_at": now_iso,
        "updated_at": now_iso,
        "total_sent": 0,
        "total_failed": 0,
        "last_delivery_at": None,
        "last_status_code": None,
    }

    default_integration_storage.save_endpoint(endpoint_dict)

    # Audit creation (Never persist unmasked secret in audit)
    audit_data = {
        "endpoint_id": endpoint_id,
        "name": payload.name,
        "target_url": payload.target_url,
        "format": payload.format,
        "events": payload.events,
        "operator": operator.username,
    }
    record_operator_audit(
        db=db,
        event_type="INTEGRATION_ENDPOINT_CREATED",
        message=json.dumps(audit_data),
        source="integrations_gateway",
        severity="info",
    )

    # Return with plaintext secret strictly once
    return WebhookEndpointCreateResponse(**endpoint_dict)


@router.patch(
    "/endpoints/{endpoint_id}",
    response_model=WebhookEndpointResponse,
    summary="Update endpoint configuration",
)
def update_endpoint(
    endpoint_id: str,
    payload: WebhookEndpointUpdate,
    operator: Operator = Depends(require_permission("integration:admin")),
    db: Session = Depends(get_db),
) -> WebhookEndpointResponse:
    """Update settings for an existing webhook target."""
    ep = default_integration_storage.get_endpoint(endpoint_id, mask=False)
    if not ep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook endpoint '{endpoint_id}' not found.",
        )

    # Validate target_url if changed
    if payload.target_url is not None:
        try:
            validate_destination_url(payload.target_url)
        except SSRFValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Updated target URL failed SSRF validation: {e}",
            )
        ep["target_url"] = payload.target_url

    if payload.name is not None:
        ep["name"] = payload.name
    if payload.description is not None:
        ep["description"] = payload.description
    if payload.enabled is not None:
        ep["enabled"] = payload.enabled
    if payload.events is not None:
        ep["events"] = payload.events
    if payload.format is not None:
        ep["format"] = payload.format
    if payload.custom_headers is not None:
        ep["custom_headers"] = payload.custom_headers

    ep["updated_at"] = datetime.now(timezone.utc).isoformat()
    default_integration_storage.save_endpoint(ep)

    # Audit update
    audit_data = {
        "endpoint_id": endpoint_id,
        "updated_by": operator.username,
        "target_url": ep["target_url"],
        "enabled": ep["enabled"],
    }
    record_operator_audit(
        db=db,
        event_type="INTEGRATION_ENDPOINT_UPDATED",
        message=json.dumps(audit_data),
        source="integrations_gateway",
        severity="info",
    )

    ep_masked = default_integration_storage.get_endpoint(endpoint_id, mask=True)
    return WebhookEndpointResponse(**ep_masked)


@router.delete(
    "/endpoints/{endpoint_id}",
    summary="Delete webhook endpoint",
)
def delete_endpoint(
    endpoint_id: str,
    operator: Operator = Depends(require_permission("integration:admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Delete a registered webhook target."""
    ep = default_integration_storage.get_endpoint(endpoint_id, mask=True)
    if not ep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook endpoint '{endpoint_id}' not found.",
        )

    deleted = default_integration_storage.delete_endpoint(endpoint_id)

    record_operator_audit(
        db=db,
        event_type="INTEGRATION_ENDPOINT_DELETED",
        message=json.dumps({"endpoint_id": endpoint_id, "deleted_by": operator.username}),
        source="integrations_gateway",
        severity="info",
    )

    return {"deleted": deleted, "endpoint_id": endpoint_id}


# =============================================================================
# Test Ping Verification
# =============================================================================

@router.post(
    "/endpoints/{endpoint_id}/test",
    response_model=TestPingResponse,
    summary="Dispatch signed test ping",
)
def test_endpoint(
    endpoint_id: str,
    payload: TestPingRequest | None = None,
    operator: Operator = Depends(require_permission("integration:test")),
    db: Session = Depends(get_db),
) -> TestPingResponse:
    """Synchronously test connectivity and signature verification with remote receiver."""
    ep = default_integration_storage.get_endpoint(endpoint_id, mask=True)
    if not ep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook endpoint '{endpoint_id}' not found.",
        )

    req_data = payload.sample_data if payload else None
    ev_type = payload.event_type if payload else "test.ping"

    result = default_dispatcher.test_ping(
        endpoint_id=endpoint_id,
        event_type=ev_type,
        sample_data=req_data,
    )

    audit_data = {
        "endpoint_id": endpoint_id,
        "delivery_id": result["delivery_id"],
        "status": result["status"],
        "status_code": result["status_code"],
        "operator": operator.username,
    }
    record_operator_audit(
        db=db,
        event_type="INTEGRATION_TEST_PING",
        message=json.dumps(audit_data),
        source="integrations_gateway",
        severity="info" if result["status"] == "success" else "warning",
    )

    return TestPingResponse(**result)


# =============================================================================
# Dead-Letter Queue (DLQ)
# =============================================================================

@router.get(
    "/dlq",
    response_model=DlqListResponse,
    summary="List dead-letter queue records",
)
def list_dlq(
    limit: int = Query(default=50, ge=1, le=200, description="Page limit"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
    operator: Operator = Depends(require_permission("integration:view")),
) -> DlqListResponse:
    """Inspect permanently failed deliveries held in DLQ."""
    items, total = default_integration_storage.list_dlq(limit=limit, offset=offset)
    records = [DlqRecord(**item) for item in items]
    return DlqListResponse(items=records, total=total)


@router.post(
    "/dlq/{delivery_id}/retry",
    summary="Manually re-dispatch DLQ record",
)
def retry_dlq(
    delivery_id: str,
    operator: Operator = Depends(require_permission("integration:retry")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Manually re-attempt delivery of a dead-letter item."""
    result = default_dispatcher.retry_dlq_item(delivery_id)
    if result.get("error") and "not found" in result["error"].lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )

    audit_data = {
        "original_delivery_id": delivery_id,
        "new_delivery_id": result["delivery_id"],
        "status": result["status"],
        "operator": operator.username,
    }
    record_operator_audit(
        db=db,
        event_type="INTEGRATION_DLQ_REPLAYED",
        message=json.dumps(audit_data),
        source="integrations_gateway",
        severity="info" if result["status"] == "success" else "warning",
    )

    return result


@router.delete(
    "/dlq/{delivery_id}",
    summary="Purge single DLQ record",
)
def delete_dlq_record(
    delivery_id: str,
    operator: Operator = Depends(require_permission("integration:admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Purge a dead-letter delivery record without re-dispatching."""
    item = default_integration_storage.get_dlq_item(delivery_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DLQ delivery record '{delivery_id}' not found.",
        )

    deleted = default_integration_storage.remove_dlq_item(delivery_id)

    record_operator_audit(
        db=db,
        event_type="INTEGRATION_DLQ_PURGED",
        message=json.dumps({"delivery_id": delivery_id, "purged_by": operator.username}),
        source="integrations_gateway",
        severity="info",
    )

    return {"deleted": deleted, "delivery_id": delivery_id}


# =============================================================================
# Gateway Metrics
# =============================================================================

@router.get(
    "/metrics",
    response_model=IntegrationMetricsResponse,
    summary="Get integration delivery metrics",
)
def get_metrics(
    operator: Operator = Depends(require_permission("integration:view")),
) -> IntegrationMetricsResponse:
    """Retrieve gateway delivery rates, circuit states, and DLQ health."""
    metrics = default_integration_storage.get_metrics()
    return IntegrationMetricsResponse(**metrics)


# =============================================================================
# Level-3 Governor Guarded SOAR Containment Dispatch
# =============================================================================

@router.post(
    "/soar/block",
    summary="Governor Tier-3 SOAR containment dispatch",
)
def dispatch_soar_block(
    payload: SoarBlockRequest,
    operator: Operator = Depends(require_permission("integration:admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Dispatch external containment action through SOAR under Level-3 Governor approval.

    Invariants:
    - Strictly requires Level-3 preview approval token.
    - Operator binding enforced.
    - Mandatory operational justification (min 10 characters).
    - Emergency lockout strictly honored.
    """
    # 1. Justification Gate
    if not payload.justification or len(payload.justification.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SOAR containment dispatch requires a mandatory justification (min 10 characters).",
        )

    # 2. Level-3 Governor Safety Gate (validates action allowlist, lockout, and single-use approval token)
    default_governor.evaluate_command_policy(
        action="SOAR_BLOCK_DISPATCH",
        target_id=payload.target_entity_id,
        operator_id=operator.username,
        justification=payload.justification,
        approval_token=payload.approval_token,
    )

    # 3. Fan out containment command to matching registered endpoints
    containment_data = {
        "command": "SOAR_BLOCK_DISPATCH",
        "target_entity": payload.target_entity_id,
        "operator": operator.username,
        "justification": payload.justification,
        "parameters": payload.parameters or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    delivery_ids = default_dispatcher.fanout_event("soar.containment.dispatched", containment_data)

    # Record Governor execution
    default_governor.record_action_executed(
        action="SOAR_BLOCK_DISPATCH",
        target_id=payload.target_entity_id,
        operator_id=operator.username,
    )

    # Audit containment dispatch
    record_operator_audit(
        db=db,
        event_type="INTEGRATION_SOAR_BLOCK_DISPATCHED",
        message=json.dumps({
            "target": payload.target_entity_id,
            "operator": operator.username,
            "justification": payload.justification,
            "delivery_count": len(delivery_ids),
        }),
        source="integrations_gateway",
        severity="critical",
    )

    return {
        "status": "staged",
        "action": "SOAR_BLOCK_DISPATCH",
        "target_entity_id": payload.target_entity_id,
        "operator": operator.username,
        "dispatched_deliveries": delivery_ids,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
