# Script tạo room với authentication
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin@pocketbase.local",
    [string]$AdminPassword = "123456789"
)

Write-Host "Creating Room with Authentication..." -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Gray
Write-Host "Admin Email: $AdminEmail" -ForegroundColor Gray

# Đăng nhập để lấy token
$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    Write-Host "Authenticating with PocketBase..." -ForegroundColor Yellow
    $authResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" `
        -Method Post `
        -Body $authBody `
        -ContentType "application/json"

    $token = $authResponse.token
    Write-Host "Authentication successful!" -ForegroundColor Green

    # Tạo headers với token
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Kiểm tra collections hiện có
    Write-Host "Checking existing collections..." -ForegroundColor Yellow
    $existingCollections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Headers $headers

    $collectionNames = $existingCollections | ForEach-Object { $_.name }
    Write-Host "Existing collections: $($collectionNames -join ', ')" -ForegroundColor Gray

    # Tạo collection rooms nếu chưa tồn tại
    if ("rooms" -notin $collectionNames) {
        Write-Host "Creating rooms collection..." -ForegroundColor Yellow

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
                }
            )
        } | ConvertTo-Json -Depth 4

        $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" `
            -Method Post `
            -Headers $headers `
            -Body $roomsCollection `
            -ContentType "application/json"

        Write-Host "Rooms collection created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Rooms collection already exists" -ForegroundColor Blue
    }

    # Tạo room mới
    Write-Host "Creating a new room..." -ForegroundColor Yellow

    $roomData = @{
        id = "room_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        name = "Test Room $(Get-Date -Format 'HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        current_players = 0
        status = "waiting"
        created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        updated_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        host_player_id = "host_player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        settings = @{
            difficulty = "normal"
            time_limit = 300
        }
    } | ConvertTo-Json

    $roomResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" `
        -Method Post `
        -Headers $headers `
        -Body $roomData `
        -ContentType "application/json"

    Write-Host "Room created successfully!" -ForegroundColor Green
    Write-Host "Room ID: $($roomResponse.id)" -ForegroundColor Cyan
    Write-Host "Room Name: $($roomResponse.name)" -ForegroundColor Cyan
    Write-Host "Game Mode: $($roomResponse.game_mode)" -ForegroundColor Cyan

    # Lấy danh sách rooms hiện có
    Write-Host "Fetching all rooms..." -ForegroundColor Yellow
    $roomsList = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Headers $headers

    Write-Host "Current rooms:" -ForegroundColor Cyan
    foreach ($room in $roomsList.items) {
        Write-Host "  - $($room.name) (ID: $($room.id)) - $($room.current_players)/$($room.max_players) players - Status: $($room.status)" -ForegroundColor Gray
    }

    Write-Host "Room creation completed successfully!" -ForegroundColor Green

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Authentication failed. Please check your credentials." -ForegroundColor Red
    } elseif ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Access forbidden. You might not have admin privileges." -ForegroundColor Red
    }
}
