"""Deterministic Retrospective Query Engine & Regex AST Validator (Module 3.11).

Implements:
- Strict fail-closed regex AST validation before compilation to prevent ReDoS.
- Deterministic query compilation against frozen relational telemetry.
- Bounded evaluation window (max 30 days) and hard evidence cap (max 200 records).
- Sensitive data attribute scrubbing.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import logging
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import Alert, Attack, AttackEvent, ThreatIntelligence
from app.schemas import HuntEvidenceRecord, HuntQuerySpec

logger = logging.getLogger(__name__)

# Maximum bounds
MAX_REGEX_LENGTH: int = 64
MAX_QUANTIFIER_BOUND: int = 20
MAX_QUERY_PREDICATES: int = 10
MAX_TIME_WINDOW_SECONDS: float = 30 * 86400.0  # 30 days
MAX_EVIDENCE_RECORDS: int = 200

# Prohibited regex tokens that indicate lookarounds or backreferences
_DISALLOWED_REGEX_RAW_PATTERNS = [
    re.compile(r"\(\?[=!<]"),  # Lookahead and lookbehind (?=, (?!, (?<=, (?<!
    re.compile(r"\\\d+"),       # Backreferences \1, \2, etc.
    re.compile(r"\(\?P="),      # Named backreferences
    re.compile(r"\.\*[\s\S]*\.\*"),  # Consecutive or multiple wildcards in sequence
]


def validate_regex_pattern(pattern: str | None) -> None:
    """Deterministically validates a regex pattern against AST safety policies.

    Fails closed with HTTP 422 if the pattern exceeds bounds or contains ReDoS-prone constructs.
    """
    if not pattern:
        return

    pattern_str = pattern.strip()
    if len(pattern_str) > MAX_REGEX_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Regex pattern exceeds maximum length of {MAX_REGEX_LENGTH} characters (length={len(pattern_str)})",
        )

    # 1. Fast raw pattern checks
    for prohibited in _DISALLOWED_REGEX_RAW_PATTERNS:
        if prohibited.search(pattern_str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Regex pattern contains prohibited construct (lookaround, backreference, or multiple wildcards)",
            )

    # 2. Syntax parse & AST validation
    try:
        if hasattr(re, "_parser"):
            parsed = re._parser.parse(pattern_str)
        else:
            import sre_parse
            parsed = sre_parse.parse(pattern_str)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid regex syntax: {str(exc)}",
        )

    # Import opcodes safely
    try:
        from re._constants import (
            ASSERT,
            ASSERT_NOT,
            BRANCH,
            GROUPREF,
            GROUPREF_EXISTS,
            GROUPREF_IGNORE,
            MAX_REPEAT,
            MAXREPEAT,
            MIN_REPEAT,
            SUBPATTERN,
        )
    except ImportError:
        import sre_constants as _sc  # type: ignore
        ASSERT = _sc.ASSERT
        ASSERT_NOT = _sc.ASSERT_NOT
        BRANCH = _sc.BRANCH
        GROUPREF = _sc.GROUPREF
        GROUPREF_EXISTS = _sc.GROUPREF_EXISTS
        GROUPREF_IGNORE = _sc.GROUPREF_IGNORE
        MAX_REPEAT = _sc.MAX_REPEAT
        MAXREPEAT = _sc.MAXREPEAT
        MIN_REPEAT = _sc.MIN_REPEAT
        SUBPATTERN = _sc.SUBPATTERN

    def _walk_ast(nodes: Any, in_repeat: bool = False) -> None:
        prev_was_unbounded_repeat = False
        for node in nodes:
            op, arg = node
            if op in (ASSERT, ASSERT_NOT):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Lookaround assertions are strictly prohibited",
                )
            if op in (GROUPREF, GROUPREF_IGNORE, GROUPREF_EXISTS):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Backreferences are strictly prohibited",
                )
            if op in (MAX_REPEAT, MIN_REPEAT):
                if in_repeat:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Nested quantifiers are strictly prohibited (ReDoS prevention)",
                    )
                min_c, max_c, sub = arg
                if max_c != MAXREPEAT and max_c > MAX_QUANTIFIER_BOUND:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Quantifier repetition count exceeds maximum bound of {MAX_QUANTIFIER_BOUND}",
                    )
                if max_c == MAXREPEAT:
                    if prev_was_unbounded_repeat:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Consecutive unbounded quantifiers prohibited",
                        )
                    prev_was_unbounded_repeat = True
                else:
                    prev_was_unbounded_repeat = False

                _walk_ast(sub, in_repeat=True)
            elif op == SUBPATTERN:
                _group, _add_flags, _del_flags, sub = arg
                _walk_ast(sub, in_repeat=in_repeat)
            elif op == BRANCH:
                _unknown, branches = arg
                for branch in branches:
                    _walk_ast(branch, in_repeat=in_repeat)
            else:
                prev_was_unbounded_repeat = False

    _walk_ast(parsed)


def sanitize_attributes(attrs: dict[str, Any]) -> dict[str, Any]:
    """Recursively scrub sensitive keys from evidence attributes."""
    scrubbed: dict[str, Any] = {}
    for k, v in attrs.items():
        k_lower = str(k).lower()
        if any(sec in k_lower for sec in ("password", "secret", "token", "key", "auth", "credential")):
            scrubbed[str(k)] = "[REDACTED]"
        elif isinstance(v, dict):
            scrubbed[str(k)] = sanitize_attributes(v)
        elif isinstance(v, (int, float, bool)) or v is None:
            scrubbed[str(k)] = v
        else:
            scrubbed[str(k)] = str(v)[:255]
    return scrubbed


def make_evidence_id(entity_type: str, entity_id: str, timestamp: str) -> str:
    """Generate a deterministic evidence ID: ev-[12 hex]."""
    seed = f"{entity_type}:{entity_id}:{timestamp}"
    hex_digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12]
    return f"ev-{hex_digest}"


class RetrospectiveQueryEngine:
    """Deterministic, read-only query compiler and executor."""

    @staticmethod
    def execute_query(spec: HuntQuerySpec, db: Session) -> list[HuntEvidenceRecord]:
        """Execute retrospective scan against historical database models.

        Invariants:
        - Max 10 filter predicates.
        - Max 30-day temporal window.
        - Safe regex AST validation.
        - Hard cap of 200 evidence records.
        - Deterministic ordering (timestamp DESC, evidence_id DESC).
        """
        # 1. Count active filter predicates
        active_predicates = 0
        if spec.time_range_start or spec.time_range_end:
            active_predicates += 1
        if spec.source_ips:
            active_predicates += 1
        if spec.destination_ips:
            active_predicates += 1
        if spec.attack_types:
            active_predicates += 1
        if spec.severities:
            active_predicates += 1
        if spec.alert_statuses:
            active_predicates += 1
        if spec.payload_substring:
            active_predicates += 1
        if spec.ioc_values:
            active_predicates += 1
        if spec.canary_ids:
            active_predicates += 1
        if spec.campaign_ids:
            active_predicates += 1
        if spec.regex_pattern:
            active_predicates += 1

        if active_predicates > MAX_QUERY_PREDICATES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Query specifies {active_predicates} filter predicates (maximum allowed: {MAX_QUERY_PREDICATES})",
            )

        # 2. Validate regex AST if provided
        compiled_regex: re.Pattern | None = None
        if spec.regex_pattern:
            validate_regex_pattern(spec.regex_pattern)
            compiled_regex = re.compile(spec.regex_pattern, re.IGNORECASE)

        # 3. Resolve and validate temporal window
        now_dt = datetime.now(timezone.utc)
        if spec.time_range_end:
            try:
                end_dt = datetime.fromisoformat(spec.time_range_end.replace("Z", "+00:00"))
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid ISO 8601 format for time_range_end",
                )
        else:
            end_dt = now_dt

        if spec.time_range_start:
            try:
                start_dt = datetime.fromisoformat(spec.time_range_start.replace("Z", "+00:00"))
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid ISO 8601 format for time_range_start",
                )
        else:
            start_dt = end_dt - timedelta(days=7)

        if start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="time_range_start must be earlier than time_range_end",
            )

        window_duration = (end_dt - start_dt).total_seconds()
        if window_duration > MAX_TIME_WINDOW_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Query temporal window of {window_duration / 86400:.1f} days exceeds 30-day safety limit",
            )

        # Make naive for database comparison if DB uses naive UTC datetimes
        start_naive = start_dt.replace(tzinfo=None)
        end_naive = end_dt.replace(tzinfo=None)

        evidence_items: list[HuntEvidenceRecord] = []
        limit = min(spec.limit or 50, MAX_EVIDENCE_RECORDS)

        # 4. Query Attacks (if matching query scope)
        try:
            atk_q = db.query(Attack).filter(
                Attack.detected_at >= start_naive,
                Attack.detected_at <= end_naive,
            )
            if spec.source_ips:
                atk_q = atk_q.filter(Attack.source_ip.in_(spec.source_ips))
            if spec.destination_ips:
                atk_q = atk_q.filter(Attack.destination_ip.in_(spec.destination_ips))
            if spec.attack_types:
                atk_q = atk_q.filter(Attack.attack_type.in_(spec.attack_types))
            if spec.severities:
                atk_q = atk_q.filter(Attack.severity.in_(spec.severities))

            attacks = atk_q.order_by(desc(Attack.detected_at)).limit(limit).all()
            for atk in attacks:
                ts_iso = atk.detected_at.isoformat() if atk.detected_at else now_dt.isoformat()
                ev = HuntEvidenceRecord(
                    evidence_id=make_evidence_id("attack", str(atk.id), ts_iso),
                    entity_type="attack",
                    entity_id=str(atk.id),
                    timestamp=ts_iso,
                    summary=f"Attack: {atk.attack_type} ({atk.severity}) from {atk.source_ip or 'unknown'}",
                    source_ip=atk.source_ip,
                    destination_ip=atk.destination_ip,
                    technique=atk.attack_type,
                    attributes=sanitize_attributes({
                        "risk_score": atk.risk_score,
                        "attack_type": atk.attack_type,
                        "severity": atk.severity,
                        "destination_ip": atk.destination_ip,
                    }),
                )
                evidence_items.append(ev)
        except Exception as e:
            logger.warning("Error querying attacks in hunt engine: %s", e)

        # 5. Query Alerts
        try:
            alert_q = db.query(Alert).filter(
                Alert.created_at >= start_naive,
                Alert.created_at <= end_naive,
            )
            if spec.severities:
                alert_q = alert_q.filter(Alert.severity.in_(spec.severities))
            if spec.alert_statuses:
                alert_q = alert_q.filter(Alert.status.in_(spec.alert_statuses))

            alerts = alert_q.order_by(desc(Alert.created_at)).limit(limit).all()
            for alt in alerts:
                ts_iso = alt.created_at.isoformat() if alt.created_at else now_dt.isoformat()
                ev = HuntEvidenceRecord(
                    evidence_id=make_evidence_id("alert", str(alt.id), ts_iso),
                    entity_type="alert",
                    entity_id=str(alt.id),
                    timestamp=ts_iso,
                    summary=f"Alert #{alt.id}: {alt.message[:100]} [{alt.status}]",
                    source_ip=None,
                    destination_ip=None,
                    technique=None,
                    attributes=sanitize_attributes({
                        "alert_id": alt.id,
                        "status": alt.status,
                        "severity": alt.severity,
                        "attack_id": alt.attack_id,
                    }),
                )
                evidence_items.append(ev)
        except Exception as e:
            logger.warning("Error querying alerts in hunt engine: %s", e)

        # 6. Query AttackEvents (Telemetry messages, payloads, and regex matches)
        try:
            ev_q = db.query(AttackEvent).filter(
                AttackEvent.event_time >= start_naive,
                AttackEvent.event_time <= end_naive,
            )
            if spec.source_ips:
                ev_q = ev_q.filter(AttackEvent.source_ip.in_(spec.source_ips))
            if spec.payload_substring:
                ev_q = ev_q.filter(AttackEvent.message.ilike(f"%{spec.payload_substring}%"))

            attack_events = ev_q.order_by(desc(AttackEvent.event_time)).limit(limit * 2).all()
            for ae in attack_events:
                # If regex pattern specified, apply post-filter
                if compiled_regex and ae.message:
                    if not compiled_regex.search(ae.message):
                        continue

                ts_iso = ae.event_time.isoformat() if ae.event_time else now_dt.isoformat()
                ev = HuntEvidenceRecord(
                    evidence_id=make_evidence_id("attack_event", str(ae.id), ts_iso),
                    entity_type="attack_event",
                    entity_id=str(ae.id),
                    timestamp=ts_iso,
                    summary=f"Event #{ae.id} ({ae.event_type}): {(ae.message or '')[:80]}",
                    source_ip=ae.source_ip,
                    destination_ip=None,
                    technique=ae.event_type,
                    attributes=sanitize_attributes({
                        "event_type": ae.event_type,
                        "attack_id": ae.attack_id,
                        "message_sample": (ae.message or "")[:128],
                    }),
                )
                evidence_items.append(ev)
        except Exception as e:
            logger.warning("Error querying attack events in hunt engine: %s", e)

        # 7. Query ThreatIntelligence
        if spec.ioc_values:
            try:
                ti_q = db.query(ThreatIntelligence).filter(
                    ThreatIntelligence.indicator_value.in_(spec.ioc_values)
                ).limit(limit).all()
                for ti in ti_q:
                    ts_iso = ti.created_at.isoformat() if ti.created_at else now_dt.isoformat()
                    ev = HuntEvidenceRecord(
                        evidence_id=make_evidence_id("ioc_match", str(ti.id), ts_iso),
                        entity_type="ioc_match",
                        entity_id=str(ti.id),
                        timestamp=ts_iso,
                        summary=f"IOC Match: {ti.indicator_value} ({ti.indicator_type}) - {ti.threat_level}",
                        source_ip=ti.indicator_value if ti.indicator_type == "ip" else None,
                        destination_ip=None,
                        technique=None,
                        attributes=sanitize_attributes({
                            "ioc_type": ti.indicator_type,
                            "confidence": ti.confidence,
                            "source": ti.source,
                        }),
                    )
                    evidence_items.append(ev)
            except Exception as e:
                logger.warning("Error querying threat intelligence in hunt engine: %s", e)

        # 8. Query Deception Canary hits if canary_ids specified
        if spec.canary_ids:
            try:
                from app.deception.service import default_deception_service
                hits = default_deception_service.store.get_all_hits()
                for h in hits:
                    if h.canary_id in spec.canary_ids:
                        ev = HuntEvidenceRecord(
                            evidence_id=make_evidence_id("canary_hit", h.hit_id, h.timestamp),
                            entity_type="canary_hit",
                            entity_id=h.hit_id,
                            timestamp=h.timestamp,
                            summary=f"Canary Hit: {h.canary_id} tripped by {h.source_ip}",
                            source_ip=h.source_ip,
                            destination_ip=None,
                            technique="Deception Honeytoken",
                            attributes=sanitize_attributes({
                                "canary_id": h.canary_id,
                                "canary_type": h.canary_type,
                                "user_agent": h.user_agent,
                            }),
                        )
                        evidence_items.append(ev)
            except Exception as e:
                logger.warning("Error checking canary hits in hunt engine: %s", e)

        # 9. Query Campaigns if campaign_ids specified
        if spec.campaign_ids:
            try:
                from app.campaigns.service import default_campaign_service
                for cid in spec.campaign_ids:
                    camp = default_campaign_service.store.get_campaign(cid)
                    if camp:
                        ev = HuntEvidenceRecord(
                            evidence_id=make_evidence_id("campaign", camp.campaign_id, camp.last_seen),
                            entity_type="campaign",
                            entity_id=camp.campaign_id,
                            timestamp=camp.last_seen,
                            summary=f"Campaign {camp.name}: {len(camp.source_ips)} IPs, severity {camp.severity}",
                            source_ip=list(camp.source_ips)[0] if camp.source_ips else None,
                            destination_ip=None,
                            technique=", ".join(list(camp.mitre_tactics)[:3]),
                            attributes=sanitize_attributes({
                                "campaign_id": camp.campaign_id,
                                "status": camp.status,
                                "severity": camp.severity,
                                "confidence": camp.confidence,
                            }),
                        )
                        evidence_items.append(ev)
            except Exception as e:
                logger.warning("Error checking campaigns in hunt engine: %s", e)

        # 10. Deduplicate by evidence_id, sort deterministically, and enforce cap
        unique_map: dict[str, HuntEvidenceRecord] = {}
        for ev in evidence_items:
            unique_map[ev.evidence_id] = ev

        sorted_evidence = sorted(
            unique_map.values(),
            key=lambda x: (x.timestamp, x.evidence_id),
            reverse=True,
        )

        return sorted_evidence[:MAX_EVIDENCE_RECORDS]
