@echo off
rem ===========================================================
rem  Spectral Structure Determination - Android APK builder
rem  Builds an installable .apk right next to this file.
rem  Needs JDK 17 + Android SDK + Gradle.
rem  See ANDROID.md next to this file.
rem  Just double-click this file.
rem ===========================================================
cd /d "%~dp0"
node tools/build-android.js
if errorlevel 1 (
  echo.
  echo Build FAILED - see the messages above.
)
echo.
pause
