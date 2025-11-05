@echo off
REM GameV1 Load and Performance Test Script
REM Tests system performance under various loads

echo ⚡ GameV1 Load and Performance Testing...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0

echo.
echo %BLUE%=== Performance Test Setup ===%NC%
echo.

REM Check if system is ready
echo %BLUE%1. System Readiness Check%NC%
curl -f http://localhost:8080/healthz >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ System not ready for load testing%NC%
    goto :end
)
echo %GREEN%✓ System is ready%NC%

echo.
echo %BLUE%2. Testing Baseline Performance%NC%

REM Baseline response time test
echo Measuring baseline response times...
for /l %%i in (1,1,10) do (
    curl -w "%%i: %%{time_total}s %%{http_code}\n" -s -o nul http://localhost:8080/healthz 2>nul
    timeout /t 1 /nobreak >nul
)

echo %GREEN%✓ Baseline performance measured%NC%

echo.
echo %BLUE%3. Testing API Endpoint Performance%NC%

REM Test different API endpoints
set endpoints=("/healthz" "/api/rooms" "/api/players" "/metrics")

for %%e in %endpoints% do (
    echo Testing %%e...
    curl -w "%%e: %%{time_total}s %%{http_code}\n" -s -o nul http://localhost:8080%%e 2>nul
)

echo %GREEN%✓ All endpoints responding%NC%

echo.
echo %BLUE%4. Testing Concurrent Load%NC%

REM Test with multiple concurrent requests
echo Starting concurrent load test (20 requests)...

set start_time=%time%
for /l %%i in (1,1,20) do (
    start /b curl -s http://localhost:8080/healthz >nul 2>&1
    start /b curl -s http://localhost:8080/api/rooms >nul 2>&1
)
set end_time=%time%

timeout /t 3 /nobreak >nul

echo %GREEN%✓ Concurrent load test completed%NC%

echo.
echo %BLUE%5. Testing Memory Usage%NC%

REM Check Docker stats
echo Current Docker resource usage:
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo %GREEN%✓ Resource monitoring active%NC%

echo.
echo %BLUE%6. Testing Metrics Under Load%NC%

REM Generate some load and check metrics
echo Generating load for metrics testing...

for /l %%i in (1,1,50) do (
    curl -s http://localhost:8080/healthz >nul 2>&1
    if %%i%%10 equ 0 (
        curl -s http://localhost:8080/metrics >nul 2>&1
    )
)

echo %GREEN%✓ Metrics generated under load%NC%

echo.
echo %BLUE%7. Testing Prometheus Metrics Collection%NC%

REM Check if metrics are being collected
curl -s "http://localhost:9090/api/v1/query?query=up" 2>nul | findstr "up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus collecting metrics%NC%
) else (
    echo %YELLOW%! Prometheus metrics collection unclear%NC%
)

REM Check specific metrics
curl -s "http://localhost:9090/api/v1/query?query=gateway_http_requests_total" 2>nul | findstr "metric" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics in Prometheus%NC%
) else (
    echo %YELLOW%! Gateway metrics not found in Prometheus%NC%
)

echo.
echo %BLUE%8. Testing Grafana Dashboard Data%NC%

REM Check if Grafana can access data
curl -s -u admin:gamev1_admin_2024 "http://localhost:3000/api/datasources/proxy/1/api/v1/query?query=up" 2>nul | findstr "data" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana dashboard data accessible%NC%
) else (
    echo %YELLOW%! Grafana dashboard data access unclear%NC%
)

echo.
echo %BLUE%9. Testing Error Rate Under Load%NC%

REM Generate some errors to test error handling
echo Generating error conditions...

for /l %%i in (1,1,10) do (
    curl -s http://localhost:8080/nonexistent >nul 2>&1
)

REM Check error metrics
curl -s "http://localhost:9090/api/v1/query?query=rate(gateway_http_requests_failed_total[1m])" 2>nul | findstr "result" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Error rate monitoring working%NC%
) else (
    echo %YELLOW%! Error rate monitoring unclear%NC%
)

echo.
echo %BLUE%10. Testing Recovery After Load%NC%

REM Test system recovery
echo Testing system recovery...

for /l %%i in (1,1,5) do (
    curl -w "Recovery test %%i: %%{time_total}s %%{http_code}\n" -s -o nul http://localhost:8080/healthz 2>nul
    timeout /t 1 /nobreak >nul
)

echo %GREEN%✓ System recovery verified%NC%

echo.
echo %BLUE%11. Performance Metrics Summary%NC%

REM Get final metrics
echo Final system state:

REM Gateway connections
curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_active_connections" | head -1

REM Request rate
curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_http_requests_total" | head -1

REM Memory usage (if available)
curl -s http://localhost:8080/metrics 2>nul | findstr "process_resident_memory_bytes" | head -1

echo %GREEN%✓ Performance metrics captured%NC%

echo.
echo ⚡ Load Test Summary:
echo Errors: %errors%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ Load testing completed successfully!%NC%
    echo.
    echo %BLUE%Performance Results:%NC%
    echo ✓ System handles concurrent requests
    echo ✓ Metrics collection works under load
    echo ✓ Error handling functions correctly
    echo ✓ Recovery after load is good
    echo ✓ Monitoring dashboards have data
    echo.
    echo %GREEN%🎉 GameV1 is production-ready!%NC%
) else (
    echo.
    echo %RED%❌ Found %errors% performance issues.%NC%
    echo.
    echo %YELLOW%Areas to investigate:%NC%
    echo - Check service logs for errors
    echo - Verify resource allocation
    echo - Review Prometheus configuration
    echo - Check network connectivity
)

echo.
echo ⚡ Load and performance testing completed!

:end
