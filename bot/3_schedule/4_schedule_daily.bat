@echo off
setlocal
cd /d "%~dp0.."
set "RUNAT=%~1"
if "%RUNAT%"=="" set /p "RUNAT=Run the bot every day at (HH:MM) [08:47]: "
if "%RUNAT%"=="" set "RUNAT=08:47"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0../scripts/schedule.ps1" -Time "%RUNAT%"
if errorlevel 1 (
  echo [X] Could not create the scheduled task.
  pause
  exit /b 1
)
echo.
echo Notes:
echo  - The computer must be on and you must be logged in to Windows.
echo  - If the computer was off at that time, it runs as soon as you log in.
echo  - A browser window will open while it runs. Do not close it.
echo  - To stop the schedule, run 5_remove_schedule.bat
pause
