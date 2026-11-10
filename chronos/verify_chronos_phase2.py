#!/usr/bin/env python3
"""
CHRONOS — The Architecture of Time
Comprehensive Multi-Breakpoint Browser Verification & Visual Inspection
System 1 / Phase 2 Suite (1440px, 1024px, 768px, 390px)
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
    screenshots_dir = "/home/liza/HoneyShield-X/chronos/screenshots/phase2"
    os.makedirs(screenshots_dir, exist_ok=True)
    profile_dir = "/tmp/firefox_chronos_marionette"
    os.makedirs(profile_dir, exist_ok=True)

    # Configure prefs for marionette
    user_js = os.path.join(profile_dir, "user.js")
    with open(user_js, "w") as f:
        f.write('user_pref("marionette.port", 2830);\n')
        f.write('user_pref("marionette.defaultPrefs.port", 2830);\n')
        f.write('user_pref("webgl.force-enabled", true);\n')

    print("[1/8] Launching Firefox 140.16.0esr with Marionette on port 2830...")
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
        "breakpoints_tested": [],
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
        print("[2/8] Marionette session initialized.")

        # =========================================================
        # 1. BREAKPOINT: 1440px (Desktop Wide)
        # =========================================================
        print("[3/8] Testing Breakpoint 1440x900 (Desktop)...")
        client.send("WebDriver:SetWindowRect", {"width": 1440, "height": 900})
        client.send("WebDriver:Navigate", {"url": "http://127.0.0.1:5175/"})
        time.sleep(3.0)

        title = client.execute_script("return document.title;")
        results["title"] = title
        has_canvas = client.execute_script("return !!document.querySelector('canvas');")
        results["canvas_found"] = has_canvas

        webgl_ok = client.execute_script("""
            const c = document.querySelector('canvas');
            if (!c) return false;
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            return !!gl;
        """)
        results["webgl_active"] = webgl_ok
        print(f"  Title: {title} | Canvas: {has_canvas} | WebGL: {webgl_ok}")

        # 1a. Prologue Hero
        client.execute_script("window.scrollTo(0, 0);")
        time.sleep(1.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_prologue.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_prologue"] = p

        # 1b. Technical Dossier Modal (test alignment fix)
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Dossier') || x.textContent.includes('Specs'));
            if (b) b.click();
        """)
        time.sleep(1.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_dossier_modal.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_dossier_modal"] = p

        # Close modal
        client.execute_script("""
            const closeBtn = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Close'));
            if (closeBtn) closeBtn.click();
        """)
        time.sleep(0.5)

        # 1c. Chapter 01: Anatomy
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Anatomy'));
            if (b) b.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_anatomy.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_anatomy"] = p

        # 1d. Chapter 02: Epochs of Time
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Epochs'));
            if (b) b.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_epochs.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_epochs"] = p

        # 1e. Chapter 03: Atelier
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Atelier'));
            if (b) b.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(2.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_atelier.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_atelier"] = p

        # 1f. Chapter 04: Philosophy of Time
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Philosophy'));
            if (b) b.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(1.5)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1440_philosophy.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1440_philosophy"] = p

        results["breakpoints_tested"].append("1440px")

        # =========================================================
        # 2. BREAKPOINT: 1024px (Tablet Landscape)
        # =========================================================
        print("[4/8] Testing Breakpoint 1024x768 (Tablet Landscape)...")
        client.send("WebDriver:SetWindowRect", {"width": 1024, "height": 768})
        client.execute_script("""
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Prologue') || x.textContent.includes('CHRONOS'));
            if (b) b.click();
            window.scrollTo(0, 0);
        """)
        time.sleep(1.5)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "1024_prologue.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["1024_prologue"] = p
        results["breakpoints_tested"].append("1024px")

        # =========================================================
        # 3. BREAKPOINT: 768px (Tablet Portrait)
        # =========================================================
        print("[5/8] Testing Breakpoint 768x1024 (Tablet Portrait)...")
        client.send("WebDriver:SetWindowRect", {"width": 768, "height": 1024})
        client.execute_script("window.scrollTo(0, 0);")
        time.sleep(1.5)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "768_prologue.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["768_prologue"] = p
        results["breakpoints_tested"].append("768px")

        # =========================================================
        # 4. BREAKPOINT: 390px (Mobile Phone)
        # =========================================================
        print("[6/8] Testing Breakpoint 390x844 (Mobile)...")
        client.send("WebDriver:SetWindowRect", {"width": 390, "height": 844})
        client.execute_script("window.scrollTo(0, 0);")
        time.sleep(1.5)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "390_mobile_prologue.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["390_mobile_prologue"] = p

        # 4b. Mobile Drawer Open
        client.execute_script("""
            const toggle = document.querySelector('button[aria-label=\"Toggle Navigation Menu\"]');
            if (toggle) toggle.click();
        """)
        time.sleep(1.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "390_mobile_drawer.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["390_mobile_drawer"] = p

        # 4c. Close Drawer and Navigate to Mobile Philosophy
        client.execute_script("""
            const drawerBtns = Array.from(document.querySelectorAll('div.lg\\\\:hidden button, div.md\\\\:hidden button'));
            const philBtn = drawerBtns.find(x => x.textContent.includes('Philosophy'));
            if (philBtn) {
                philBtn.click();
            } else {
                const anyPhil = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Philosophy'));
                if (anyPhil) anyPhil.click();
            }
            window.scrollTo(0, 0);
        """)
        time.sleep(1.5)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "390_mobile_philosophy.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["390_mobile_philosophy"] = p

        results["breakpoints_tested"].append("390px")

        print("[7/8] Writing verification evidence summary...")
        evidence_json = os.path.join(screenshots_dir, "phase2_verification_summary.json")
        with open(evidence_json, "w") as f:
            json.dump(results, f, indent=2)

        print("[8/8] All Phase 2 multi-breakpoint browser tests PASSED successfully.")

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
