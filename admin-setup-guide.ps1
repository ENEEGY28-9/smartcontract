# Huong dan tao Admin User trong PocketBase
Write-Host "HUONG DAN TAO ADMIN USER TRONG POCKETBASE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "BUOC 1: TRUY CAP POCKETBASE ADMIN" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "1. Mở trình duyệt web (Chrome, Firefox, Edge, v.v.)" -ForegroundColor White
Write-Host "2. Truy cập địa chỉ: http://localhost:8090/_/" -ForegroundColor Green
Write-Host "3. Bạn sẽ thấy giao diện đăng nhập PocketBase" -ForegroundColor White
Write-Host ""

Write-Host "BUOC 2: TAO ADMIN USER" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host "Trong giao diện PocketBase admin:" -ForegroundColor White
Write-Host "1. Tìm và nhấn vào nút 'Create your first admin'" -ForegroundColor Green
Write-Host "   (hoặc vào Settings > Admins nếu đã có admin)" -ForegroundColor Gray
Write-Host "2. Điền thông tin admin:" -ForegroundColor White
Write-Host "   • Email: admin2@pocketbase.local" -ForegroundColor Green
Write-Host "   • Password: admin123456" -ForegroundColor Green
Write-Host "   • Confirm Password: admin123456" -ForegroundColor Green
Write-Host "3. Nhấn 'Create admin' hoặc 'Save'" -ForegroundColor Green
Write-Host ""

Write-Host "BUOC 3: XAC NHAN DANG NHAP" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
Write-Host "1. Sau khi tạo admin, bạn sẽ được đăng nhập tự động" -ForegroundColor White
Write-Host "2. Bạn sẽ thấy giao diện admin dashboard" -ForegroundColor Green
Write-Host "3. Ở góc trên bên phải, bạn sẽ thấy email của mình" -ForegroundColor White
Write-Host ""

Write-Host "BUOC 4: KIEM TRA COLLECTIONS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host "1. Vào menu 'Collections' ở sidebar bên trái" -ForegroundColor White
Write-Host "2. Kiểm tra xem có collection nào chưa:" -ForegroundColor White
Write-Host "   • Nếu chưa có collection nào, hãy tạo collection 'rooms'" -ForegroundColor Yellow
Write-Host "   • Nếu đã có, bỏ qua bước này" -ForegroundColor Gray
Write-Host ""

Write-Host "BUOC 5: TAO COLLECTION ROOMS (Neu chua co)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "1. Nhấn nút 'New collection'" -ForegroundColor Green
Write-Host "2. Điền thông tin:" -ForegroundColor White
Write-Host "   • Name: rooms" -ForegroundColor Green
Write-Host "   • Type: base" -ForegroundColor Green
Write-Host "3. Thêm các fields sau bằng cách nhấn 'Add field':" -ForegroundColor White
Write-Host "   • id (text, required, unique)" -ForegroundColor Gray
Write-Host "   • name (text, required)" -ForegroundColor Gray
Write-Host "   • game_mode (select: deathmatch, team_deathmatch, capture_the_flag)" -ForegroundColor Gray
Write-Host "   • max_players (number, min: 2, max: 8)" -ForegroundColor Gray
Write-Host "   • current_players (number, min: 0)" -ForegroundColor Gray
Write-Host "   • status (select: waiting, starting, in_progress, finished, closed)" -ForegroundColor Gray
Write-Host "   • host_player_id (text, required)" -ForegroundColor Gray
Write-Host "   • created_at (date, required)" -ForegroundColor Gray
Write-Host "   • updated_at (date, required)" -ForegroundColor Gray
Write-Host "   • settings (json)" -ForegroundColor Gray
Write-Host "4. Nhấn 'Create collection'" -ForegroundColor Green
Write-Host ""

Write-Host "BUOC 6: CHAY SCRIPT TU DONG" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host "Sau khi hoàn thành các bước trên, chạy lệnh:" -ForegroundColor White
Write-Host "powershell -File create-room-full-automation.ps1 -NumberOfRooms 5" -ForegroundColor Green
Write-Host ""

Write-Host "BUOC 7: KIEM TRA KET QUA" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow
Write-Host "1. Trong PocketBase admin, vào Collections > rooms" -ForegroundColor White
Write-Host "2. Bạn sẽ thấy danh sách rooms đã được tạo tự động" -ForegroundColor Green
Write-Host "3. Mở http://localhost:5173 để chơi game" -ForegroundColor White
Write-Host ""

Write-Host "MEO HUU ICH:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "• Nếu gặp lỗi đăng nhập, thử refresh trang" -ForegroundColor Gray
Write-Host "• Nếu không thấy collection, thử tạo lại" -ForegroundColor Gray
Write-Host "• Rooms được tạo tự động sẽ xuất hiện ngay lập tức" -ForegroundColor Gray
Write-Host "• Bạn có thể tạo thêm rooms bất cứ lúc nào" -ForegroundColor Gray
Write-Host ""

Write-Host "SAU KHI HOAN THANH:" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host "Bạn sẽ có:" -ForegroundColor White
Write-Host "Admin user da duoc thiet lap" -ForegroundColor Green
Write-Host "Collection rooms da co trong database" -ForegroundColor Green
Write-Host "Nhieu rooms san sang de choi" -ForegroundColor Green
Write-Host "He thong hoat dong hoan chinh" -ForegroundColor Green

Write-Host ""
Write-Host "CHUC BAN THANH CONG!" -ForegroundColor Magenta

# Tự động mở PocketBase admin
try {
    Start-Process "http://localhost:8090/_/"
    Write-Host "Da mo PocketBase admin trong trinh duyet!" -ForegroundColor Green
} catch {
    Write-Host "Khong the mo trinh duyet tu dong." -ForegroundColor Yellow
    Write-Host "Hay mo http://localhost:8090/_/ thu cong" -ForegroundColor White
}
