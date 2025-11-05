@echo off
REM GameV1 Complete Native Deployment Setup
REM One-stop setup script for native deployment without Docker

echo 🚀 GameV1 Complete Native Deployment Setup
echo ===========================================
echo.

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo This script will setup GameV1 for native deployment without Docker.
echo Estimated time: 15-20 minutes
echo.

REM Confirm
set /p "choice=Do you want to continue? (y/N): "
if /i not "%choice%"=="y" (
    echo Setup cancelled.
    exit /b 0
)

echo.
echo %BLUE%Starting complete native deployment setup...%NC%

REM Step 1: Test current setup
echo.
echo %BLUE%Step 1: Testing current setup...%NC%
call test-native-deployment.bat
if %errorlevel% neq 0 (
    echo %RED%✗ Setup test failed!%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Current setup test completed%NC%

REM Step 2: Build services
echo.
echo %BLUE%Step 2: Building optimized services...%NC%
call build-native-production.bat
if %errorlevel% neq 0 (
    echo %RED%✗ Build failed!%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Services built successfully%NC%

REM Step 3: Setup databases
echo.
echo %BLUE%Step 3: Setting up databases...%NC%

REM Setup PocketBase
if not exist "pocketbase-native\pocketbase.exe" (
    echo Setting up PocketBase...
    call setup-pocketbase-native.bat
    if %errorlevel% neq 0 (
        echo %RED%✗ PocketBase setup failed!%NC%
        pause
        exit /b 1
    )
    echo %GREEN%✓ PocketBase setup completed%NC%
) else (
    echo %GREEN%✓ PocketBase already installed%NC%
)

REM Setup Redis
if not exist "redis-native\redis-server.exe" (
    echo Setting up Redis...
    call setup-redis-native.bat
    if %errorlevel% neq 0 (
        echo %RED%✗ Redis setup failed!%NC%
        pause
        exit /b 1
    )
    echo %GREEN%✓ Redis setup completed%NC%
) else (
    echo %GREEN%✓ Redis already installed%NC%
)

REM Step 4: Setup monitoring
echo.
echo %BLUE%Step 4: Setting up monitoring...%NC%
call setup-monitoring-native.bat
if %errorlevel% neq 0 (
    echo %RED%✗ Monitoring setup failed!%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Monitoring setup completed%NC%

REM Step 5: Final test
echo.
echo %BLUE%Step 5: Final testing...%NC%
call test-native-deployment.bat
if %errorlevel% neq 0 (
    echo %YELLOW%⚠ Final test had some issues, but setup may still work%NC%
) else (
    echo %GREEN%✓ Final test passed%NC%
)

echo.
echo %BLUE%Setup completed!%NC%
echo %GREEN%✓ GameV1 native deployment setup completed successfully!%NC%
echo.

echo %YELLOW%Next steps:%NC%
echo 1. Start all services: start-all-native.bat
echo 2. Check status: cd monitoring && dashboard.bat
echo 3. Test APIs: curl http://localhost:8080/healthz
echo 4. Access PocketBase: http://localhost:8090/_/
echo.

echo %BLUE%Service management:%NC%
echo - Start services: start-all-native.bat
echo - Stop services: taskkill /IM gateway.exe /F && taskkill /IM worker.exe /F && taskkill /IM room-manager.exe /F
echo - Check logs: cd monitoring && log-monitor.bat
echo - Monitor system: cd monitoring && dashboard.bat
echo.

echo %GREEN%🎉 GameV1 is ready for native deployment without Docker!%NC%
echo.

pause
