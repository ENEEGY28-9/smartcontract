Write-Host "🎮 Hướng dẫn nhanh tạo Room qua PocketBase" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bước 1: Đăng nhập vào PocketBase Admin" -ForegroundColor Yellow
Write-Host "  • Mở trình duyệt và truy cập: http://localhost:8090/_/" -ForegroundColor White
Write-Host "  • Đăng nhập với email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  • Password: admin123456" -ForegroundColor White
Write-Host ""
Write-Host "Bước 2: Tạo Collection Rooms (nếu chưa có)" -ForegroundColor Yellow
Write-Host "  • Vào menu Collections > New collection" -ForegroundColor White
Write-Host "  • Điền thông tin:" -ForegroundColor White
Write-Host "    Name: rooms" -ForegroundColor Gray
Write-Host "    Type: base" -ForegroundColor Gray
Write-Host "  • Thêm các fields sau:" -ForegroundColor White
Write-Host "    - id (text, required, unique)" -ForegroundColor Gray
Write-Host "    - name (text, required)" -ForegroundColor Gray
Write-Host "    - game_mode (select: deathmatch, team_deathmatch, capture_the_flag)" -ForegroundColor Gray
Write-Host "    - max_players (number, min: 2, max: 8)" -ForegroundColor Gray
Write-Host "    - current_players (number, min: 0)" -ForegroundColor Gray
Write-Host "    - status (select: waiting, starting, in_progress, finished, closed)" -ForegroundColor Gray
Write-Host "    - host_player_id (text, required)" -ForegroundColor Gray
Write-Host "    - created_at (date, required)" -ForegroundColor Gray
Write-Host "    - updated_at (date, required)" -ForegroundColor Gray
Write-Host "    - settings (json)" -ForegroundColor Gray
Write-Host ""
Write-Host "Bước 3: Tạo Room mới" -ForegroundColor Yellow
Write-Host "  • Vào Collections > rooms > New record" -ForegroundColor White
Write-Host "  • Điền thông tin room:" -ForegroundColor White
Write-Host "    Name: Game Room (tên bất kỳ)" -ForegroundColor Gray
Write-Host "    Game Mode: deathmatch" -ForegroundColor Gray
Write-Host "    Max Players: 4" -ForegroundColor Gray
Write-Host "    Current Players: 0" -ForegroundColor Gray
Write-Host "    Status: waiting" -ForegroundColor Gray
Write-Host "    Host Player ID: host_player_123" -ForegroundColor Gray
Write-Host "    Created At: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "    Updated At: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
Write-Host "Bước 4: Chạy script tự động (sau khi thiết lập xong)" -ForegroundColor Yellow
Write-Host "  • Đóng hướng dẫn này và chạy: .\create-room-automatically.ps1" -ForegroundColor White
Write-Host ""
Write-Host "📚 Các lệnh hữu ích:" -ForegroundColor Green
Write-Host "  • Xem danh sách rooms: http://localhost:8090/_/collections/rooms" -ForegroundColor White
Write-Host "  • Xem room details: http://localhost:8080/api/rooms" -ForegroundColor White
Write-Host "  • Test Room Manager: cargo run -p room-manager" -ForegroundColor White
Write-Host ""
Write-Host "✨ Chúc bạn chơi game vui vẻ!" -ForegroundColor Cyan

# Mở PocketBase admin dashboard
try {
    Start-Process "http://localhost:8090/_/"
    Write-Host "Đã mở PocketBase admin dashboard trong trình duyệt" -ForegroundColor Green
} catch {
    Write-Host "Khong the mo trinh duyet tu dong. Hay mo http://localhost:8090/_/ thu cong" -ForegroundColor Yellow
}
