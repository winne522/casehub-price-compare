@echo off
setlocal
cd /d "%~dp0.."
set "PYTHONUTF8=1"
if not exist ".venv\Scripts\python.exe" (
  echo Run 1_setup\1_install.bat first.
  pause
  exit /b 1
)
rem Two jobs in one run, same bot Chrome, slow pace:
rem  1) Collect accessory images, 15 items per tab (extra arguments go to this step, e.g. --force).
rem  2) Read product OPTIONS (phone models the shop really sells + colors) for 8 products
rem     -> data\options.json and ..\assets\options.js (website shows "confirmed model").
rem Step 2 runs only when step 1 finished without a block.
rem If Shopee asks to verify: confirm it yourself in the bot Chrome window (the bot never clicks it).
echo === Step 1/2: accessory images ===
".venv\Scripts\python.exe" -u -W ignore scripts\fetch_film_images.py --max 150 --round 15 %*
set "RC=%errorlevel%"
if not "%RC%"=="0" goto done
echo.
echo === Step 2/2: product options (models + colors) ===
".venv\Scripts\python.exe" -u -W ignore scripts\fetch_options.py --limit 8
set "RC=%errorlevel%"
:done
if "%RC%"=="0" node "%~dp0..\scripts\close_chrome.js" shopee
echo.
pause
