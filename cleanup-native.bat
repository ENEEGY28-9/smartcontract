@echo off
REM Cleanup GameV1 Native Deployment
REM Removes all native deployment files and services

echo 🧹 GameV1 Native Deployment Cleanup
echo ===================================
echo.

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Confirm
set /p "choice=This will remove all GameV1 native deployment files. Continue? (y/N): "
if /i not "%choice%"=="y" (
    echo Cleanup cancelled.
    exit /b 0
)

echo.
echo %BLUE%Stopping all services...%NC%

REM Stop running services
taskkill /IM gateway.exe /F 2>nul
taskkill /IM worker.exe /F 2>nul
taskkill /IM room-manager.exe /F 2>nul
taskkill /IM pocketbase.exe /F 2>nul
taskkill /IM redis-server.exe /F 2>nul

echo %GREEN%✓ Services stopped%NC%

echo.
echo %BLUE%Removing deployment files...%NC%

REM Remove production build
if exist "target\production" (
    rmdir /S /Q "target\production"
    echo %GREEN%✓ Removed production build%NC%
)

REM Remove databases
if exist "pocketbase-native" (
    rmdir /S /Q "pocketbase-native"
    echo %GREEN%✓ Removed PocketBase installation%NC%
)

if exist "redis-native" (
    rmdir /S /Q "redis-native"
    echo %GREEN%✓ Removed Redis installation%NC%
)

REM Remove monitoring
if exist "monitoring" (
    rmdir /S /Q "monitoring"
    echo %GREEN%✓ Removed monitoring setup%NC%
)

REM Clean build artifacts
cargo clean 2>nul
echo %GREEN%✓ Cleaned build artifacts%NC%

echo.
echo %BLUE%Removing configuration files...%NC%

REM Remove config files
if exist "config\pocketbase-config.json" (
    del "config\pocketbase-config.json"
    echo %GREEN%✓ Removed PocketBase config%NC%
)

if exist "config\redis.conf" (
    del "config\redis.conf"
    echo %GREEN%✓ Removed Redis config%NC%
)

echo.
echo %BLUE%Removing logs...%NC%

REM Remove log directories
for /d %%d in (target\release\logs pocketbase-native\logs redis-native\logs) do (
    if exist "%%d" (
        rmdir /S /Q "%%d"
        echo %GREEN%✓ Removed log directory: %%d%NC%
    )
)

echo.
echo %BLUE%Removing scripts...%NC%

REM Remove generated scripts (keep original setup scripts)
if exist "target\production\start-production.bat" (
    del "target\production\start-production.bat"
    echo %GREEN%✓ Removed production startup script%NC%
)

echo.
echo %BLUE%Removing data files...%NC%

REM Remove data directories
for /d %%d in (target\production pocketbase-native\data redis-native\data) do (
    if exist "%%d" (
        rmdir /S /Q "%%d"
        echo %GREEN%✓ Removed data directory: %%d%NC%
    )
)

echo.
echo %BLUE%Checking for remaining files...%NC%

REM Check what's left
echo Remaining GameV1 files:
if exist "target" (
    echo - target/ (build artifacts)
)

if exist "config" (
    echo - config/ (configuration files)
)

if exist "scripts" (
    echo - scripts/ (setup scripts)
)

if exist "systemd" (
    echo - systemd/ (Linux service files)
)

if exist "*.bat" (
    echo - *.bat (Windows scripts)
)

if exist "*.sh" (
    echo - *.sh (Linux scripts)
)

echo.
echo %GREEN%✓ Native deployment cleanup completed!%NC%
echo.
echo %YELLOW%Note: Original setup scripts and configuration templates preserved%NC%
echo %YELLOW%To reinstall: Run setup-complete-native.bat%NC%
echo.

pause
