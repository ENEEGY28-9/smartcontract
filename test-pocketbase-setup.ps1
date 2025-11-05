# Simple PocketBase Setup and Test Script

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== PocketBase Simple Setup ===" -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Yellow

# Test connection
try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "✓ PocketBase connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Authenticate as admin
$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "✓ Admin authentication successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Admin authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get existing collections
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $collections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method GET -Headers $headers
    Write-Host "Found $($collections.Count) existing collections" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to get collections: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check and create rooms collection
$roomsCollection = $collections | Where-Object { $_.name -eq "rooms" }
if (-not $roomsCollection) {
    Write-Host "Creating rooms collection..." -ForegroundColor Yellow

    $roomsSchema = @{
        name = "rooms"
        type = "base"
        schema = @(
            @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
            @{ name = "name"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
            @{ name = "game_mode"; type = "text"; required = $true; options = @{ max = 50; min = 1 } }
            @{ name = "max_players"; type = "number"; required = $true; options = @{ max = 16; min = 2 } }
            @{ name = "current_players"; type = "number"; required = $false; options = @{ min = 0 } }
            @{ name = "spectator_count"; type = "number"; required = $false; options = @{ min = 0 } }
            @{ name = "status"; type = "select"; required = $true; options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") } }
            @{ name = "host_player_id"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
            @{ name = "worker_endpoint"; type = "text"; required = $false; options = @{ max = 200 } }
            @{ name = "settings"; type = "json"; required = $false }
            @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
            @{ name = "updated_at"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
            @{ name = "last_activity"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
            @{ name = "ttl_seconds"; type = "number"; required = $false; options = @{ min = 0 } }
        )
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema -ContentType "application/json"
        Write-Host "✓ Created rooms collection" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "✓ Rooms collection already exists" -ForegroundColor Green
}

# Check and create players collection
$playersCollection = $collections | Where-Object { $_.name -eq "players" }
if (-not $playersCollection) {
    Write-Host "Creating players collection..." -ForegroundColor Yellow

    $playersSchema = @{
        name = "players"
        type = "base"
        schema = @(
            @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
            @{ name = "username"; type = "text"; required = $true; options = @{ max = 50; min = 3 } }
            @{ name = "email"; type = "email"; required = $true }
            @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
            @{ name = "status"; type = "select"; required = $true; options = @{ values = @("connected", "disconnected", "left") } }
            @{ name = "team"; type = "text"; required = $false; options = @{ max = 50 } }
            @{ name = "score"; type = "number"; required = $false; options = @{ min = 0 } }
            @{ name = "is_host"; type = "bool"; required = $false }
            @{ name = "game_stats"; type = "json"; required = $false }
            @{ name = "connection_id"; type = "text"; required = $false; options = @{ max = 100 } }
            @{ name = "joined_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
            @{ name = "last_seen"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
        )
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $playersSchema -ContentType "application/json"
        Write-Host "✓ Created players collection" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create players collection: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "✓ Players collection already exists" -ForegroundColor Green
}

# Test room creation
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
    created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    updated_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    last_activity = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    ttl_seconds = 300
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Method POST -Headers $headers -Body $roomData -ContentType "application/json"
    Write-Host "✓ Room creation successful: $($response.id)" -ForegroundColor Green

    # Test room listing
    Write-Host "Testing room listing..." -ForegroundColor Yellow
    $roomsResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Method GET -Headers $headers
    Write-Host "✓ Found $($roomsResponse.items.Count) rooms" -ForegroundColor Green

    # Test player creation
    Write-Host "Testing player creation..." -ForegroundColor Yellow
    $playerData = @{
        id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        username = "Test Player $(Get-Date -Format 'HHmmss')"
        email = "test$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
        room_id = $response.id
        status = "connected"
        score = 0
        is_host = $false
        game_stats = @{}
        joined_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        last_seen = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    } | ConvertTo-Json

    $playerResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/players/records" -Method POST -Headers $headers -Body $playerData -ContentType "application/json"
    Write-Host "✓ Player creation successful: $($playerResponse.id)" -ForegroundColor Green

} catch {
    Write-Host "✗ Room operations failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== PocketBase Setup Complete ===" -ForegroundColor Cyan
Write-Host "✓ PocketBase is ready for Room Manager" -ForegroundColor Green
