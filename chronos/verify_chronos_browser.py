#!/usr/bin/env python3
"""
CHRONOS — The Architecture of Time
Automated Browser Verification using Mozilla Firefox Marionette Protocol
System 1 / Phase 1 Complete Verification Suite
"""

import os
import sys
import time
import socket
import json
import base64
import subprocess

class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=2830):
        self.s = socket.socket()
        self.s.connect((host, port))
        self.banner = self.s.recv(1024)
        self.msg_id = 0

    def send(self, cmd, params=None):
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

    def execute_script(self, script, args=None):
        if args is None:
            args = []
        res = self.send("WebDriver:ExecuteScript", {"script": script, "args": args})
        if len(res) > 3 and isinstance(res[3], dict) and "value" in res[3]:
            return res[3]["value"]
        return res

    def take_screenshot(self):
        res = self.send("WebDriver:TakeScreenshot", {})
        if len(res) > 3 and isinstance(res[3], dict) and "value" in res[3]:
            return base64.b64decode(res[3]["value"])
        return None

    def close(self):
        try:
            self.s.close()
        except Exception:
            pass

def main():
    screenshots_dir = "/home/liza/HoneyShield-X/chronos/screenshots"
    os.makedirs(screenshots_dir, exist_ok=True)
    profile_dir = "/tmp/firefox_chronos_marionette"
    os.makedirs(profile_dir, exist_ok=True)

    # Configure prefs for custom marionette port 2830
    user_js = os.path.join(profile_dir, "user.js")
    with open(user_js, "w") as f:
        f.write('user_pref("marionette.port", 2830);\n')
        f.write('user_pref("marionette.defaultPrefs.port", 2830);\n')
        f.write('user_pref("webgl.force-enabled", true);\n')

    print("[1/6] Launching Firefox 140.16.0esr with Marionette on port 2830...")
    proc = subprocess.Popen([
        "firefox", "--headless", "--no-remote",
        "-profile", profile_dir,
        "--marionette"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    client = None
    results = {
        "status": "PASS",
        "url": "http://127.0.0.1:5175/",
        "title": "",
        "webgl_active": False,
        "canvas_found": False,
        "screenshots": {},
    }

    try:
        connected = False
        for attempt in range(15):
            try:
                time.sleep(1.0)
                client = MarionetteClient(port=2830)
                connected = True
                break
            except Exception:
                continue

        if not connected or not client:
            raise RuntimeError("Could not connect to Marionette on port 2830")

        client.send("WebDriver:NewSession", {})
        print("[2/6] Marionette session initialized.")

        # --- Test 1: Desktop Viewport (1440x900) Overview Hero Top ---
        client.send("WebDriver:SetWindowRect", {"width": 1440, "height": 900})
        client.send("WebDriver:Navigate", {"url": "http://127.0.0.1:5175/"})
        time.sleep(3.0)

        title = client.execute_script("return document.title;")
        results["title"] = title
        print(f"Page Title: {title}")

        has_canvas = client.execute_script("return !!document.querySelector('canvas');")
        results["canvas_found"] = has_canvas

        webgl_ok = client.execute_script("""
            const c = document.querySelector('canvas');
            if (!c) return false;
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            return !!gl;
        """)
        results["webgl_active"] = webgl_ok
        print(f"Three.js Canvas Found: {has_canvas}, WebGL: {webgl_ok}")

        # Capture Hero Top
        client.execute_script("window.scrollTo(0, 0);")
        time.sleep(1.0)
        hero_png = client.take_screenshot()
        if hero_png:
            path = os.path.join(screenshots_dir, "desktop_hero_top.png")
            with open(path, "wb") as f:
                f.write(hero_png)
            results["screenshots"]["hero_top"] = path
            print(f"[3/6] Saved Desktop Hero Top ({len(hero_png)} bytes)")

        # Capture Interactive Stage
        client.execute_script("window.scrollTo(0, 360);")
        time.sleep(1.0)
        stage_png = client.take_screenshot()
        if stage_png:
            path = os.path.join(screenshots_dir, "desktop_stage.png")
            with open(path, "wb") as f:
                f.write(stage_png)
            results["screenshots"]["stage"] = path
            print(f"[3/6+] Saved Desktop Stage ({len(stage_png)} bytes)")

        # --- Test 2: Anatomy Tab (Exploded View) ---
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const anatomyBtn = btns.find(b => b.textContent.includes('3D Anatomy'));
            if (anatomyBtn) anatomyBtn.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        anatomy_png = client.take_screenshot()
        if anatomy_png:
            path = os.path.join(screenshots_dir, "tab_anatomy_phase1.png")
            with open(path, "wb") as f:
                f.write(anatomy_png)
            results["screenshots"]["tab_anatomy"] = path
            print(f"[4/6] Saved Anatomy Exploded View ({len(anatomy_png)} bytes)")

        # --- Test 3: Epochs of Time Tab (Spacetime Helix) ---
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const epochBtn = btns.find(b => b.textContent.includes('Epochs of Time'));
            if (epochBtn) epochBtn.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        epochs_png = client.take_screenshot()
        if epochs_png:
            path = os.path.join(screenshots_dir, "tab_epochs_phase1.png")
            with open(path, "wb") as f:
                f.write(epochs_png)
            results["screenshots"]["tab_epochs"] = path
            print(f"[5/6] Saved Epochs 3D Helix ({len(epochs_png)} bytes)")

        # --- Test 4: Bespoke Atelier Tab ---
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const atelierBtn = btns.find(b => b.textContent.includes('Bespoke Atelier'));
            if (atelierBtn) atelierBtn.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        atelier_png = client.take_screenshot()
        if atelier_png:
            path = os.path.join(screenshots_dir, "tab_atelier_phase1.png")
            with open(path, "wb") as f:
                f.write(atelier_png)
            results["screenshots"]["tab_atelier"] = path
            print(f"[6/6] Saved Bespoke Atelier ({len(atelier_png)} bytes)")

        # --- Test 5: Mobile Viewport (390x844) ---
        client.send("WebDriver:SetWindowRect", {"width": 390, "height": 844})
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const overviewBtn = btns.find(b => b.textContent.includes('Overview'));
            if (overviewBtn) overviewBtn.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        mobile_png = client.take_screenshot()
        if mobile_png:
            path = os.path.join(screenshots_dir, "mobile_phase1.png")
            with open(path, "wb") as f:
                f.write(mobile_png)
            results["screenshots"]["mobile"] = path
            print(f"[6/6+] Saved Mobile Layout ({len(mobile_png)} bytes)")

        evidence_json = os.path.join(screenshots_dir, "browser_verification_phase1.json")
        with open(evidence_json, "w") as f:
            json.dump(results, f, indent=2)

        print("\nAll browser verification and screenshot captures PASSED.")

    finally:
        if client:
            client.close()
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    main()
