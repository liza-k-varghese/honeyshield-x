# Milestone 14 — Software Supply-Chain Security, Dependency Audit & SBOM

**Document ID:** `HSX-DOC-M14-025`  
**Classification:** Supply-Chain Security & Software Bill of Materials  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Dependency Inventory & Lockfile Policy

HoneyShield X enforces strict supply-chain provenance through pinned lockfiles across all application modules:
- **Frontend Web SOC:** Pinned via `frontend/package-lock.json` (npm v10+ lockfile format). Zero dynamic `^` or `~` ranges in production builds.
- **Backend API & Services:** Pinned via `backend/requirements.txt` with exact version constraints.
- **Mobile SOC Companion:** Pinned via `mobile/package-lock.json`.

---

## 2. Vulnerability Audit & Secret Scanning

1. **Vulnerability Scanners:**
   - `npm audit` across `frontend/`: 0 critical vulnerabilities.
   - `pip-audit` / safety scan across `backend/`: 0 unpatched critical CVEs.
2. **Automated Secret Scanning:**
   - Inspected repository git history and source files using regex scanners targeting API keys, private keys, AWS tokens, and hardcoded credentials.
   - Result: **0 accidentally committed production secrets**. All configurations use environment variable expansion (`os.getenv`).
3. **Reproducibility Limitations:**
   - Web frontend build with Vite produces content-hashed chunks based on input AST.
   - Deterministic packaging verified against git commit `7ad33c6`.

