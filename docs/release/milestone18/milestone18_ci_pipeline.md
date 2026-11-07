# HoneyShield X — Milestone 18: Android CI Build Pipeline Specification

## 1. Pipeline Definition
The Android native build pipeline is defined in `.github/workflows/android-build.yml` for execution in a controlled CI runner equipped with Android SDK 34.

## 2. Pipeline Execution Stages
1. **Checkout:** Clones verified commit revision.
2. **JDK Setup:** Configures OpenJDK 21 via `actions/setup-java`.
3. **Android SDK Resolution:** Installs `platforms;android-34`, `build-tools;34.0.0`, and `cmdline-tools;latest` via `android-actions/setup-android`.
4. **Mobile Type Check:** Runs `tsc --noEmit` inside `mobile/`.
5. **Asset Bundling:** Bundles React Native JavaScript into `index.android.bundle` via `esbuild`.
6. **Gradle Compilation:** Executes `./gradlew :app:assembleDebug --stacktrace --no-daemon`.
7. **Package Forensics:**
   - Evaluates package name, SDK versions, and launch activity via `aapt dump badging`.
   - Verifies APK signature via `apksigner verify --verbose`.
   - Generates SHA-256 checksum file.
8. **Artifact Archiving:** Uploads debug APK to workflow artifacts (retention 14 days).

## 3. Publication Guard
The pipeline does not configure automatic Google Play Store publishing or release tagging. Artifact release remains strictly under manual operator control.

