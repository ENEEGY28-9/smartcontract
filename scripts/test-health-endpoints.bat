@echo off
REM GameV1 Health Endpoints Test Script
REM Tests all health endpoints and basic connectivity

echo 🏥 Testing GameV1 Health Endpoints...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0

echo.
echo %BLUE%1. Testing Gateway Health...%NC%
curl -f -m 10 http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway is healthy%NC%
) else (
    echo %RED%✗ Gateway health check failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%2. Testing Worker Service...%NC%
curl -f -m 10 http://localhost:50051/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker service is responding%NC%
) else (
    echo %YELLOW%! Worker health endpoint not available (might be internal)%NC%
)

echo.
echo %BLUE%3. Testing Room Manager...%NC%
curl -f -m 10 http://localhost:3200/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager is healthy%NC%
) else (
    echo %RED%✗ Room Manager health check failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%4. Testing Prometheus...%NC%
curl -f -m 10 http://localhost:9090/-/healthy >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus is healthy%NC%
) else (
    echo %RED%✗ Prometheus health check failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%5. Testing Grafana...%NC%
curl -f -m 10 http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Grafana is healthy%NC%
) else (
    echo %RED%✗ Grafana health check failed%NC%
    set /a errors+=1
)

echo.
echo %BLUE%6. Testing Metrics Endpoints...%NC%

REM Gateway metrics
curl -f -m 10 http://localhost:8080/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics available%NC%
) else (
    echo %RED%✗ Gateway metrics not available%NC%
    set /a errors+=1
)

REM Worker metrics
curl -f -m 10 http://localhost:3100/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics available%NC%
) else (
    echo %YELLOW%! Worker metrics not available (internal endpoint?)%NC%
)

REM Room Manager metrics
curl -f -m 10 http://localhost:3201/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager metrics available%NC%
) else (
    echo %YELLOW%! Room Manager metrics not available (internal endpoint?)%NC%
)

echo.
echo %BLUE%7. Testing Prometheus Targets...%NC%
curl -s http://localhost:9090/api/v1/targets 2>nul | findstr "up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Prometheus targets are healthy%NC%
) else (
    echo %YELLOW%! No healthy Prometheus targets%NC%
)

echo.
echo %BLUE%8. Testing API Endpoints...%NC%

REM Test basic API endpoints
curl -f -m 10 http://localhost:8080/api/rooms >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Rooms API is working%NC%
) else (
    echo %YELLOW%! Rooms API not available%NC%
)

curl -f -m 10 http://localhost:8080/api/players >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Players API is working%NC%
) else (
    echo %YELLOW%! Players API not available%NC%
)

echo.
echo 📊 Health Test Summary:
echo Errors: %errors%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ All critical services are healthy!%NC%
    echo.
    echo %BLUE%Next steps:%NC%
    echo 1. Open Grafana: http://localhost:3000
    echo 2. Check dashboards for real-time metrics
    echo 3. Test game room creation
    echo 4. Monitor system performance
) else (
    echo.
    echo %RED%❌ Found %errors% health issues. Check service logs.%NC%
    echo.
    echo %YELLOW%Troubleshooting:%NC%
    echo - Check Docker services: docker compose ps
    echo - View logs: docker compose logs [service-name]
    echo - Restart services: docker compose restart
)

echo.
echo 🏥 Health check completed!
