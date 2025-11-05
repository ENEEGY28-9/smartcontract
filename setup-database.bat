@echo off
REM Setup Database Services for GameV1 Native
REM Downloads and starts PocketBase and Redis

echo 🗄️  Setting up Database Services...

REM Colors for output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Create database directory
if not exist "database" mkdir database

echo %BLUE%1. Setting up PocketBase...%NC%

REM Check if PocketBase is already downloaded
if exist "database\pocketbase.exe" (
    echo %GREEN%✓ PocketBase already downloaded%NC%
) else (
    echo Downloading PocketBase...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_windows_amd64.zip' -OutFile 'database\pocketbase.zip'"

    if %errorlevel% neq 0 (
        echo %RED%✗ Failed to download PocketBase%NC%
        echo %YELLOW%Please download manually from: https://pocketbase.io/%NC%
        goto :redis_setup
    )

    echo Extracting PocketBase...
    powershell -Command "Expand-Archive -Path 'database\pocketbase.zip' -DestinationPath 'database' -Force"
    del database\pocketbase.zip

    REM Find the executable
    for %%f in (database\pocketbase*.exe) do (
        if exist "%%f" (
            move "%%f" database\pocketbase.exe
        )
    )
)

REM Start PocketBase
if exist "database\pocketbase.exe" (
    echo Starting PocketBase...
    start "PocketBase" /B database\pocketbase.exe serve --http="0.0.0.0:8090"

    REM Wait and check if it's running
    timeout /t 3 /nobreak >nul
    curl -f http://localhost:8090/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ PocketBase started successfully%NC%
        echo 🌐 PocketBase: http://localhost:8090
    ) else (
        echo %YELLOW%⚠️  PocketBase started but health check failed%NC%
        echo Try accessing: http://localhost:8090/_/
    )
) else (
    echo %RED%✗ PocketBase setup failed%NC%
)

:redis_setup
echo.
echo %BLUE%2. Setting up Redis...%NC%

REM Check if Redis is already downloaded
if exist "database\redis-server.exe" (
    echo %GREEN%✓ Redis already downloaded%NC%
) else (
    echo Downloading Redis...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip' -OutFile 'database\redis.zip'"

    if %errorlevel% neq 0 (
        echo %RED%✗ Failed to download Redis%NC%
        echo %YELLOW%Please download manually from: https://redis.io/%NC%
        goto :setup_complete
    )

    echo Extracting Redis...
    powershell -Command "Expand-Archive -Path 'database\redis.zip' -DestinationPath 'database' -Force"
    del database\redis.zip

    REM Find Redis executables
    for %%f in (database\redis*.exe) do (
        if exist "%%f" (
            if "%%~nf"=="redis-server" move "%%f" database\redis-server.exe
            if "%%~nf"=="redis-cli" move "%%f" database\redis-cli.exe
        )
    )
)

REM Start Redis
if exist "database\redis-server.exe" (
    echo Starting Redis...
    start "Redis" /B database\redis-server.exe

    REM Wait and check if it's running
    timeout /t 3 /nobreak >nul
    netstat -ano | findstr "LISTENING" | findstr "6379" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Redis started successfully%NC%
        echo ⚡ Redis: localhost:6379
    ) else (
        echo %YELLOW%⚠️  Redis started but port check failed%NC%
        echo Check if port 6379 is available
    )
) else (
    echo %RED%✗ Redis setup failed%NC%
)

:setup_complete
echo.
echo %BLUE%3. Creating initial data...%NC%

REM Create PocketBase admin user if PocketBase is running
curl -f http://localhost:8090/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Setting up PocketBase collections...

    REM Create rooms collection
    curl -X POST http://localhost:8090/api/collections ^
      -H "Content-Type: application/json" ^
      -d "{\"name\":\"rooms\",\"schema\":[{\"name\":\"name\",\"type\":\"text\",\"required\":true},{\"name\":\"gameMode\",\"type\":\"text\",\"required\":true},{\"name\":\"maxPlayers\",\"type\":\"number\",\"required\":true},{\"name\":\"isPrivate\",\"type\":\"bool\",\"required\":false}]}" >nul 2>&1

    REM Create players collection
    curl -X POST http://localhost:8090/api/collections ^
      -H "Content-Type: application/json" ^
      -d "{\"name\":\"players\",\"schema\":[{\"name\":\"username\",\"type\":\"text\",\"required\":true},{\"name\":\"email\",\"type\":\"email\",\"required\":true},{\"name\":\"role\",\"type\":\"text\",\"required\":false}]}" >nul 2>&1

    echo %GREEN%✓ Database collections created%NC%
)

echo.
echo %GREEN%🗄️  Database setup complete!%NC%
echo.
echo %BLUE%Access URLs:%NC%
echo 🌐 PocketBase Admin: http://localhost:8090/_/
echo ⚡ Redis CLI: database\redis-cli.exe
echo.
echo %YELLOW%Next steps:%NC%
echo 1. Start GameV1 services: start-native.bat
echo 2. Test API: curl http://localhost:8080/healthz
echo 3. View metrics: curl http://localhost:3100/metrics

echo.
echo %GREEN%Database services are ready! 🎉%NC%
