#!/usr/bin/env python3
"""
HoneyShield X — Milestone 52 Firefox Automation & Real-Time Relay Verification
Validates the complete 4-agent continuous movement sequence (SCOUT -> NEXUS -> ORACLE -> SENTINEL)
using native Mozilla Firefox 140.16.0esr via Marionette.
"""

import os
import sys
import time
import socket
import json
import base64
import subprocess

class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=2828):
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

def run_verification():
    evidence_dir = "/home/liza/HoneyShield-X/docs/final-engineering/milestone52/evidence"
    os.makedirs(evidence_dir, exist_ok=True)
    profile_dir = "/tmp/firefox_m52_profile"
    os.makedirs(profile_dir, exist_ok=True)

    print("Launching Firefox 140.16.0esr with Marionette on port 2828...")
    proc = subprocess.Popen([
        "firefox", "--headless", "--no-remote",
        "-profile", profile_dir,
        "--marionette"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    client = None
    telemetry_records = []

    try:
        time.sleep(2)
        client = MarionetteClient()
        session_res = client.send("WebDriver:NewSession", {})
        print("Marionette session initialized successfully.")

        # Set window size to 1920x1080
        client.send("WebDriver:SetWindowRect", {"width": 1920, "height": 1080})

        url = "http://127.0.0.1:5173/?view=universe&locomotion=1&debug=1"
        print(f"Navigating to {url}...")
        client.send("WebDriver:Navigate", {"url": url})
        time.sleep(2.0)

        # Check document title & readiness
        title = client.execute_script("return document.title;")
        print(f"Page loaded: {title}")

        print("\nBeginning continuous 14.5-second relay observation...")
        print(f"{'Time (s)':<10} | {'Carrier':<10} | {'Phase':<12} | {'Progress':<10} | {'Coords (X, Y)':<22} | {'Packet Capsule':<28}")
        print("-" * 100)

        start_time = time.time()
        screenshot_stages = {}

        # Capture telemetry at ~350ms intervals over 14.5 seconds
        while time.time() - start_time < 14.5:
            now = time.time() - start_time

            state = client.execute_script("""
                const agent = document.querySelector('.hsx-travelling-agent');
                const hud = document.querySelector('[data-testid="developer-diagnostics-hud"]');
                const capsule = document.querySelector('.hsx-packet-capsule');
                const carrierBadge = document.querySelector('.relative.z-30 .font-bold.text-white.uppercase');
                const phaseBadge = document.querySelector('.relative.z-30 .text-cyan-400.font-bold.uppercase');

                let left = null, top = null, coordsText = 'DOCKED';
                if (agent) {
                    left = agent.style.left;
                    top = agent.style.top;
                    coordsText = `${left}, ${top}`;
                }

                let hudLines = {};
                if (hud) {
                    const lines = hud.innerText.split('\\n');
                    for (const l of lines) {
                        if (l.includes(':')) {
                            const [k, v] = l.split(':');
                            hudLines[k.trim()] = v.trim();
                        }
                    }
                }

                return {
                    left: left,
                    top: top,
                    coordsText: coordsText,
                    carrier: carrierBadge ? carrierBadge.innerText : 'UNKNOWN',
                    phase: phaseBadge ? phaseBadge.innerText : 'UNKNOWN',
                    capsuleText: capsule ? capsule.innerText.replace(/\\n/g, ' ') : 'NONE (DETACHED)',
                    hudLines: hudLines,
                };
            """)

            carrier = str(state.get("carrier") or "UNKNOWN").lower().strip()
            phase = str(state.get("phase") or "UNKNOWN").strip()
            coords = str(state.get("coordsText") or "DOCKED")
            capsule = str(state.get("capsuleText") or "NONE (DETACHED)")
            hud = state.get("hudLines", {})

            progress = hud.get("Animation Progress", "N/A")
            if "Movement State" in hud:
                phase = hud["Movement State"]
            if "Agent Coordinates" in hud:
                coords = hud["Agent Coordinates"]

            record = {
                "elapsed_seconds": round(now, 3),
                "carrier": carrier,
                "phase": phase,
                "progress": progress,
                "coords": coords,
                "capsule": capsule,
            }
            telemetry_records.append(record)

            print(f"{now:<10.3f} | {carrier.upper():<10} | {phase:<12} | {progress:<10} | {coords:<22} | {capsule:<28}")

            # Capture screenshot when each carrier is in mid-flight (phase is travelling or progress > 30%)
            if carrier in ["scout", "nexus", "oracle", "sentinel"] and carrier not in screenshot_stages:
                if "TRAVELLING" in capsule or "travelling" in phase.lower():
                    screenshot_stages[carrier] = True
                    leg_num = {"scout": 1, "nexus": 2, "oracle": 3, "sentinel": 4}[carrier]
                    shot_path = os.path.join(evidence_dir, f"0{leg_num}_{carrier}_travelling_firefox.png")
                    png_bytes = client.take_screenshot()
                    if png_bytes:
                        with open(shot_path, "wb") as f:
                            f.write(png_bytes)
                        print(f"  >>> [SAVED CONTINUOUS FIREFOX EVIDENCE] Leg {leg_num}/4 ({carrier.upper()} in transit): {shot_path} ({len(png_bytes)} bytes)")

            time.sleep(0.35)

        # Save complete telemetry dump
        telemetry_file = os.path.join(evidence_dir, "continuous_relay_telemetry.json")
        with open(telemetry_file, "w") as f:
            json.dump(telemetry_records, f, indent=2)
        print(f"\nSaved {len(telemetry_records)} empirical telemetry records to {telemetry_file}")

        # Verification Analysis
        observed_carriers = set(r["carrier"] for r in telemetry_records if r["carrier"] in ["scout", "nexus", "oracle", "sentinel"])
        print("\n" + "=" * 70)
        print("VERIFICATION SUMMARY:")
        print(f"Total Observed Carriers: {len(observed_carriers)} / 4")
        for expected in ["scout", "nexus", "oracle", "sentinel"]:
            matching = [r for r in telemetry_records if r["carrier"] == expected]
            if matching:
                p_values = [r["progress"] for r in matching]
                first_coord = matching[0]["coords"]
                last_coord = matching[-1]["coords"]
                print(f"  ✓ {expected.upper():<10}: {len(matching):>2} frames | Start: {first_coord} -> Mid/End: {last_coord} | Progress: {p_values[0]} to {p_values[-1]}")
            else:
                print(f"  ✗ {expected.upper():<10}: NOT OBSERVED")
        print("=" * 70)

    finally:
        if client:
            client.close()
        proc.terminate()
        proc.wait()
        print("Firefox process terminated cleanly.")

if __name__ == "__main__":
    run_verification()
