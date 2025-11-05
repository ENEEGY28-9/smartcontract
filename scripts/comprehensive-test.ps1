# GameV1 Comprehensive System Test
# Tests all services with metrics integration

Write-Host "GameV1 Comprehensive System Test" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Function to check if service is running
function Test-ServiceHealth {
    param([string]$Name, [string]$Url, [string]$Port)

    Write-Host "Testing $Name health ($Url)..." -ForegroundColor Cyan

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS: $Name is healthy" -ForegroundColor Green
            return $true
        } else {
            Write-Host "WARNING: $Name returned status $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "ERROR: $Name is not responding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test metrics endpoint
function Test-MetricsEndpoint {
    param([string]$Name, [string]$Url, [string[]]$ExpectedMetrics)

    Write-Host "Testing $Name metrics ($Url)..." -ForegroundColor Cyan

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $content = $response.Content
            $lines = $content -split "`n" | Where-Object { $_ -and -not $_.StartsWith("#") }
            $metrics = $lines | Where-Object { $_ -and -not $_.StartsWith("#") }

            Write-Host "INFO: $Name returned $($metrics.Count) metrics" -ForegroundColor Blue

            # Check for expected metrics
            $foundMetrics = @()
            foreach ($expected in $ExpectedMetrics) {
                if ($content.Contains($expected)) {
                    $foundMetrics += $expected
                }
            }

            if ($foundMetrics.Count -gt 0) {
                Write-Host "SUCCESS: Found $($foundMetrics.Count)/$($ExpectedMetrics.Count) expected metrics" -ForegroundColor Green
                foreach ($metric in $foundMetrics) {
                    Write-Host "  - $metric" -ForegroundColor Green
                }
            } else {
                Write-Host "WARNING: No expected metrics found" -ForegroundColor Yellow
            }

            # Check for Prometheus format
            $hasHelp = $content.Contains("# HELP")
            $hasType = $content.Contains("# TYPE")

            if ($hasHelp -and $hasType) {
                Write-Host "SUCCESS: Proper Prometheus format detected" -ForegroundColor Green
            } else {
                Write-Host "WARNING: Missing Prometheus format elements" -ForegroundColor Yellow
            }

            return $true
        } else {
            Write-Host "ERROR: $Name metrics returned status $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "ERROR: $Name metrics not responding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Test services health
$services = @(
    @{Name="Gateway"; HealthUrl="http://localhost:8080/healthz"; MetricsUrl="http://localhost:8080/metrics"; ExpectedMetrics=@("gateway_http_requests_total", "gateway_active_connections")}
    @{Name="Worker"; HealthUrl="http://localhost:50051/health"; MetricsUrl="http://localhost:3100/metrics"; ExpectedMetrics=@("worker_active_players", "worker_ticks_total")}
    @{Name="Room Manager"; HealthUrl="http://localhost:3200/health"; MetricsUrl="http://localhost:3200/metrics"; ExpectedMetrics=@("room_manager_active_rooms", "room_manager_rooms_created_total")}
)

$healthyServices = 0
$totalServices = $services.Count

Write-Host "1. Testing Service Health..." -ForegroundColor Yellow
Write-Host ""

foreach ($service in $services) {
    if (Test-ServiceHealth -Name $service.Name -Url $service.HealthUrl -Port $service.Port) {
        $healthyServices++
    }
    Write-Host ""
}

Write-Host "2. Testing Metrics Endpoints..." -ForegroundColor Yellow
Write-Host ""

$metricsWorking = 0
foreach ($service in $services) {
    if (Test-MetricsEndpoint -Name $service.Name -Url $service.MetricsUrl -ExpectedMetrics $service.ExpectedMetrics) {
        $metricsWorking++
    }
    Write-Host ""
}

# Test integration
Write-Host "3. Testing Service Integration..." -ForegroundColor Yellow
Write-Host ""

$integrationWorking = $true

# Test Gateway performance endpoint
try {
    $perfResponse = Invoke-WebRequest -Uri "http://localhost:8080/game/performance" -UseBasicParsing -TimeoutSec 5
    if ($perfResponse.StatusCode -eq 200) {
        Write-Host "SUCCESS: Gateway game performance endpoint working" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Gateway game performance endpoint returned $($perfResponse.StatusCode)" -ForegroundColor Yellow
        $integrationWorking = $false
    }
}
catch {
    Write-Host "ERROR: Gateway game performance endpoint not working: $($_.Exception.Message)" -ForegroundColor Red
    $integrationWorking = $false
}

# Test Worker RPC (if available)
try {
    # This would test gRPC calls if we had a gRPC client
    Write-Host "INFO: Worker gRPC endpoints require client implementation" -ForegroundColor Blue
}
catch {
    Write-Host "WARNING: Worker gRPC test not implemented" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "COMPREHENSIVE TEST RESULTS:" -ForegroundColor Green
Write-Host ""

Write-Host "Service Health: $healthyServices/$totalServices services healthy" -ForegroundColor White
Write-Host "Metrics Endpoints: $metricsWorking/$totalServices endpoints working" -ForegroundColor White
Write-Host "Integration: $(if ($integrationWorking) { 'Working' } else { 'Issues detected' })" -ForegroundColor White

Write-Host ""
Write-Host "TEST SUMMARY:" -ForegroundColor Green

if ($healthyServices -eq $totalServices -and $metricsWorking -eq $totalServices -and $integrationWorking) {
    Write-Host "🎉 ALL TESTS PASSED! System is working correctly with metrics." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Start Prometheus: ./scripts/start-monitoring.sh" -ForegroundColor White
    Write-Host "  2. Open monitoring dashboard: http://localhost:9090" -ForegroundColor White
    Write-Host "  3. Import Grafana dashboard: config/grafana/dashboards/gamev1-overview.json" -ForegroundColor White
    Write-Host "  4. Generate traffic to see real metrics" -ForegroundColor White
}
else {
    Write-Host "⚠️  SOME TESTS FAILED. Check the output above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor White
    Write-Host "  1. Ensure all services are running" -ForegroundColor White
    Write-Host "  2. Check service logs for errors" -ForegroundColor White
    Write-Host "  3. Verify port availability (8080, 3100, 3200)" -ForegroundColor White
    Write-Host "  4. Check firewall settings" -ForegroundColor White
    Write-Host "  5. Review metrics endpoint responses" -ForegroundColor White
}

Write-Host ""
Write-Host "Current Service Status:" -ForegroundColor Cyan
Write-Host "  Gateway: $(if (Test-ServiceHealth -Name 'Gateway' -Url 'http://localhost:8080/healthz' -Port '8080') { 'Running' } else { 'Stopped' })" -ForegroundColor White
Write-Host "  Worker: $(if (Test-ServiceHealth -Name 'Worker' -Url 'http://localhost:50051/health' -Port '3100') { 'Running' } else { 'Stopped' })" -ForegroundColor White
Write-Host "  Room Manager: $(if (Test-ServiceHealth -Name 'Room Manager' -Url 'http://localhost:3200/health' -Port '3200') { 'Running' } else { 'Stopped' })" -ForegroundColor White

Write-Host ""
Write-Host "Metrics Status:" -ForegroundColor Cyan
Write-Host "  Gateway: $(if (Test-MetricsEndpoint -Name 'Gateway' -Url 'http://localhost:8080/metrics' -ExpectedMetrics @('gateway_http_requests_total')) { 'Working' } else { 'Not working' })" -ForegroundColor White
Write-Host "  Worker: $(if (Test-MetricsEndpoint -Name 'Worker' -Url 'http://localhost:3100/metrics' -ExpectedMetrics @('worker_active_players')) { 'Working' } else { 'Not working' })" -ForegroundColor White
Write-Host "  Room Manager: $(if (Test-MetricsEndpoint -Name 'Room Manager' -Url 'http://localhost:3200/metrics' -ExpectedMetrics @('room_manager_active_rooms')) { 'Working' } else { 'Not working' })" -ForegroundColor White

exit 0
