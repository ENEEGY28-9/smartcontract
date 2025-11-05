@echo off
REM Start Redis for GameV1 Native Deployment

echo 🚀 Starting Redis for GameV1...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "REDIS_DIR=redis-native"

REM Check if Redis exists
if not exist "%REDIS_DIR%\redis-server.exe" (
    echo %RED%✗ Redis not found!%NC%
    echo Please run: setup-redis-native.bat
    pause
    exit /b 1
)

REM Check if configuration exists
if not exist "%REDIS_DIR%\redis.conf" (
    echo %RED%✗ Redis configuration not found!%NC%
    echo Please run: setup-redis-native.bat
    pause
    exit /b 1
)

echo %BLUE%Starting Redis on port 6379...%NC%
echo %YELLOW%Redis CLI: redis://localhost:6379%NC%
echo %YELLOW%Press Ctrl+C to stop%NC%
echo.

REM Start Redis
cd "%REDIS_DIR%"
start "Redis - GameV1 Cache" /B redis-server.exe redis.conf

echo.
echo %GREEN%✓ Redis started successfully!%NC%
echo %BLUE%Check logs: tail -f logs/redis.log%NC%
echo.
pause
