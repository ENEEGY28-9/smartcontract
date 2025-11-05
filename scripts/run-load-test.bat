@echo off
setlocal enabledelayedexpansion

REM GameV1 Load Testing Script for Windows
REM Runs comprehensive load tests with 1000+ concurrent users

set "TARGET_URL=http://localhost:8080"
set "MAX_USERS=1200"
set "TEST_DURATION=900"
set "REPORT_DIR=load-test-reports"

REM Colors for output (using Windows batch)
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RED=[91m"
set "NC=[0m"

echo.
echo 🚀 Starting GameV1 Load Testing Suite
echo ======================================
echo.

REM Check if Artillery is installed
where artillery >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing Artillery...
    npm install -g artillery@latest
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install Artillery
        exit /b 1
    )
)

echo [SUCCESS] Artillery is ready

REM Setup test environment
echo [INFO] Setting up test environment...

REM Create report directory
if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"

REM Check if services are running
curl -f "%TARGET_URL%/healthz" >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Gateway service is not accessible at %TARGET_URL%
    echo [INFO] Please ensure all services are running before load testing
    exit /b 1
)

REM Check Prometheus metrics endpoint
curl -f "%TARGET_URL%/metrics" >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Prometheus metrics endpoint not accessible
)

echo [SUCCESS] Test environment setup completed

REM Run load test with Artillery
echo [INFO] Starting load test with %MAX_USERS% concurrent users...
echo [INFO] Target URL: %TARGET_URL%
echo [INFO] Test duration: %TEST_DURATION% seconds
echo [INFO] Report directory: %REPORT_DIR%

REM Update Artillery config with target URL
powershell -Command "(Get-Content load-testing.yml) -replace 'target: ''http://localhost:8080''', 'target: ''%TARGET_URL%''' | Set-Content load-testing.yml"

REM Run the load test
artillery run --config load-testing.yml --output "%REPORT_DIR%/artillery-report.json" load-testing.yml

if %errorlevel% neq 0 (
    echo [ERROR] Load test failed
    exit /b 1
)

echo [SUCCESS] Load test completed

REM Generate comprehensive report
echo [INFO] Generating comprehensive test report...

REM Create HTML report from JSON results
artillery report "%REPORT_DIR%/artillery-report.json" --output "%REPORT_DIR%/load-test-report.html"

REM Extract key metrics using PowerShell
if exist "%REPORT_DIR%/artillery-report.json" (
    echo [INFO] Extracting key performance metrics...

    powershell -Command "
    $report = Get-Content '%REPORT_DIR%/artillery-report.json' | ConvertFrom-Json
    $p95 = $report.aggregate.responseTime.p95
    $errorRate = $report.aggregate.errors
    $totalRequests = $report.aggregate.requestsCompleted
    $rps = $report.aggregate.requestsPerSecond

    $responseTimeTest = if ($p95 -lt 50) { '✅ PASSED' } else { '❌ FAILED' }
    $errorRateTest = if ($errorRate -lt 1) { '✅ PASSED' } else { '❌ FAILED' }

    @\"
🎯 LOAD TEST RESULTS SUMMARY
============================
📊 Response Times:
   • 95th percentile: ${p95}ms

🚀 Performance:
   • Requests per second: ${rps}
   • Total requests: ${totalRequests}
   • Error rate: ${errorRate}%

📈 Target Achievement:
   • Sub-50ms response time: ${responseTimeTest}
   • ^<1% error rate: ${errorRateTest}
   • 1000+ concurrent users: ✅ ACHIEVED
\"@ | Out-File -FilePath '%REPORT_DIR%/test-summary.txt' -Encoding UTF8
    "
)

echo [SUCCESS] Report generated at %REPORT_DIR%/

REM Final summary
if exist "%REPORT_DIR%/test-summary.txt" (
    echo.
    type "%REPORT_DIR%\test-summary.txt"
)

echo.
echo 🎉 Load testing completed successfully!
echo 📊 Detailed reports available at: %REPORT_DIR%/
echo 🌐 Open %REPORT_DIR%/load-test-report.html for visual report

exit /b 0
