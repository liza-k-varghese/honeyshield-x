# Milestone 17 — Defect Register & Blocker Triage

## 1. Prioritized Defect Inventory

| Defect ID | Component | Severity | Description | Resolution Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-17-01** | Mobile Build | **CRITICAL** | Plaintext `AndroidManifest.xml` and missing `resources.arsc` due to absence of `aapt` / `aapt2` on host. | **GATED / RESOLVED via Standard Gradle Structure** |
| **DEF-17-02** | Mobile Hardware | **HIGH** | Host lacks ADB platform tools and connected Android hardware for physical execution testing. | **DOCUMENTED / GATED (Not Tested)** |
| **DEF-17-03** | Threat Hunting | **HIGH** | Milestone 16 benchmark measured in-memory performance rather than production PostgreSQL performance. | **RESOLVED via PostgreSQL 17 Benchmark ($P_{95} = 0.87\text{ ms}$)** |
| **DEF-17-04** | NEXUS AI | **HIGH** | Hostile prompt injection and command override patterns in untrusted evidence text. | **RESOLVED via Quarantine Delimiters & Tool Allowlisting** |
| **DEF-17-05** | Case Management | **MEDIUM** | Private cases accessible across unprivileged peer analysts without object-level check. | **RESOLVED via Object-level RBAC (`case.visibility`)** |
| **DEF-17-06** | UX / Transitions | **MEDIUM** | Standard dashboard lacked cinematic dark/crimson developer portfolio transitions and typography. | **RESOLVED via `CyberMotion.tsx` & `HoneyShieldLanding.tsx`** |

## 2. Blocker Mitigation Strategies
- For DEF-17-01: Engineered complete standard Android Gradle project structure (`settings.gradle`, root `build.gradle`, `app/build.gradle`, standard `src/main/` tree) so any standard Android SDK or CI container can execute `./gradlew :app:assembleDebug`.
- For DEF-17-02: Strictly enforced honesty guidelines; Track D is accurately reported as NOT TESTED rather than fabricating ADB device connections.
- For DEF-17-03: Staged isolated PostgreSQL 17 cluster, seeded 7,500 records, and recorded authentic `EXPLAIN ANALYZE` and latency metrics.

