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
".venv\Scripts\python.exe" bot.py --login
pause
