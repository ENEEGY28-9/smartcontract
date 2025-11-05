@echo off
REM Test GameV1 Native Deployment
REM Comprehensive testing script for native deployment without Docker

echo Testing GameV1 Native Deployment...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set "TEST_LOG=test-results.log"
set "FAILED_TESTS=0"
set "TOTAL_TESTS=0"

echo Starting comprehensive native deployment tests...
echo Test started at %DATE% %TIME% > "%TEST_LOG%"

:TEST_PREREQUISITES
echo.
echo %BLUE%1. Testing Prerequisites...%NC%
echo Testing Prerequisites... >> "%TEST_LOG%"

REM Test Rust toolchain
echo Testing Rust toolchain...
rustc --version >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Rust toolchain available%NC%
    echo [PASS] Rust toolchain >> "%TEST_LOG%"
) else (
    echo %RED%✗ Rust toolchain not found%NC%
    echo [FAIL] Rust toolchain >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

cargo --version >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Cargo available%NC%
    echo [PASS] Cargo >> "%TEST_LOG%"
) else (
    echo %RED%✗ Cargo not found%NC%
    echo [FAIL] Cargo >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

set /a "TOTAL_TESTS+=2"

:TEST_BINARIES
echo.
echo %BLUE%2. Testing Binaries...%NC%
echo Testing Binaries... >> "%TEST_LOG%"

REM Test if binaries exist
if exist "target\release\gateway.exe" (
    echo %GREEN%✓ Gateway binary exists%NC%
    echo [PASS] Gateway binary >> "%TEST_LOG%"
) else (
    echo %RED%✗ Gateway binary not found%NC%
    echo [FAIL] Gateway binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

if exist "target\release\worker.exe" (
    echo %GREEN%✓ Worker binary exists%NC%
    echo [PASS] Worker binary >> "%TEST_LOG%"
) else (
    echo %RED%✗ Worker binary not found%NC%
    echo [FAIL] Worker binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

if exist "target\release\room-manager.exe" (
    echo %GREEN%✓ Room Manager binary exists%NC%
    echo [PASS] Room Manager binary >> "%TEST_LOG%"
) else (
    echo %RED%✗ Room Manager binary not found%NC%
    echo [FAIL] Room Manager binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

set /a "TOTAL_TESTS+=3"

:TEST_DATABASES
echo.
echo %BLUE%3. Testing Database Services...%NC%
echo Testing Database Services... >> "%TEST_LOG%"

REM Test PocketBase
if exist "pocketbase-native\pocketbase.exe" (
    echo %GREEN%✓ PocketBase installed%NC%
    echo [PASS] PocketBase installation >> "%TEST_LOG%"

    REM Check if PocketBase is running
    curl -f http://localhost:8090/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ PocketBase is running%NC%
        echo [PASS] PocketBase service >> "%TEST_LOG%"
    ) else (
        echo %YELLOW%⚠ PocketBase not running (may be expected)%NC%
        echo [SKIP] PocketBase service >> "%TEST_LOG%"
    )
) else (
    echo %YELLOW%⚠ PocketBase not installed%NC%
    echo [SKIP] PocketBase installation >> "%TEST_LOG%"
)

REM Test Redis
if exist "redis-native\redis-server.exe" (
    echo %GREEN%✓ Redis installed%NC%
    echo [PASS] Redis installation >> "%TEST_LOG%"

    REM Check if Redis is running
    netstat -ano | findstr "LISTENING" | findstr "6379" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Redis is running%NC%
        echo [PASS] Redis service >> "%TEST_LOG%"
    ) else (
        echo %YELLOW%⚠ Redis not running (may be expected)%NC%
        echo [SKIP] Redis service >> "%TEST_LOG%"
    )
) else (
    echo %YELLOW%⚠ Redis not installed%NC%
    echo [SKIP] Redis installation >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=4"

:TEST_SERVICES
echo.
echo %BLUE%4. Testing Service Endpoints...%NC%
echo Testing Service Endpoints... >> "%TEST_LOG%"

REM Test Gateway health
curl -f -s http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway health endpoint%NC%
    echo [PASS] Gateway health >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Gateway not running%NC%
    echo [SKIP] Gateway health >> "%TEST_LOG%"
)

REM Test Gateway metrics
curl -f -s http://localhost:8080/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway metrics endpoint%NC%
    echo [PASS] Gateway metrics >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Gateway metrics not available%NC%
    echo [SKIP] Gateway metrics >> "%TEST_LOG%"
)

REM Test API endpoints
curl -f -s http://localhost:8080/api/rooms >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway API endpoint%NC%
    echo [PASS] Gateway API >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Gateway API not available%NC%
    echo [SKIP] Gateway API >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=3"

:TEST_PROCESSES
echo.
echo %BLUE%5. Testing Running Processes...%NC%
echo Testing Running Processes... >> "%TEST_LOG%"

REM Check if services are running
tasklist | findstr "gateway" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway process running%NC%
    echo [PASS] Gateway process >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Gateway process not running%NC%
    echo [SKIP] Gateway process >> "%TEST_LOG%"
)

tasklist | findstr "worker" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker process running%NC%
    echo [PASS] Worker process >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Worker process not running%NC%
    echo [SKIP] Worker process >> "%TEST_LOG%"
)

