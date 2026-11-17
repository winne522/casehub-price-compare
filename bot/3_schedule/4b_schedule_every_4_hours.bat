@echo off
setlocal
cd /d "%~dp0.."
set "HOURS=%~1"
if "%HOURS%"=="" set "HOURS=4"
rem Replaces the daily task from 4_schedule_daily.bat (same task name). Each run opens up to ~28 Shopee pages (about 7 minutes).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/schedule.ps1" -Time "00:15" -EveryHours %HOURS%
if errorlevel 1 (
  echo [X] Could not create the scheduled task.
  pause
  exit /b 1
)
echo.
echo Notes:
echo  - The bot runs every %HOURS% hours while the computer is on and you are logged in to Windows.
echo  - A Chrome window opens while it runs. Do not use or close it during the run.
echo  - Each run checks the 24 products in feed_catalog that were checked longest ago, then publishes to the site.
echo  - To stop: run 5_remove_schedule.bat
pause
