# Milestone 14 — Known Issues, Technical Debt & Remediation Register

**Document ID:** `HSX-DOC-M14-032`  
**Classification:** Quality Assurance & Technical Debt Register  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Executive Summary

In adherence to Milestone 14 Quality Directives (Section 38.9: **NO HIDDEN RELEASE BLOCKERS**), HoneyShield X maintains an uncompromised register of all outstanding defects, risks, and technical debt.

---

## 2. Active Technical Issues & Blockers

| Defect ID | Severity | Subsystem | Description | Root Cause | Remediation Plan |
|:---|:---:|:---|:---|:---|:---|
| **ISS-M14-01** | **CRITICAL (BLOCKER)** | Mobile Build Pipeline | Debug APK (`60 KB`) is an unexecutable stub archive. | Local host lacks Android SDK Platform 34, `aapt2`, Gradle, and Hermes C++ runtime libraries. | Provision enterprise Linux CI runner with Android SDK 34 and Gradle 8+ or run GitHub Actions build. |
| **ISS-M14-02** | **HIGH (RELEASE GATE)**| Physical Device QA | Zero connected physical Android handsets or QEMU emulators on host. | `adb` binary missing from host PATH; no USB-connected physical devices present in `lsusb`. | Provision authorized testing handset (e.g. Google Pixel or Samsung Galaxy) with USB debugging enabled. |
| **ISS-M14-03** | **MEDIUM** | Push Notifications | Cloud push notifications inactive in staging. | Google Firebase Cloud Messaging (FCM) service account keys not committed to source repo (by design). | Supply enterprise staging FCM credentials via Kubernetes secrets in staging deployment. |
| **ISS-M14-04** | **LOW** | Threat Feed Polling | External STIX TAXII feeds rely on local fixture fallback when sandbox network is offline. | Isolated sandbox mode restricts outbound internet access. | Connect enterprise threat feed proxy in staging VPC. |

---

## 3. Risk Assessment & Production Impact

- **Web SOC Platform & Backend API:** **ZERO OPEN BLOCKERS**. The Web SOC frontend, backend FastAPI services, PostgreSQL outbox, Redis event broker, and Digital Agent Universe are 100% verified with 253/253 passing automated tests.
- **Android Mobile Track:** **BLOCKED FROM GENERAL RELEASE**. In accordance with two-track release governance, the Android companion app is gated separately until authentic compilation and physical handset validation are completed on an Android-enabled build runner.

