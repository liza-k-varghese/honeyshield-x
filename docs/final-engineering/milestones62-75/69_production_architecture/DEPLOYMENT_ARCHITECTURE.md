# MILESTONE 69 — PRODUCTION FRONTEND & BACKEND DEPLOYMENT ARCHITECTURE

**Directory:** `docs/final-engineering/milestones62-75/69_production_architecture/`  
**Target Subsystems:** Reverse Proxy, Process Supervision, Environment Segregation  
**Evaluation Gates:** G51, G52, G53, G54  

---

## 1. PRODUCTION PACKAGING & SERVING TOPOLOGY

In production, HoneyShield X must **never** run under `vite` development server on port 5173. The recommended deployment topology employs:

```
[Client Web Browser (HTTPS)]
             │
             ▼ :443 (TLS Termination)
┌──────────────────────────────────────────────┐
│       Reverse Proxy (Nginx / Caddy)          │
│                                              │
│  /           ──► Static Root (/var/www/dist) │
│  /api/v1/    ──► Uvicorn Cluster (:8000)     │
│  /api/v1/ws  ──► WebSocket Upgrade (:8000)   │
└──────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
[FastAPI Node 1] [FastAPI Node 2]
      │             │
      └──────┬──────┘
             ▼
[PostgreSQL 17 :5432]  ── [Redis 7 :6379]
```

---

## 2. REVERSE PROXY & TLS CONFIGURATION (NGINX)

```nginx
server {
    listen 443 ssl http2;
    server_name soc.enterprise.corp;

    ssl_certificate /etc/ssl/certs/honeyshield.crt;
    ssl_certificate_key /etc/ssl/private/honeyshield.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # OWASP Recommended Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' ws: wss:;" always;

    # Static Production Frontend Assets
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Dynamic API Routes
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # WebSocket Real-Time Outbox Stream
    location /api/v1/events/ws {
        proxy_pass http://127.0.0.1:8000/api/v1/events/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

---

## 3. BACKEND PROCESS SUPERVISION & UVICORN CONFIGURATION

Production FastAPI instances run via systemd or container supervision:

```ini
[Unit]
Description=HoneyShield X FastAPI Production Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=honeyshield
Group=honeyshield
WorkingDirectory=/opt/honeyshield/backend
EnvironmentFile=/etc/honeyshield/production.env
ExecStart=/opt/honeyshield/backend/.venv/bin/uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 4 \
    --proxy-headers \
    --forwarded-allow-ips="127.0.0.1" \
    --timeout-graceful-shutdown 15
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```
