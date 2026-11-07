#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [[ ! -d "$SDK/platforms/android-36" && ! -f "$ROOT/android/local.properties" ]]; then
  printf '%s\n' '无法打包：未找到 Android 36 SDK。' '请通过 Android Studio 安装 Android SDK Platform 36 与 Build Tools，并确认 SDK 许可。' '然后设置 ANDROID_HOME，或在 android/local.properties 中配置 sdk.dir，再运行 npm run android:apk。' >&2
  exit 1
fi
if [[ -d "$SDK" ]]; then export ANDROID_HOME="$SDK"; fi
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT/build/gradle-home}"
cd "$ROOT"
npm run sync
cd "$ROOT/android"
./gradlew --no-daemon testDebugUnitTest assembleDebug
printf '\nAPK: %s\n' "$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"