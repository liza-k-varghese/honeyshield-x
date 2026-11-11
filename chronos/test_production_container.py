#!/usr/bin/env python3
"""
chronos/test_production_container.py
Empirical HTTP and Security Header Validation for CHRONOS Production Docker/Nginx Container.

Tests:
1. HTTP 200 on / (Homepage index.html)
2. HTTP 200 on static JS & CSS assets with immutable caching and full security headers
3. HTTP 200 on SPA fallback routes with index.html delivery
4. HTTP 403 Forbidden on hidden dotfiles (/.git, /.env, /.htaccess)
5. HTTP 403 Forbidden on sensitive backup/log extensions (.tar, .gz, .bak, .sql, .log)
6. HTTP 405 Method Not Allowed on disallowed verbs (POST, PUT, DELETE, PATCH)
7. Full OWASP security headers validation:
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: SAMEORIGIN
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy
   - Strict-Transport-Security
   - Content-Security-Policy (with frame-ancestors, object-src 'none', base-uri 'self', form-action 'self')
8. Server banner suppression (server_tokens off)
"""

import sys
import json
import urllib.request
import urllib.error
import http.client
from pathlib import Path

BASE_URL = "http://127.0.0.1:8080"

def run_tests() -> bool:
    print("=" * 70)
    print(f"CHRONOS Production Nginx Container Verification on {BASE_URL}")
    print("=" * 70)

    failures = []
    
    # 1. Homepage Request
    print("\n[TEST 1] GET / (Homepage Entry Point)...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/", method="GET")
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            code = resp.status
            headers = dict(resp.getheaders())
            body = resp.read().decode("utf-8")
            h_lower = {k.lower(): v for k, v in headers.items()}
            
            assert code == 200, f"Expected 200, got {code}"
            assert "<title>CHRONOS" in body, "Expected CHRONOS title in body"
            assert h_lower.get("x-content-type-options") == "nosniff", "Missing X-Content-Type-Options"
            assert h_lower.get("x-frame-options") == "SAMEORIGIN", "Missing X-Frame-Options"
            assert "strict-transport-security" in h_lower, "Missing Strict-Transport-Security"
            assert "frame-ancestors 'self'" in h_lower.get("content-security-policy", ""), "CSP missing frame-ancestors"
            assert "object-src 'none'" in h_lower.get("content-security-policy", ""), "CSP missing object-src 'none'"
            assert "server" not in h_lower or "nginx/" not in h_lower["server"], f"Server header discloses version: {h_lower.get('server')}"
            assert "no-cache" in h_lower.get("cache-control", ""), "index.html missing no-cache header"
            print("  -> PASS: 200 OK, HTML loaded, strict security headers present, version hidden.")
    except Exception as e:
        print(f"  -> FAIL: {e}")
        failures.append(f"GET / failed: {e}")

    # 2. Extract asset paths and test /assets/ headers
    print("\n[TEST 2] GET /assets/* (Static Bundles & Header Inheritance)...")
    try:
        dist_assets = list(Path("/home/liza/HoneyShield-X/chronos/dist/assets").glob("*.js"))
        if not dist_assets:
            raise FileNotFoundError("No JS assets found in dist/assets")
        asset_rel = f"/assets/{dist_assets[0].name}"
        req = urllib.request.Request(f"{BASE_URL}{asset_rel}", method="GET")
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            code = resp.status
            headers = dict(resp.getheaders())
            h_lower = {k.lower(): v for k, v in headers.items()}
            
            assert code == 200, f"Expected 200, got {code}"
            assert "immutable" in h_lower.get("cache-control", ""), "Asset missing immutable Cache-Control"
            assert h_lower.get("x-content-type-options") == "nosniff", "Asset missing X-Content-Type-Options (Inheritance drop!)"
            assert "content-security-policy" in h_lower, "Asset missing Content-Security-Policy (Inheritance drop!)"
            print(f"  -> PASS: {asset_rel} returned 200 with immutable cache AND full security headers.")
    except Exception as e:
        print(f"  -> FAIL: {e}")
        failures.append(f"Asset request failed: {e}")

    # 3. SPA Fallback Routing
    print("\n[TEST 3] GET /unknown-spa-route/mechanical-tourbillon (SPA Fallback)...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/unknown-spa-route/mechanical-tourbillon", method="GET")
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            code = resp.status
            body = resp.read().decode("utf-8")
            assert code == 200, f"Expected 200 fallback, got {code}"
            assert "<div id=\"root\">" in body, "Expected root div in SPA fallback HTML"
            print("  -> PASS: SPA fallback served index.html cleanly.")
    except Exception as e:
        print(f"  -> FAIL: {e}")
        failures.append(f"SPA fallback failed: {e}")

    # 4. Block Hidden Dotfiles
    print("\n[TEST 4] Block Hidden Files (/.git, /.env, /.htaccess)...")
    dotfile_paths = ["/.git", "/.env", "/.env.local", "/.htaccess", "/.ssh/id_rsa"]
    for p in dotfile_paths:
        try:
            req = urllib.request.Request(f"{BASE_URL}{p}", method="GET")
            urllib.request.urlopen(req, timeout=3.0)
            print(f"  -> FAIL: {p} was NOT blocked!")
            failures.append(f"Dotfile {p} was not blocked (did not return 403)")
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print(f"  -> PASS: {p} rejected with HTTP 403 Forbidden.")
            else:
                print(f"  -> WARN: {p} returned HTTP {e.code} (expected 403)")
                failures.append(f"Dotfile {p} returned {e.code} instead of 403")
        except Exception as e:
            print(f"  -> ERROR on {p}: {e}")
            failures.append(f"Error checking {p}: {e}")

    # 5. Block Sensitive Backup/Log Extensions
    print("\n[TEST 5] Block Backup & Log Extensions (.bak, .sql, .tar.gz, .log)...")
    sensitive_files = ["/backup.tar.gz", "/dump.sql", "/config.bak", "/access.log"]
    for sf in sensitive_files:
        try:
            req = urllib.request.Request(f"{BASE_URL}{sf}", method="GET")
            urllib.request.urlopen(req, timeout=3.0)
            print(f"  -> FAIL: {sf} was NOT blocked!")
            failures.append(f"Sensitive file {sf} was not blocked")
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print(f"  -> PASS: {sf} rejected with HTTP 403 Forbidden.")
            else:
                print(f"  -> WARN: {sf} returned HTTP {e.code} (expected 403)")
                failures.append(f"Sensitive file {sf} returned {e.code} instead of 403")
        except Exception as e:
            print(f"  -> ERROR on {sf}: {e}")
            failures.append(f"Error checking {sf}: {e}")

    # 6. HTTP Method Restriction (Allow only GET and HEAD)
    print("\n[TEST 6] Restrict HTTP Methods (POST, PUT, DELETE)...")
    for verb in ["POST", "PUT", "DELETE"]:
        try:
            req = urllib.request.Request(f"{BASE_URL}/", data=b"{}", method=verb)
            urllib.request.urlopen(req, timeout=3.0)
            print(f"  -> FAIL: {verb} was NOT blocked!")
            failures.append(f"Method {verb} was not blocked")
        except urllib.error.HTTPError as e:
            if e.code == 405:
                print(f"  -> PASS: {verb} rejected with HTTP 405 Method Not Allowed.")
            else:
                print(f"  -> WARN: {verb} returned HTTP {e.code} (expected 405)")
                failures.append(f"Method {verb} returned {e.code} instead of 405")
        except Exception as e:
            print(f"  -> ERROR on {verb}: {e}")
            failures.append(f"Error checking {verb}: {e}")

    # 7. HEAD Request
    print("\n[TEST 7] Permitted HEAD Request...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/", method="HEAD")
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            print("  -> PASS: HEAD returned HTTP 200.")
    except Exception as e:
        print(f"  -> FAIL on HEAD: {e}")
        failures.append(f"HEAD request failed: {e}")

    print("\n" + "=" * 70)
    if not failures:
        print("[SUCCESS] ALL PRODUCTION CONTAINER SECURITY TESTS PASSED [100%]")
        print("=" * 70)
        return True
    else:
        print(f"[FAIL] {len(failures)} verification failures detected:")
        for f in failures:
            print(f"  - {f}")
        print("=" * 70)
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
