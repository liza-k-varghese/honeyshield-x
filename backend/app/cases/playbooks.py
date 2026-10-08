"""Deterministic Incident Response Playbooks (SOPs) for Module 3.6.

Adheres strictly to the principle:
"Determinism for Detection; AI for Contextualization."

Implements structured standard operating procedures based on NIST SP 800-61
and SANS incident response lifecycle:
- Identification
- Containment
- Eradication
- Recovery
- Lessons Learned
"""

import copy
from typing import Any

from app.schemas import PlaybookTask

PLAYBOOK_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "SSH_BRUTE_FORCE_SOP": [
        {
            "task_id": "task_1_verify_ioc",
            "stage": "identification",
            "title": "Verify Source IP & Threat Intelligence",
            "description": "Inspect adversary source IP against threat intelligence indicators and verify failed authentication velocity.",
            "action_type": "evidence_collection",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_2_stage_containment",
            "stage": "containment",
            "title": "Stage Ingress Drop Containment",
            "description": "Execute governed Level-3 containment staging request to block SSH ingress from malicious IP under HITL approval.",
            "action_type": "governor_command",
            "suggested_command": "CONTAINMENT_STAGING_REQUEST",
            "is_mandatory": True,
        },
        {
            "task_id": "task_3_notify_soc",
            "stage": "containment",
            "title": "Dispatch Critical Notification to SOC Webhook",
            "description": "Notify upstream incident response teams via governed notification dispatch.",
            "action_type": "notification",
            "suggested_command": "NOTIFICATION_DISPATCH",
            "is_mandatory": True,
        },
        {
            "task_id": "task_4_verify_cessation",
            "stage": "eradication",
            "title": "Verify Authentication Cessation & Sensor Liveness",
            "description": "Confirm honeypot sensor has ceased recording unauthorized connection attempts from the contained entity.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_5_traffic_stability",
            "stage": "recovery",
            "title": "Validate Sensor Service Stability",
            "description": "Validate that telemetry flow and system health metrics are normal with zero collateral disruption.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_6_lessons_learned",
            "stage": "lessons_learned",
            "title": "Document Intrusion Findings & Close Case",
            "description": "Complete investigation notes, record adversary IOCs, generate Post-Incident Review (PIR) report, and formally close case.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
    ],
    "WEB_EXPLOIT_SOP": [
        {
            "task_id": "task_1_inspect_payload",
            "stage": "identification",
            "title": "Inspect Web Request Payload & Pattern Match",
            "description": "Examine HTTP URI and query parameters for SQL injection, path traversal, or command injection patterns.",
            "action_type": "evidence_collection",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_2_stage_containment",
            "stage": "containment",
            "title": "Stage Ingress Containment for Web Vector",
            "description": "Execute governed containment staging request under Level-3 HITL approval to halt web exploit attempts.",
            "action_type": "governor_command",
            "suggested_command": "CONTAINMENT_STAGING_REQUEST",
            "is_mandatory": True,
        },
        {
            "task_id": "task_3_notify_appsec",
            "stage": "containment",
            "title": "Notify Web Application Security Team",
            "description": "Dispatch notification to application security response channels.",
            "action_type": "notification",
            "suggested_command": "NOTIFICATION_DISPATCH",
            "is_mandatory": True,
        },
        {
            "task_id": "task_4_confirm_cessation",
            "stage": "eradication",
            "title": "Confirm Web Exploitation Cessation",
            "description": "Verify no residual malicious HTTP probes are reaching web decoy endpoints.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_5_lessons_learned",
            "stage": "lessons_learned",
            "title": "File Mitigation Advisory & Complete PIR",
            "description": "File remediation recommendations, sign off on root cause, and close incident case.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
    ],
    "PORT_SCAN_RECON_SOP": [
        {
            "task_id": "task_1_triage_sweep",
            "stage": "identification",
            "title": "Triage Sweep Velocity & Target Ports",
            "description": "Review scanned port distribution and identify whether sweep targets high-risk operational ports.",
            "action_type": "evidence_collection",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_2_correlate_intel",
            "stage": "identification",
            "title": "Correlate IP with Multi-Vector Threat Intelligence",
            "description": "Cross-reference scanning IP against active threat intelligence indicators and previous attack sessions.",
            "action_type": "evidence_collection",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_3_evaluate_threshold",
            "stage": "containment",
            "title": "Evaluate Containment Threshold",
            "description": "Determine if reconnaissance warrants active containment or passive monitoring.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_4_resolve_alert",
            "stage": "lessons_learned",
            "title": "Acknowledge and Resolve Reconnaissance Alert",
            "description": "Acknowledge or resolve reconnaissance alerts once evaluated and log disposition.",
            "action_type": "governor_command",
            "suggested_command": "ALERT_RESOLVE",
            "is_mandatory": True,
        },
    ],
    "GENERIC_INCIDENT_SOP": [
        {
            "task_id": "task_1_initial_triage",
            "stage": "identification",
            "title": "Perform Initial Incident Triage & Evidence Collection",
            "description": "Gather all related alerts, source indicators, and sensor telemetry into the incident dossier.",
            "action_type": "evidence_collection",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_2_assess_containment",
            "stage": "containment",
            "title": "Assess & Execute Necessary Containment Actions",
            "description": "Evaluate required mitigation; request Level-3 containment staging if intrusion is actively ongoing.",
            "action_type": "governor_command",
            "suggested_command": "CONTAINMENT_STAGING_REQUEST",
            "is_mandatory": True,
        },
        {
            "task_id": "task_3_verify_neutralization",
            "stage": "eradication",
            "title": "Verify Threat Neutralization",
            "description": "Verify adversary activity has stopped and no further malicious traffic is observed.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_4_system_stability",
            "stage": "recovery",
            "title": "Confirm Systems Operational Stability",
            "description": "Confirm protected systems and sensor infrastructure operate normally.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
        {
            "task_id": "task_5_pir_signoff",
            "stage": "lessons_learned",
            "title": "Conduct Post-Incident Review & Sign Off",
            "description": "Review incident timeline, confirm root cause determination, and sign off on case closure.",
            "action_type": "manual_check",
            "suggested_command": None,
            "is_mandatory": True,
        },
    ],
}


def get_playbook_tasks_for_template(template_name: str) -> list[PlaybookTask]:
    """Resolve and instantiate a list of PlaybookTask objects for a template name.

    If the requested template is unknown, safely falls back to GENERIC_INCIDENT_SOP.
    """
    clean_name = template_name.strip().upper() if template_name else "GENERIC_INCIDENT_SOP"
    task_dicts = PLAYBOOK_TEMPLATES.get(clean_name, PLAYBOOK_TEMPLATES["GENERIC_INCIDENT_SOP"])
    tasks: list[PlaybookTask] = []
    for d in copy.deepcopy(task_dicts):
        tasks.append(
            PlaybookTask(
                task_id=d["task_id"],
                stage=d["stage"],
                title=d["title"],
                description=d["description"],
                action_type=d.get("action_type", "manual_check"),
                suggested_command=d.get("suggested_command"),
                is_mandatory=d.get("is_mandatory", True),
                status="pending",
                completed_by=None,
                completed_at=None,
                command_execution_id=None,
                notes=None,
            )
        )
    return tasks
