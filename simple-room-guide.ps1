Write-Host "Huong dan tao Room qua PocketBase" -ForegroundColor Cyan
Write-Host ""
Write-Host "Buoc 1: Dang nhap vao PocketBase Admin" -ForegroundColor Yellow
Write-Host "  - Mo trinh duyet: http://localhost:8090/_/" -ForegroundColor White
Write-Host "  - Dang nhap voi email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  - Password: admin123456" -ForegroundColor White
Write-Host ""
Write-Host "Buoc 2: Tao Collection Rooms" -ForegroundColor Yellow
Write-Host "  - Vao Collections > New collection" -ForegroundColor White
Write-Host "  - Dien thong tin:" -ForegroundColor White
Write-Host "    Name: rooms" -ForegroundColor Gray
Write-Host "    Type: base" -ForegroundColor Gray
Write-Host "  - Them fields: id, name, game_mode, max_players, current_players, status, host_player_id, created_at, updated_at, settings" -ForegroundColor Gray
Write-Host ""
Write-Host "Buoc 3: Tao Room moi" -ForegroundColor Yellow
Write-Host "  - Vao Collections > rooms > New record" -ForegroundColor White
Write-Host "  - Dien thong tin room" -ForegroundColor White
Write-Host ""
Write-Host "Buoc 4: Chay script tu dong" -ForegroundColor Yellow
Write-Host "  - Sau khi thiet lap xong, chay: .\create-room-automatically.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Thong tin huu ich:" -ForegroundColor Green
Write-Host "  - Xem rooms: http://localhost:8090/_/collections/rooms" -ForegroundColor White
Write-Host "  - Test Room Manager: cargo run -p room-manager" -ForegroundColor White
Write-Host ""
Write-Host "Chuc ban thanh cong!" -ForegroundColor Cyan

# Mo PocketBase admin
Start-Process "http://localhost:8090/_/"
