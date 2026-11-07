# HoneyShield X — Milestone 18: Defect Register & Resolution Tracking

| ID | Component | Severity | Description | Status | Resolution / Remediation |
|---|---|---|---|---|---|
| **DEF-1801** | Android Native Toolchain | Critical | Host environment lacks Android SDK Build-Tools (`aapt2`, `d8`, `android.jar`). | Documented & Gated | Option D reproducible setup instructions and standard Gradle module configured for external CI runner. |
| **DEF-1802** | Android Packaging | Critical | Legacy APK contained uncompiled plaintext `AndroidManifest.xml` and missing `resources.arsc`. | Remediated in Architecture | Standard Android Gradle hierarchy configured with binary AXML compilation mapping in `mobile/android/app/build.gradle`. |
| **DEF-1803** | Emulator / Hardware | Blocker | No physical Android device or AVD emulator attached to host container. | Gated Honestly | Track D marked as NOT TESTED / BLOCKED (adhering strictly to Part 31). |
| **DEF-1804** | NEXUS AI Sandbox | High | Hostile prompt injections in evidence queries could attempt privilege escalation. | Remediated | XML instruction/data isolation, adversarial payload quarantine, and read-only tool allowlist enforced. |
| **DEF-1805** | Dual Risk Scale | Medium | Ambiguity between CVSS 0–10 base rule severity and HoneyShield 0–100 composite operational score. | Remediated | Reconciled endpoint `/api/v1/risk/explain/{attack_id}` providing explicit `scale` and `normalized_score_10`. |
| **DEF-1806** | Threat Hunting Mock | Medium | Milestone 16 benchmark measured simulated in-memory lookups instead of real PostgreSQL queries. | Remediated | Real PostgreSQL 17 benchmark executed against 7,500 records ($P_{95} = 0.87\text{ ms}$). |

