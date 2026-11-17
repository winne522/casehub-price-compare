@echo off
setlocal
cd /d "%~dp0.."
echo ============================================
echo   PhoneCase Bot - install (run once)
echo ============================================

set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  where python >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY goto nopython
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
if errorlevel 1 goto nopython

rem .venv copied from another PC points to a missing Python -> delete it and rebuild
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys" >nul 2>nul
  if errorlevel 1 (
    echo Old .venv is broken ^(made on another PC^) - rebuilding ...
    rmdir /s /q ".venv"
  )
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python environment in .venv ...
  %PY% -m venv .venv
  if errorlevel 1 goto fail
)

echo Installing Playwright ...
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto fail

set "HASCHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "HASCHROME=1"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "HASCHROME=1"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "HASCHROME=1"
if defined HASCHROME goto chromeok
echo Google Chrome not found - downloading Chromium for the bot ...
".venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 goto fail
:chromeok

echo.
echo [OK] Install finished.
echo Next: double-click 2_login.bat and log in to Shopee once.
pause
exit /b 0

:nopython
echo [X] Python 3.9+ not found.
echo     Install it from https://www.python.org/downloads/
echo     and tick "Add python.exe to PATH", then run this file again.
pause
exit /b 1

:fail
echo [X] Install failed. Check your internet connection and run this file again.
pause
exit /b 1
