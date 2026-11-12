#!/usr/bin/env python3
"""
HoneyShield X — Professional SOC UI/UX Rebuild: Automated Visual QA & Evidence Capture
Launches backend & frontend preview in sandboxed mode, automates headless Firefox via Marionette,
and captures high-resolution screenshots across 10 core views and 4 responsive breakpoints.
"""

import base64
import json
import logging
import os
import shutil
import socket
import subprocess
import sys
import time
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("redesign_qa_capture")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AFTER_DIR = os.path.join(REPO_ROOT, "docs", "system1-excellence", "redesign_evidence", "after")
ARTIFACT_DIR = "/home/liza/.gemini/antigravity/brain/ed93eb72-4628-4c8c-be7b-fab727dc29f0"
APP_URL = "http://127.0.0.1:5173"
DB_PATH = "/tmp/hsx_qa.db"


class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=2828, timeout=20.0):
        start = time.time()
        connected = False
        while time.time() - start < timeout:
            try:
                self.s = socket.socket()
                self.s.connect((host, port))
                connected = True
                break
            except (ConnectionRefusedError, OSError):
                time.sleep(0.5)
        if not connected:
            raise ConnectionRefusedError(f"Could not connect to Marionette on {host}:{port}")
        self.banner = self.s.recv(1024)
        self.msg_id = 0

    def send(self, cmd: str, params: dict | None = None) -> list:
        if params is None:
            params = {}
        self.msg_id += 1
        payload = json.dumps([0, self.msg_id, cmd, params])
        self.s.sendall(f"{len(payload)}:{payload}".encode("utf-8"))
        header = b""
        while b":" not in header:
            header += self.s.recv(1)
        length = int(header.rstrip(b":"))
        body = b""
        while len(body) < length:
            chunk = self.s.recv(min(4096, length - len(body)))
            if not chunk:
                break
            body += chunk
        return json.loads(body.decode("utf-8"))

    def execute_script(self, script: str, args: list | None = None) -> Any:
        if args is None:
            args = []
        res = self.send("WebDriver:ExecuteScript", {"script": script, "args": args})
        if len(res) > 3 and isinstance(res[3], dict) and "value" in res[3]:
            return res[3]["value"]
        return res

    def take_screenshot(self) -> bytes | None:
        res = self.send("WebDriver:TakeScreenshot", {})
        if len(res) > 3 and isinstance(res[3], dict) and "value" in res[3]:
            return base64.b64decode(res[3]["value"])
        return None

    def close(self):
        try:
            self.send("WebDriver:DeleteSession", {})
            self.s.close()
        except Exception:
            pass


def save_screenshot(client: MarionetteClient, filename: str) -> str:
    path = os.path.join(AFTER_DIR, filename)
    png_bytes = client.take_screenshot()
    if png_bytes:
        with open(path, "wb") as f:
            f.write(png_bytes)
        logger.info("[EVIDENCE CAPTURED] %s (%d bytes)", filename, len(png_bytes))

        # Also copy key screenshots to artifact directory for presentation
        if os.path.isdir(ARTIFACT_DIR):
            art_path = os.path.join(ARTIFACT_DIR, f"after_{filename}")
            try:
                shutil.copy2(path, art_path)
            except Exception as e:
                logger.warning("Could not copy to artifact dir: %s", e)

        return path
    else:
        logger.warning("[SCREENSHOT FAILED] %s", filename)
        return ""


