# Script tự động tạo room qua Room Manager API
param(
    [string]$RoomManagerUrl = "http://localhost:8080",
    [int]$NumberOfRooms = 3
)

Write-Host "Tu dong tao Room qua Room Manager API" -ForegroundColor Cyan
Write-Host "Room Manager URL: $RoomManagerUrl" -ForegroundColor Gray
Write-Host "Số lượng rooms cần tạo: $NumberOfRooms" -ForegroundColor Gray

# Kiểm tra kết nối với Room Manager
Write-Host ""
Write-Host "Kiem tra ket noi voi Room Manager..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "$RoomManagerUrl/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Room Manager đang hoạt động" -ForegroundColor Green
}
catch {
    Write-Host "Khong the ket noi voi Room Manager" -ForegroundColor Red
    Write-Host "Dang thu khoi dong Room Manager..." -ForegroundColor Yellow

    # Thu khoi dong Room Manager
    try {
        Start-Process -FilePath "cargo" -ArgumentList "run -p room-manager" -NoNewWindow
        Start-Sleep -Seconds 3
        $health = Invoke-RestMethod -Uri "$RoomManagerUrl/api/health" -Method Get -TimeoutSec 5
        Write-Host "Room Manager da duoc khoi dong thanh cong" -ForegroundColor Green
    }
    catch {
        Write-Host "Khong the khoi dong Room Manager" -ForegroundColor Red
        exit 1
    }
}

# Tạo các room
Write-Host ""
Write-Host "Dang tao $NumberOfRooms rooms..." -ForegroundColor Yellow

$createdRooms = @()

for ($i = 1; $i -le $NumberOfRooms; $i++) {
    $roomData = @{
        name = "Auto Room $i - $(Get-Date -Format 'HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        host_player_id = "auto_host_$i"
        settings = @{
            difficulty = "normal"
            time_limit = 300
            allow_spectators = $true
        }
    } | ConvertTo-Json

    try {
        $roomResponse = Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms" -Method Post -Body $roomData -ContentType "application/json" -TimeoutSec 10

        Write-Host "✅ Room $i đã được tạo thành công!" -ForegroundColor Green
        Write-Host "   ID: $($roomResponse.room_id)" -ForegroundColor Cyan
        Write-Host "   Name: $($roomResponse.name)" -ForegroundColor Cyan
        Write-Host "   Game Mode: $($roomResponse.game_mode)" -ForegroundColor Cyan
        Write-Host "   Max Players: $($roomResponse.max_players)" -ForegroundColor Cyan

        $createdRooms += $roomResponse.room_id

    }
    catch {
        Write-Host "Loi khi tao Room $i" -ForegroundColor Red
    }

    # Đợi 1 giây giữa các lần tạo
    if ($i -lt $NumberOfRooms) {
        Start-Sleep -Seconds 1
    }
}

# Hiển thị danh sách tất cả rooms
Write-Host ""
Write-Host "Danh sach tat ca rooms hien co:" -ForegroundColor Yellow

try {
    $roomsList = Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms" -Method Get -TimeoutSec 10

    if ($roomsList.rooms.Count -eq 0) {
        Write-Host "Chua co room nao trong he thong" -ForegroundColor Gray
    } else {
        foreach ($room in $roomsList.rooms) {
            $status = if ($room.current_players -eq 0) { "Trong" } elseif ($room.current_players -eq $room.max_players) { "Day" } else { "Co nguoi" }
            Write-Host "  $($room.name) (ID: $($room.id))" -ForegroundColor White
            Write-Host "     $($room.current_players)/$($room.max_players) players | $($room.game_mode) | $status" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "Khong the lay danh sach rooms" -ForegroundColor Red
}

# Thông tin kết nối
Write-Host ""
Write-Host "Thong tin truy cap:" -ForegroundColor Yellow
Write-Host "  Game Client: http://localhost:5173" -ForegroundColor White
Write-Host "  Game trực tiếp: http://localhost:5173/game" -ForegroundColor White
Write-Host "  Room Manager API: $RoomManagerUrl/api/rooms" -ForegroundColor White
Write-Host "  PocketBase Admin: http://localhost:8090/_/" -ForegroundColor White

Write-Host ""
Write-Host "Hoan thanh! Da tao $NumberOfRooms rooms thanh cong" -ForegroundColor Green
Write-Host "Tổng số rooms hiện có: $($roomsList.rooms.Count)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Meo su dung:" -ForegroundColor Yellow
Write-Host "  - Mở http://localhost:5173 để chơi game" -ForegroundColor White
Write-Host "  - Nhấn 'Play Game' để bắt đầu" -ForegroundColor White
Write-Host "  - Sử dụng SPACE, A/D, S để điều khiển" -ForegroundColor White