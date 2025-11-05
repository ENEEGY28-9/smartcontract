# Script tự động tạo room qua PocketBase API với authentication
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "Tu dong tao Room qua PocketBase API" -ForegroundColor Cyan
Write-Host "Neu gap loi 404, hay tao admin user truoc qua giao dien web" -ForegroundColor Yellow
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Gray
Write-Host "Admin Email: $AdminEmail" -ForegroundColor Gray

# Bước 1: Đăng nhập để lấy token
Write-Host ""
Write-Host "Dang nhap vao PocketBase..." -ForegroundColor Yellow

$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" `
        -Method Post `
        -Body $authBody `
        -ContentType "application/json"

    $token = $authResponse.token
    Write-Host "Dang nhap thanh cong!" -ForegroundColor Green

    # Tạo headers với token cho các request tiếp theo
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }

    # Bước 2: Kiểm tra collections hiện có
    Write-Host ""
    Write-Host "Kiem tra collections hien co..." -ForegroundColor Yellow

    $existingCollections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Headers $headers
    $collectionNames = $existingCollections | ForEach-Object { $_.name }

    Write-Host "Collections hiện có: $($collectionNames -join ', ')" -ForegroundColor Gray

    # Bước 3: Tạo collection rooms nếu chưa có
    if ("rooms" -notin $collectionNames) {
        Write-Host ""
        Write-Host "Tao collection 'rooms'..." -ForegroundColor Yellow

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
                    name = "status"
                    type = "select"
                    required = $true
                    options = @{
                        values = @("waiting", "starting", "in_progress", "finished", "closed")
                    }
                },
                @{
                    name = "host_player_id"
                    type = "text"
                    required = $true
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

        Write-Host "Collection 'rooms' da duoc tao thanh cong!" -ForegroundColor Green
        Write-Host "Collection ID: $($response.id)" -ForegroundColor Cyan
    } else {
        Write-Host "ℹ️  Collection 'rooms' đã tồn tại" -ForegroundColor Blue
    }

    # Bước 4: Tạo room mới
    Write-Host ""
    Write-Host "Tao room moi..." -ForegroundColor Yellow

    $currentTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    $roomId = "room_$(Get-Date -Format 'yyyyMMdd_HHmmss_fff')"

    $roomData = @{
        id = $roomId
        name = "Game Room $(Get-Date -Format 'HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        current_players = 0
        status = "waiting"
        host_player_id = "host_player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        created_at = $currentTime
        updated_at = $currentTime
        settings = @{
            difficulty = "normal"
            time_limit = 300
            allow_spectators = $true
        }
    } | ConvertTo-Json

    $roomResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" `
        -Method Post `
        -Headers $headers `
        -Body $roomData `
        -ContentType "application/json"

    Write-Host "Room da duoc tao thanh cong!" -ForegroundColor Green
    Write-Host "Room ID: $($roomResponse.id)" -ForegroundColor Cyan
    Write-Host "Room Name: $($roomResponse.name)" -ForegroundColor Cyan
    Write-Host "Game Mode: $($roomResponse.game_mode)" -ForegroundColor Cyan
    Write-Host "Max Players: $($roomResponse.max_players)" -ForegroundColor Cyan
    Write-Host "Status: $($roomResponse.status)" -ForegroundColor Cyan

    # Bước 5: Hiển thị danh sách rooms hiện có
    Write-Host ""
    Write-Host "Danh sach rooms hien co:" -ForegroundColor Yellow

    $roomsList = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Headers $headers

    if ($roomsList.items.Count -eq 0) {
        Write-Host "Chua co room nao trong database" -ForegroundColor Gray
    } else {
        foreach ($room in $roomsList.items) {
            Write-Host "  $($room.name) (ID: $($room.id))" -ForegroundColor White
            Write-Host "     $($room.current_players)/$($room.max_players) players | $($room.game_mode) | $($room.status)" -ForegroundColor Gray
        }
    }

    # Bước 6: Hiển thị thông tin kết nối
    Write-Host ""
    Write-Host "Thong tin ket noi:" -ForegroundColor Yellow
    Write-Host "PocketBase Admin Dashboard: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "Room Manager API: http://localhost:8080/api/rooms" -ForegroundColor White
    Write-Host "PocketBase API: http://localhost:8090/api/collections/rooms/records" -ForegroundColor White

    Write-Host ""
    Write-Host "Hoan thanh! Ban co the:" -ForegroundColor Green
    Write-Host "  • Xem room trong PocketBase admin dashboard" -ForegroundColor White
    Write-Host "  • Tich hop voi game client de join room" -ForegroundColor White
    Write-Host "  • Tao them rooms bang cach chay lai script nay" -ForegroundColor White
}

} catch {
    Write-Host "Loi dang nhap: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Kiem tra lai thong tin dang nhap admin" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Quyen truy cap bi tu choi. Kiem tra quyen admin." -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Endpoint khong ton tai. Co the can tao admin user truoc." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "HUONG DAN TAO ADMIN USER:" -ForegroundColor Cyan
        Write-Host "1. Mo trinh duyet: http://localhost:8090/_/" -ForegroundColor White
        Write-Host "2. Dang nhap voi email: admin2@pocketbase.local" -ForegroundColor White
        Write-Host "3. Password: admin123456" -ForegroundColor White
        Write-Host "4. Hoac tao admin user moi trong Settings > Admins" -ForegroundColor White
        Write-Host ""
        Write-Host "THU GIAI PHAP KHAC:" -ForegroundColor Cyan
        Write-Host "Dang thu tao room qua Room Manager API..." -ForegroundColor Yellow

        # Thu tao room qua Room Manager thay the
        try {
            $roomData = @{
                name = "Room tu dong $(Get-Date -Format 'HH:mm:ss')"
                game_mode = "deathmatch"
                max_players = 4
                host_player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
                settings = @{
                    difficulty = "normal"
                    time_limit = 300
                }
            } | ConvertTo-Json

            $rmResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/rooms" -Method Post -Body $roomData -ContentType "application/json"
            Write-Host "Thanh cong! Room da duoc tao qua Room Manager" -ForegroundColor Green
            Write-Host "Room ID: $($rmResponse.room_id)" -ForegroundColor Cyan
        } catch {
            Write-Host "Khong the tao room qua Room Manager: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Hay kiem tra Room Manager co dang chay khong" -ForegroundColor Yellow
        }
    }
}
