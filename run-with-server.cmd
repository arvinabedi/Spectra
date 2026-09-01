@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
rem ===========================================================
rem  Fallback launcher - serves the app on http://127.0.0.1:8081
rem  Only needed if the direct launcher misbehaves (a few
rem  locked-down browsers restrict file:// pages).
rem  Requires Python. Close this window to stop the server.
rem ===========================================================
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo Python was not found on this system.
  echo Use run.cmd instead - the direct launcher, which
  echo needs nothing installed.
  echo.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8081/index.html"
python "%~dp0tools\serve.py"
