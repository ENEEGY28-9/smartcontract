# Script tự động tạo Collection "rooms" qua PocketBase API
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "TU DONG TAO COLLECTION ROOMS QUA POCKETBASE API" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Gray
Write-Host "Admin Email: $AdminEmail" -ForegroundColor Gray

# Bước 1: Đăng nhập để lấy token
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
        Write-Host "Buoc 3: Tao collection 'rooms' voi day du fields..." -ForegroundColor Yellow

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

        Write-Host "Dang tao collection voi cau truc sau:" -ForegroundColor Gray
        Write-Host "  - id (text, required, unique)" -ForegroundColor Gray
        Write-Host "  - name (text, required)" -ForegroundColor Gray
        Write-Host "  - game_mode (select: deathmatch, team_deathmatch, capture_the_flag)" -ForegroundColor Gray
        Write-Host "  - max_players (number, min: 2, max: 8)" -ForegroundColor Gray
        Write-Host "  - current_players (number, min: 0)" -ForegroundColor Gray
        Write-Host "  - status (select: waiting, starting, in_progress, finished, closed)" -ForegroundColor Gray
        Write-Host "  - host_player_id (text, required)" -ForegroundColor Gray
        Write-Host "  - created_at (date, required)" -ForegroundColor Gray
        Write-Host "  - updated_at (date, required)" -ForegroundColor Gray
        Write-Host "  - settings (json)" -ForegroundColor Gray

        $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" `
            -Method Post `
            -Headers $headers `
            -Body $roomsCollection `
            -ContentType "application/json"

        Write-Host "Collection 'rooms' da duoc tao thanh cong!" -ForegroundColor Green
        Write-Host "Collection ID: $($response.id)" -ForegroundColor Cyan

        # Bước 4: Xác nhận collection đã được tạo
        Write-Host ""
        Write-Host "Buoc 4: Xac nhan collection da duoc tao..." -ForegroundColor Yellow

        $updatedCollections = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Headers $headers
        $roomsCollectionExists = $updatedCollections | Where-Object { $_.name -eq "rooms" }

        if ($roomsCollectionExists) {
            Write-Host "Collection 'rooms' da ton tai trong database!" -ForegroundColor Green
            Write-Host "  - Name: $($roomsCollectionExists.name)" -ForegroundColor Gray
            Write-Host "  - Type: $($roomsCollectionExists.type)" -ForegroundColor Gray
            Write-Host "  - Schema fields: $($roomsCollectionExists.schema.Count)" -ForegroundColor Gray
        }

    } else {
        Write-Host "Collection 'rooms' da ton tai!" -ForegroundColor Blue

        # Hiển thị thông tin collection hiện có
        $existingRoomCollection = $existingCollections | Where-Object { $_.name -eq "rooms" }
        Write-Host "Thong tin collection hien co:" -ForegroundColor Gray
        Write-Host "  - Name: $($existingRoomCollection.name)" -ForegroundColor Gray
        Write-Host "  - Type: $($existingRoomCollection.type)" -ForegroundColor Gray
        Write-Host "  - Schema fields: $($existingRoomCollection.schema.Count)" -ForegroundColor Gray
    }

    # Bước 5: Hiển thị danh sách tất cả collections
    Write-Host ""
    Write-Host "Buoc 5: Danh sach tat ca collections hien co:" -ForegroundColor Yellow

    foreach ($collection in $existingCollections) {
        Write-Host "  $($collection.name) ($($collection.type)) - $($collection.schema.Count) fields" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Buoc 6: Thong tin truy cap:" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Green
    Write-Host "PocketBase Admin Dashboard: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "Xem collection rooms: http://localhost:8090/_/collections/rooms" -ForegroundColor White
    Write-Host "PocketBase API: http://localhost:8090/api/collections/rooms/records" -ForegroundColor White

    Write-Host ""
    Write-Host "Buoc 7: San sang tao rooms!" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    Write-Host "Bây giờ bạn có thể chạy lệnh sau để tạo rooms tự động:" -ForegroundColor White
    Write-Host "powershell -File create-room-full-automation.ps1 -NumberOfRooms 5" -ForegroundColor Green
    Write-Host ""
    Write-Host "Hoặc tạo rooms thủ công trong giao diện web:" -ForegroundColor White
    Write-Host "  1. Vào Collections > rooms" -ForegroundColor Gray
    Write-Host "  2. Nhấn 'New record'" -ForegroundColor Gray
    Write-Host "  3. Điền thông tin room và nhấn 'Create'" -ForegroundColor Gray

    Write-Host ""
    Write-Host "HOAN THANH! Collection 'rooms' da san sang!" -ForegroundColor Green
    Write-Host "Tong so collections hien co: $($existingCollections.Count)" -ForegroundColor Cyan

} catch {
    Write-Host "Loi dang nhap" -ForegroundColor Red

    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Kiem tra lai thong tin dang nhap admin" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Quyen truy cap bi tu choi. Kiem tra quyen admin." -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Endpoint khong ton tai. Co the can tao admin user truoc." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Hay mo trinh duyet va truy cap: http://localhost:8090/_/" -ForegroundColor White
        Write-Host "Tao admin user voi email: admin2@pocketbase.local" -ForegroundColor White
        Write-Host "Password: admin123456" -ForegroundColor White
    }
}
