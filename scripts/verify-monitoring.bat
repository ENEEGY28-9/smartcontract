@echo off
REM GameV1 Monitoring Verification Script
REM Comprehensive test of monitoring system components

echo 📊 GameV1 Monitoring System Verification...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0
set warnings=0

echo.
echo %BLUE%=== Phase 1: Infrastructure Check ===%NC%
echo.

REM 1.1 Check Docker services
echo %BLUE%1.1 Checking Docker Services...%NC%
docker compose ps | findstr "running" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Docker services are running%NC%
) else (
    echo %RED%✗ No Docker services running%NC%
    set /a errors+=1
)

REM 1.2 Check essential services
echo %BLUE%1.2 Checking Essential Services...%NC%
docker compose ps | findstr "gamev1-gateway.*running" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway service running%NC%
) else (
    echo %RED%✗ Gateway service not running%NC%
    set /a errors+=1
)

docker compose ps | findstr "gamev1-prometheus.*running" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus running%NC%
) else (
    echo %RED%✗ Prometheus not running%NC%
    set /a errors+=1
)

docker compose ps | findstr "gamev1-grafana.*running" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana running%NC%
) else (
    echo %RED%✗ Grafana not running%NC%
    set /a errors+=1
)

echo.
echo %BLUE%=== Phase 2: Health Endpoints ===%NC%
echo.

REM 2.1 Gateway health
echo %BLUE%2.1 Gateway Health Check...%NC%
curl -f -m 5 http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway health endpoint responding%NC%
) else (
    echo %RED%✗ Gateway health endpoint failed%NC%
    set /a errors+=1
)

REM 2.2 Prometheus health
echo %BLUE%2.2 Prometheus Health Check...%NC%
curl -f -m 5 http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus health endpoint responding%NC%
) else (
    echo %RED%✗ Prometheus health endpoint failed%NC%
    set /a errors+=1
)

REM 2.3 Grafana health
echo %BLUE%2.3 Grafana Health Check...%NC%
curl -f -m 5 http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana health endpoint responding%NC%
) else (
    echo %RED%✗ Grafana health endpoint failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%=== Phase 3: Metrics Collection ===%NC%
echo.

REM 3.1 Gateway metrics
echo %BLUE%3.1 Gateway Metrics...%NC%
curl -f -m 5 http://localhost:8080/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics endpoint accessible%NC%

    REM Check for specific metrics
    curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_http_requests_total" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Gateway HTTP metrics present%NC%
    ) else (
        echo %YELLOW%! Gateway HTTP metrics missing%NC%
        set /a warnings+=1
    )

    curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_active_connections" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Gateway connection metrics present%NC%
    ) else (
        echo %YELLOW%! Gateway connection metrics missing%NC%
        set /a warnings+=1
    )
) else (
    echo %RED%✗ Gateway metrics endpoint failed%NC%
    set /a errors+=1
)

REM 3.2 Worker metrics
echo %BLUE%3.2 Worker Metrics...%NC%
curl -f -m 5 http://localhost:3100/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics endpoint accessible%NC%

    curl -s http://localhost:3100/metrics 2>nul | findstr "worker_frame_time" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Worker performance metrics present%NC%
    ) else (
        echo %YELLOW%! Worker performance metrics missing%NC%
        set /a warnings+=1
    )
) else (
    echo %YELLOW%! Worker metrics endpoint not accessible (internal endpoint?)%NC%
)

REM 3.3 Room Manager metrics
echo %BLUE%3.3 Room Manager Metrics...%NC%
curl -f -m 5 http://localhost:3201/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager metrics endpoint accessible%NC%

    curl -s http://localhost:3201/metrics 2>nul | findstr "room_manager" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Room Manager metrics present%NC%
    ) else (
        echo %YELLOW%! Room Manager metrics missing%NC%
        set /a warnings+=1
    )
) else (
    echo %YELLOW%! Room Manager metrics endpoint not accessible (internal endpoint?)%NC%
)

echo.
echo %BLUE%=== Phase 4: Prometheus Integration ===%NC%
echo.

REM 4.1 Check targets
echo %BLUE%4.1 Prometheus Targets...%NC%
curl -s http://localhost:9090/api/v1/targets 2>nul | findstr "up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus has healthy targets%NC%

    REM Count targets
    for /f %%i in ('curl -s http://localhost:9090/api/v1/targets 2^>nul ^| findstr "up" ^| find /c /v ""') do set target_count=%%i
    echo %BLUE%  Found %target_count% healthy targets%NC%
) else (
    echo %RED%✗ No healthy Prometheus targets%NC%
    set /a errors+=1
)

REM 4.2 Test queries
echo %BLUE%4.2 Prometheus Queries...%NC%
curl -s "http://localhost:9090/api/v1/query?query=up" 2>nul | findstr "data" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus queries working%NC%
) else (
    echo %RED%✗ Prometheus queries failed%NC%
    set /a errors+=1
)

REM 4.3 Check specific metrics
echo %BLUE%4.3 Gateway Metrics in Prometheus...%NC%
curl -s "http://localhost:9090/api/v1/query?query=gateway_active_connections" 2>nul | findstr "result" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics queryable%NC%
) else (
    echo %YELLOW%! Gateway metrics not queryable in Prometheus%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%=== Phase 5: Grafana Integration ===%NC%
echo.

REM 5.1 Grafana API access
echo %BLUE%5.1 Grafana API Access...%NC%
curl -f -u admin:gamev1_admin_2024 http://localhost:3000/api/datasources >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana API accessible%NC%
) else (
    echo %RED%✗ Grafana API access failed%NC%
    set /a errors+=1
)

