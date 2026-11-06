# Milestone 15 — Threat Hunting & Digital Forensics Architecture

**System:** HoneyShield X Enterprise Threat Operations  
**Subsystems:** Threat Hunting Studio, Digital Forensic Vault, Detection Engineering Lab, NEXUS AI Investigation Assistant  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. High-Level Architectural Topology

Milestone 15 extends HoneyShield X with enterprise-grade threat hunting, cryptographic forensic evidence handling, Detection Engineering laboratory simulations, and explainable AI-assisted investigation workflows without requiring destructive database schema changes:

```mermaid
flowchart TD
    subgraph Client Tier
        UI[SOC Analyst Console / Hunting Studio]
        CLI[Forensic Investigation CLI]
        MOB[Android SOC Companion Client]
    end

    subgraph API & RBAC Boundary
        GW[FastAPI Gateway / Zero-Trust RBAC]
        AUTH[Operator Session & Permission Enforcement]
    end

    subgraph Threat Hunting Engine
        THS[Retrospective Telemetry Search]
        SHS[Saved Hunts Storage & Execution]
        PIV[Threat Intel IOC Pivoting Engine]
    end

    subgraph Forensic Evidence Subsystem
        EVD[Forensic Evidence Vault]
        SHA[Canonical SHA-256 Digest Calculator]
        VRF[Integrity Verification & Audit Trail]
        EXP[Sanitized Dossier Export with CSV Formula Defense]
    end

    subgraph Detection Engineering Lab
        SIM[Read-Only Detection Simulation Sandbox]
        REG[Detection Rules Registry]
        MET[Precision, Recall & F1 Metric Engine]
    end

    subgraph Explainable Intelligence & AI
        RSK[Deterministic Risk Explainability Service]
        NXA[NEXUS Assistant with Prompt-Injection Defense]
    end

    subgraph Storage & Persistence
        DB[(PostgreSQL Primary / SQLite Memory)]
        RED[(Redis State Store / Thread-Safe Memory)]
        OBX[(Transactional Event Outbox)]
    end

    UI --> GW
    CLI --> GW
    MOB --> GW
    GW --> AUTH

    AUTH --> THS
    AUTH --> SHS
    AUTH --> PIV
    AUTH --> EVD
    AUTH --> SIM
    AUTH --> RSK
    AUTH --> NXA

    THS --> DB
    SHS --> RED
    EVD --> RED
    EVD --> SHA
    EVD --> VRF
    EVD --> EXP
    SIM --> REG
    SIM --> MET
    RSK --> DB
    NXA --> DB
    NXA --> EVD
```

---

## 2. Core Security & Isolation Principles

1. **Zero-Migration Compliance:** Telemetry indexing and searches query existing ORM entities (`attacks`, `alerts`, `attack_events`, `security_event_outbox`, `threat_intelligence`) and record audit actions into `system_events`.
2. **Read-Only Simulation Sandboxes:** The Detection Engineering Lab tests detection rules against synthetic or historical datasets in memory without emitting alerts to the outbox or dispatching automated containment.
3. **Cryptographic Sealing:** Every evidence artifact captured receives a canonical SHA-256 digest computed over sorted keys and whitespace-stripped JSON payloads.
4. **Formula Injection Neutralization:** Case exports in CSV format escape leading characters (`=`, `+`, `-`, `@`) with prepended apostrophes, neutralizing client-side formula execution vulnerabilities.
5. **Grounded AI Security Boundary:** The NEXUS Assistant processes untrusted inputs through regex-based instruction override detection, refuses privilege escalation prompts, and grounds all responses with verified backend identifiers.

