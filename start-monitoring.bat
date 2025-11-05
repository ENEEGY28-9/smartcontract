@echo off
REM Start Monitoring Stack for GameV1
REM This script starts all monitoring services and sets up Grafana

echo 🎯 Starting GameV1 Monitoring Stack...

REM Colors for output
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%Starting monitoring services...%NC%

REM Start monitoring services
docker-compose up -d gamev1-prometheus gamev1-grafana

echo %BLUE%Waiting for services to start...%NC%
timeout /t 10 /nobreak >nul

REM Check if services are running
echo %BLUE%Checking service status...%NC%

docker-compose ps | findstr "gamev1-prometheus" | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus is running%NC%
) else (
    echo %RED%✗ Prometheus failed to start%NC%
    exit /b 1
)

docker-compose ps | findstr "gamev1-grafana" | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana is running%NC%
) else (
    echo %RED%✗ Grafana failed to start%NC%
    exit /b 1
)

echo %BLUE%Running Grafana setup...%NC%
call scripts/setup-grafana.bat

echo %BLUE%Testing setup...%NC%
call scripts/test-grafana-setup.bat

echo.
echo %GREEN%🎉 Monitoring stack is ready!%NC%
echo.
echo %BLUE%Access URLs:%NC%
echo %GREEN%Grafana:%NC% http://localhost:3000
echo %GREEN%Prometheus:%NC% http://localhost:9090
echo.
echo %BLUE%Credentials:%NC%
echo Username: admin
echo Password: gamev1_admin_2024
echo.
echo %YELLOW%Press any key to open Grafana in browser...%NC%
pause >nul

start http://localhost:3000
