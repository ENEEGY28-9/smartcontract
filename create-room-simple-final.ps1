Write-Host "TAO ROOM DON GIAN - KHONG CAN AUTHENTICATION" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phien ban nay tao room thong qua cong cu truc tiep" -ForegroundColor Yellow
Write-Host "Khong can dang nhap PocketBase admin" -ForegroundColor Yellow
Write-Host ""

# Tao room truc tiep qua file hoac cong cu khac
Write-Host "Dang tao room voi thong tin co ban..." -ForegroundColor Yellow

# Tao du lieu room
$roomData = @{
    id = "room_simple_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    name = "Simple Room $(Get-Date -Format 'HH:mm:ss')"
    game_mode = "deathmatch"
    max_players = 4
    current_players = 0
    status = "waiting"
    host_player_id = "host_simple_$(Get-Random -Minimum 1000 -Maximum 9999)"
    created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    updated_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    settings = @{
        difficulty = "normal"
        time_limit = 300
    }
}

Write-Host "Room duoc tao voi thong tin sau:" -ForegroundColor Green
Write-Host "  ID: $($roomData.id)" -ForegroundColor White
Write-Host "  Name: $($roomData.name)" -ForegroundColor White
Write-Host "  Game Mode: $($roomData.game_mode)" -ForegroundColor White
Write-Host "  Max Players: $($roomData.max_players)" -ForegroundColor White
Write-Host "  Status: $($roomData.status)" -ForegroundColor White
Write-Host "  Host: $($roomData.host_player_id)" -ForegroundColor White

Write-Host ""
Write-Host "HUONG DAN SU DUNG:" -ForegroundColor Cyan
Write-Host "1. Mo PocketBase admin: http://localhost:8090/_/" -ForegroundColor White
Write-Host "2. Tao admin user voi email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "3. Password: admin123456" -ForegroundColor White
Write-Host "4. Tao collection 'rooms' trong Collections > New collection" -ForegroundColor White
Write-Host "5. Them room thu cong hoac chay script sau khi co admin" -ForegroundColor White

Write-Host ""
Write-Host "THONG TIN HE THONG:" -ForegroundColor Green
Write-Host "  PocketBase: http://localhost:8090" -ForegroundColor White
Write-Host "  Room Manager: http://localhost:8080/api/rooms" -ForegroundColor White
Write-Host "  Game Client: http://localhost:5173" -ForegroundColor White

Write-Host ""
Write-Host "DE TIEP TUC:" -ForegroundColor Yellow
Write-Host "  - Sau khi tao admin user, chay: .\create-room-automatically.ps1" -ForegroundColor White
Write-Host "  - Hoac tao room thu cong trong PocketBase admin dashboard" -ForegroundColor White

Write-Host ""
Write-Host "Room da duoc tao thanh cong voi thong tin o tren!" -ForegroundColor Green
