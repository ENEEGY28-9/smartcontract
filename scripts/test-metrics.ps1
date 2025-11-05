# GameV1 Metrics Test Script (PowerShell)
# Tests all metrics endpoints and validates data collection

$services = @(
    @{
        Name = "Gateway"
        Url = "http://localhost:8080/metrics"
        Expected = @("gateway_response_time_seconds", "gateway_active_connections", "gateway_auth_success_total")
    },
    @{
        Name = "Worker"
        Url = "http://localhost:3100/metrics"
        Expected = @("worker_frame_time_seconds", "worker_rpc_calls_total", "worker_gameplay_events_total")
    },
    @{
        Name = "Room Manager"
        Url = "http://localhost:3200/metrics"
        Expected = @("room_manager_rooms_created_total", "room_manager_active_rooms")
    }
)

function Write-Colored {
    param([string]$Color, [string]$Message)
    Write-Host $Message -ForegroundColor $Color
}

function Write-Service {
    param([string]$Name, [string]$Message)
    Write-Colored "Cyan" "[$Name] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Colored "Green" "SUCCESS: $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Colored "Red" "ERROR: $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Colored "Yellow" "WARNING: $Message"
}

function Write-Info {
    param([string]$Message)
    Write-Colored "Blue" "INFO: $Message"
}

# HTTP request helper
function Invoke-MetricsRequest {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        return @{
            StatusCode = $response.StatusCode
            Data = $response.Content
            Success = $true
        }
    }
    catch {
        return @{
            StatusCode = $_.Exception.Response.StatusCode.Value
            Data = $null
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Test individual service metrics
function Test-ServiceMetrics {
    param($Service)

    $name = $Service.Name
    $url = $Service.Url
    $expected = $Service.Expected

    Write-Service $name "Testing metrics endpoint: $url"

    $response = Invoke-MetricsRequest -Url $url

    if (-not $response.Success) {
        Write-Error "$name request failed: $($response.Error)"
        return $false
    }

    if ($response.StatusCode -ne 200) {
        Write-Error "$name returned status $($response.StatusCode)"
        return $false
    }

    $metricsText = $response.Data
    $lines = $metricsText -split "`n" | Where-Object { $_ -and -not $_.StartsWith("#") }
    $metrics = $lines | Where-Object { $_ -and -not $_.StartsWith("#") }

    Write-Info "$name returned $($metrics.Count) metrics"

    # Check for expected metrics
    $foundExpected = 0
    $foundMetrics = @()

    foreach ($expectedMetric in $expected) {
        $found = $metrics | Where-Object { $_.Contains($expectedMetric) }
        if ($found) {
            $foundExpected++
            $foundMetrics += $expectedMetric
            Write-Success "Found expected metric: $expectedMetric"
        }
        else {
            Write-Warning "Missing expected metric: $expectedMetric"
        }
    }

    # Check for common metrics patterns
    $hasHelpComments = $lines | Where-Object { $_.StartsWith("# HELP") }
    $hasTypeComments = $lines | Where-Object { $_.StartsWith("# TYPE") }

    if ($hasHelpComments) {
        Write-Success "$name includes HELP comments"
    }
    else {
        Write-Warning "$name missing HELP comments"
    }

    if ($hasTypeComments) {
        Write-Success "$name includes TYPE comments"
    }
    else {
        Write-Warning "$name missing TYPE comments"
    }

    # Validate metrics format
    $invalidLines = $metrics | Where-Object {
        $parts = $_ -split " "
        $parts.Length -lt 2 -or -not ($parts[1] -match "^\d+(\.\d+)?$")
    }

    if ($invalidLines.Count -eq 0) {
        Write-Success "$name metrics format is valid"
    }
    else {
        Write-Warning "$name has $($invalidLines.Count) invalid metric lines"
    }

    # Show sample metrics
    $sampleMetrics = $metrics | Select-Object -First 5
    Write-Info "$name sample metrics:"
    foreach ($metric in $sampleMetrics) {
        Write-Host "   $metric" -ForegroundColor Magenta
    }

    return $foundExpected -eq $expected.Count
}

# Test Prometheus configuration
function Test-Prometheus {
    Write-Colored "Blue" "Testing Prometheus configuration..."

    $prometheusUrl = "http://localhost:9090/-/healthy"

    $response = Invoke-MetricsRequest -Url $prometheusUrl

    if ($response.Success -and $response.StatusCode -eq 200) {
        Write-Success "Prometheus is healthy"
        return $true
    }
    else {
        Write-Warning "Prometheus health check failed: $($response.Error)"
        return $false
    }
}

# Test Grafana (if available)
function Test-Grafana {
    Write-Colored "Blue" "Testing Grafana..."

    $grafanaUrl = "http://localhost:3000/api/health"

    $response = Invoke-MetricsRequest -Url $grafanaUrl

    if ($response.Success -and $response.StatusCode -eq 200) {
        Write-Success "Grafana is healthy"
        return $true
    }
    else {
        Write-Warning "Grafana health check failed: $($response.Error)"
        return $false
    }
}

# Main test function
$totalTests = 0
$passedTests = 0

Write-Host "GameV1 Metrics Test Suite" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Test Prometheus health
$totalTests++
if (Test-Prometheus) {
    $passedTests++
}

# Test Grafana health
$totalTests++
if (Test-Grafana) {
    $passedTests++
}

# Test each service
foreach ($service in $services) {
    $totalTests++
    if (Test-ServiceMetrics -Service $service) {
        $passedTests++
    }
}

# Summary
Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "Test Results Summary:" -ForegroundColor Green
Write-Host "   Total Tests: $totalTests" -ForegroundColor White
Write-Host "   Passed: $passedTests" -ForegroundColor White
Write-Host "   Failed: $($totalTests - $passedTests)" -ForegroundColor White
Write-Host "   Success Rate: $([math]::Round(($passedTests / $totalTests) * 100))%" -ForegroundColor White
Write-Host ""

if ($passedTests -eq $totalTests) {
    Write-Success "All tests passed! Metrics system is working correctly."
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "   1. Open Prometheus: http://localhost:9090" -ForegroundColor White
    Write-Host "   2. Open Grafana: http://localhost:3000" -ForegroundColor White
    Write-Host "   3. Import dashboard: config/grafana/dashboards/gamev1-overview.json" -ForegroundColor White
    Write-Host "   4. Start your game services to see real metrics" -ForegroundColor White
}
else {
    Write-Warning "Some tests failed. Check the output above for details."
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor White
    Write-Host "   1. Ensure all services are running" -ForegroundColor White
    Write-Host "   2. Check service logs for errors" -ForegroundColor White
    Write-Host "   3. Verify port availability" -ForegroundColor White
    Write-Host "   4. Check firewall settings" -ForegroundColor White
}

if ($passedTests -eq $totalTests) {
    exit 0
} else {
    exit 1
}
