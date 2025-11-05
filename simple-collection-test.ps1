# Simple test to check if collections exist

Write-Host "=== Simple Collection Test ===" -ForegroundColor Cyan

# Test 1: Check if collections endpoint works without auth
Write-Host "1. Testing collections endpoint..." -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET
    Write-Host "+ Found $($collections.Count) collections" -ForegroundColor Green

    # Check for rooms collection
    $roomsColl = $collections | Where-Object { $_.name -eq "rooms" }
    if ($roomsColl) {
        Write-Host "+ Rooms collection exists" -ForegroundColor Green
    } else {
        Write-Host "- Rooms collection missing" -ForegroundColor Red
    }

    # Check for players collection
    $playersColl = $collections | Where-Object { $_.name -eq "players" }
    if ($playersColl) {
        Write-Host "+ Players collection exists" -ForegroundColor Green
    } else {
        Write-Host "- Players collection missing" -ForegroundColor Red
    }

} catch {
    Write-Host "- Collections endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check if we can list rooms (should work without auth)
Write-Host "2. Testing rooms listing..." -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri "http://localhost:8090/api/collections/rooms/records" -Method GET
    Write-Host "+ Found $($rooms.items.Count) rooms" -ForegroundColor Green
} catch {
    Write-Host "- Rooms listing failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
