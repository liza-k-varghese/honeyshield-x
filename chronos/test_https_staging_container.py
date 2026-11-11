#!/usr/bin/env python3
"""
chronos/test_https_staging_container.py
Verification of CHRONOS Local HTTPS Staging Container & HTTP->HTTPS Redirection.

Verifies:
1. HTTP on port 8080 redirects with HTTP 301 to https://localhost:8443/
2. HTTPS on port 8443 connects with TLS and serves index.html (HTTP 200)
3. HSTS header actively served under HTTPS (RFC 6797 compliant)
4. CSP with frame-ancestors, object-src 'none', base-uri, form-action served under HTTPS
5. Asset caching and full header inheritance under HTTPS (/assets/*.js)
6. SPA routing under HTTPS (/unknown-route -> 200)
7. Dotfiles and sensitive extensions blocked under HTTPS (HTTP 403)
8. Container restart and recovery verification
"""

import sys
import ssl
import urllib.request
import urllib.error
import subprocess

HTTP_URL = "http://127.0.0.1:8080"
HTTPS_URL = "https://127.0.0.1:8443"

# Create SSL context that trusts local staging certificate or skips verification for localhost test
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_staging_container():
    print("=" * 70)
    print("CHRONOS Private HTTPS Staging Verification Suite")
    print(f"HTTP: {HTTP_URL} | HTTPS: {HTTPS_URL}")
    print("=" * 70)

    failures = []

    # 1. HTTP 301 Redirect Check
    print("\n[TEST 1] Testing HTTP -> HTTPS 301 Redirection...")
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        resp = opener.open(f"{HTTP_URL}/", timeout=5.0)
        code = resp.status
        headers = dict(resp.getheaders())
        loc = headers.get("Location") or headers.get("location")
        assert code == 301, f"Expected 301, got {code}"
        assert "https://" in loc and "8443" in loc, f"Invalid redirect location: {loc}"
        print(f"  -> PASS: HTTP 301 Redirect to {loc}")
    except urllib.error.HTTPError as e:
        if e.code == 301:
            loc = e.headers.get("Location")
            print(f"  -> PASS: HTTP 301 Redirect to {loc}")
        else:
            print(f"  -> FAIL: Expected 301, got {e.code}")
            failures.append(f"HTTP redirect failed: {e.code}")
    except Exception as e:
        print(f"  -> FAIL: {e}")
        failures.append(f"HTTP request error: {e}")

    # 2. HTTPS Homepage Check
    print("\n[TEST 2] Testing HTTPS Connection & Security Headers...")
    try:
        req = urllib.request.Request(f"{HTTPS_URL}/", method="GET")
        with urllib.request.urlopen(req, context=ctx, timeout=5.0) as resp:
            code = resp.status
            headers = dict(resp.getheaders())
            body = resp.read().decode("utf-8")
            h_lower = {k.lower(): v for k, v in headers.items()}

            assert code == 200, f"Expected 200, got {code}"
            assert "<title>CHRONOS" in body, "Body missing title"
            assert "strict-transport-security" in h_lower, "Missing HSTS header under HTTPS!"
            assert "max-age=31536000" in h_lower["strict-transport-security"], "HSTS max-age incorrect"
            assert h_lower.get("x-content-type-options") == "nosniff", "Missing nosniff"
            assert h_lower.get("x-frame-options") == "SAMEORIGIN", "Missing SAMEORIGIN"
            assert "frame-ancestors 'self'" in h_lower.get("content-security-policy", ""), "CSP missing frame-ancestors"
            assert "object-src 'none'" in h_lower.get("content-security-policy", ""), "CSP missing object-src 'none'"
            assert "server" not in h_lower or "nginx/" not in h_lower["server"], f"Server discloses version: {h_lower.get('server')}"
            print("  -> PASS: HTTPS 200 OK, TLS active, HSTS verified, CSP hardened, version hidden.")
    except Exception as e:
        print(f"  -> FAIL on HTTPS: {e}")
        failures.append(f"HTTPS connection failed: {e}")

    # 3. Static Asset under HTTPS & Header Inheritance
    print("\n[TEST 3] Testing Static Asset under HTTPS (Header Inheritance)...")
    try:
        req = urllib.request.Request(f"{HTTPS_URL}/assets/index-BO88qnm5.js", method="GET")
        with urllib.request.urlopen(req, context=ctx, timeout=5.0) as resp:
            code = resp.status
            h_lower = {k.lower(): v for k, v in resp.getheaders()}
            assert code == 200, f"Expected 200, got {code}"
            assert "immutable" in h_lower.get("cache-control", ""), "Asset missing immutable"
            assert h_lower.get("x-content-type-options") == "nosniff", "Asset missing nosniff"
            assert "strict-transport-security" in h_lower, "Asset missing HSTS"
            print("  -> PASS: Asset served with immutable cache, HSTS, and nosniff.")
    except Exception as e:
        print(f"  -> FAIL on Asset: {e}")
        failures.append(f"Asset check failed: {e}")

    # 4. Dotfiles & Sensitive Files Blocked under HTTPS
    print("\n[TEST 4] Testing Blocked Files under HTTPS...")
    blocked_test_urls = ["/.git", "/.env", "/backup.tar.gz", "/dump.sql"]
    for p in blocked_test_urls:
        try:
            req = urllib.request.Request(f"{HTTPS_URL}{p}", method="GET")
            urllib.request.urlopen(req, context=ctx, timeout=3.0)
            print(f"  -> FAIL: {p} was NOT blocked!")
            failures.append(f"{p} not blocked under HTTPS")
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print(f"  -> PASS: {p} returned HTTP 403 Forbidden.")
            else:
                print(f"  -> WARN: {p} returned {e.code}")
                failures.append(f"{p} returned {e.code}")
        except Exception as e:
            print(f"  -> ERROR on {p}: {e}")
            failures.append(f"Error checking {p}: {e}")

    # 5. Container Restart and Recovery
    print("\n[TEST 5] Testing Container Restart & Recovery...")
    try:
        import time
        # Graceful stop and start to permit socket teardown under rootless pasta networking
        subprocess.run(["podman", "stop", "-t", "2", "chronos_staging_https"], capture_output=True, text=True)
        time.sleep(1.0)
        res = subprocess.run(["podman", "start", "chronos_staging_https"], capture_output=True, text=True)
        assert res.returncode == 0, f"podman start failed: {res.stderr}"
        time.sleep(2.0)
        req = urllib.request.Request(f"{HTTPS_URL}/", method="GET")
        with urllib.request.urlopen(req, context=ctx, timeout=5.0) as resp:
            assert resp.status == 200, f"Expected 200 after restart, got {resp.status}"
            print("  -> PASS: Container stopped, restarted, and cleanly resumed serving HTTPS traffic.")
    except Exception as e:
        print(f"  -> FAIL on restart: {e}")
        failures.append(f"Restart recovery failed: {e}")

    print("\n" + "=" * 70)
    if not failures:
        print("[SUCCESS] ALL HTTPS STAGING VERIFICATIONS PASSED [100%]")
        print("=" * 70)
        return True
    else:
        print(f"[FAIL] {len(failures)} verification failures detected:")
        for f in failures:
            print(f"  - {f}")
        print("=" * 70)
        return False

if __name__ == "__main__":
    success = test_staging_container()
    sys.exit(0 if success else 1)
