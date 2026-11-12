#!/usr/bin/env python3
"""
CHRONOS — The Architecture of Time
Comprehensive QA & Performance Metrology Suite
Measures: Load time, transferred bytes, WebGL FPS, interaction latency, and captures fresh screenshots.
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
    screenshots_dir = "/home/liza/HoneyShield-X/chronos/screenshots/final_qa"
    os.makedirs(screenshots_dir, exist_ok=True)
    profile_dir = "/tmp/firefox_chronos_qa"
    os.makedirs(profile_dir, exist_ok=True)

    user_js = os.path.join(profile_dir, "user.js")
    with open(user_js, "w") as f:
        f.write('user_pref("marionette.port", 2830);\n')
        f.write('user_pref("marionette.defaultPrefs.port", 2830);\n')
        f.write('user_pref("webgl.force-enabled", true);\n')

    print("[1/8] Launching Firefox headless with Marionette on port 2830...")
    proc = subprocess.Popen([
        "firefox", "--headless", "--no-remote",
        "-profile", profile_dir,
        "--marionette"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    client = None
    results = {
        "status": "PASS",
        "url": "http://127.0.0.1:5175/",
        "performance_metrics": {},
        "interaction_latency_ms": {},
        "webgl_metrics": {},
        "screenshots": {},
    }

    try:
        connected = False
        for _ in range(15):
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

        # Navigate to application
        print("[3/8] Loading CHRONOS application at 1440x900...")
        client.send("WebDriver:SetWindowRect", {"width": 1440, "height": 900})
        t0 = time.time()
        client.send("WebDriver:Navigate", {"url": "http://127.0.0.1:5175/"})
        time.sleep(3.0)
        nav_time_ms = round((time.time() - t0) * 1000, 2)

        # Performance navigation timing
        timing = client.execute_script("""
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                return {
                    domInteractive: Math.round(nav.domInteractive),
                    domComplete: Math.round(nav.domComplete),
                    loadEventEnd: Math.round(nav.loadEventEnd),
                    transferSize: nav.transferSize || 0
                };
            }
            return {
                domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
                domComplete: performance.timing.domComplete - performance.timing.navigationStart,
                loadEventEnd: performance.timing.loadEventEnd - performance.timing.navigationStart
            };
        """)
        results["performance_metrics"] = timing
        print(f"  Navigation Timing: {timing}")

        # Measure WebGL frame rate
        print("[4/8] Measuring live WebGL rendering frame rate...")
        webgl_fps = client.execute_script("""
            return new Promise((resolve) => {
                let frames = 0;
                const start = performance.now();
                function count() {
                    frames++;
                    if (performance.now() - start < 1000) {
                        requestAnimationFrame(count);
                    } else {
                        const elapsed = performance.now() - start;
                        resolve(Math.round((frames * 1000) / elapsed));
                    }
                }
                requestAnimationFrame(count);
            });
        """)
        results["webgl_metrics"]["measured_fps"] = webgl_fps
        print(f"  Measured WebGL FPS: {webgl_fps}")

        # Interaction Latency: Tab Navigation
        print("[5/8] Measuring interaction latency...")
        tab_latencies = client.execute_script("""
            const latencies = {};
            const tabs = ['ancient', 'mechanical', 'modern', 'philosophy', 'origins'];
            for (const t of tabs) {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes(t));
                if (btn) {
                    const start = performance.now();
                    btn.click();
                    latencies[t] = Math.round((performance.now() - start) * 100) / 100;
                }
            }
            return latencies;
        """)
        results["interaction_latency_ms"]["tab_switching"] = tab_latencies
        print(f"  Tab Latencies: {tab_latencies}")

        # Modal Latency
        modal_latency = client.execute_script("""
            const dossierBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dossier'));
            if (!dossierBtn) return null;
            const t0 = performance.now();
            dossierBtn.click();
            const openMs = Math.round((performance.now() - t0) * 100) / 100;
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close'));
            let closeMs = 0;
            if (closeBtn) {
                const t1 = performance.now();
                closeBtn.click();
                closeMs = Math.round((performance.now() - t1) * 100) / 100;
            }
            return { open_ms: openMs, close_ms: closeMs };
        """)
        results["interaction_latency_ms"]["dossier_modal"] = modal_latency
        print(f"  Modal Latency: {modal_latency}")

        # [6/8] Capturing Desktop Screenshots Across All 5 Chapters
        print("[6/8] Capturing refined screenshots across chapters (1440x900)...")
        # Ensure modal is closed before chapter captures
        client.execute_script("""
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close'));
            if (closeBtn) closeBtn.click();
        """)
        time.sleep(0.5)

        chapters = [
            ("00_origins", "Origins"),
            ("01_ancient", "Ancient"),
            ("02_mechanical", "Mechanical"),
            ("03_modern", "Modern"),
            ("04_philosophy", "Philosophy"),
        ]

        for code, label in chapters:
            client.execute_script(f"""
                const btns = Array.from(document.querySelectorAll('header nav button, header button'));
                const btn = btns.find(b => b.textContent.includes('{label}'));
                if (btn) btn.click();
                window.scrollTo(0, 0);
            """)
            time.sleep(1.8)
            png = client.take_screenshot()
            if png:
                p = os.path.join(screenshots_dir, f"final_{code}.png")
                with open(p, "wb") as f: f.write(png)
                results["screenshots"][code] = p

        # Capture Dossier Modal
        client.execute_script("""
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dossier'));
            if (btn) btn.click();
        """)
        time.sleep(1.0)
        png = client.take_screenshot()
        if png:
            p = os.path.join(screenshots_dir, "final_dossier_modal.png")
            with open(p, "wb") as f: f.write(png)
            results["screenshots"]["dossier_modal"] = p

        client.execute_script("""
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close'));
            if (closeBtn) closeBtn.click();
        """)
        time.sleep(0.5)

        # [7/8] Multi-Breakpoint Screen Captures (1920, 1024, 768, 390, 360)
        print("[7/8] Capturing multi-breakpoint viewport renders...")
        breakpoints = [
            ("1920_desktop", 1920, 1080),
            ("1024_tablet_landscape", 1024, 768),
            ("768_tablet_portrait", 768, 1024),
            ("390_mobile_portrait", 390, 844),
            ("360_small_mobile", 360, 780),
        ]

        for name, w, h in breakpoints:
            client.send("WebDriver:SetWindowRect", {"width": w, "height": h})
            # Navigate to Origins
            client.execute_script("""
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Origins'));
                if (btn) btn.click();
                window.scrollTo(0, 0);
            """)
            time.sleep(1.5)
            png = client.take_screenshot()
            if png:
                p = os.path.join(screenshots_dir, f"final_{name}.png")
                with open(p, "wb") as f: f.write(png)
                results["screenshots"][name] = p

        print("[8/8] Saving QA results to final_qa_summary.json...")
        with open(os.path.join(screenshots_dir, "final_qa_summary.json"), "w") as f:
            json.dump(results, f, indent=2)

        print("\nCHRONOS QA Pass Completed Successfully.")

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
