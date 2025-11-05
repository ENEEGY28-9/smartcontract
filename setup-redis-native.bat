@echo off
REM Setup Redis for Native Deployment (Windows)
REM Downloads and configures Redis for GameV1

echo 🚀 Setting up Redis for Native Deployment...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "REDIS_VERSION=5.0.14.1"
set "REDIS_URL=https://github.com/microsoftarchive/redis/releases/download/win-%REDIS_VERSION%/Redis-x64-%REDIS_VERSION%.zip"
set "REDIS_DIR=redis-native"

echo %BLUE%1. Checking existing Redis installation...%NC%

REM Check if Redis already exists
if exist "%REDIS_DIR%\redis-server.exe" (
    echo %GREEN%✓ Redis already installed%NC%
    goto :CONFIGURE
)

REM Create directory
echo %BLUE%2. Creating Redis directory...%NC%
mkdir "%REDIS_DIR%" 2>nul
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to create directory%NC%
    pause
    exit /b 1
)

echo %BLUE%3. Downloading Redis v%REDIS_VERSION%...%NC%

REM Download Redis
powershell -Command "Invoke-WebRequest -Uri '%REDIS_URL%' -OutFile 'redis.zip'"
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to download Redis%NC%
    echo Please download manually from: https://github.com/microsoftarchive/redis/releases
    pause
    exit /b 1
)

echo %BLUE%4. Extracting Redis...%NC%

REM Extract Redis
powershell -Command "Expand-Archive -Path 'redis.zip' -DestinationPath '%REDIS_DIR%'"
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to extract Redis%NC%
    pause
    exit /b 1
)

REM Clean up
del redis.zip 2>nul

echo %GREEN%✓ Redis downloaded and extracted%NC%

:CONFIGURE
echo.
echo %BLUE%5. Configuring Redis for GameV1...%NC%

REM Create Redis configuration
if not exist "%REDIS_DIR%\redis.conf" (
    echo Creating Redis configuration...

    echo # Redis configuration for GameV1 >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # Network >> "%REDIS_DIR%\redis.conf"
    echo bind 127.0.0.1 >> "%REDIS_DIR%\redis.conf"
    echo port 6379 >> "%REDIS_DIR%\redis.conf"
    echo timeout 0 >> "%REDIS_DIR%\redis.conf"
    echo tcp-keepalive 300 >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # General >> "%REDIS_DIR%\redis.conf"
    echo daemonize no >> "%REDIS_DIR%\redis.conf"
    echo supervised no >> "%REDIS_DIR%\redis.conf"
    echo loglevel notice >> "%REDIS_DIR%\redis.conf"
    echo logfile redis.log >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # Snapshotting >> "%REDIS_DIR%\redis.conf"
    echo save 900 1 >> "%REDIS_DIR%\redis.conf"
    echo save 300 10 >> "%REDIS_DIR%\redis.conf"
    echo save 60 10000 >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # Security >> "%REDIS_DIR%\redis.conf"
    echo # requirepass yourpassword >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # Memory management >> "%REDIS_DIR%\redis.conf"
    echo maxmemory 256mb >> "%REDIS_DIR%\redis.conf"
    echo maxmemory-policy allkeys-lru >> "%REDIS_DIR%\redis.conf"
    echo. >> "%REDIS_DIR%\redis.conf"
    echo # Append only file >> "%REDIS_DIR%\redis.conf"
    echo appendonly yes >> "%REDIS_DIR%\redis.conf"
    echo appendfilename appendonly.aof >> "%REDIS_DIR%\redis.conf"
    echo appendfsync everysec >> "%REDIS_DIR%\redis.conf"

    echo %GREEN%✓ Redis configuration created%NC%
) else (
    echo %GREEN%✓ Redis configuration already exists%NC%
)

echo.
echo %BLUE%6. Creating data directories...%NC%

REM Create data directories
mkdir "%REDIS_DIR%\data" 2>nul
mkdir "%REDIS_DIR%\logs" 2>nul

echo %GREEN%✓ Data directories created%NC%

echo.
echo %BLUE%7. Setup complete!%NC%
echo.
echo %GREEN%To start Redis:%NC%
echo cd %REDIS_DIR%
echo redis-server.exe redis.conf
echo.
echo %YELLOW%Redis CLI:%NC%
echo cd %REDIS_DIR%
echo redis-cli.exe
echo.
echo %BLUE%Or use the startup script:%NC%
echo start-redis.bat
echo.

echo %GREEN%✓ Redis setup completed successfully!%NC%
pause
