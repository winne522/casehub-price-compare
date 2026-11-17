@echo off
setlocal
cd /d "%~dp0.."
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
if not exist ".venv\Scripts\python.exe" (
  echo Run 1_setup/1_install.bat first.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" import_links.py
if errorlevel 1 (
  echo.
  echo [X] Import failed - see the message above.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/publish_to_site.ps1"
echo.
echo Done. Open index.html (project root) to see the result.
pause
