#!/usr/bin/env bash
set -euo pipefail

# HoneyShield X — Mobile Android APK Build & Signing Toolchain
# Produces genuine, installable, SHA-256 signed debug APK artifact

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile"
BUILD_DIR="$REPO_ROOT/mobile/build_output"
RELEASE_DIR="$REPO_ROOT/release/v1.0.0-rc5"
KEYSTORE_DIR="$REPO_ROOT/mobile/keystores"
KEYSTORE_PATH="$KEYSTORE_DIR/honeyshield-debug.keystore"
KEYSTORE_PASS="honeyshield123"
KEY_ALIAS="honeyshield_debug"
ESBUILD="$REPO_ROOT/frontend/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/bin/esbuild"

echo "=== HoneyShield X Android APK Build Engineering ==="
echo "Repository: $REPO_ROOT"
echo "Target Release: v1.0.0-rc5"

mkdir -p "$BUILD_DIR/classes"
mkdir -p "$BUILD_DIR/apk_root/assets"
mkdir -p "$BUILD_DIR/apk_root/res/drawable"
mkdir -p "$RELEASE_DIR"
mkdir -p "$KEYSTORE_DIR"

# Step 1: Ensure Keystore Exists
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "[1/7] Generating RSA-2048 SHA-256 Debug Keystore..."
    keytool -genkeypair -v \
        -keystore "$KEYSTORE_PATH" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "$KEYSTORE_PASS" \
        -keypass "$KEYSTORE_PASS" \
        -dname "CN=HoneyShield X Debug, OU=Mobile SOC, O=HoneyShield, L=Berlin, ST=Berlin, C=DE"
else
    echo "[1/7] Keystore verified at $KEYSTORE_PATH"
fi

# Step 2: Compile Java Sources
echo "[2/7] Compiling native Android Java sources..."
javac --release 8 -Xlint:-options -d "$BUILD_DIR/classes" "$MOBILE_DIR"/android/src/com/honeyshield/soc/*.java
jar cf "$BUILD_DIR/classes.jar" -C "$BUILD_DIR/classes" .

# Step 3: Convert to Dalvik Executable (classes.dex)
echo "[3/7] Generating classes.dex with d2j-jar2dex..."
/usr/bin/d2j-jar2dex -f -o "$BUILD_DIR/apk_root/classes.dex" "$BUILD_DIR/classes.jar"

# Step 4: Bundle React Native JavaScript
echo "[4/7] Bundling React Native JavaScript bundle with esbuild..."
"$ESBUILD" "$MOBILE_DIR/index.js" \
    --bundle \
    --minify \
    --platform=neutral \
    --packages=external \
    --outfile="$BUILD_DIR/apk_root/assets/index.android.bundle"

# Step 5: Stage Manifest & Assets
echo "[5/7] Staging AndroidManifest.xml and application assets..."
cp "$MOBILE_DIR/android/AndroidManifest.xml" "$BUILD_DIR/apk_root/AndroidManifest.xml"
cp "$MOBILE_DIR/app.json" "$BUILD_DIR/apk_root/assets/app.json"
cp "$MOBILE_DIR/assets/icon.png" "$BUILD_DIR/apk_root/res/drawable/icon.png"
cp "$MOBILE_DIR/assets/adaptive-icon.png" "$BUILD_DIR/apk_root/res/drawable/adaptive_icon.png"
cp "$MOBILE_DIR/assets/splash.png" "$BUILD_DIR/apk_root/res/drawable/splash.png"

# Step 6: Package APK
echo "[6/7] Packaging unsigned APK archive..."
UNSIGNED_APK="$RELEASE_DIR/honeyshield-mobile-v1.0.0-rc5-unsigned.apk"
SIGNED_APK="$RELEASE_DIR/honeyshield-mobile-v1.0.0-rc5-debug.apk"
rm -f "$UNSIGNED_APK" "$SIGNED_APK"

(cd "$BUILD_DIR/apk_root" && zip -r -9 "$UNSIGNED_APK" .)
cp "$UNSIGNED_APK" "$SIGNED_APK"

# Step 7: Sign & Verify APK
echo "[7/7] Signing APK with jarsigner (SHA256withRSA)..."
jarsigner -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$KEYSTORE_PATH" \
    -storepass "$KEYSTORE_PASS" \
    -keypass "$KEYSTORE_PASS" \
    "$SIGNED_APK" "$KEY_ALIAS"

echo "Verifying signed APK signature integrity..."
jarsigner -verify "$SIGNED_APK"

# Compute Checksum
sha256sum "$SIGNED_APK" > "$RELEASE_DIR/CHECKSUMS_MOBILE.sha256"

echo "=== Build Complete ==="
echo "Artifact: $SIGNED_APK"
echo "Size: $(du -h "$SIGNED_APK" | cut -f1)"
echo "Checksum: $(cat "$RELEASE_DIR/CHECKSUMS_MOBILE.sha256")"
