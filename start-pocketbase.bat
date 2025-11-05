@echo off
REM Start PocketBase for GameV1 Native Deployment

echo 🚀 Starting PocketBase for GameV1...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "POCKETBASE_DIR=pocketbase-native"
set "POCKETBASE_CONFIG=config\pocketbase-config.json"

REM Check if PocketBase exists
if not exist "%POCKETBASE_DIR%\pocketbase.exe" (
    echo %RED%✗ PocketBase not found!%NC%
    echo Please run: setup-pocketbase-native.bat
    pause
    exit /b 1
)

REM Check if config exists
if not exist "%POCKETBASE_CONFIG%" (
    echo %RED%✗ PocketBase configuration not found!%NC%
    echo Please run: setup-pocketbase-native.bat
    pause
    exit /b 1
)

echo %BLUE%Starting PocketBase on port 8090...%NC%
echo %YELLOW%Admin Panel: http://localhost:8090/_/%NC%
echo %YELLOW%API: http://localhost:8090/api/%NC%
echo %YELLOW%Press Ctrl+C to stop%NC%
echo.

REM Start PocketBase
cd "%POCKETBASE_DIR%"
start "PocketBase - GameV1 Database" /B .\pocketbase.exe serve --config=../%POCKETBASE_CONFIG%

echo.
echo %GREEN%✓ PocketBase started successfully!%NC%
echo %BLUE%Check logs: tail -f logs/pocketbase.log%NC%
echo.
pause
