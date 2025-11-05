# Very Simple Test Script

Write-Host "=== Very Simple Test ===" -ForegroundColor Cyan

# Test 1: PocketBase Health
Write-Host "1. Testing PocketBase..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET
    Write-Host "✓ PocketBase OK: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Room Manager
Write-Host "2. Testing Room Manager..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method GET
    Write-Host "✓ Room Manager OK: $($response.rooms.Count) rooms" -ForegroundColor Green
} catch {
    Write-Host "✗ Room Manager FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: PocketBase Collections
Write-Host "3. Testing PocketBase Collections..." -ForegroundColor Yellow
try {
    $authBody = @{
        identity = "admin2@pocketbase.local"
        password = "admin123456"
    } | ConvertTo-Json

    $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $authResponse.token

    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers
    Write-Host "✓ Collections OK: $($collections.Count) collections" -ForegroundColor Green

    $roomsColl = $collections | Where-Object { $_.name -eq "rooms" }
    if ($roomsColl) {
        Write-Host "✓ Rooms collection exists" -ForegroundColor Green
    } else {
        Write-Host "✗ Rooms collection missing" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Collections FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
