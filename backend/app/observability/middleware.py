"""Observability and Tracing Middleware for HoneyShield X (Milestone 8).

Attaches unique Request-ID and Correlation-ID to every HTTP transaction,
measures execution latency, records telemetry, and ensures sensitive tokens are redacted.
"""

import logging
import re
import time
from typing import Callable
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.observability.metrics import default_metrics_collector

logger = logging.getLogger("honeyshield.observability")

SENSITIVE_PARAM_PATTERN = re.compile(
    r"(token|ticket|password|secret|authorization)=[^&\s]+",
    re.IGNORECASE,
)


def redact_sensitive_query(url_str: str) -> str:
    """Mask sensitive tokens in logged URLs."""
    return SENSITIVE_PARAM_PATTERN.sub(r"\1=[REDACTED]", url_str)


class ObservabilityTracingMiddleware(BaseHTTPMiddleware):
    """Enforces request tracing, latency capture, and header decoration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Correlation ID & Request ID extraction or generation
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        correlation_id = request.headers.get("X-Correlation-ID") or request_id

        # Attach to request state for downstream handlers
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        start_time = time.perf_counter()
        clean_url = redact_sensitive_query(str(request.url))

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Record telemetry in metrics collector
            path_template = request.url.path
            default_metrics_collector.record_request(
                method=request.method,
                path=path_template,
                status_code=response.status_code,
                duration_ms=duration_ms,
            )

            # Inject trace headers on response
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Correlation-ID"] = correlation_id

            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            default_metrics_collector.record_error("INTERNAL_EXCEPTION")
            logger.error(
                "Unhandled exception in request %s [%s %s] duration=%.2fms: %s",
                request_id,
                request.method,
                clean_url,
                duration_ms,
                exc,
            )
            raise exc

