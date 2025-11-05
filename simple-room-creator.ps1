# Script tao room don gian
Write-Host "Dang tao room tu dong..." -ForegroundColor Cyan

# Tao room truc tiep
for ($i = 1; $i -le 3; $i++) {
    $roomData = @{
        name = "Auto Room $i"
        game_mode = "deathmatch"
        max_players = 4
        host_player_id = "auto_host_$i"
        settings = @{
            difficulty = "normal"
            time_limit = 300
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/rooms" -Method Post -Body $roomData -ContentType "application/json"
        Write-Host "Room $i da tao thanh cong: $($response.room_id)" -ForegroundColor Green
    } catch {
        Write-Host "Loi tao Room $i" -ForegroundColor Red
    }
}

# Hien thi danh sach rooms
Write-Host ""
Write-Host "Danh sach rooms hien co:" -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri "http://localhost:8080/api/rooms" -Method Get
    foreach ($room in $rooms.rooms) {
        Write-Host "  $($room.name) - $($room.current_players)/$($room.max_players) players" -ForegroundColor Gray
    }
} catch {
    Write-Host "Khong the lay danh sach rooms" -ForegroundColor Red
}

Write-Host ""
Write-Host "Hoan thanh!" -ForegroundColor Green
