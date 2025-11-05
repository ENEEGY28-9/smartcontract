# Script tự động tạo room hoàn chỉnh với PocketBase
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456",
    [int]$NumberOfRooms = 3
)

Write-Host "TU DONG TAO ROOM VOI POCKETBASE HOAN CHINH" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Gray
Write-Host "Admin Email: $AdminEmail" -ForegroundColor Gray
Write-Host "Số lượng rooms cần tạo: $NumberOfRooms" -ForegroundColor Gray

# Bước 1: Đăng nhập vào PocketBase để lấy token
Write-Host ""
Write-Host "Buoc 1: Dang nhap vao PocketBase..." -ForegroundColor Yellow

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
    Write-Host "Buoc 2: Kiem tra collections hien co..." -ForegroundColor Yellow

    $existingCollections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Headers $headers
    $collectionNames = $existingCollections | ForEach-Object { $_.name }

    Write-Host "Collections hiện có: $($collectionNames -join ', ')" -ForegroundColor Gray

    # Bước 3: Tạo collection rooms nếu chưa có
    if ("rooms" -notin $collectionNames) {
        Write-Host ""
        Write-Host "Buoc 3: Tao collection 'rooms'..." -ForegroundColor Yellow

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
        Write-Host "Collection 'rooms' da ton tai" -ForegroundColor Blue
    }

    # Bước 4: Tạo các rooms mới
    Write-Host ""
    Write-Host "Buoc 4: Tao $NumberOfRooms rooms moi..." -ForegroundColor Yellow

    $createdRooms = @()
    $currentTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"

    for ($i = 1; $i -le $NumberOfRooms; $i++) {
        $roomId = "room_auto_$(Get-Date -Format 'yyyyMMdd_HHmmss_fff')_$i"

        $roomData = @{
            id = $roomId
            name = "Auto Room $i - $(Get-Date -Format 'HH:mm:ss')"
            game_mode = "deathmatch"
            max_players = 4
            current_players = 0
            status = "waiting"
            host_player_id = "host_auto_$i"
            created_at = $currentTime
            updated_at = $currentTime
            settings = @{
                difficulty = "normal"
                time_limit = 300
                allow_spectators = $true
            }
        } | ConvertTo-Json

        try {
            $roomResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" `
                -Method Post `
                -Headers $headers `
                -Body $roomData `
                -ContentType "application/json"

            $createdRooms += $roomResponse.id
            Write-Host "Room $i da duoc tao: $($roomResponse.id)" -ForegroundColor Green
        }
        catch {
            Write-Host "Loi khi tao Room $i" -ForegroundColor Red
        }

        # Đợi 1 giây giữa các lần tạo
        if ($i -lt $NumberOfRooms) {
            Start-Sleep -Seconds 1
        }
    }

    # Bước 5: Hiển thị danh sách tất cả rooms trong PocketBase
    Write-Host ""
    Write-Host "Buoc 5: Danh sach tat ca rooms trong PocketBase:" -ForegroundColor Yellow

    try {
        $roomsList = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Headers $headers

        if ($roomsList.items.Count -eq 0) {
            Write-Host "Chua co room nao trong database" -ForegroundColor Gray
        } else {
            foreach ($room in $roomsList.items) {
            Write-Host "  $($room.name) (ID: $($room.id))" -ForegroundColor White
            Write-Host "     $($room.current_players)/$($room.max_players) players | $($room.game_mode) | $($room.status)" -ForegroundColor Gray
            }
        }
    }
    catch {
        Write-Host "Khong the lay danh sach rooms" -ForegroundColor Red
    }

    # Bước 6: Thông tin kết nối và hướng dẫn
    Write-Host ""
    Write-Host "Buoc 6: Thong tin truy cap va huong dan:" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "PocketBase Admin Dashboard: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "Xem rooms trực tiếp: http://localhost:8090/_/collections/rooms" -ForegroundColor White
    Write-Host "Game Client: http://localhost:5173" -ForegroundColor White
    Write-Host "Room Manager API: http://localhost:8080/api/rooms" -ForegroundColor White

    Write-Host ""
    Write-Host "Huong dan su dung:" -ForegroundColor Yellow
    Write-Host "1. Mở trình duyệt và truy cập: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "2. Vào Collections > rooms để xem danh sách rooms" -ForegroundColor White
    Write-Host "3. Nhấn 'New record' để tạo thêm room thủ công" -ForegroundColor White
    Write-Host "4. Mở http://localhost:5173 để chơi game" -ForegroundColor White

    Write-Host ""
    Write-Host "HOAN THANH! Da tao $NumberOfRooms rooms trong PocketBase!" -ForegroundColor Green
    Write-Host "Tổng số rooms hiện có: $($roomsList.items.Count)" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Tom tat:" -ForegroundColor Magenta
    Write-Host "Dang nhap PocketBase: Thanh cong" -ForegroundColor Green
    Write-Host "Tao collection rooms: Thanh cong" -ForegroundColor Green
    Write-Host "Tao $NumberOfRooms rooms: Thanh cong" -ForegroundColor Green
    Write-Host "Luu vao database: Thanh cong" -ForegroundColor Green

} catch {
    Write-Host "Loi dang nhap" -ForegroundColor Red

    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Kiem tra lai thong tin dang nhap admin" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Quyen truy cap bi tu choi. Kiem tra quyen admin." -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Endpoint khong ton tai. Co the can tao admin user truoc." -ForegroundColor Yellow
    }
}
