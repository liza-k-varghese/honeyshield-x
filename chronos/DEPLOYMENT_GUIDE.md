# CHRONOS — Production Staging & Deployment Package

**Artifact:** `chronos-staging-package-v1.0.0.tar.gz`  
**Version:** `1.0.0` (Staging Baseline)  
**Security Level:** OWASP Level 3 Hardened  

---

## 1. Quick Start (Clean-Room Deployment)

Extract the archive into any target deployment directory:
```bash
tar -xzf chronos-staging-package-v1.0.0.tar.gz
cd chronos/
```

### Option A: Standard Production Deployment (Port 8080)
For environments running behind a cloud reverse proxy / load balancer (e.g. AWS ALB, Cloudflare, Traefik, Nginx):
```bash
# Using Podman
podman build -t chronos:prod -f Dockerfile .
podman run -d --name chronos_web_prod --security-opt no-new-privileges:true -p 127.0.0.1:8080:80 chronos:prod

# Or using Docker Compose
docker compose up -d
```

### Option B: Standalone HTTPS Staging Deployment (Port 8080 -> 8443)
For standalone private HTTPS staging with TLS certificates:
```bash
# 1. Place valid certificates in certs/ (or generate self-signed test certs)
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/chronos.key -out certs/chronos.crt \
  -subj "/CN=staging.chronos.internal"
chmod 0600 certs/chronos.key

# 2. Launch HTTPS staging container
podman run -d --name chronos_staging_https \
  --security-opt no-new-privileges:true \
  -p 127.0.0.1:8080:80 -p 127.0.0.1:8443:443 \
  -v ./nginx.ssl.conf:/etc/nginx/conf.d/default.conf:ro \
  -v ./certs:/etc/nginx/certs:ro \
  chronos:prod

# Or using Docker Compose
docker compose -f docker-compose.staging.https.yml up -d
```

---

## 2. Fast Standalone Build (Without Node.js Toolchain)

To build the Docker container using only the pre-compiled `dist/` bundle:
```bash
podman build -t chronos:prod -f Dockerfile.standalone .
```

---

## 3. Rollback Procedure

To roll back a running deployment:
```bash
# Gracefully stop the current container
podman stop -t 5 chronos_web_prod && podman rm chronos_web_prod

# Revert to the previous known good image or backup
podman run -d --name chronos_web_prod --security-opt no-new-privileges:true -p 127.0.0.1:8080:80 chronos:previous-stable
```

---

## 4. Security Policy & Headers

- **Content-Security-Policy:** Level 3 policy enforcing self-origin script, style, font, media, with `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'`.
- **HSTS:** `max-age=31536000; includeSubDomains` (Preload excluded for safe staging).
- **MIME Sniffing:** `X-Content-Type-Options: nosniff`.
- **Clickjacking:** `X-Frame-Options: SAMEORIGIN`.
- **Sensitive Files:** Automatic 403 Forbidden on `.git`, `.env`, `.bak`, `.sql`, `.log`, `.tar.gz`.
- **HTTP Methods:** Restricted to `GET` and `HEAD` (405 Method Not Allowed on others).

---

## 5. Automated Post-Deployment Verification

The package includes automated Python verification harnesses for immediate post-deployment validation:

```bash
# 1. Verify HTTP production container security headers, SPA fallback, blocked files, and methods:
python3 test_production_container.py

# 2. Verify HTTPS staging container (TLS termination, HSTS emission, restart recovery):
python3 test_https_staging_container.py

# 3. Verify complete OWASP application security controls (zero secrets, DOM safety, live headers):
CHRONOS_URL="http://127.0.0.1:8080/" python3 verify_chronos_security.py
```

