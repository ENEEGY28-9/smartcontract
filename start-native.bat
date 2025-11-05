@echo off
REM Start GameV1 Native Services (without Docker)
REM This script starts the Rust services directly

echo 🚀 Starting GameV1 Native Services...

REM Colors for output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Check if binaries exist
echo %BLUE%1. Checking binaries...%NC%
if not exist "target\release\worker.exe" (
    echo %RED%✗ Worker binary not found. Please build the project first.%NC%
    echo Run: cargo build --release
    pause
    exit /b 1
)

if not exist "target\release\room-manager.exe" (
    echo %RED%✗ Room Manager binary not found. Please build the project first.%NC%
    echo Run: cargo build --release
    pause
    exit /b 1
)

if not exist "target\release\gateway.exe" (
    echo %RED%✗ Gateway binary not found. Please build the project first.%NC%
    echo Run: cargo build --release
    pause
    exit /b 1
)

echo %GREEN%✓ All binaries found%NC%

echo.
echo %BLUE%2. Starting Database Services...%NC%
echo %YELLOW%Note: PocketBase and Redis need to be installed separately%NC%
echo.

REM Check if PocketBase is running
curl -f http://localhost:8090/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  PocketBase not detected on localhost:8090%NC%
    echo Please start PocketBase: https://pocketbase.io/
    echo Or use Docker: docker compose up -d gamev1-pocketbase
) else (
    echo %GREEN%✓ PocketBase is running%NC%
)

REM Check if Redis is running
netstat -ano | findstr "LISTENING" | findstr "6379" >nul
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  Redis not detected on localhost:6379%NC%
    echo Please start Redis: https://redis.io/
    echo Or use Docker: docker compose up -d gamev1-redis
) else (
    echo %GREEN%✓ Redis is running%NC%
)

echo.
echo %BLUE%3. Starting Application Services...%NC%

REM Start Worker (background service)
echo Starting Worker...
start "GameV1 Worker" /B .\target\release\worker.exe

REM Wait for worker to start
echo Waiting for Worker to initialize...
timeout /t 5 /nobreak >nul

REM Start Room Manager
echo Starting Room Manager...
start "Room Manager" /B .\target\release\room-manager.exe

REM Wait for room manager
echo Waiting for Room Manager to initialize...
timeout /t 5 /nobreak >nul

REM Start Gateway (foreground - will show logs)
echo Starting Gateway...
echo %BLUE%Gateway logs will appear below. Press Ctrl+C to stop.%NC%
echo.

.\target\release\gateway.exe

echo.
echo %YELLOW%Gateway stopped. Other services may still be running in background.%NC%
echo To stop all services: taskkill /IM worker.exe /F && taskkill /IM room-manager.exe /F

echo.
echo %BLUE%Manual Testing:%NC%
echo curl http://localhost:8080/healthz
echo curl http://localhost:3100/metrics
echo curl http://localhost:3201/metrics
