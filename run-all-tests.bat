@echo off
REM GameV1 Complete Test Runner
REM Runs all tests and provides comprehensive system validation

echo 🎯 GameV1 Complete System Validation...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set start_time=%time%
set total_tests=0
set passed_tests=0
set failed_tests=0

echo.
echo %BLUE%=== Starting Complete System Validation ===%NC%
echo.

REM Test 1: System Configuration
echo %BLUE%Test 1: System Configuration%NC%
echo Running configuration validation...
.\test-config.bat
if %errorlevel% equ 0 (
    echo %GREEN%✓ Configuration test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Configuration test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 2: Health Endpoints
echo %BLUE%Test 2: Health Endpoints%NC%
echo Testing all health endpoints...
call scripts\test-health-endpoints.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Health endpoints test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Health endpoints test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 3: Metrics Collection
echo %BLUE%Test 3: Metrics Collection%NC%
echo Testing metrics collection system...
call scripts\test-metrics-collection.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Metrics collection test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Metrics collection test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 4: API Endpoints
echo %BLUE%Test 4: API Endpoints%NC%
echo Testing all API endpoints...
call scripts\test-api-endpoints.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ API endpoints test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ API endpoints test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 5: Monitoring System
echo %BLUE%Test 5: Monitoring System%NC%
echo Verifying complete monitoring setup...
call scripts\verify-monitoring.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Monitoring system test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Monitoring system test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 6: Demo Game Session
echo %BLUE%Test 6: Demo Game Session%NC%
echo Running complete game session demo...
call scripts\demo-game-session.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Game session demo passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Game session demo failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.

REM Test 7: Load Performance
echo %BLUE%Test 7: Load Performance%NC%
echo Testing system under load...
call scripts\test-load-performance.bat >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Load performance test passed%NC%
    set /a passed_tests+=1
) else (
    echo %RED%✗ Load performance test failed%NC%
    set /a failed_tests+=1
)
set /a total_tests+=1

echo.
echo %BLUE%=== Test Results Summary ===%NC%
echo.

set end_time=%time%

echo Total Tests: %total_tests%
echo Passed: %passed_tests%
echo Failed: %failed_tests%

REM Calculate success rate
if %total_tests% gtr 0 (
    set /a success_rate=100*%passed_tests%/%total_tests%
) else (
    set success_rate=0
)

echo Success Rate: %success_rate%%%

echo.

if %failed_tests% equ 0 (
    echo %GREEN%🎉 ALL TESTS PASSED!%NC%
    echo.
    echo %BLUE%System Status:%NC%
    echo ✅ Configuration: Valid
    echo ✅ Services: All running and healthy
    echo ✅ Metrics: Collection working
    echo ✅ APIs: All endpoints functional
    echo ✅ Monitoring: Complete system operational
    echo ✅ Game Demo: Full session successful
    echo ✅ Performance: Load tests passed
    echo.
    echo %GREEN%🚀 GameV1 is PRODUCTION READY!%NC%
    echo.
    echo %BLUE%Access Points:%NC%
    echo • Grafana: http://localhost:3000 (admin/gamev1_admin_2024)
    echo • Prometheus: http://localhost:9090
    echo • Game API: http://localhost:8080
    echo • PocketBase: http://localhost:8090
    echo.
    echo %YELLOW%Next Steps:%NC%
    echo 1. Monitor real-time dashboards
    echo 2. Test gameplay scenarios
    echo 3. Scale services as needed
    echo 4. Configure production alerts

) else (
    echo %RED%❌ %failed_tests% test(s) failed.%NC%
    echo.
    echo %YELLOW%Failed Tests:%NC%
    if %failed_tests% geq 1 echo • Configuration issues
    if %failed_tests% geq 2 echo • Health endpoint problems
    if %failed_tests% geq 3 echo • Metrics collection issues
    if %failed_tests% geq 4 echo • API functionality problems
    if %failed_tests% geq 5 echo • Monitoring system issues
    if %failed_tests% geq 6 echo • Game session problems
    if %failed_tests% geq 7 echo • Performance issues
    echo.
    echo %BLUE%Troubleshooting:%NC%
    echo 1. Check service logs: docker compose logs
    echo 2. Verify Docker services: docker compose ps
    echo 3. Run individual tests for details
    echo 4. See TROUBLESHOOTING-GUIDE.md for help
)

echo.
echo Test Duration: %start_time% - %end_time%
echo.
echo 🎯 Complete system validation finished!

REM Exit with appropriate code
if %failed_tests% equ 0 (
    exit /b 0
) else (
    exit /b 1
)
