@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/publish_to_site.ps1"
set "RC=%errorlevel%"
echo.
if "%RC%"=="0" echo Open index.html (project root) to see the result.
pause
exit /b %RC%
