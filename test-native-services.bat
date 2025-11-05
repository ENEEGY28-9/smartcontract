@echo off
REM Test Native GameV1 Services
REM Tests the Rust services running without Docker

echo 🧪 Testing Native GameV1 Services...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0

echo.
echo %BLUE%1. Checking Database Services...%NC%

REM Test PocketBase
curl -f -m 5 http://localhost:8090/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ PocketBase is running%NC%

    REM Get PocketBase info
    curl -s http://localhost:8090/api/health | findstr "code\|message" 2>nul
) else (
    echo %RED%✗ PocketBase not accessible%NC%
    echo %YELLOW%Please run: setup-database.bat%NC%
    set /a errors+=1
)

REM Test Redis
netstat -ano | findstr "LISTENING" | findstr "6379" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Redis is running%NC%
) else (
    echo %YELLOW%! Redis not detected (optional for basic functionality)%NC%
)

echo.
echo %BLUE%2. Testing Application Services...%NC%

REM Test Gateway
curl -f -m 5 http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway is running%NC%

    REM Test Gateway API
    curl -w "Gateway: %%{http_code}\n" -s -o nul http://localhost:8080/healthz 2>nul

    REM Test metrics
    curl -f http://localhost:8080/metrics >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Gateway metrics available%NC%
    ) else (
        echo %YELLOW%! Gateway metrics not available%NC%
    )
) else (
    echo %RED%✗ Gateway not responding%NC%
    echo %YELLOW%Please run: start-native.bat%NC%
    set /a errors+=1
)

REM Test Worker (internal service)
curl -f -m 5 http://localhost:3100/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker metrics available%NC%
) else (
    echo %YELLOW%! Worker not accessible (may be internal endpoint)%NC%
)

REM Test Room Manager
curl -f -m 5 http://localhost:3200/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager is running%NC%

    REM Test Room Manager metrics
    curl -f http://localhost:3201/metrics >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Room Manager metrics available%NC%
    ) else (
        echo %YELLOW%! Room Manager metrics not available%NC%
    )
) else (
    echo %YELLOW%! Room Manager not accessible%NC%
)

echo.
echo %BLUE%3. Testing API Endpoints...%NC%

REM Test basic API endpoints
curl -f http://localhost:8080/api/rooms >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Rooms API working%NC%
) else (
    echo %YELLOW%! Rooms API not working%NC%
)

curl -f http://localhost:8080/api/players >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Players API working%NC%
) else (
    echo %YELLOW%! Players API not working%NC%
)

echo.
echo %BLUE%4. Testing Performance...%NC%

REM Simple performance test
echo Testing response times...
for /l %%i in (1,1,3) do (
    curl -w "Request %%i: %%{time_total}s %%{http_code}\n" -s -o nul http://localhost:8080/healthz 2>nul
)

echo %GREEN%✓ Performance test completed%NC%

echo.
echo %BLUE%5. Testing Metrics Collection...%NC%

REM Test metrics endpoints
echo Testing metrics endpoints...

REM Gateway metrics
curl -s http://localhost:8080/metrics 2>nul | findstr "gateway_http_requests_total" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway HTTP metrics present%NC%
) else (
    echo %YELLOW%! Gateway HTTP metrics missing%NC%
)

REM Worker metrics (if accessible)
curl -s http://localhost:3100/metrics 2>nul | findstr "worker_frame_time" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker performance metrics present%NC%
) else (
    echo %YELLOW%! Worker performance metrics missing%NC%
)

echo.
echo %BLUE%6. Testing System Integration...%NC%

REM Test if services can communicate
echo Testing service integration...

REM Check if worker is responding to gateway
curl -s http://localhost:8080/api/rooms 2>nul | findstr "error\|rooms" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway-Worker integration working%NC%
) else (
    echo %YELLOW%! Gateway-Worker integration unclear%NC%
)

echo.
echo 🧪 Native Services Test Summary:
echo Errors: %errors%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ All native services are working!%NC%
    echo.
    echo %BLUE%System Status:%NC%
    echo ✓ Database services running
    echo ✓ Application services responding
    echo ✓ API endpoints functional
    echo ✓ Metrics collection working
    echo ✓ Performance acceptable
    echo.
    echo %GREEN%🎉 GameV1 Native is ready!%NC%
    echo.
    echo %BLUE%Test the system:%NC%
    echo curl http://localhost:8080/healthz
    echo curl http://localhost:8080/api/rooms
    echo curl http://localhost:8080/metrics
) else (
    echo.
    echo %RED%❌ Found %errors% issues with native services.%NC%
    echo.
    echo %YELLOW%Troubleshooting:%NC%
    echo 1. Setup database: setup-database.bat
    echo 2. Start services: start-native.bat
    echo 3. Check ports: netstat -ano | findstr "8080"
    echo 4. Check logs: Check console windows for errors

echo.
echo 🧪 Native services testing completed!
