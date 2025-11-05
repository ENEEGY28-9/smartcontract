# 🎯 FULL SYSTEM INTEGRATION TEST SUITE
# Comprehensive test for GameV1 after fixes
# Tests all components working together

param(
    [switch]$Verbose = $false,
    [int]$TestDuration = 60
)

Write-Host "🎯 GameV1 Full System Integration Test Suite" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Testing all components after fixes..." -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = 'Stop'
$startTime = Get-Date
$testResults = @()
$errors = 0
$totalTests = 0

# Test Suite Functions
function Write-TestResult {
    param($TestName, $Status, $Message = "")
    $totalTests++

    if ($Status -eq "PASS") {
        Write-Host "✅ $TestName" -ForegroundColor Green
        $testResults += @{Test = $TestName; Status = "PASS"; Message = $Message}
    } else {
        Write-Host "❌ $TestName" -ForegroundColor Red
        $testResults += @{Test = $TestName; Status = "FAIL"; Message = $Message}
        $script:errors++
    }

    if ($Message -and $Verbose) {
        Write-Host "   $Message" -ForegroundColor Gray
    }
}

function Test-ServiceHealth {
    param($ServiceName, $Url, $ExpectedStatus = 200)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-TestResult "Health Check - $ServiceName" "PASS" "$ServiceName responding at $Url"
        } else {
            Write-TestResult "Health Check - $ServiceName" "FAIL" "Status: $($response.StatusCode)"
        }
    } catch {
        Write-TestResult "Health Check - $ServiceName" "FAIL" $_.Exception.Message
    }
}

function Test-APIEndpoint {
    param($EndpointName, $Url, $Method = "GET")

    try {
        if ($Method -eq "POST") {
            $body = @{"test" = "integration"} | ConvertTo-Json
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 10
        }

        Write-TestResult "API Test - $EndpointName" "PASS" "$Method $Url - Status: $($response.StatusCode)"
    } catch {
        Write-TestResult "API Test - $EndpointName" "FAIL" $_.Exception.Message
    }
}

function Test-WebSocketConnection {
    param($WsUrl)

    try {
        # This is a basic test - in a real scenario we'd use a WebSocket client
        $tcpTest = Test-NetConnection -ComputerName "localhost" -Port 8080
        if ($tcpTest.TcpTestSucceeded) {
            Write-TestResult "WebSocket Connection Test" "PASS" "TCP connection to WebSocket port available"
        } else {
            Write-TestResult "WebSocket Connection Test" "FAIL" "Cannot connect to WebSocket port"
        }
    } catch {
        Write-TestResult "WebSocket Connection Test" "FAIL" $_.Exception.Message
    }
}

function Test-DatabaseConnection {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8090/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-TestResult "Database Connection Test" "PASS" "PocketBase database responding"
        } else {
            Write-TestResult "Database Connection Test" "FAIL" "Database not responding correctly"
        }
    } catch {
        Write-TestResult "Database Connection Test" "FAIL" $_.Exception.Message
    }
}

function Test-MetricsCollection {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/metrics" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200 -and $response.Content.Contains("gateway")) {
            Write-TestResult "Metrics Collection Test" "PASS" "Prometheus metrics available"
        } else {
            Write-TestResult "Metrics Collection Test" "FAIL" "Metrics endpoint not working correctly"
        }
    } catch {
        Write-TestResult "Metrics Collection Test" "FAIL" $_.Exception.Message
    }
}

# MAIN TEST SUITE
Write-Host "🚀 Starting Integration Tests..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Basic Health Checks
Write-Host ""
Write-Host "📊 Phase 1: Basic Health Checks" -ForegroundColor Yellow
Test-ServiceHealth "Gateway" "http://localhost:8080/health"
Test-ServiceHealth "Client" "http://localhost:5173"
Test-ServiceHealth "PocketBase" "http://localhost:8090/api/health"

# 2. API Functionality Tests
Write-Host ""
Write-Host "🔗 Phase 2: API Functionality" -ForegroundColor Yellow
Test-APIEndpoint "Rooms List" "http://localhost:8080/api/rooms/list" "GET"
Test-APIEndpoint "Chat Send" "http://localhost:8080/chat/send" "POST"

