# HoneyShield X — Milestone 18: APK Signing & Cryptographic Validation

## 1. Keystore Specifications
- **Keystore Path:** `mobile/keystores/honeyshield-debug.keystore`
- **Keystore Type:** PKCS12 / JKS
- **Key Algorithm:** RSA 2048-bit
- **Digest Algorithm:** SHA-256
- **Signature Algorithm:** `SHA256withRSA`
- **Alias:** `honeyshield_debug`
- **Validity:** 10,000 days
- **Distinguished Name:** `CN=HoneyShield X Debug, OU=Mobile SOC, O=HoneyShield, L=Berlin, ST=Berlin, C=DE`

## 2. Signature Verification
- Validated via `jarsigner -verify -verbose -certs`:
  ```
  jar verified.
  s   177320 Fri Nov 06 10:56:08 IST 2026 assets/index.android.bundle
  s     8432 Fri Nov 06 10:55:30 IST 2026 classes.dex
  s     2418 Fri Nov 06 07:06:00 IST 2026 AndroidManifest.xml
  ```
- All archive entries are correctly signed with SHA-256 digests matching `META-INF/MANIFEST.MF`.

## 3. Production Signing Distinction
- The debug keystore is strictly reserved for local testing and CI verification.
- **Part 3 Compliance:** No production release signing key has been created or uploaded to third-party services. Production signing remains strictly under operator control.

