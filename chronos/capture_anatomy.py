#!/usr/bin/env python3
import os, time, json, base64, socket, subprocess

class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=2830):
        self.s = socket.socket()
        self.s.connect((host, port))
        self.banner = self.s.recv(1024)
        self.msg_id = 0

    def send(self, cmd, params=None):
        if params is None: params = {}
        self.msg_id += 1
        payload = json.dumps([0, self.msg_id, cmd, params])
        self.s.sendall(f"{len(payload)}:{payload}".encode("utf-8"))
        header = b""
        while b":" not in header: header += self.s.recv(1)
        length = int(header.rstrip(b":"))
        body = b""
        while len(body) < length:
            chunk = self.s.recv(min(4096, length - len(body)))
            if not chunk: break
            body += chunk
        return json.loads(body.decode("utf-8"))

    def execute_script(self, script, args=None):
        if args is None: args = []
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
        try: self.s.close()
        except: pass

profile_dir = "/tmp/firefox_chronos_marionette"
proc = subprocess.Popen([
    "firefox", "--headless", "--no-remote",
    "-profile", profile_dir,
    "--marionette"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    time.sleep(2.0)
    client = MarionetteClient(port=2830)
    client.send("WebDriver:NewSession", {})
    client.send("WebDriver:SetWindowRect", {"width": 1440, "height": 900})
    client.send("WebDriver:Navigate", {"url": "http://127.0.0.1:5175/"})
    time.sleep(2.0)
    client.execute_script("""
        const btns = Array.from(document.querySelectorAll('button'));
        const anatBtn = btns.find(b => b.textContent.includes('3D Anatomy'));
        if (anatBtn) anatBtn.click();
    """)
    time.sleep(2.5)
    client.execute_script("document.querySelector('canvas').scrollIntoView({ block: 'center' });")
    time.sleep(1.0)
    png = client.take_screenshot()
    if png:
        with open("/home/liza/HoneyShield-X/chronos/screenshots/tab_anatomy.png", "wb") as f:
            f.write(png)
        print("Anatomy screenshot saved.")
    client.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=3)
    except: proc.kill()