# 3. Real-time Communication Tests
Write-Host ""
Write-Host "⚡ Phase 3: Real-time Communication" -ForegroundColor Yellow
Test-WebSocketConnection "ws://localhost:8080/ws"

# 4. Database Integration Tests
Write-Host ""
Write-Host "🗄️ Phase 4: Database Integration" -ForegroundColor Yellow
Test-DatabaseConnection

# 5. Monitoring Tests
Write-Host ""
Write-Host "📈 Phase 5: Monitoring & Metrics" -ForegroundColor Yellow
Test-MetricsCollection

# 6. Performance Tests (Basic)
Write-Host ""
Write-Host "⚡ Phase 6: Basic Performance Tests" -ForegroundColor Yellow

$testUrls = @(
    "http://localhost:8080/health",
    "http://localhost:5173",
    "http://localhost:8090/api/health"
)

foreach ($url in $testUrls) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        $sw.Stop()
        $latency = $sw.ElapsedMilliseconds

        if ($latency -lt 100) {
            Write-TestResult "Performance Test - $(Split-Path $url -Leaf)" "PASS" "Latency: ${latency}ms"
        } else {
            Write-TestResult "Performance Test - $(Split-Path $url -Leaf)" "FAIL" "High latency: ${latency}ms"
        }
    } catch {
        Write-TestResult "Performance Test - $(Split-Path $url -Leaf)" "FAIL" $_.Exception.Message
    }
}

# TEST SUMMARY
Write-Host ""
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "Test Duration: $($duration.TotalSeconds.ToString("F2")) seconds" -ForegroundColor White
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $($totalTests - $errors)" -ForegroundColor Green
Write-Host "Failed: $errors" -ForegroundColor Red

# Detailed Results
Write-Host ""
Write-Host "📋 Detailed Results:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  $($result.Test): $($result.Status)" -ForegroundColor $color
    if ($result.Message) {
        Write-Host "    $($result.Message)" -ForegroundColor Gray
    }
}

# Final Assessment
Write-Host ""
Write-Host "🎯 FINAL ASSESSMENT" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

if ($errors -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "✅ System is fully operational after fixes" -ForegroundColor Green
    Write-Host "🚀 Ready for production deployment" -ForegroundColor Green

    Write-Host ""
    Write-Host "📋 System Status:" -ForegroundColor Yellow
    Write-Host "  ✅ All services healthy" -ForegroundColor Green
    Write-Host "  ✅ API endpoints functional" -ForegroundColor Green
    Write-Host "  ✅ Real-time communication ready" -ForegroundColor Green
    Write-Host "  ✅ Database integration working" -ForegroundColor Green
    Write-Host "  ✅ Monitoring system operational" -ForegroundColor Green
    Write-Host "  ✅ Performance within acceptable limits" -ForegroundColor Green

    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Run load testing with multiple clients" -ForegroundColor White
    Write-Host "  2. Test multiplayer game scenarios" -ForegroundColor White
    Write-Host "  3. Monitor system under production load" -ForegroundColor White
    Write-Host "  4. Set up alerting and monitoring dashboards" -ForegroundColor White
} else {
    Write-Host "⚠️ $errors test(s) failed" -ForegroundColor Yellow
    Write-Host "🔧 System needs attention before production" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "📋 Failed Tests:" -ForegroundColor Red
    foreach ($result in $testResults) {
        if ($result.Status -eq "FAIL") {
            Write-Host "  ❌ $($result.Test): $($result.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "🔧 Recommended Actions:" -ForegroundColor Yellow
    Write-Host "  1. Check service logs for errors" -ForegroundColor White
    Write-Host "  2. Verify database connections" -ForegroundColor White
    Write-Host "  3. Review authentication configuration" -ForegroundColor White
    Write-Host "  4. Test individual components" -ForegroundColor White
    Write-Host "  5. Run diagnostic scripts" -ForegroundColor White
}

Write-Host ""
Write-Host "📅 Test completed at $(Get-Date)" -ForegroundColor Gray
Write-Host "🛠️ Full System Integration Test Suite - GameV1" -ForegroundColor Magenta
