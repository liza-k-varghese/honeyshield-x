# HoneyShield X — Phase 4 Android Build Engineering & Configuration Report

**Document ID:** `HSX-DOC-P4-002`  
**Phase:** 4 — Android Release Engineering  
**Date:** 2026-11-04  
**Author:** Android Release Engineer & DevSecOps Lead  
**Classification:** Internal Technical Standard  

---

## 1. Overview

This document specifies the Android release engineering setup, build profiles, environment configuration, package identification, permissions, and native bridge configurations for HoneyShield X.

---

## 2. Android Manifest & Application Configuration

The primary configuration is defined in `mobile/app.json`:

```json
{
  "expo": {
    "name": "HoneyShield X",
    "slug": "honeyshield-x",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "scheme": "honeyshield",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#030712"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.honeyshield.soc"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#030712"
      },
      "package": "com.honeyshield.soc",
      "versionCode": 1,
      "minSdkVersion": 26,
      "targetSdkVersion": 34,
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        "android.permission.CAMERA",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.VIBRATE"
      ]
    },
    "plugins": [
      [
        "expo-local-authentication",
        {
          "faceDetectorSettings": {}
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#00f0ff"
        }
      ]
    ]
  }
}
```

### Key Parameters:
1. **Application Identifier:** `com.honeyshield.soc`
2. **Deep-Link Scheme:** `honeyshield://` (for QR device pairing `honeyshield://pairing?...`)
3. **Minimum SDK:** 26 (Android 8.0 Oreo), ensuring hardware keystore and biometric support.
4. **Target SDK:** 34 (Android 14).
5. **Permissions:**
   - `android.permission.CAMERA`: Required for QR code optical scanning.
   - `android.permission.POST_NOTIFICATIONS`: Android 13+ runtime push notifications.
   - `android.permission.USE_BIOMETRIC`: Hardware-backed local authentication.
   - `android.permission.INTERNET` & `ACCESS_NETWORK_STATE`: Encrypted WebSocket and API communication.

---

## 3. Expo Application Services (EAS) Build Profiles

Configured in `mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Profiles Overview:
- **`development`**: Generates debug build with Expo Development Client enabled for hot reloading and native module inspection.
- **`preview`**: Generates standalone `.apk` binaries for sideloading on testing devices and field deployment without Play Store dependency.
- **`production`**: Produces an optimized Android App Bundle (`.aab`) with ProGuard / R8 code shrinking and resource optimization.

---

## 4. Host Environment Audit & Physical Device Status

An audit of the build environment on the Linux host revealed:
- **Java Virtual Machine:** OpenJDK 25.0.4.1 installed at `/usr/lib/jvm/java-25-openjdk-amd64/bin/java`.
- **Android Debug Bridge (adb):** Not installed in host system PATH.
- **Gradle:** Not installed in host system PATH.
- **Physical Device:** **`NOT TESTED`**. No physical Android handset or emulator daemon is connected to this headless Linux workspace. All physical device items are formally designated as `NOT TESTED` in accordance with platform verification guidelines.

### Recommended Build Workflow:
For production binary generation, use EAS Cloud Build or execute within an Android SDK Docker container:
```bash
eas build --platform android --profile preview
```

