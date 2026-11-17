@echo off
chcp 65001 >nul
title Site visitors and buy clicks
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0track-report.ps1" %*
if errorlevel 1 (
  echo.
  echo [!] script did not finish cleanly - copy the text above to Claude
  pause
)