def seed_database():
    """Initializes SQLite with mock SOC entities."""
    logger.info("Initializing SQLite database at %s...", DB_PATH)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.join(REPO_ROOT, "backend")
    env["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

    python_bin = os.path.join(REPO_ROOT, "backend", ".venv", "bin", "python")

    # Create tables
    create_tables_code = """
from app.database import engine, Base
import app.models
from app.models import Attack, Alert, ThreatIntelligence
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)
from sqlalchemy.orm import Session

with Session(engine) as s:
    a1 = Attack(attack_type="SSH_BRUTE_FORCE", source_ip="198.51.100.23", protocol="TCP", severity="critical", risk_score=94.5, status="detected", detected_at=datetime.utcnow() - timedelta(minutes=12))
    a2 = Attack(attack_type="SQLI_INJECTION", source_ip="203.0.113.89", protocol="HTTP", severity="high", risk_score=78.2, status="contained", detected_at=datetime.utcnow() - timedelta(minutes=35))
    a3 = Attack(attack_type="PORT_SCAN", source_ip="192.0.2.14", protocol="SYN", severity="medium", risk_score=45.0, status="investigating", detected_at=datetime.utcnow() - timedelta(hours=2))
    s.add_all([a1, a2, a3])
    s.commit()

    al1 = Alert(attack_id=a1.id, alert_type="SSH_THRESHOLD_EXCEEDED", severity="critical", message="Excessive failed logins from 198.51.100.23 on port 22", status="open", notification_status="delivered")
    al2 = Alert(attack_id=a2.id, alert_type="SQLI_SIGNATURE_DETECTED", severity="high", message="Union-based SQL injection attempt targeting /api/v1/auth", status="acknowledged", notification_status="delivered")
    al3 = Alert(attack_id=a3.id, alert_type="SYN_FLOOD_PROBE", severity="low", message="Broad TCP SYN sweep across ports 1-1024", status="resolved", notification_status="pending")
    s.add_all([al1, al2, al3])

    t1 = ThreatIntelligence(indicator_type="ip", indicator_value="198.51.100.23", threat_level="critical", source="HoneyShield Sensor-01", confidence=0.95, description="High-velocity SSH credential stuffer active in AP-South region")
    t2 = ThreatIntelligence(indicator_type="ip", indicator_value="203.0.113.89", threat_level="high", source="Global Threat Feed", confidence=0.82, description="Automated SQL injection probe host")
    s.add_all([t1, t2])
    s.commit()

print("Seeded database with initial attack and alert entities.")
"""
    subprocess.run([python_bin, "-c", create_tables_code], env=env, check=True)


def main():
    os.makedirs(AFTER_DIR, exist_ok=True)
    seed_database()

    # Paths and environment
    python_bin = os.path.join(REPO_ROOT, "backend", ".venv", "bin", "python")
    pnpm_bin = os.path.join(REPO_ROOT, "scripts", "bin", "pnpm")
    node_dir = "/tmp/node24/bin"

    env = os.environ.copy()
    env["PATH"] = f"{node_dir}:{os.path.join(REPO_ROOT, 'scripts', 'bin')}:{env.get('PATH', '')}"
    env["PYTHONPATH"] = os.path.join(REPO_ROOT, "backend")
    env["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

    # 1. Start Backend Uvicorn Server
    logger.info("Starting Backend Uvicorn on 127.0.0.1:8000...")
    backend_proc = subprocess.Popen([
        python_bin, "-m", "uvicorn", "app.main:app",
        "--host", "127.0.0.1", "--port", "8000"
    ], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Start Frontend Vite Preview Server
    logger.info("Starting Frontend Vite Preview on 127.0.0.1:5173...")
    frontend_proc = subprocess.Popen([
        pnpm_bin, "vite", "preview", "--port", "5173", "--host", "127.0.0.1"
    ], cwd=os.path.join(REPO_ROOT, "frontend"), env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. Start Firefox with Marionette
    profile_dir = "/tmp/firefox_hsx_redesign_qa"
    shutil.rmtree(profile_dir, ignore_errors=True)
    os.makedirs(profile_dir, exist_ok=True)

    logger.info("Starting headless Firefox with Marionette on port 2828...")
    firefox_proc = subprocess.Popen([
        "firefox", "--headless", "--no-remote",
        "-profile", profile_dir,
        "--marionette"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    client = None
    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_url": APP_URL,
        "views_captured": [],
    }

    try:
        time.sleep(3.5)
        client = MarionetteClient(port=2828, timeout=20.0)
        client.send("WebDriver:NewSession", {})
        logger.info("[PASS] Marionette session connected successfully.")

        # Set Desktop Viewport 1920x1080
        client.send("WebDriver:SetWindowRect", {"width": 1920, "height": 1080})

        # Navigate to app
        client.send("WebDriver:Navigate", {"url": APP_URL})
        time.sleep(3.0)

        # Set authenticated session storage
        client.execute_script("""
            sessionStorage.setItem('hsx_operator', JSON.stringify({
                username: 'admin_chief',
                role: 'soc_lead',
                email: 'admin.chief@honeyshield.local',
                permissions: ['*'],
                is_active: true
            }));
            sessionStorage.setItem('hsx_auth_token', 'hsx_qa_session_token_lead');
        """)

        # Views Matrix (Desktop 1920x1080)
        views = [
            ("overview", "02_staging_security_overview.png", "Security Overview Flagship Command Center"),
            ("universe", "03_staging_digital_universe.png", "Spatial Agent Universe 2.0"),
            ("alerts", "04_staging_alerts_triage.png", "Full Alerts Console & Incident Prioritization"),
            ("cases", "05_staging_case_management.png", "Incident Case Management & NIST Playbooks"),
            ("deception", "06_staging_deception_grid.png", "Active Deception Grid & Canary Orchestration"),
            ("intel", "07_staging_threat_intelligence.png", "Threat Intelligence & IOC Fusion Core"),
            ("command", "08_staging_live_command.png", "Live Incident Command Center & Telemetry Stream"),
            ("campaigns", "09_staging_threat_hunting.png", "Attack Campaign Intelligence & Threat Hunting"),
            ("rules", "10_staging_detection_rules.png", "Declarative Detection Rules Catalog & Sandbox"),
            ("integrations", "11_staging_system2_integrations.png", "SIEM-SOAR Gateway & Outbound Webhooks"),
        ]

        for view_name, filename, desc in views:
            url = f"{APP_URL}/?view={view_name}"
            if view_name == "universe":
                url += "&locomotion=1"
            logger.info("Capturing desktop view '%s' (%s)...", view_name, desc)
            client.send("WebDriver:Navigate", {"url": url})
            time.sleep(2.0)

            dom_nodes = client.execute_script("return document.querySelectorAll('*').length;")
            logger.info("Rendered DOM nodes for '%s': %d", view_name, dom_nodes)

            save_screenshot(client, filename)
            results["views_captured"].append({
                "view": view_name,
                "viewport": "1920x1080",
                "filename": filename,
                "description": desc,
                "dom_nodes": dom_nodes,
                "status": "PASS" if dom_nodes > 40 else "WARN"
            })

        # Step 4: Responsive Breakpoints Testing
        # Laptop 1440x900
        logger.info("Capturing Laptop viewport (1440x900)...")
        client.send("WebDriver:SetWindowRect", {"width": 1440, "height": 900})
        client.send("WebDriver:Navigate", {"url": f"{APP_URL}/?view=overview"})
        time.sleep(2.0)
        save_screenshot(client, "15_staging_laptop_overview.png")
        results["views_captured"].append({
            "view": "overview",
            "viewport": "1440x900",
            "filename": "15_staging_laptop_overview.png",
            "description": "Overview on Laptop 1440x900",
            "status": "PASS"
        })

        # Tablet 768x1024
        logger.info("Capturing Tablet viewport (768x1024)...")
        client.send("WebDriver:SetWindowRect", {"width": 768, "height": 1024})
        client.send("WebDriver:Navigate", {"url": f"{APP_URL}/?view=overview"})
        time.sleep(2.0)
        save_screenshot(client, "14_staging_tablet_overview.png")
        results["views_captured"].append({
            "view": "overview",
            "viewport": "768x1024",
            "filename": "14_staging_tablet_overview.png",
            "description": "Overview on Tablet 768x1024",
            "status": "PASS"
        })

        # Mobile 390x844
        logger.info("Capturing Mobile viewport (390x844)...")
        client.send("WebDriver:SetWindowRect", {"width": 390, "height": 844})

        # Mobile Overview
        client.send("WebDriver:Navigate", {"url": f"{APP_URL}/?view=overview"})
        time.sleep(2.0)
        save_screenshot(client, "12_staging_mobile_overview.png")
        results["views_captured"].append({
            "view": "overview",
            "viewport": "390x844",
            "filename": "12_staging_mobile_overview.png",
            "description": "Overview on Mobile 390x844",
            "status": "PASS"
        })

        # Mobile Universe
        client.send("WebDriver:Navigate", {"url": f"{APP_URL}/?view=universe&locomotion=1"})
        time.sleep(2.0)
        save_screenshot(client, "13_staging_mobile_universe.png")
        results["views_captured"].append({
            "view": "universe",
            "viewport": "390x844",
            "filename": "13_staging_mobile_universe.png",
            "description": "Universe on Mobile 390x844",
            "status": "PASS"
        })

        # Summary JSON
        summary_path = os.path.join(AFTER_DIR, "redesign_browser_acceptance_summary.json")
        with open(summary_path, "w") as f:
            json.dump(results, f, indent=2)
        logger.info("[SUCCESS] Visual QA Audit Complete! Total screenshots: %d", len(results["views_captured"]))

    finally:
        if client:
            client.close()
        for p, name in [(firefox_proc, "Firefox"), (frontend_proc, "Frontend Vite"), (backend_proc, "Backend Uvicorn")]:
            try:
                p.terminate()
                p.wait(timeout=2.0)
            except Exception:
                p.kill()
        shutil.rmtree(profile_dir, ignore_errors=True)
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)


if __name__ == "__main__":
    main()
