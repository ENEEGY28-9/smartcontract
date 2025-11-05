Write-Host "=== Testing System Endpoints ===" -ForegroundColor Cyan

# Test Gateway endpoints
Write-Host "`n1. Testing Gateway endpoints..." -ForegroundColor Blue

$endpoints = @(
    "http://localhost:8080/healthz",
    "http://localhost:8080/api/rooms/list",
    "http://localhost:8080/api/games/list"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ $endpoint - OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ $endpoint - Failed" -ForegroundColor Red
    }
}

# Test Client
Write-Host "`n2. Testing Client..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Client - OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Client - Failed" -ForegroundColor Red
}

# Test PocketBase
Write-Host "`n3. Testing PocketBase..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8090/_/" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ PocketBase - OK" -ForegroundColor Green
} catch {
    Write-Host "❌ PocketBase - Failed" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
