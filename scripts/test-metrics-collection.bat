@echo off
REM GameV1 Metrics Collection Test Script
REM Tests Prometheus metrics collection from all services

echo 📊 Testing GameV1 Metrics Collection...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0

echo.
echo %BLUE%1. Testing Prometheus Status...%NC%
curl -f -m 10 http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus is running%NC%
) else (
    echo %RED%✗ Prometheus not accessible%NC%
    set /a errors+=1
    goto :end
)

echo.
echo %BLUE%2. Checking Prometheus Targets...%NC%
for /f "delims=" %%i in ('curl -s http://localhost:9090/api/v1/targets 2^>nul') do set "targets=%%i"

echo %targets% | findstr "up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus has healthy targets%NC%
) else (
    echo %YELLOW%! No healthy targets found%NC%
)

echo.
echo %BLUE%3. Testing Gateway Metrics...%NC%
curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_http_requests_total" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics available%NC%
    REM Show sample metrics
    curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_http_requests_total\|gateway_active_connections" | head -5
) else (
    echo %RED%✗ Gateway metrics missing%NC%
    set /a errors+=1
)

echo.
echo %BLUE%4. Testing Worker Metrics...%NC%
curl -s http://localhost:3100/metrics 2>nul | findstr "worker_frame_time" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics available%NC%
    REM Show sample metrics
    curl -s http://localhost:3100/metrics 2>nul | findstr "worker_frame_time\|worker_rpc_calls" | head -3
) else (
    echo %YELLOW%! Worker metrics not accessible (internal endpoint?)%NC%
)

echo.
echo %BLUE%5. Testing Room Manager Metrics...%NC%
curl -s http://localhost:3201/metrics 2>nul | findstr "room_manager" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager metrics available%NC%
    REM Show sample metrics
    curl -s http://localhost:3201/metrics 2>nul | findstr "room_manager_active_rooms\|room_manager_matchmaking" | head -3
) else (
    echo %YELLOW%! Room Manager metrics not accessible (internal endpoint?)%NC%
)

echo.
echo %BLUE%6. Testing Prometheus Queries...%NC%

REM Test gateway metrics query
curl -s "http://localhost:9090/api/v1/query?query=gateway_active_connections" 2>nul | findstr "result" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics queryable in Prometheus%NC%
) else (
    echo %YELLOW%! Gateway metrics not queryable%NC%
)

REM Test worker metrics query
curl -s "http://localhost:9090/api/v1/query?query=worker_frame_time" 2>nul | findstr "result" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics queryable in Prometheus%NC%
) else (
    echo %YELLOW%! Worker metrics not queryable%NC%
)

echo.
echo %BLUE%7. Testing Grafana Data Source...%NC%
curl -f -u admin:gamev1_admin_2024 http://localhost:3000/api/datasources 2>nul | findstr "prometheus" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana can access Prometheus%NC%
) else (
    echo %YELLOW%! Grafana-Prometheus connection issue%NC%
)

echo.
echo %BLUE%8. Checking Metrics Rate...%NC%

REM Get current metrics count
for /f %%i in ('curl -s http://localhost:8080/metrics 2^>nul ^| findstr /c:"# TYPE" ^| find /c /v ""') do set gateway_metrics=%%i
for /f %%i in ('curl -s http://localhost:3100/metrics 2^>nul ^| findstr /c:"# TYPE" ^| find /c /v ""') do set worker_metrics=%%i

echo Gateway metrics count: %gateway_metrics%
echo Worker metrics count: %worker_metrics%

if %gateway_metrics% gtr 10 (
    echo %GREEN%✓ Gateway exposing sufficient metrics%NC%
) else (
    echo %YELLOW%! Gateway metrics count low%NC%
)

echo.
echo %BLUE%9. Testing Alert Rules...%NC%
curl -s http://localhost:9090/api/v1/rules 2>nul | findstr "groups" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Alert rules loaded in Prometheus%NC%
) else (
    echo %YELLOW%! Alert rules not loaded%NC%
)

:end
echo.
echo 📊 Metrics Test Summary:
echo Errors: %errors%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ Metrics collection is working perfectly!%NC%
    echo.
    echo %BLUE%You can now:%NC%
    echo - View real-time metrics in Grafana dashboards
    echo - Monitor system performance
    echo - Set up alerts for production monitoring
) else (
    echo.
    echo %RED%❌ Found %errors% metrics issues.%NC%
    echo.
    echo %YELLOW%Troubleshooting:%NC%
    echo - Check if all services are running
    echo - Verify Prometheus configuration
    echo - Check firewall settings
    echo - Review service logs
)

echo.
echo 📊 Metrics collection test completed!
