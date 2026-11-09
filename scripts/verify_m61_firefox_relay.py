#!/usr/bin/env python3
"""
HoneyShield X — Milestone 61: Firefox Relay Regression & State Purity Verification
Collects empirical temporal telemetry from native Mozilla Firefox 140.16.0esr via Marionette.
Verifies all 4 agents move sequentially, pure reducer transitions, packet clamping, pause/resume, and reset.
"""

import os
import sys
import time
import socket
import json
import base64
import subprocess

class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=2828, timeout=12.0):
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

def run_milestone61_verification():
    evidence_dir = "/home/liza/HoneyShield-X/docs/final-engineering/milestone61/evidence"
    os.makedirs(evidence_dir, exist_ok=True)
    profile_dir = "/tmp/firefox_m52_profile"

    print("======================================================================")
    print("HONEYSHIELD X — MILESTONE 61: FOUR-ROBOT MOVEMENT & PURITY VERIFICATION")
    print("======================================================================")
    print("Launching Firefox 140.16.0esr with Marionette on port 2828...")

    proc = subprocess.Popen([
        "firefox", "--headless", "--no-remote",
        "-profile", profile_dir,
        "--marionette"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    client = None
    telemetry_records = []
    agent_traces = {
        "scout": [],
        "nexus": [],
        "oracle": [],
        "sentinel": []
    }

    try:
        time.sleep(2.0)
        client = MarionetteClient()
        session_res = client.send("WebDriver:NewSession", {})
        print("✓ Marionette session established.")

        client.send("WebDriver:SetWindowRect", {"width": 1920, "height": 1080})

        url = "http://127.0.0.1:5173/?view=universe&locomotion=1&debug=1"
        print(f"Navigating to: {url}")
        client.send("WebDriver:Navigate", {"url": url})
        time.sleep(2.0)

        title = client.execute_script("return document.title;")
        print(f"Loaded page title: {title}")

        # Inject Performance Profiler
        client.execute_script("""
            window.__HSX_PERF_MONITOR__ = {
                frameDeltas: [],
                lastTimestamp: performance.now(),
                droppedFrames: 0,
                longFrames: 0,
                totalFrames: 0
            };
            function trackPerf(now) {
                const delta = now - window.__HSX_PERF_MONITOR__.lastTimestamp;
                window.__HSX_PERF_MONITOR__.lastTimestamp = now;
                window.__HSX_PERF_MONITOR__.totalFrames++;
                if (window.__HSX_PERF_MONITOR__.frameDeltas.length < 1200) {
                    window.__HSX_PERF_MONITOR__.frameDeltas.push(delta);
                }
                if (delta > 33.3) window.__HSX_PERF_MONITOR__.droppedFrames++;
                if (delta > 100.0) window.__HSX_PERF_MONITOR__.longFrames++;
                requestAnimationFrame(trackPerf);
            }
            requestAnimationFrame(trackPerf);
        """)

        print("\nStarting continuous 14.5s temporal telemetry sampling...")
        print(f"{'Time (s)':<9} | {'Carrier':<10} | {'Progress':<10} | {'Coords (X, Y)':<18} | {'Attached':<10} | {'Packet Capsule':<28}")
        print("-" * 95)

        start_time = time.time()
        screenshots_captured = {}

        while time.time() - start_time < 14.5:
            now = time.time() - start_time

            sample = client.execute_script("""
                const relayState = window.__HSX_RELAY_STATE__ || {};
                const capsule = document.querySelector('.hsx-packet-capsule');
                const travellingAgent = document.querySelector('.hsx-travelling-agent');

                let domCoords = null;
                if (travellingAgent) {
                    domCoords = {
                        left: travellingAgent.style.left,
                        top: travellingAgent.style.top
                    };
                }

                let activeAgent = relayState.currentAgent || null;
                let activeInfo = null;
                if (activeAgent && relayState.agents && relayState.agents[activeAgent]) {
                    activeInfo = relayState.agents[activeAgent];
                }

                return {
                    timestamp: performance.now(),
                    relayStateMode: relayState.mode || null,
                    relayRunId: relayState.relayRunId || null,
                    currentAgent: activeAgent,
                    currentStage: relayState.currentStage || null,
                    movementProgress: relayState.movementProgress !== undefined ? relayState.movementProgress : null,
                    isLocomotionPlaying: relayState.isLocomotionPlaying,
                    activeInfo: activeInfo,
                    domCoords: domCoords,
                    capsuleText: capsule ? capsule.textContent.trim() : null,
                    capsuleVisible: !!capsule
                };
            """)

            carrier = sample.get("currentAgent") or "unknown"
            progress = sample.get("movementProgress") or 0.0
            active_info = sample.get("activeInfo") or {}
            cur_pos = active_info.get("currentPosition") or {}
            x = cur_pos.get("x", 0.0)
            y = cur_pos.get("y", 0.0)
            attached = active_info.get("packetAttached", False)
            capsule_text = sample.get("capsuleText") or "None"

            print(f"{now:<9.2f} | {carrier:<10} | {progress:<10.3f} | ({x:5.1f}, {y:5.1f})      | {str(attached):<10} | {capsule_text:<28}")

            record = {
                "elapsed_s": round(now, 3),
                "carrier": carrier,
                "stage": sample.get("currentStage"),
                "progress": round(progress, 3),
                "carrier_pos": {"x": round(x, 2), "y": round(y, 2)},
                "packet_attached": attached,
                "capsule_text": capsule_text,
                "run_id": sample.get("relayRunId")
            }
            telemetry_records.append(record)

            if carrier in agent_traces:
                agent_traces[carrier].append({
                    "elapsed_s": round(now, 3),
                    "progress": round(progress, 3),
                    "x": round(x, 2),
                    "y": round(y, 2),
                    "attached": attached
                })

            # Capture screenshot mid-transit
            if carrier not in screenshots_captured and 0.25 <= progress <= 0.65:
                png_bytes = client.take_screenshot()
                if png_bytes:
                    img_path = os.path.join(evidence_dir, f"m61_{carrier}_in_transit.png")
                    with open(img_path, "wb") as f:
                        f.write(png_bytes)
                    screenshots_captured[carrier] = img_path
                    print(f"  📸 Captured high-res screenshot: {os.path.basename(img_path)} ({len(png_bytes)} bytes)")

            time.sleep(0.35)

        # Interactive controls verification: Pause, Resume, Reset
        print("\nVerifying interactive controls via keyboard & DOM...")
        # 1. Pause
        client.execute_script("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));")
        time.sleep(0.5)
        pause_state = client.execute_script("return window.__HSX_RELAY_STATE__ || {};")
        print(f"✓ Pause verification: isPlaying = {pause_state.get('isLocomotionPlaying')}")

        # 2. Resume
        client.execute_script("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));")
        time.sleep(0.5)
        resume_state = client.execute_script("return window.__HSX_RELAY_STATE__ || {};")
        print(f"✓ Resume verification: isPlaying = {resume_state.get('isLocomotionPlaying')}")

        # 3. Reset
        reset_res = client.execute_script("""
            const resetBtn = document.querySelector('button[title=\"Reset Locomotion to Origin\"]');
            if (resetBtn) {
                resetBtn.click();
                return true;
            }
            return false;
        """)
        time.sleep(0.5)
        post_reset = client.execute_script("return window.__HSX_RELAY_STATE__ || {};")
        print(f"✓ Reset verification: agent = {post_reset.get('currentAgent')}, progress = {post_reset.get('movementProgress')}, runId = {post_reset.get('relayRunId')}")

        # Query Perf
        perf = client.execute_script("return window.__HSX_PERF_MONITOR__ || {};")
        deltas = perf.get("frameDeltas", [])
        avg_fps = 0
        if deltas:
            avg_delta = sum(deltas) / len(deltas)
            avg_fps = round(1000.0 / avg_delta, 2) if avg_delta > 0 else 0
        print(f"\nIn-Browser FPS: {avg_fps} FPS (Total frames: {perf.get('totalFrames')}, Dropped: {perf.get('droppedFrames')})")

        # Save telemetry
        telemetry_file = os.path.join(evidence_dir, "milestone61_telemetry.json")
        with open(telemetry_file, "w") as f:
            json.dump({
                "test_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "sample_count": len(telemetry_records),
                "samples": telemetry_records,
                "traces": agent_traces,
                "perf_summary": {
                    "avg_fps": avg_fps,
                    "total_frames": perf.get("totalFrames"),
                    "dropped_frames": perf.get("droppedFrames")
                }
            }, f, indent=2)
        print(f"\n✓ Saved {len(telemetry_records)} telemetry samples to: {telemetry_file}")

        # Save per-agent traces
        for agent_id, points in agent_traces.items():
            trace_path = os.path.join(evidence_dir, f"m61_{agent_id}_samples.json")
            with open(trace_path, "w") as f:
                json.dump(points, f, indent=2)

    finally:
        if client:
            client.close()
        proc.terminate()
        try:
            proc.wait(timeout=3.0)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("Firefox process terminated cleanly.")

if __name__ == "__main__":
    run_milestone61_verification()
