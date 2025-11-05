# Setup PocketBase Database for Production
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== PocketBase Production Setup ===" -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Yellow

# Import PocketBase client library (if available)
# For now, we'll use REST API calls directly

function Test-PocketBaseConnection {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 10
        Write-Host "✓ PocketBase connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Authenticate-Admin {
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
        return $null
    }
}

function Get-Collections {
    param([string]$Url, [string]$Token)

    $headers = @{
        "Authorization" = "Bearer $Token"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/collections" -Method GET -Headers $headers
        return $response
    }
    catch {
        Write-Host "✗ Failed to get collections: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Create-RoomsCollection {
    param([string]$Url, [string]$Token)

    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }

    $collectionSchema = @{
        name = "rooms"
        type = "base"
        schema = @(
            @{
                name = "id"
                type = "text"
                required = $true
                options = @{
                    max = 15
                    min = 15
                    pattern = "^[a-z0-9]+$"
                }
            }
            @{
                name = "name"
                type = "text"
                required = $true
                options = @{
                    max = 100
                    min = 1
                }
            }
            @{
                name = "game_mode"
                type = "text"
                required = $true
                options = @{
                    max = 50
                    min = 1
                }
            }
            @{
                name = "max_players"
                type = "number"
                required = $true
                options = @{
                    max = 16
                    min = 2
                }
            }
            @{
                name = "current_players"
                type = "number"
                required = $false
                options = @{
                    min = 0
                }
            }
            @{
                name = "spectator_count"
                type = "number"
                required = $false
                options = @{
                    min = 0
                }
            }
            @{
                name = "status"
                type = "select"
                required = $true
                options = @{
                    values = @("waiting", "playing", "finished")
                }
            }
            @{
                name = "host_player_id"
                type = "text"
                required = $true
                options = @{
                    max = 100
                    min = 1
                }
            }
            @{
                name = "worker_endpoint"
                type = "text"
                required = $false
                options = @{
                    max = 200
                }
            }
            @{
                name = "settings"
                type = "json"
                required = $false
            }
            @{
                name = "created_at"
                type = "autodate"
                required = $false
                options = @{
                    onCreate = $true
                }
            }
            @{
                name = "updated_at"
                type = "autodate"
                required = $false
                options = @{
                    onCreate = $true
                    onUpdate = $true
                }
            }
        )
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/collections" -Method POST -Headers $headers -Body $collectionSchema
        Write-Host "✓ Created rooms collection" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Create-PlayersCollection {
    param([string]$Url, [string]$Token)

    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }

    $collectionSchema = @{
        name = "players"
        type = "base"
        schema = @(
            @{
                name = "id"
                type = "text"
                required = $true
                options = @{
                    max = 15
                    min = 15
                    pattern = "^[a-z0-9]+$"
                }
            }
            @{
                name = "username"
                type = "text"
                required = $true
                options = @{
                    max = 50
                    min = 3
                }
            }
            @{
                name = "email"
                type = "email"
                required = $true
            }
            @{
                name = "score"
                type = "number"
                required = $false
                options = @{
                    min = 0
                }
            }
            @{
                name = "is_online"
                type = "bool"
                required = $false
            }
            @{
                name = "created"
                type = "autodate"
                required = $false
                options = @{
                    onCreate = $true
                }
            }
            @{
                name = "updated"
                type = "autodate"
                required = $false
                options = @{
                    onCreate = $true
                    onUpdate = $true
                }
            }
        )
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/collections" -Method POST -Headers $headers -Body $collectionSchema
        Write-Host "✓ Created players collection" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Failed to create players collection: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomOperations {
    param([string]$Url, [string]$Token)

    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }

    Write-Host "Testing room creation..." -ForegroundColor Yellow

    # Test room creation
    $roomData = @{
        id = "test-$(Get-Random)"
        name = "Test Room $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        current_players = 1
        status = "waiting"
        host_player_id = "player_$(Get-Random)"
        settings = @{}
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/collections/rooms/records" -Method POST -Headers $headers -Body $roomData
        Write-Host "✓ Room creation successful: $($response.id)" -ForegroundColor Green

        # Test room listing
        Write-Host "Testing room listing..." -ForegroundColor Yellow
        $roomsResponse = Invoke-RestMethod -Uri "$Url/api/collections/rooms/records" -Method GET -Headers $headers
        Write-Host "✓ Found $($roomsResponse.items.Count) rooms" -ForegroundColor Green

        return $true
    }
    catch {
        Write-Host "✗ Room operations failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
if (-not (Test-PocketBaseConnection -Url $PocketBaseUrl)) {
    Write-Host "Cannot connect to PocketBase. Exiting." -ForegroundColor Red
    exit 1
}

# Authenticate as admin
$token = Authenticate-Admin -Url $PocketBaseUrl -Email $AdminEmail -Password $AdminPassword
if (-not $token) {
    Write-Host "Cannot authenticate as admin. Exiting." -ForegroundColor Red
    exit 1
}

# Get existing collections
$collections = Get-Collections -Url $PocketBaseUrl -Token $token
if (-not $collections) {
    Write-Host "Cannot get collections. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Found $($collections.Count) existing collections" -ForegroundColor Yellow

# Check if rooms collection exists
$roomsCollection = $collections | Where-Object { $_.name -eq "rooms" }
if (-not $roomsCollection) {
    Write-Host "Creating rooms collection..." -ForegroundColor Yellow
    if (-not (Create-RoomsCollection -Url $PocketBaseUrl -Token $token)) {
        Write-Host "Failed to create rooms collection" -ForegroundColor Red
    }
} else {
    Write-Host "✓ Rooms collection already exists" -ForegroundColor Green
}

# Check if players collection exists
$playersCollection = $collections | Where-Object { $_.name -eq "players" }
if (-not $playersCollection) {
    Write-Host "Creating players collection..." -ForegroundColor Yellow
    if (-not (Create-PlayersCollection -Url $PocketBaseUrl -Token $token)) {
        Write-Host "Failed to create players collection" -ForegroundColor Red
    }
} else {
    Write-Host "✓ Players collection already exists" -ForegroundColor Green
}

# Test basic operations
Write-Host "Testing database operations..." -ForegroundColor Yellow
if (Test-RoomOperations -Url $PocketBaseUrl -Token $token) {
    Write-Host "✓ All database operations working correctly" -ForegroundColor Green
} else {
    Write-Host "✗ Some database operations failed" -ForegroundColor Red
}

Write-Host "=== PocketBase Setup Complete ===" -ForegroundColor Cyan
