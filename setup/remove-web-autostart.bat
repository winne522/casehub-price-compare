@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-web-autostart.ps1" -Remove
pause
