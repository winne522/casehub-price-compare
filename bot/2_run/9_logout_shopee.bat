@echo off
setlocal
cd /d "%~dp0.."
set "PYTHONUTF8=1"
if not exist ".venv\Scripts\python.exe" (
  echo Run 1_setup\1_install.bat first.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" scripts\logout_shopee.py
echo.
pause
