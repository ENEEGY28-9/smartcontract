# Create PocketBase Collections for Room Manager

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== Creating PocketBase Collections ===" -ForegroundColor Cyan

# Test connection
try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "+ PocketBase connection successful" -ForegroundColor Green
} catch {
    Write-Host "- PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "+ Admin authentication successful" -ForegroundColor Green
} catch {
    Write-Host "- Admin authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create rooms collection
Write-Host "Creating rooms collection..." -ForegroundColor Yellow
$roomsSchema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "name"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "game_mode"; type = "select"; required = $true; options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") } }
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
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "+ Created rooms collection" -ForegroundColor Green
} catch {
    Write-Host "- Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
}

# Create players collection
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
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $playersSchema
    Write-Host "+ Created players collection" -ForegroundColor Green
} catch {
    Write-Host "- Failed to create players collection: $($_.Exception.Message)" -ForegroundColor Red
}

# Create game_sessions collection
Write-Host "Creating game_sessions collection..." -ForegroundColor Yellow
$sessionsSchema = @{
    name = "game_sessions"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
        @{ name = "session_name"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("initializing", "starting", "in_progress", "finished", "cancelled") } }
        @{ name = "started_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "ended_at"; type = "autodate"; required = $false; options = @{ onUpdate = $true } }
        @{ name = "participants"; type = "json"; required = $false }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $sessionsSchema
    Write-Host "+ Created game_sessions collection" -ForegroundColor Green
} catch {
    Write-Host "- Failed to create game_sessions collection: $($_.Exception.Message)" -ForegroundColor Red
}

# Create room_events collection
Write-Host "Creating room_events collection..." -ForegroundColor Yellow
$eventsSchema = @{
    name = "room_events"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
        @{ name = "player_id"; type = "text"; required = $false; options = @{ max = 15; min = 15 } }
        @{ name = "event_type"; type = "text"; required = $true; options = @{ max = 50; min = 1 } }
        @{ name = "event_data"; type = "json"; required = $false }
        @{ name = "timestamp"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $eventsSchema
    Write-Host "+ Created room_events collection" -ForegroundColor Green
} catch {
    Write-Host "- Failed to create room_events collection: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== Collections Setup Complete ===" -ForegroundColor Cyan
Write-Host "+ All required collections created" -ForegroundColor Green
