@echo off
echo.
echo   LinkLane - Native Host Installer (Windows)
echo   ============================================
echo.

:: ---- Python check / install ----
python --version >nul 2>&1
if errorlevel 1 (
  echo   Python not found. Attempting to install via winget...
  winget install --id Python.Python.3.12 --source winget --silent --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo   ERROR: Could not install Python automatically.
    echo   Please download and install Python 3.6+ from https://www.python.org
    echo   then re-run this script.
    pause
    exit /b 1
  )
  :: Refresh PATH for current session
  for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "PATH=%%b;%PATH%"
  echo   OK Python installed
) else (
  for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   OK %%v found
)
echo.

set SCRIPT_DIR=%USERPROFILE%\bin\linklane
set SCRIPT_PATH=%SCRIPT_DIR%\linklane_host.py
set MANIFEST_PATH=%SCRIPT_DIR%\linklane_host.json
set REG_KEY=HKCU\Software\Mozilla\NativeMessagingHosts\linklane_host
set HOST_SRC=%~dp0linklane_host.py

:: Create directory and copy files
if not exist "%SCRIPT_DIR%" mkdir "%SCRIPT_DIR%"
copy /Y "%HOST_SRC%" "%SCRIPT_PATH%" >nul
echo   OK Host script installed to %SCRIPT_PATH%

:: Create manifest
(
echo {
echo   "name": "linklane_host",
echo   "description": "LinkLane Native Host - Opens URLs in external browsers",
echo   "path": "%SCRIPT_PATH:\=\\%",
echo   "type": "stdio",
echo   "allowed_extensions": ["linklane@linklane"]
echo }
) > "%MANIFEST_PATH%"
echo   OK Manifest created at %MANIFEST_PATH%

:: Register in Windows Registry
reg add "%REG_KEY%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul
echo   OK Registry entry added

echo.
echo   Installation complete!
echo   Restart Firefox and open LinkLane settings to verify the connection.
echo.
pause
