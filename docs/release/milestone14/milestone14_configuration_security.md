# Milestone 14 — Release Configuration Hardening & Zero-Trust Policies

**Document ID:** `HSX-DOC-M14-026`  
**Classification:** DevSecOps Hardening & Infrastructure Security  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Network & Ingress Hardening

1. **TLS 1.3 Termination:**
   - Ingress reverse proxy enforces TLS 1.3 with forward secrecy (`ECDHE-RSA-AES256-GCM-SHA384`).
   - Strict-Transport-Security (HSTS) configured: `max-age=31536000; includeSubDomains`.
2. **WebSocket Upgrade Gate:**
   - NGINX proxy passes `Upgrade` and `Connection` headers strictly to `/api/v1/ws/*` endpoints.
   - Unauthenticated upgrade attempts are dropped prior to worker dispatch.
3. **Internal Ports Shielding:**
   - PostgreSQL (`5432`) and Redis (`6379`) are bound strictly to internal docker/loopback interfaces (`127.0.0.1`).
   - Zero administrative database ports are publicly exposed.

---

## 2. HTTP Security Headers & Content Security Policy (CSP)

The web frontend enforces enterprise security headers:
- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;`
- `X-Frame-Options`: `DENY`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: `geolocation=(), camera=(), microphone=()`

---

## 3. Environment Variable Sanitization

Production and staging deployments strictly require:
- `SECRET_KEY`: Minimum 64-character high-entropy hex string.
- `DEBUG`: Strictly set to `false`.
- `ALLOW_ORIGINS`: Explicit list of authorized SOC origin domains (no wildcard `*`).
- `RATE_LIMIT_LOGIN`: 5 attempts per minute per IP.

