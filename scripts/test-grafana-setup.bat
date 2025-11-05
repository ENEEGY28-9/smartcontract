@echo off
REM Test Grafana Setup Script for Windows
REM This script verifies that Grafana is properly configured

echo 🧪 Testing Grafana Setup...

REM Colors for output (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Check if Grafana is running
echo %BLUE%1. Checking Grafana service...%NC%
curl -f http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana is running%NC%
) else (
    echo %RED%✗ Grafana is not running%NC%
    echo %YELLOW%Start Grafana: docker-compose up -d gamev1-grafana%NC%
    exit /b 1
)

REM Check if Prometheus is running
echo %BLUE%2. Checking Prometheus service...%NC%
curl -f http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus is running%NC%
) else (
    echo %RED%✗ Prometheus is not running%NC%
    exit /b 1
)

REM Check metrics endpoints
echo %BLUE%3. Testing metrics endpoints...%NC%

REM Gateway metrics
curl -f http://localhost:8080/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics available%NC%
) else (
    echo %YELLOW%! Gateway metrics not available (service not running?)%NC%
)

REM Worker metrics (if available)
curl -f http://localhost:3100/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics available%NC%
) else (
    echo %YELLOW%! Worker metrics not available (service not running?)%NC%
)

REM Room manager metrics (if available)
curl -f http://localhost:3200/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager metrics available%NC%
) else (
    echo %YELLOW%! Room Manager metrics not available (service not running?)%NC%
)

REM Check Prometheus targets
echo %BLUE%4. Checking Prometheus targets...%NC%
for /f "delims=" %%i in ('curl -s http://localhost:9090/api/v1/targets 2^>nul') do set "targets_response=%%i"

REM Use PowerShell to count active targets
for /f "delims=" %%i in ('powershell -Command "$json='%targets_response%'; if ($json) { $obj = ConvertFrom-Json $json -ErrorAction SilentlyContinue; if ($obj.data.activeTargets) { ($obj.data.activeTargets | Where-Object {$_.health -eq 'up'}).Count } else { 0 } } else { 0 }"') do set "TARGETS=%%i"

if "%TARGETS%" GTR "0" (
    echo %GREEN%✓ Prometheus has %TARGETS% active targets%NC%
) else (
    echo %YELLOW%! No active Prometheus targets%NC%
)

REM Test dashboard files exist
echo %BLUE%5. Checking dashboard files...%NC%
set "DASHBOARDS=gamev1-overview gateway-performance game-metrics system-health alert-overview"
set "MISSING_COUNT=0"

for %%d in (%DASHBOARDS%) do (
    if exist "config/grafana/dashboards/%%d.json" (
        echo %GREEN%✓ %%d.json exists%NC%
    ) else (
        echo %RED%✗ %%d.json missing%NC%
        set /a "MISSING_COUNT+=1"
    )
)

REM Check provisioning files
echo %BLUE%6. Checking provisioning files...%NC%
if exist "config/grafana/datasources/prometheus.yml" (
    echo %GREEN%✓ Datasource provisioning configured%NC%
) else (
    echo %RED%✗ Datasource provisioning missing%NC%
)

if exist "config/grafana/dashboards/dashboards.yml" (
    echo %GREEN%✓ Dashboard provisioning configured%NC%
) else (
    echo %RED%✗ Dashboard provisioning missing%NC%
)

REM Test Grafana API access
echo %BLUE%7. Testing Grafana API access...%NC%
curl -f -u admin:gamev1_admin_2024 http://localhost:3000/api/datasources >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana API access working%NC%
) else (
    echo %YELLOW%! Grafana API access failed (check credentials)%NC%
)

REM Summary
echo.
echo %BLUE%📊 Test Summary:%NC%

if "%MISSING_COUNT%" EQU "0" (
    echo %GREEN%✓ All dashboard files present%NC%
) else (
    echo %RED%✗ %MISSING_COUNT% dashboard files missing%NC%
)

echo %BLUE%📈 Next Steps:%NC%
echo 1. Access Grafana: http://localhost:3000
echo 2. Username: admin, Password: gamev1_admin_2024
echo 3. Check dashboards are imported correctly
echo 4. Verify metrics are being collected
echo 5. Test alerting functionality

echo.
echo %GREEN%🎉 Grafana setup test completed!%NC%
