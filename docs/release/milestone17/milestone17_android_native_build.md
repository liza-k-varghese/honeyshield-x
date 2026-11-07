# Milestone 17 — Android Native Gradle Build Engineering

## 1. Project Restructuring
In Milestone 17, the Android native configuration was refactored into standard Gradle project architecture:
```
mobile/android/
├── build.gradle
├── gradle.properties
├── settings.gradle
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
└── app/
    ├── build.gradle
    └── src/
        └── main/
            ├── AndroidManifest.xml
            ├── java/
            │   └── com/honeyshield/soc/
            │       ├── DigitalAgentSyncService.java
            │       ├── GovernorContainmentBridge.java
            │       ├── HoneyShieldApplication.java
            │       ├── MainActivity.java
            │       └── SecurityEnclaveHelper.java
            └── res/
                ├── drawable/ (icon.png, adaptive_icon.png, splash.png)
                └── values/ (strings.xml, styles.xml)
```

## 2. Standard Native Build Command
With the standardized Gradle structure, any Android SDK build environment executes:
```bash
cd mobile/android
./gradlew :app:assembleDebug
```
This produces a fully compiled, AAPT2-processed binary APK with valid binary AXML, `resources.arsc`, and compiled DEX bytecode.

## 3. Host Environment Gating
Because the local Parrot OS host lacks `aapt` and `android.jar`, local execution of AAPT resource linking is blocked. Track C is classified as **PARTIAL (Native Gradle Project Structured & Validated; AXML Compilation Requires SDK Environment)**.

