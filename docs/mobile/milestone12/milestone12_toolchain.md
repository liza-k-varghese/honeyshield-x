# Milestone 12 — Mobile Build Toolchain & Environment

**Document:** `milestone12_toolchain.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Environment:** Parrot OS Linux 6.12.33, KDE Plasma 6.3.2, Wayland  

---

## 1. Toolchain Components & Versions

| Tool | Version / Path | Purpose |
|---|---|---|
| **Node.js** | `v20.19.2` (`/bin/node`) | JavaScript runtime engine |
| **npm** | `10.8.2` (via workspace wrapper `scripts/bin/npm`) | Package manager launcher |
| **pnpm** | `9.15.0` (via workspace wrapper `scripts/bin/pnpm`) | Monorepo package manager |
| **JDK (Java)** | OpenJDK 25.0.4.1 (`/usr/bin/javac`, `jar`) | Native Java source compilation |
| **Android DX Tool** | `dex2jar 2.4` / `d2j-jar2dex` (`/usr/bin/d2j-jar2dex`) | Converts Java bytecode to Dalvik Executable (`classes.dex`) |
| **JavaScript Bundler** | `esbuild 0.25.12` | Bundles React Native code to `assets/index.android.bundle` |
| **APK Packager** | `zip 3.0` (`/usr/bin/zip`) | Packages APK zip archive |
| **Signer & Verification**| `jarsigner` / `keytool` (OpenJDK 25) | Generates RSA-2048 SHA-256 certificate and signs APK |

## 2. Toolchain Issue Resolution

- **Issue:** System `npm`/`npx` symlink wrappers attempted to locate `node_modules` relative to `/bin`, triggering `Cannot find module '/bin/node_modules/npm/bin/npm-prefix.js'`.
- **Resolution:** Authored clean workspace binary wrappers at `scripts/bin/npm`, `scripts/bin/npx`, and `scripts/bin/pnpm` invoking corepack cached CLIs directly.
- **Java 25 invokedynamic Compatibility:** OpenJDK 25 emits `invokedynamic` instructions for string concatenations and lambdas by default, which Android DX pre-D8 rejects. Java native source was compiled with `javac --release 8 -Xlint:-options` using classic atomic loops, guaranteeing complete Dalvik DEX bytecode compliance.

