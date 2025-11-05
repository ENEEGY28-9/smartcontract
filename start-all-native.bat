@echo off
REM GameV1 Complete Native Deployment Startup Script
REM Starts all services in correct order for native deployment

echo 🚀 Starting GameV1 Complete Native Deployment...
echo.

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "POCKETBASE_DIR=pocketbase-native"
set "REDIS_DIR=redis-native"
set "PROD_DIR=target\production"

echo %BLUE%1. Checking prerequisites...%NC%

REM Check if binaries are built
if not exist "target\release\gateway.exe" (
    echo %RED%✗ Services not built!%NC%
    echo Please run: build-native-production.bat
    pause
    exit /b 1
)

REM Check if databases are setup
if not exist "%POCKETBASE_DIR%\pocketbase.exe" (
    echo %YELLOW%⚠ PocketBase not setup!%NC%
    echo Please run: setup-pocketbase-native.bat
    echo Continuing without PocketBase...
)

if not exist "%REDIS_DIR%\redis-server.exe" (
    echo %YELLOW%⚠ Redis not setup!%NC%
    echo Please run: setup-redis-native.bat
    echo Continuing without Redis...
)

echo %GREEN%✓ Prerequisites check completed%NC%

echo.
echo %BLUE%2. Starting Database Services...%NC%

REM Start PocketBase if available
if exist "%POCKETBASE_DIR%\pocketbase.exe" (
    echo Starting PocketBase...
    start "PocketBase - GameV1 Database" /B start-pocketbase.bat

    echo %BLUE%Waiting for PocketBase to initialize...%NC%
    timeout /t 5 /nobreak >nul

    REM Check if PocketBase is running
    curl -f http://localhost:8090/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ PocketBase is running%NC%
    ) else (
        echo %YELLOW%⚠ PocketBase may not be ready yet%NC%
    )
) else (
    echo %YELLOW%⚠ Skipping PocketBase (not installed)%NC%
)

REM Start Redis if available
if exist "%REDIS_DIR%\redis-server.exe" (
    echo Starting Redis...
    start "Redis - GameV1 Cache" /B start-redis.bat

    echo %BLUE%Waiting for Redis to initialize...%NC%
    timeout /t 3 /nobreak >nul

    REM Check if Redis is running
    netstat -ano | findstr "LISTENING" | findstr "6379" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Redis is running%NC%
    ) else (
        echo %YELLOW%⚠ Redis may not be ready yet%NC%
    )
) else (
    echo %YELLOW%⚠ Skipping Redis (not installed)%NC%
)

echo.
echo %BLUE%3. Starting Application Services...%NC%

REM Start Worker first (background)
echo Starting Worker service...
start "GameV1 Worker" /B .\target\release\worker.exe

echo %BLUE%Waiting for Worker to initialize...%NC%
timeout /t 3 /nobreak >nul

REM Start Room Manager (background)
echo Starting Room Manager service...
start "GameV1 Room Manager" /B .\target\release\room-manager.exe

echo %BLUE%Waiting for Room Manager to initialize...%NC%
timeout /t 3 /nobreak >nul

echo.
echo %BLUE%4. Starting Gateway (API server)...%NC%
echo %YELLOW%Gateway logs will appear below%NC%
echo %YELLOW%Press Ctrl+C to stop Gateway%NC%
echo %YELLOW%Other services will continue running in background%NC%
echo.

REM Start Gateway (foreground - will show logs)
.\target\release\gateway.exe

echo.
echo %YELLOW%Gateway stopped.%NC%
echo %BLUE%Other services may still be running in background%NC%
echo.

echo %BLUE%Service Management:%NC%
echo To check running services: tasklist | findstr "gateway\|worker\|room-manager"
echo To stop all services: taskkill /IM gateway.exe /F && taskkill /IM worker.exe /F && taskkill /IM room-manager.exe /F
echo.

echo %BLUE%Testing Endpoints:%NC%
echo curl http://localhost:8080/healthz
echo curl http://localhost:8080/api/rooms
echo curl http://localhost:3100/metrics
echo curl http://localhost:3201/metrics
echo.

echo %GREEN%✓ GameV1 native deployment started!%NC%
