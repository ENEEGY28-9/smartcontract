@echo off
echo 🚀 Circuit Breaker Demo Script
echo ================================
echo.

echo 1. Starting gateway service with circuit breaker monitoring...
echo.

REM Check if gateway is running
echo Checking current service status...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null; Write-Host 'Gateway is already running' } catch { Write-Host 'Gateway not running, starting...' }"

REM Start gateway if not running
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo Starting gateway service...
    start /B cargo run --bin gateway
    timeout /t 5 /nobreak >nul
)

echo.
echo 2. Testing Circuit Breaker behavior...
echo.

REM Test normal operation
echo Testing normal circuit breaker operation...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 10 -ErrorAction SilentlyContinue | Out-Null; Write-Host 'Normal operation: OK' } catch { Write-Host 'Error during normal operation test' }"

echo.
echo 3. Testing failure scenarios...
echo.

REM Simulate some failures by calling a non-existent endpoint
echo Simulating failures to trigger circuit breaker...
for /l %%i in (1,1,10) do (
    echo Attempt %%i...
    powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/nonexistent' -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null; Write-Host 'Success' } catch { Write-Host 'Failed (expected)' }"
    timeout /t 1 /nobreak >nul
)

echo.
echo 4. Checking circuit breaker metrics...
echo.

REM Check metrics endpoint
echo Checking circuit breaker metrics...
powershell -Command "
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:8080/metrics' -TimeoutSec 5 -ErrorAction SilentlyContinue;
    $content = $response.Content;
    Write-Host 'Circuit Breaker Metrics:';
    $lines = $content -split '`n';
    $found = $false;
    foreach ($line in $lines) {
        if ($line -like '*circuit_breaker*') {
            Write-Host $line;
            $found = $true;
        }
    }
    if (-not $found) {
        Write-Host 'No circuit breaker metrics found';
    }
} catch {
    Write-Host 'Could not retrieve metrics';
}
"

echo.
echo 5. Circuit breaker demo completed!
echo Check the gateway logs and metrics to see circuit breaker behavior.
echo.

echo Demo script finished. Gateway is still running in background.
echo To stop the gateway, close this window or use Task Manager.
pause