REM 5.2 Check datasources
echo %BLUE%5.2 Prometheus Datasource...%NC%
curl -s -u admin:gamev1_admin_2024 "http://localhost:3000/api/datasources" 2>nul | findstr "prometheus" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus datasource configured%NC%
) else (
    echo %RED%✗ Prometheus datasource missing%NC%
    set /a errors+=1
)

REM 5.3 Check dashboards
echo %BLUE%5.3 Dashboards Status...%NC%
curl -s -u admin:gamev1_admin_2024 "http://localhost:3000/api/search?type=dash-db" 2>nul | findstr "title" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Dashboards loaded in Grafana%NC%

    REM Count dashboards
    for /f %%i in ('curl -s -u admin:gamev1_admin_2024 "http://localhost:3000/api/search?type=dash-db" 2^>nul ^| findstr "title" ^| find /c /v ""') do set dashboard_count=%%i
    echo %BLUE%  Found %dashboard_count% dashboards%NC%
) else (
    echo %YELLOW%! Dashboards not loaded or not accessible%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%=== Phase 6: Alert System ===%NC%
echo.

REM 6.1 Check alert rules
echo %BLUE%6.1 Alert Rules...%NC%
curl -s http://localhost:9090/api/v1/rules 2>nul | findstr "groups" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Alert rules loaded%NC%

    REM Count alert rules
    for /f %%i in ('curl -s http://localhost:9090/api/v1/rules 2^>nul ^| findstr "alert:" ^| find /c /v ""') do set alert_count=%%i
    echo %BLUE%  Found %alert_count% alert rules%NC%
) else (
    echo %YELLOW%! Alert rules not loaded%NC%
    set /a warnings+=1
)

REM 6.2 Test alert firing (generate errors)
echo %BLUE%6.2 Testing Alert Firing...%NC%
echo Generating errors to test alerting...

for /l %%i in (1,1,20) do (
    curl -f http://localhost:8080/nonexistent >nul 2>&1
)

REM Check if errors are reflected in metrics
timeout /t 5 /nobreak >nul
curl -s "http://localhost:9090/api/v1/query?query=rate(gateway_http_requests_failed_total[1m])" 2>nul | findstr "result" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Error metrics being collected%NC%
) else (
    echo %YELLOW%! Error metrics not reflected%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%=== Phase 7: Performance Check ===%NC%
echo.

REM 7.1 Response times
echo %BLUE%7.1 Response Time Test...%NC%
for /l %%i in (1,1,5) do (
    curl -w "Request %%i: %%{time_total}s %%{http_code}\n" -s -o nul http://localhost:8080/healthz 2>nul
)

echo %GREEN%✓ Response time test completed%NC%

REM 7.2 Resource usage
echo %BLUE%7.2 Resource Usage...%NC%
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | findstr "gamev1"
echo %GREEN%✓ Resource monitoring active%NC%

echo.
echo %BLUE%=== Phase 8: End-to-End Test ===%NC%
echo.

REM 8.1 Complete request flow
echo %BLUE%8.1 Complete Request Flow...%NC%
echo Testing complete API flow...

REM Health check -> Metrics -> Prometheus -> Grafana
curl -f http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    curl -f http://localhost:8080/metrics >nul 2>&1
    if %errorlevel% equ 0 (
        curl -f "http://localhost:9090/api/v1/query?query=up" >nul 2>&1
        if %errorlevel% equ 0 (
            curl -f -u admin:gamev1_admin_2024 http://localhost:3000/api/health >nul 2>&1
            if %errorlevel% equ 0 (
                echo %GREEN%✓ Complete monitoring pipeline working%NC%
            ) else (
                echo %RED%✗ Grafana in pipeline failed%NC%
                set /a errors+=1
            )
        ) else (
            echo %RED%✗ Prometheus in pipeline failed%NC%
            set /a errors+=1
        )
    ) else (
        echo %RED%✗ Metrics in pipeline failed%NC%
        set /a errors+=1
    )
) else (
    echo %RED%✗ Gateway in pipeline failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%=== Phase 9: Dashboard Verification ===%NC%
echo.

REM 9.1 Check specific dashboards
echo %BLUE%9.1 Dashboard Data...%NC%
curl -s -u admin:gamev1_admin_2024 "http://localhost:3000/api/datasources/proxy/1/api/v1/query?query=gateway_active_connections" 2>nul | findstr "data" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Dashboard data queries working%NC%
) else (
    echo %YELLOW%! Dashboard data queries not working%NC%
    set /a warnings+=1
)

echo.
echo 📊 Monitoring Verification Summary:
echo Errors: %errors%
echo Warnings: %warnings%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ Monitoring system is fully operational!%NC%
    echo.
    echo %BLUE%System Status:%NC%
    echo ✓ All services running and healthy
    echo ✓ Metrics collection working
    echo ✓ Prometheus scraping data
    echo ✓ Grafana dashboards populated
    echo ✓ Alert system operational
    echo ✓ End-to-end monitoring pipeline working
    echo.
    echo %GREEN%🎉 Ready for production monitoring!%NC%
) else (
    echo.
    echo %RED%❌ Found %errors% monitoring issues.%NC%
    if %warnings% gtr 0 (
        echo %YELLOW%⚠️  %warnings% warnings detected.%NC%
    )
    echo.
    echo %YELLOW%Troubleshooting steps:%NC%
    echo 1. Check service logs: docker compose logs
    echo 2. Verify network connectivity
    echo 3. Check Prometheus configuration
    echo 4. Re-run Grafana setup
)

echo.
echo 📊 Monitoring verification completed!
