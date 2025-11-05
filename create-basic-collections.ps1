# Create basic collections for testing
Write-Host "Creating basic collections..." -ForegroundColor Cyan

# Authenticate first
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $authResponse.token
    Write-Host "✓ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create rooms collection
$roomsCollection = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{
            name = "name"
            type = "text"
            required = $true
        },
        @{
            name = "game_mode"
            type = "text"
            required = $true
        },
        @{
            name = "max_players"
            type = "number"
            required = $true
        },
        @{
            name = "current_players"
            type = "number"
            required = $true
        },
        @{
            name = "status"
            type = "text"
            required = $true
        },
        @{
            name = "host_player_id"
            type = "text"
            required = $true
        },
        @{
            name = "settings"
            type = "json"
        }
    )
} | ConvertTo-Json -Depth 3

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method POST -Body $roomsCollection -Headers $headers
    Write-Host "✓ Rooms collection created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
}

# Create players collection
$playersCollection = @{
    name = "players"
    type = "base"
    schema = @(
        @{
            name = "name"
            type = "text"
            required = $true
        },
        @{
            name = "room_id"
            type = "text"
            required = $true
        },
        @{
            name = "status"
            type = "text"
            required = $true
        }
    )
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method POST -Body $playersCollection -Headers $headers
    Write-Host "✓ Players collection created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create players collection: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "✅ Collections creation completed!" -ForegroundColor Green

