Write-Host "HUONG DAN TAO COLLECTION ROOMS QUA GIAO DIEN WEB" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "BAN DA DANG NHAP THANH CONG VAO POCKETBASE!" -ForegroundColor Green
Write-Host "Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host ""

Write-Host "QUY TRINH TAO COLLECTION ROOMS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "BUOC 1: TRONG GIAO DIEN POCKETBASE ADMIN" -ForegroundColor Green
Write-Host "  - Ban dang o trang: Collections / players" -ForegroundColor White
Write-Host "  - O ben trai, tim muc 'Collections'" -ForegroundColor White
Write-Host "  - Nhan vao 'Collections' de mo danh sach" -ForegroundColor White
Write-Host ""

Write-Host "BUOC 2: TAO COLLECTION MOI" -ForegroundColor Green
Write-Host "  - Ben phai, tim nut '+ New collection'" -ForegroundColor White
Write-Host "  - Nhan vao nut do" -ForegroundColor White
Write-Host ""

Write-Host "BUOC 3: DIEN THONG TIN COLLECTION" -ForegroundColor Green
Write-Host "  - Name: rooms" -ForegroundColor White
Write-Host "  - Type: base" -ForegroundColor White
Write-Host "  - Nhan 'Create collection'" -ForegroundColor White
Write-Host ""

Write-Host "BUOC 4: THEM CAC TRUONG (FIELDS)" -ForegroundColor Green
Write-Host "  - Sau khi tao collection, nhan vao ten 'rooms'" -ForegroundColor White
Write-Host "  - Trong trang chi tiet, tim muc 'Schema'" -ForegroundColor White
Write-Host "  - Nhan 'Add field' de them tung truong" -ForegroundColor White
Write-Host ""

Write-Host "CAC TRUONG CAN THEM:" -ForegroundColor Magenta
Write-Host ""

Write-Host "1. id (text, required)" -ForegroundColor Green
Write-Host "   - Name: id" -ForegroundColor White
Write-Host "   - Type: text" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host ""

Write-Host "2. name (text, required)" -ForegroundColor Green
Write-Host "   - Name: name" -ForegroundColor White
Write-Host "   - Type: text" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host ""

Write-Host "3. game_mode (select, required)" -ForegroundColor Green
Write-Host "   - Name: game_mode" -ForegroundColor White
Write-Host "   - Type: select" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host "   - Options: deathmatch, team_deathmatch, capture_the_flag" -ForegroundColor White
Write-Host ""

Write-Host "4. max_players (number, required)" -ForegroundColor Green
Write-Host "   - Name: max_players" -ForegroundColor White
Write-Host "   - Type: number" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host "   - Min: 2, Max: 8" -ForegroundColor White
Write-Host ""

Write-Host "5. current_players (number, optional)" -ForegroundColor Green
Write-Host "   - Name: current_players" -ForegroundColor White
Write-Host "   - Type: number" -ForegroundColor White
Write-Host "   - Required: false" -ForegroundColor White
Write-Host "   - Min: 0" -ForegroundColor White
Write-Host ""

Write-Host "6. status (select, required)" -ForegroundColor Green
Write-Host "   - Name: status" -ForegroundColor White
Write-Host "   - Type: select" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host "   - Options: waiting, starting, in_progress, finished, closed" -ForegroundColor White
Write-Host ""

Write-Host "7. host_player_id (text, required)" -ForegroundColor Green
Write-Host "   - Name: host_player_id" -ForegroundColor White
Write-Host "   - Type: text" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host ""

Write-Host "8. created_at (date, required)" -ForegroundColor Green
Write-Host "   - Name: created_at" -ForegroundColor White
Write-Host "   - Type: date" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host ""

Write-Host "9. updated_at (date, required)" -ForegroundColor Green
Write-Host "   - Name: updated_at" -ForegroundColor White
Write-Host "   - Type: date" -ForegroundColor White
Write-Host "   - Required: true" -ForegroundColor White
Write-Host ""

Write-Host "10. settings (json, optional)" -ForegroundColor Green
Write-Host "    - Name: settings" -ForegroundColor White
Write-Host "    - Type: json" -ForegroundColor White
Write-Host "    - Required: false" -ForegroundColor White
Write-Host ""

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "SAU KHI TAO XONG:" -ForegroundColor Magenta
Write-Host ""
Write-Host "Ban se thay collection 'rooms' trong danh sach" -ForegroundColor Green
Write-Host "Co the nhan vao de xem chi tiet cac truong" -ForegroundColor White
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
