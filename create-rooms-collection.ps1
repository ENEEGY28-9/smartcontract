# Script tạo collection rooms cho Room Manager
param(
    [string]$PocketBaseUrl = "http://localhost:8090"
)

Write-Host "Creating Rooms Collection for Room Manager..." -ForegroundColor Cyan

# Kiểm tra kết nối cơ bản
try {
    $health = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method Get -TimeoutSec 5
    Write-Host "✓ PocketBase is running" -ForegroundColor Green
}
catch {
    Write-Host "✗ Cannot connect to PocketBase: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Định nghĩa collection rooms
$roomsCollection = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{
            name = "id"
            type = "text"
            required = $true
            unique = $true
        },
        @{
            name = "name"
            type = "text"
            required = $true
        },
        @{
            name = "game_mode"
            type = "select"
            required = $true
            options = @{
                values = @("deathmatch", "team_deathmatch", "capture_the_flag")
            }
        },
        @{
            name = "max_players"
            type = "number"
            required = $true
            options = @{
                min = 2
                max = 8
            }
        },
        @{
            name = "current_players"
            type = "number"
            required = $true
            options = @{
                min = 0
            }
        },
        @{
            name = "spectator_count"
            type = "number"
            required = $true
            options = @{
                min = 0
            }
        },
        @{
            name = "status"
            type = "select"
            required = $true
            options = @{
                values = @("waiting", "starting", "in_progress", "finished", "closed")
            }
        },
        @{
            name = "created_at"
            type = "date"
            required = $true
        },
        @{
            name = "updated_at"
            type = "date"
            required = $true
        },
        @{
            name = "last_activity"
            type = "date"
            required = $true
        },
        @{
            name = "host_player_id"
            type = "text"
            required = $true
        },
        @{
            name = "worker_endpoint"
            type = "text"
        },
        @{
            name = "settings"
            type = "json"
        },
        @{
            name = "ttl_seconds"
            type = "number"
        }
    )
    indexes = @(
        "CREATE INDEX idx_rooms_status ON rooms (status)",
        "CREATE INDEX idx_rooms_game_mode ON rooms (game_mode)",
        "CREATE INDEX idx_rooms_updated ON rooms (updated_at DESC)",
        "CREATE INDEX idx_rooms_host ON rooms (host_player_id)"
    )
} | ConvertTo-Json -Depth 5

# Tạo collection
try {
    Write-Host "Creating rooms collection..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" `
        -Method Post `
        -Body $roomsCollection `
        -ContentType "application/json" `
        -TimeoutSec 10

    Write-Host "✓ Rooms collection created successfully!" -ForegroundColor Green
    Write-Host "Collection ID: $($response.id)" -ForegroundColor Cyan
}
catch {
    $errorCode = $_.Exception.Response.StatusCode
    if ($errorCode -eq 400) {
        Write-Host "ℹ️  Rooms collection already exists" -ForegroundColor Blue
    }
    else {
        Write-Host "✗ Failed to create rooms collection: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}
}

# Hiển thị collections hiện có
Write-Host "Current collections in PocketBase:" -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method Get -TimeoutSec 10

    foreach ($collection in $collections) {
        Write-Host "  - $($collection.name) ($($collection.type))" -ForegroundColor Gray
    }
}
catch {
    Write-Host "✗ Cannot fetch collections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Rooms collection setup completed!" -ForegroundColor Green
Write-Host "Room Manager can now use this collection to store room data." -ForegroundColor Cyan"