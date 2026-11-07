# HoneyShield X — Milestone 18: Gradle Build Pipeline & Configuration

## 1. Build Configuration Architecture
The native Android build configuration established in `mobile/android/` adheres to Google's official Android Gradle Plugin (AGP) guidelines:

```
mobile/android/
├── settings.gradle                  # Defines root project and ':app' module
├── build.gradle                     # Project buildscript with AGP 8.3.2 and Kotlin 1.9.24
├── gradle.properties                # JVM memory allocation (-Xmx2048m) and AndroidX flags
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties # Gradle 8.4 binary distribution URL
└── app/
    ├── build.gradle                 # Application module applying 'com.android.application'
    └── src/main/
        ├── AndroidManifest.xml      # Full permissions, deep links, activities
        ├── java/                    # Native security enclave and sync service code
        └── res/                     # Application strings, styles, and icons
```

## 2. Supported Build Commands
In an environment provisioned with Android SDK 34:
- Assembling Debug APK:
  ```bash
  cd mobile/android
  ./gradlew :app:assembleDebug
  ```
- Running Unit Tests:
  ```bash
  ./gradlew :app:testDebugUnitTest
  ```
- Analyzing Manifest and Resource Linking:
  ```bash
  ./gradlew :app:processDebugResources
  ```

## 3. Host Compilation Feasibility
- Host system has OpenJDK 21/25 installed.
- Host system lacks Android SDK platform libraries (`platforms/android-34/android.jar`) and `aapt2` binary.
- Standalone execution on host container is gated on SDK availability.

