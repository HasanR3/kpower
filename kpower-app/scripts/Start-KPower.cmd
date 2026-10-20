@echo off
setlocal
cd /d "%~dp0\.."

set "NODE_EXE=%CD%\runtime\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>&1
  if errorlevel 1 (
    echo Node runtime missing. Reinstall KPower.
    pause
    exit /b 1
  )
  for /f "delims=" %%i in ('where node') do (
    set "NODE_EXE=%%i"
    goto :have_node
  )
)
:have_node

if not exist "dist\index.html" (
  echo Missing dist\ - reinstall KPower.
  pause
  exit /b 1
)

set "NODE_PATH=%CD%\node_modules"
set "PATH=%CD%\runtime;%PATH%"

start "KPower HID Bridge" /min "%NODE_EXE%" "scripts\ups-hid-bridge.mjs"
timeout /t 2 /nobreak >nul
start "KPower UI" /min "%NODE_EXE%" "scripts\serve-ui.mjs"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:1420"
echo KPower started - UI http://127.0.0.1:1420  HID http://127.0.0.1:3921
endlocal
