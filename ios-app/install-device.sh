#!/usr/bin/env bash
set -euo pipefail
APP="USDFirm"
DIR="$(cd "$(dirname "$0")" && pwd)"
DEV="00008120-00161D9C0A12201E"
CORE="51EC3EA5-693E-56E3-8D4E-0EAD752EF575"
xcodebuild \
  -project "$DIR/$APP.xcodeproj" \
  -scheme "$APP" \
  -configuration Release \
  -destination "id=$DEV" \
  -derivedDataPath "$DIR/build/DerivedDataDevice" \
  -allowProvisioningUpdates \
  build
PROD="$DIR/build/DerivedDataDevice/Build/Products"
xcrun devicectl device install app \
  --device "$CORE" \
  "$PROD/Release-iphoneos/$APP.app"
