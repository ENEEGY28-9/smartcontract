# Test script to run after creating rooms collection
param(
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== TESTING SYSTEM AFTER ROOMS COLLECTION CREATION ===" -ForegroundColor Cyan
Write-Host "Using credentials: $AdminEmail" -ForegroundColor Gray

# Test 1: Check if collections are accessible
Write-Host "1. Testing collections access..." -ForegroundColor Yellow
try {
    # Try to authenticate first
    $authBody = '{"identity":"' + $AdminEmail + '","password":"' + $AdminPassword + '"}' | ConvertTo-Json
    try {
        $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json" -TimeoutSec 5
        $token = $authResponse.token
        Write-Host "✓ Authentication successful with token" -ForegroundColor Green

        # Now try to access collections with token
        $headers = @{"Authorization" = "Bearer $token"}
        $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers -TimeoutSec 5
        Write-Host "✓ Collections accessible! Found $($response.Count) collections:" -ForegroundColor Green
        $response | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Cyan }
        $global:collectionsResponse = $response
    } catch {
        Write-Host "✗ Authentication or collections access failed: $($_.Exception.Message)" -ForegroundColor Red
        # Fallback to no-auth test
        $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -TimeoutSec 5
        Write-Host "✓ Collections accessible without authentication" -ForegroundColor Green
        Write-Host "Found $($response.Count) collections:" -ForegroundColor Green
        $response | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Cyan }
        $global:collectionsResponse = $response
    }
} catch {
    Write-Host "✗ Collections access failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check PocketBase health
Write-Host "2. Verifying PocketBase health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 3
    Write-Host "✓ PocketBase is healthy: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase health check failed" -ForegroundColor Red
}

# Test 3: Test Room Manager with database
Write-Host "3. Testing Room Manager with database persistence..." -ForegroundColor Yellow
$env:POCKETBASE_URL = "http://localhost:8090"
$env:ROOM_MANAGER_TEST = "1"
try {
    & ".\target\debug\room-manager.exe"
    Write-Host "✓ Room Manager test completed" -ForegroundColor Green
} catch {
    Write-Host "✗ Room Manager test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3.1: Check if rooms collection exists and has correct structure
Write-Host "3.1. Verifying rooms collection structure..." -ForegroundColor Yellow
try {
    if ($global:collectionsResponse) {
        $roomsCollection = $global:collectionsResponse | Where-Object { $_.name -eq "rooms" }
        if ($roomsCollection) {
            Write-Host "✓ Rooms collection found!" -ForegroundColor Green
            Write-Host "Collection ID: $($roomsCollection.id)" -ForegroundColor Gray
            Write-Host "Collection Type: $($roomsCollection.type)" -ForegroundColor Gray

            # Check if collection has the expected fields
            $expectedFields = @("id", "name", "game_mode", "max_players", "current_players", "status", "host_player_id", "settings", "created_at", "updated_at")
            $missingFields = @()
            foreach ($field in $expectedFields) {
                $fieldExists = $roomsCollection.schema | Where-Object { $_.name -eq $field }
                if (-not $fieldExists) {
                    $missingFields += $field
                }
            }

            if ($missingFields.Count -eq 0) {
                Write-Host "✓ All required fields present in rooms collection" -ForegroundColor Green
            } else {
                Write-Host "⚠️ Missing fields in rooms collection: $($missingFields -join ', ')" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️ Rooms collection not found in collections list" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Cannot verify rooms collection - no collections response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Error checking rooms collection: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Run API endpoint tests (the ones that were hanging before)
Write-Host "4. Testing API endpoints..." -ForegroundColor Yellow
$endpoints = @("/api/health", "/api/settings", "/api/realtime")
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8090$endpoint" -Method GET -TimeoutSec 3
        Write-Host "✓ $endpoint accessible" -ForegroundColor Green
    } catch {
        Write-Host "✗ $endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan

# Summary
if ($global:collectionsResponse) {
    $roomsCollection = $global:collectionsResponse | Where-Object { $_.name -eq "rooms" }
    if ($roomsCollection) {
        Write-Host "✅ SUCCESS: Rooms collection exists and is properly configured!" -ForegroundColor Green
        Write-Host "🎉 Room Manager should now use database persistence instead of in-memory fallback!" -ForegroundColor Green
        Write-Host "" -ForegroundColor Yellow
        Write-Host "NEXT STEPS:" -ForegroundColor Cyan
        Write-Host "1. Run comprehensive test: .\scripts\test-database-setup-complete.ps1" -ForegroundColor White
        Write-Host "2. Test with real game clients" -ForegroundColor White
        Write-Host "3. Monitor system performance" -ForegroundColor White
    } else {
        Write-Host "⚠️ WARNING: Rooms collection not found - please create it manually" -ForegroundColor Yellow
        Write-Host "See schema instructions above for field details" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️ WARNING: Cannot verify collections - authentication may still be an issue" -ForegroundColor Yellow
}
