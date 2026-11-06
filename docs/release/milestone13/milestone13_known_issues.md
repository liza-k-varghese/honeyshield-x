# Milestone 13 — Known Issues, Technical Debt & Remediation Register

**Document ID:** `HSX-DOC-M13-026`  
**Classification:** Engineering Defect Register  
**Release Candidate:** `v1.0.0-rc5`  
**Review Date:** 2026-11-06

---

## 1. Executive Summary

In adherence to Milestone 13 Non-Negotiables and Stop Conditions, HoneyShield X maintains an uncompromising defect and blocker register. Known gaps are documented transparently rather than obfuscated with synthetic mocks or placeholders.

---

## 2. Active Technical Issues & Blockers

| Issue ID | Severity | Subsystem | Description | Root Cause | Remediation Plan |
|:---|:---:|:---|:---|:---|:---|
| **ISS-M13-01** | **CRITICAL (BLOCKER)** | Mobile Build Pipeline | Debug APK is not a valid Android executable package (`60 KB` archive). | Local host lacks Android SDK Platform 34, `aapt2`, Gradle, and Hermes C++ runtime libraries; previous packaging used ad-hoc zip creation. | Provision enterprise Linux build agent with Android SDK 34 and Gradle 8+ or execute build via GitHub Actions CI pipeline. |
| **ISS-M13-02** | **HIGH (RELEASE GATE)**| Physical Device QA | Zero connected physical Android handsets or QEMU emulators on host. | `adb` binary missing from host PATH; no USB-connected physical devices present in `lsusb`. | Provision authorized testing handset (e.g. Google Pixel or Samsung Galaxy) with USB debugging enabled for on-device acceptance. |
| **ISS-M13-03** | **MEDIUM** | Push Notifications | Cloud push notifications inactive in staging. | Google Firebase Cloud Messaging (FCM) service account keys not committed to source repo (by design). | Supply enterprise staging FCM credentials via Kubernetes secrets in staging deployment. |
| **ISS-M13-04** | **LOW** | Threat Feed Polling | External STIX TAXII feeds rely on local fixture fallback when sandbox network is offline. | Isolated sandbox mode restricts outbound internet access. | Connect enterprise threat feed proxy in staging VPC. |

---

## 3. Risk Assessment & Production Impact

- **Web SOC Platform & Backend API:** **ZERO OPEN BLOCKERS**. The Web SOC frontend, backend FastAPI services, PostgreSQL outbox, Redis event broker, and Digital Agent Universe are 100% verified with 253/253 passing automated tests.
- **Android Mobile Track:** **BLOCKED FROM GENERAL RELEASE**. In accordance with two-track release governance, the Android companion app is gated separately until authentic compilation and physical handset validation are completed on an Android-enabled build runner.

