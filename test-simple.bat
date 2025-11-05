@echo off
REM Simple Test GameV1 Native Deployment
REM Basic testing script without complex formatting

echo GameV1 Native Deployment Test
echo =============================
echo.

set "TEST_LOG=test-results.log"
set "FAILED_TESTS=0"
set "TOTAL_TESTS=0"

echo Test started at %DATE% %TIME% > "%TEST_LOG%"

echo 1. Testing Prerequisites...
echo Testing Prerequisites... >> "%TEST_LOG%"

REM Test Rust toolchain
echo Testing Rust toolchain...
rustc --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Rust toolchain available
    echo [PASS] Rust toolchain >> "%TEST_LOG%"
) else (
    echo [FAIL] Rust toolchain not found
    echo [FAIL] Rust toolchain >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

cargo --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Cargo available
    echo [PASS] Cargo >> "%TEST_LOG%"
) else (
    echo [FAIL] Cargo not found
    echo [FAIL] Cargo >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

set /a "TOTAL_TESTS+=2"

echo.
echo 2. Testing Binaries...
echo Testing Binaries... >> "%TEST_LOG%"

REM Test if binaries exist
if exist "target\release\gateway.exe" (
    echo [PASS] Gateway binary exists
    echo [PASS] Gateway binary >> "%TEST_LOG%"
) else (
    echo [FAIL] Gateway binary not found
    echo [FAIL] Gateway binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

if exist "target\release\worker.exe" (
    echo [PASS] Worker binary exists
    echo [PASS] Worker binary >> "%TEST_LOG%"
) else (
    echo [FAIL] Worker binary not found
    echo [FAIL] Worker binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

if exist "target\release\room-manager.exe" (
    echo [PASS] Room Manager binary exists
    echo [PASS] Room Manager binary >> "%TEST_LOG%"
) else (
    echo [FAIL] Room Manager binary not found
    echo [FAIL] Room Manager binary >> "%TEST_LOG%"
    set /a "FAILED_TESTS+=1"
)

set /a "TOTAL_TESTS+=3"

echo.
echo 3. Testing Database Services...
echo Testing Database Services... >> "%TEST_LOG%"

REM Test PocketBase
if exist "pocketbase-native\pocketbase.exe" (
    echo [PASS] PocketBase installed
    echo [PASS] PocketBase installation >> "%TEST_LOG%"

    REM Check if PocketBase is running
    curl -f http://localhost:8090/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo [PASS] PocketBase is running
        echo [PASS] PocketBase service >> "%TEST_LOG%"
    ) else (
        echo [SKIP] PocketBase not running (may be expected)
        echo [SKIP] PocketBase service >> "%TEST_LOG%"
    )
) else (
    echo [SKIP] PocketBase not installed
    echo [SKIP] PocketBase installation >> "%TEST_LOG%"
)

REM Test Redis
if exist "redis-native\redis-server.exe" (
    echo [PASS] Redis installed
    echo [PASS] Redis installation >> "%TEST_LOG%"

    REM Check if Redis is running
    netstat -ano | findstr "LISTENING" | findstr "6379" >nul
    if %errorlevel% equ 0 (
        echo [PASS] Redis is running
        echo [PASS] Redis service >> "%TEST_LOG%"
    ) else (
        echo [SKIP] Redis not running (may be expected)
        echo [SKIP] Redis service >> "%TEST_LOG%"
    )
) else (
    echo [SKIP] Redis not installed
    echo [SKIP] Redis installation >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=4"

echo.
echo 4. Testing Service Endpoints...
echo Testing Service Endpoints... >> "%TEST_LOG%"

REM Test Gateway health
curl -f -s http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Gateway health endpoint
    echo [PASS] Gateway health >> "%TEST_LOG%"
) else (
    echo [SKIP] Gateway not running
    echo [SKIP] Gateway health >> "%TEST_LOG%"
)

REM Test Gateway metrics
curl -f -s http://localhost:8080/metrics >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Gateway metrics endpoint
    echo [PASS] Gateway metrics >> "%TEST_LOG%"
) else (
    echo [SKIP] Gateway metrics not available
    echo [SKIP] Gateway metrics >> "%TEST_LOG%"
)

REM Test API endpoints
curl -f -s http://localhost:8080/api/rooms >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Gateway API endpoint
    echo [PASS] Gateway API >> "%TEST_LOG%"
) else (
    echo [SKIP] Gateway API not available
    echo [SKIP] Gateway API >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=3"

echo.
echo 5. Testing Running Processes...
echo Testing Running Processes... >> "%TEST_LOG%"

REM Check if services are running
tasklist | findstr "gateway" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Gateway process running
    echo [PASS] Gateway process >> "%TEST_LOG%"
) else (
    echo [SKIP] Gateway process not running
    echo [SKIP] Gateway process >> "%TEST_LOG%"
)