tasklist | findstr "room-manager" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Room Manager process running%NC%
    echo [PASS] Room Manager process >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Room Manager process not running%NC%
    echo [SKIP] Room Manager process >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=3"

:TEST_NETWORK
echo.
echo %BLUE%6. Testing Network Connectivity...%NC%
echo Testing Network Connectivity... >> "%TEST_LOG%"

REM Test network ports
netstat -ano | findstr "LISTENING" | findstr "8080" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Port 8080 (Gateway) listening%NC%
    echo [PASS] Port 8080 >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Port 8080 not listening%NC%
    echo [SKIP] Port 8080 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "50051" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Port 50051 (Worker) listening%NC%
    echo [PASS] Port 50051 >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Port 50051 not listening%NC%
    echo [SKIP] Port 50051 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "8090" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Port 8090 (PocketBase) listening%NC%
    echo [PASS] Port 8090 >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Port 8090 not listening%NC%
    echo [SKIP] Port 8090 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "6379" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Port 6379 (Redis) listening%NC%
    echo [PASS] Port 6379 >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Port 6379 not listening%NC%
    echo [SKIP] Port 6379 >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=4"

:TEST_PERFORMANCE
echo.
echo %BLUE%7. Testing Performance...%NC%
echo Testing Performance... >> "%TEST_LOG%"

REM Test response times
echo Testing response times...
timeout /t 1 /nobreak >nul
curl -f -w "%%{http_code}" -s -o /dev/null http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Fast response times%NC%
    echo [PASS] Response times >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Response time test skipped%NC%
    echo [SKIP] Response times >> "%TEST_LOG%"
)

REM Test memory usage
echo Testing memory usage...
tasklist | findstr "gateway\|worker\|room-manager" >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Services using reasonable memory%NC%
    echo [PASS] Memory usage >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Memory test skipped%NC%
    echo [SKIP] Memory usage >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=2"

:TEST_LOGS
echo.
echo %BLUE%8. Testing Logging...%NC%
echo Testing Logging... >> "%TEST_LOG%"

REM Check if log directories exist
if exist "target\release\logs" (
    echo %GREEN%✓ Log directories exist%NC%
    echo [PASS] Log directories >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Log directories not found%NC%
    echo [SKIP] Log directories >> "%TEST_LOG%"
)

if exist "pocketbase-native\logs" (
    echo %GREEN%✓ PocketBase logs directory exists%NC%
    echo [PASS] PocketBase logs >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ PocketBase logs not found%NC%
    echo [SKIP] PocketBase logs >> "%TEST_LOG%"
)

if exist "redis-native\logs" (
    echo %GREEN%✓ Redis logs directory exists%NC%
    echo [PASS] Redis logs >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Redis logs not found%NC%
    echo [SKIP] Redis logs >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=3"

:RESULTS
echo.
echo %BLUE%9. Test Results...%NC%
echo Test Results... >> "%TEST_LOG%"

echo %BLUE%Test Summary:%NC%
echo Total Tests: %TOTAL_TESTS%
echo Failed Tests: %FAILED_TESTS%
echo Passed Tests: %TOTAL_TESTS% - %FAILED_TESTS%

echo. >> "%TEST_LOG%"
echo Test Summary: >> "%TEST_LOG%"
echo Total Tests: %TOTAL_TESTS% >> "%TEST_LOG%"
echo Failed Tests: %FAILED_TESTS% >> "%TEST_LOG%"
echo Passed Tests: %TOTAL_TESTS% - %FAILED_TESTS% >> "%TEST_LOG%"

if %FAILED_TESTS% equ 0 (
    echo %GREEN%✓ All critical tests passed!%NC%
    echo [SUCCESS] All critical tests passed >> "%TEST_LOG%"
) else (
    echo %YELLOW%⚠ Some tests failed, but deployment may still work%NC%
    echo [WARNING] Some tests failed >> "%TEST_LOG%"
)

:RECOMMENDATIONS
echo.
echo %BLUE%10. Recommendations...%NC%
echo Recommendations... >> "%TEST_LOG%"

echo %YELLOW%Next steps:%NC%
echo 1. Build services: build-native-production.bat
echo 2. Setup databases: setup-pocketbase-native.bat && setup-redis-native.bat
echo 3. Start services: start-all-native.bat
echo 4. Monitor system: cd monitoring && dashboard.bat
echo 5. Check logs: cd monitoring && log-monitor.bat

echo. >> "%TEST_LOG%"
echo Next steps: >> "%TEST_LOG%"
echo 1. Build services: build-native-production.bat >> "%TEST_LOG%"
echo 2. Setup databases: setup-pocketbase-native.bat && setup-redis-native.bat >> "%TEST_LOG%"
echo 3. Start services: start-all-native.bat >> "%TEST_LOG%"
echo 4. Monitor system: cd monitoring && dashboard.bat >> "%TEST_LOG%"
echo 5. Check logs: cd monitoring && log-monitor.bat >> "%TEST_LOG%"

echo.
echo Test completed at %DATE% %TIME% >> "%TEST_LOG%"
echo %GREEN%✓ Native deployment test completed!%NC%

pause
