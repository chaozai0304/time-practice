#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
npm run sync
mkdir -p "$ROOT/build/ios"
# An unsigned archive is intentionally not called an installable IPA.
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -arch arm64 -archivePath "$ROOT/build/ios/Sprout-UNSIGNED.xcarchive" \
  -derivedDataPath "$ROOT/build/ios/DerivedData" \
  CODE_SIGNING_ALLOWED=NO SKIP_INSTALL=NO archive
printf '\n%s\n' '待签名归档：build/ios/Sprout-UNSIGNED.xcarchive' '这不是可直接安装的 IPA。请在 Xcode 中配置 Apple Team 与描述文件后 Archive / Distribute。'