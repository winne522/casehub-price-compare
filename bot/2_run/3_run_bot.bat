@echo off
setlocal
cd /d "%~dp0.."
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
if not exist ".venv\Scripts\python.exe" (
  echo Run 1_setup/1_install.bat first.
  if /i not "%~1"=="--scheduled" pause
  exit /b 1
)
".venv\Scripts\python.exe" bot.py %*
set "RC=%errorlevel%"
rem Close the bot Chrome when the run ended normally (kept open if Shopee asked for verify, so you can confirm it by hand).
if "%RC%"=="0" node "%~dp0..\scripts\close_chrome.js" shopee
if "%RC%"=="0" call :publish
if "%RC%"=="2" call :publish
if /i "%~1"=="--scheduled" exit /b %RC%
echo.
if "%RC%"=="0" echo [OK] Done. Results: data\products.json and data\products_all.csv
if "%RC%"=="2" echo [!] Stopped early - see the message above. Partial results were saved.
if "%RC%"=="1" echo [X] Error - see the newest file in the logs folder.
pause
exit /b %RC%

:publish
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/publish_to_site.ps1"
exit /b 0
