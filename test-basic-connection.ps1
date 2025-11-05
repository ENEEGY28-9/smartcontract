# Basic Connection Test Script

Write-Host "=== Basic Connection Test ===" -ForegroundColor Cyan

# Test PocketBase connection
Write-Host "Testing PocketBase connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 10
    Write-Host "✓ PocketBase is running: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Room Manager connection
Write-Host "Testing Room Manager connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method GET -TimeoutSec 10
    Write-Host "✓ Room Manager is running: Found $($response.rooms.Count) rooms" -ForegroundColor Green
} catch {
    Write-Host "✗ Room Manager connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test if collections exist in PocketBase
Write-Host "Checking PocketBase collections..." -ForegroundColor Yellow
try {
    # First authenticate as admin
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
    Write-Host "✓ Found $($collections.Count) collections" -ForegroundColor Green

    $roomsCollection = $collections | Where-Object { $_.name -eq "rooms" }
    if ($roomsCollection) {
        Write-Host "✓ Rooms collection exists" -ForegroundColor Green

        # Test creating a room
        Write-Host "Testing room creation..." -ForegroundColor Yellow
        $roomData = @{
            id = "test-$(Get-Random -Minimum 1000 -Maximum 9999)"
            name = "Test Room $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            game_mode = "deathmatch"
            max_players = 4
            current_players = 1
            spectator_count = 0
            status = "waiting"
            host_player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
            settings = @{}
        } | ConvertTo-Json

        try {
            $roomResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/collections/rooms/records" -Method POST -Headers $headers -Body $roomData -ContentType "application/json"
            Write-Host "✓ Room created successfully: $($roomResponse.id)" -ForegroundColor Green

            # Test room listing
            $roomsList = Invoke-RestMethod -Uri "http://localhost:8090/api/collections/rooms/records" -Method GET -Headers $headers
            Write-Host "✓ Found $($roomsList.items.Count) rooms in database" -ForegroundColor Green

        } catch {
            Write-Host "✗ Room creation failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Rooms collection not found" -ForegroundColor Red
    }

    $playersCollection = $collections | Where-Object { $_.name -eq "players" }
    if ($playersCollection) {
        Write-Host "✓ Players collection exists" -ForegroundColor Green
    } else {
        Write-Host "✗ Players collection not found" -ForegroundColor Red
    }

} catch {
    Write-Host "✗ Failed to check collections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Connection Test Complete ===" -ForegroundColor Cyan
