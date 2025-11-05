# Simple script to create rooms collection
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== CREATING ROOMS COLLECTION ===" -ForegroundColor Cyan

# Step 1: Test connection
Write-Host "Step 1: Testing PocketBase connection..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ PocketBase is healthy: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Authenticate
Write-Host "Step 2: Attempting authentication..." -ForegroundColor Yellow
$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json" -TimeoutSec 10
    $token = $response.token
    Write-Host "✓ Authentication successful!" -ForegroundColor Green
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create rooms collection
Write-Host "Step 3: Creating rooms collection..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
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
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $collectionSchema -TimeoutSec 10
    Write-Host "✓ Rooms collection created successfully!" -ForegroundColor Green
    Write-Host "Collection ID: $($response.id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Verify collection
Write-Host "Step 4: Verifying rooms collection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method GET -Headers $headers -TimeoutSec 5
    $roomsCollection = $response | Where-Object { $_.name -eq "rooms" }

    if ($roomsCollection) {
        Write-Host "✓ Rooms collection verified!" -ForegroundColor Green
        Write-Host "Name: $($roomsCollection.name)" -ForegroundColor Gray
        Write-Host "Type: $($roomsCollection.type)" -ForegroundColor Gray
        Write-Host "Fields: $($roomsCollection.schema.Count)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Rooms collection not found after creation" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Cannot verify collection: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== ROOMS COLLECTION CREATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "🎉 Ready to test Room Manager with database persistence!" -ForegroundColor Green
