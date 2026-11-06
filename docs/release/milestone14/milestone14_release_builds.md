# Milestone 14 — Release Build Pipeline & Artifact Packaging

**Document ID:** `HSX-DOC-M14-027`  
**Classification:** Build Engineering & Release Management  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Web Frontend Production Build

The Web SOC frontend was built using project-local Vite tooling:
```bash
cd frontend && ./node_modules/.bin/vite build
```

- **Build Time:** 7.1 seconds.
- **Output Directory:** `frontend/dist/`.
- **Assets:** Minified JS chunks, CSS bundles, SVG assets, and content-hashed manifests.
- **Verification:** Tarball archive generated at `release/v1.0.0-rc5/honeyshield-frontend-v1.0.0-rc5.tar.gz` (4,218,892 bytes).
- **Status:** **PASS / QUALIFIED FOR STAGING**.

---

## 2. Backend Packaging & Dependencies

The FastAPI backend utilizes Python 3.13 packaging with locked requirements:
- Source package directory: `backend/app/`.
- Migrations: Managed via Alembic (`backend/alembic/`).
- Status: **PASS / QUALIFIED FOR STAGING**.

---

## 3. Android Mobile Build Pipeline Status

- **Build Target:** `mobile/` React Native application.
- **Packaging Pipeline:** **FAILED / GATED**.
- **Reason:** Local Parrot OS host lacks Android SDK Platform 34 and Gradle wrapper. As proven in `milestone14_android_build.md`, the existing 60 KB APK is an unexecutable stub archive.
- **Action:** Gated separately. Do not publish mobile packages until compiled on a certified Android CI runner.

