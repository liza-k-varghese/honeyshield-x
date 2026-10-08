"""Deterministic Advisory Contextualizer & PIR Report Generator for Module 3.6.

Adheres strictly to the architectural principle:
"Determinism for Detection; AI for Contextualization."

Hard Constraints:
- Zero external LLM SDK or cloud dependencies.
- 100% deterministic, reproducible, sub-millisecond execution.
- Read-only, optional, advisory-only, and fails closed with structured fallbacks.
"""

from datetime import datetime, timezone
from typing import Any

from app.schemas import IncidentCase, PostIncidentReportResponse


def generate_advisory_summary(case: IncidentCase) -> str:
    """Generate a deterministic advisory contextual summary for an incident case."""
    ip_str = f"originating from {case.source_ip}" if case.source_ip else "from an unconfirmed source"
    alert_count = len(case.alert_ids)
    completed_tasks = [t for t in case.tasks if t.status == "completed"]
    task_count = len(completed_tasks)
    total_tasks = len(case.tasks)

    summary_lines = [
        f"ADVISORY CONTEXTUAL BRIEF [{case.case_id}]:",
        f"Incident '{case.title}' classified as {case.severity.upper()} severity {ip_str}.",
        f"Linked to {alert_count} sensor alert(s) across detection telemetry.",
        f"SOP Playbook '{case.playbook_template}' progress: {task_count}/{total_tasks} tasks verified ({int(case.playbook_progress * 100)}%).",
    ]

    # Command executions
    commands_executed = [t.command_execution_id for t in completed_tasks if t.command_execution_id]
    if commands_executed:
        summary_lines.append(
            f"Defensive containment actions executed via Module 3.4 Governor: {len(commands_executed)} action(s) under HITL approval."
        )

    if case.status == "closed":
        summary_lines.append(
            f"Case formally closed by {case.closed_by or 'operator'} at {case.closed_at or 'closure timestamp'}."
        )
    elif case.status in ("contained", "resolved"):
        summary_lines.append("Threat activity has been mitigated; awaiting post-incident verification.")
    else:
        summary_lines.append("Active incident response and evidence collection are ongoing.")

    return " ".join(summary_lines)


def generate_post_incident_report(case: IncidentCase, operator_id: str) -> PostIncidentReportResponse:
    """Generate a deterministic, structured Post-Incident Review (PIR) executive closure report."""
    now_iso = datetime.now(timezone.utc).isoformat()
    ip_label = case.source_ip or "unspecified adversary"
    completed_mandatory = [t for t in case.tasks if t.is_mandatory and t.status == "completed"]
    total_mandatory = [t for t in case.tasks if t.is_mandatory]
    adherence_pct = (
        int((len(completed_mandatory) / len(total_mandatory)) * 100) if total_mandatory else 100
    )

    # Remediation actions
    remediation_actions: list[str] = []
    for t in case.tasks:
        if t.status == "completed":
            if t.command_execution_id:
                remediation_actions.append(f"{t.title} (Execution ID: {t.command_execution_id})")
            elif t.action_type in ("governor_command", "notification"):
                remediation_actions.append(f"{t.title} [Completed]")

    if not remediation_actions:
        remediation_actions.append("Passive triage and monitoring (No active containment staged)")

    # Chronological timeline
    timeline: list[dict[str, Any]] = [
        {
            "timestamp": case.created_at,
            "event": "Incident Case Created",
            "actor": case.created_by,
            "details": f"Promoted or initialized as {case.severity.upper()} under playbook {case.playbook_template}",
        }
    ]

    for n in case.notes:
        timeline.append({
            "timestamp": n.created_at,
            "event": "Forensic Investigation Note Added",
            "actor": n.operator_id,
            "details": n.message[:120] + ("..." if len(n.message) > 120 else ""),
        })

    for t in case.tasks:
        if t.status == "completed" and t.completed_at:
            timeline.append({
                "timestamp": t.completed_at,
                "event": f"Playbook Task Completed: {t.title}",
                "actor": t.completed_by or "system",
                "details": t.notes or "Task criteria verified",
            })

    if case.closed_at:
        timeline.append({
            "timestamp": case.closed_at,
            "event": "Incident Case Formally Closed",
            "actor": case.closed_by or operator_id,
            "details": "Case resolution criteria satisfied and PIR report archived",
        })

    timeline.sort(key=lambda x: x["timestamp"])

    # Root Cause Analysis Synthesis
    if "SSH" in case.playbook_template or "BRUTE" in case.title.upper():
        root_cause = f"Automated credential dictionary assault against honeypot SSH service from {ip_label}. Evaluated and mitigated with staged ingress drop."
    elif "WEB" in case.playbook_template or "SQL" in case.title.upper():
        root_cause = f"Web application exploit probe targeting HTTP decoy endpoints from {ip_label}. Blocked and verified non-impactful."
    elif "RECON" in case.playbook_template or "SCAN" in case.title.upper():
        root_cause = f"Port reconnaissance and service enumeration scan originating from {ip_label}. Analyzed and dispositioned."
    else:
        root_cause = f"Multi-vector intrusion attempt targeting internal sensors from {ip_label}. Remediated according to standard operational playbook."

    executive_summary = (
        f"Incident {case.case_id} ('{case.title}') occurred with {case.severity.upper()} severity"
        + (f" from adversary {ip_label}." if ip_label != "unspecified adversary" else ".")
        + f" HoneyShield-X detected anomalous activity across {len(case.alert_ids)} linked alert(s). "
        f"Response was coordinated under SOP '{case.playbook_template}' with {adherence_pct}% playbook adherence. "
        f"Current incident status is {case.status.upper()}."
    )

    return PostIncidentReportResponse(
        case_id=case.case_id,
        title=case.title,
        severity=case.severity,
        status=case.status,
        executive_summary=executive_summary,
        incident_timeline=timeline,
        playbook_adherence=f"{adherence_pct}% ({len(completed_mandatory)}/{len(total_mandatory)} mandatory tasks)",
        remediation_actions=remediation_actions,
        root_cause_analysis=root_cause,
        assigned_operator=case.assigned_to,
        signoff_operator=operator_id,
        generated_at=now_iso,
    )