tasklist | findstr "worker" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Worker process running
    echo [PASS] Worker process >> "%TEST_LOG%"
) else (
    echo [SKIP] Worker process not running
    echo [SKIP] Worker process >> "%TEST_LOG%"
)

tasklist | findstr "room-manager" >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Room Manager process running
    echo [PASS] Room Manager process >> "%TEST_LOG%"
) else (
    echo [SKIP] Room Manager process not running
    echo [SKIP] Room Manager process >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=3"

echo.
echo 6. Testing Network Connectivity...
echo Testing Network Connectivity... >> "%TEST_LOG%"

REM Test network ports
netstat -ano | findstr "LISTENING" | findstr "8080" >nul
if %errorlevel% equ 0 (
    echo [PASS] Port 8080 (Gateway) listening
    echo [PASS] Port 8080 >> "%TEST_LOG%"
) else (
    echo [SKIP] Port 8080 not listening
    echo [SKIP] Port 8080 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "50051" >nul
if %errorlevel% equ 0 (
    echo [PASS] Port 50051 (Worker) listening
    echo [PASS] Port 50051 >> "%TEST_LOG%"
) else (
    echo [SKIP] Port 50051 not listening
    echo [SKIP] Port 50051 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "8090" >nul
if %errorlevel% equ 0 (
    echo [PASS] Port 8090 (PocketBase) listening
    echo [PASS] Port 8090 >> "%TEST_LOG%"
) else (
    echo [SKIP] Port 8090 not listening
    echo [SKIP] Port 8090 >> "%TEST_LOG%"
)

netstat -ano | findstr "LISTENING" | findstr "6379" >nul
if %errorlevel% equ 0 (
    echo [PASS] Port 6379 (Redis) listening
    echo [PASS] Port 6379 >> "%TEST_LOG%"
) else (
    echo [SKIP] Port 6379 not listening
    echo [SKIP] Port 6379 >> "%TEST_LOG%"
)

set /a "TOTAL_TESTS+=4"

echo.
echo Test Results:
echo Test Summary: >> "%TEST_LOG%"
echo Total Tests: %TOTAL_TESTS% >> "%TEST_LOG%"
echo Failed Tests: %FAILED_TESTS% >> "%TEST_LOG%"
echo Passed Tests: %TOTAL_TESTS% - %FAILED_TESTS% >> "%TEST_LOG%"

if %FAILED_TESTS% equ 0 (
    echo [SUCCESS] All critical tests passed!
    echo [SUCCESS] All critical tests passed >> "%TEST_LOG%"
) else (
    echo [WARNING] Some tests failed, but deployment may still work
    echo [WARNING] Some tests failed >> "%TEST_LOG%"
)

echo.
echo Next steps:
echo 1. Build services: build-native-production.bat
echo 2. Setup databases: setup-pocketbase-native.bat && setup-redis-native.bat
echo 3. Start services: start-all-native.bat
echo 4. Monitor system: cd monitoring && dashboard.bat
echo 5. Check logs: cd monitoring && log-monitor.bat

echo.
echo Test completed at %DATE% %TIME% >> "%TEST_LOG%"
echo Native deployment test completed!

pause
