# Simple Integration Test for GameV1
Write-Host "=== GameV1 Integration Test ===" -ForegroundColor Green

$errors = 0

# Test 1: Services Health
Write-Host "1. Testing Services..." -ForegroundColor Yellow
$services = @(
    @{name="Gateway"; url="http://localhost:8080/health"},
    @{name="Client"; url="http://localhost:5173"},
    @{name="PocketBase"; url="http://localhost:8090/api/health"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.url -UseBasicParsing -TimeoutSec 5
        Write-Host "OK $($service.name): $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "FAIL $($service.name): $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

# Test 2: API Endpoints
Write-Host ""
Write-Host "2. Testing API Endpoints..." -ForegroundColor Yellow
$apis = @(
    @{name="Rooms API"; url="http://localhost:8080/api/rooms/list"},
    @{name="Chat API"; url="http://localhost:8080/chat/send"}
)

foreach ($api in $apis) {
    try {
        if ($api.name -eq "Chat API") {
            $body = '{"message": "test"}' | Out-String
            $response = Invoke-WebRequest -Uri $api.url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        } else {
            $response = Invoke-WebRequest -Uri $api.url -UseBasicParsing -TimeoutSec 5
        }
        Write-Host "OK $($api.name): $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "FAIL $($api.name): $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

# Test 3: Database
Write-Host ""
Write-Host "3. Testing Database..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8090/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "OK Database: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "FAIL Database: $($_.Exception.Message)" -ForegroundColor Red
    $errors++
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Total Errors: $errors" -ForegroundColor White

if ($errors -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "System is ready for production!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Check system configuration." -ForegroundColor Yellow
}
