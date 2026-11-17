@echo off
setlocal
cd /d "%~dp0.."
chcp 65001 >nul
rem Runs the bot a few times (max 4 rounds, 30-60 min apart) until every product has an image. Create bot\STOP.txt to stop it.
rem Stops immediately if Shopee blocks the bot (no retry). Optional lockout after a block: add -CooldownHours 12 to the command below.
if exist STOP.txt del STOP.txt
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/run_until_done.ps1"
if not errorlevel 1 node "%~dp0..\scripts\close_chrome.js" shopee
echo.
pause
