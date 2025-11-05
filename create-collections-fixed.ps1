param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== Creating PocketBase Collections ===" -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Yellow

# Function to authenticate admin
function Get-AdminToken {
    param([string]$Url, [string]$Email, [string]$Password)

    $authBody = @{
        identity = $Email
        password = $Password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
        Write-Host "✓ Admin authentication successful" -ForegroundColor Green
        return $response.token
    }
    catch {
        Write-Host "✗ Admin authentication failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Function to create collection
function New-Collection {
    param([string]$Url, [string]$Token, [string]$CollectionJson)

    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/collections" -Method POST -Body $CollectionJson -Headers $headers
        return $true
    }
    catch {
        Write-Host "✗ Failed to create collection: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check if collection exists
function Test-CollectionExists {
    param([string]$Url, [string]$Token, [string]$CollectionName)

    $headers = @{
        "Authorization" = "Bearer $Token"
    }

    try {
        $collections = Invoke-RestMethod -Uri "$Url/api/collections" -Method GET -Headers $headers
        foreach ($collection in $collections) {
            if ($collection.name -eq $CollectionName) {
                return $true
            }
        }
        return $false
    }
    catch {
        return $false
    }
}

# Test connection
try {
    $health = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ PocketBase connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Authenticate
$token = Get-AdminToken -Url $PocketBaseUrl -Email $AdminEmail -Password $AdminPassword

# Collection 1: rooms
$roomsCollection = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{
            name = "name"
            type = "text"
            required = $true
            options = @{ max = 100 }
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
            options = @{ min = 2; max = 8 }
        },
        @{
            name = "current_players"
            type = "number"
            required = $true
        },
        @{
            name = "status"
            type = "select"
            required = $true
            options = @{ values = @("waiting", "starting", "playing", "finished", "closed") }
        },
        @{
            name = "host_player_id"
            type = "text"
            required = $true
        },
        @{
            name = "settings"
            type = "json"
        },
        @{
            name = "created_at"
            type = "date"
        },
        @{
            name = "updated_at"
            type = "date"
        }
    )
} | ConvertTo-Json -Depth 4

if (Test-CollectionExists -Url $PocketBaseUrl -Token $token -CollectionName "rooms") {
    Write-Host "✓ Rooms collection already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating rooms collection..." -ForegroundColor Yellow
    if (New-Collection -Url $PocketBaseUrl -Token $token -CollectionJson $roomsCollection) {
        Write-Host "✓ Rooms collection created successfully" -ForegroundColor Green
    }
}

# Collection 2: players
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
            type = "select"
            required = $true
            options = @{ values = @("connected", "disconnected", "left", "kicked", "banned") }
        },
        @{
            name = "last_seen"
            type = "date"
        },
        @{
            name = "connection_id"
            type = "text"
        }
    )
} | ConvertTo-Json -Depth 4

if (Test-CollectionExists -Url $PocketBaseUrl -Token $token -CollectionName "players") {
    Write-Host "✓ Players collection already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating players collection..." -ForegroundColor Yellow
    if (New-Collection -Url $PocketBaseUrl -Token $token -CollectionJson $playersCollection) {
        Write-Host "✓ Players collection created successfully" -ForegroundColor Green
    }
}

Write-Host "✅ Collections setup completed!" -ForegroundColor Green

