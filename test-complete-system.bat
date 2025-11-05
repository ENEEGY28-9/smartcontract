@echo off
REM Complete GameV1 System Test Suite
REM Runs all tests in the correct order

echo 🎯 GameV1 Complete System Test Suite...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set total_errors=0
set total_warnings=0

echo.
echo %BLUE%=== System Test Suite Starting ===%NC%
echo.

REM Test 1: Health endpoints
echo %BLUE%Test 1: Health Endpoints%NC%
call scripts\test-health-endpoints.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 2: Metrics Collection%NC%
call scripts\test-metrics-collection.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 3: API Endpoints%NC%
call scripts\test-api-endpoints.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 4: WebSocket Setup%NC%
call scripts\test-websocket.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 5: Monitoring System%NC%
call scripts\verify-monitoring.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 6: Demo Game Session%NC%
call scripts\demo-game-session.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo %BLUE%Test 7: Load and Performance%NC%
call scripts\test-load-performance.bat
if %errorlevel% neq 0 (
    set /a total_errors+=1
)

echo.
echo 🎯 Complete System Test Summary:
echo Total Errors: %total_errors%

if %total_errors% equ 0 (
    echo.
    echo %GREEN%🎉 ALL TESTS PASSED!%NC%
    echo.
    echo %BLUE%System Status:%NC%
    echo ✅ All services running
    echo ✅ Health endpoints responding
    echo ✅ Metrics collection working
    echo ✅ API endpoints functional
    echo ✅ WebSocket ready
    echo ✅ Monitoring system operational
    echo ✅ Game session demo successful
    echo ✅ Performance tests passed
    echo.
    echo %GREEN%🚀 GameV1 is PRODUCTION READY!%NC%
    echo.
    echo %BLUE%Next steps:%NC%
    echo 1. Monitor dashboards: http://localhost:3000
    echo 2. Test real gameplay scenarios
    echo 3. Scale services as needed
    echo 4. Set up production alerts
) else (
    echo.
    echo %RED%❌ %total_errors% test(s) failed.%NC%
    echo.
    echo %YELLOW%Review test outputs above for details.%NC%
    echo Run individual tests for detailed diagnostics:
    echo - scripts\test-health-endpoints.bat
    echo - scripts\test-metrics-collection.bat
    echo - scripts\test-api-endpoints.bat
    echo - scripts\verify-monitoring.bat
)

echo.
echo 🎯 Complete system test suite finished!
