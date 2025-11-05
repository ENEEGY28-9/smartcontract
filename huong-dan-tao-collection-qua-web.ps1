Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "HUONG DAN TAO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "THONG QUA GIAO DIEN WEB POCKETBASE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "BAN DA DANG NHAP THANH CONG!" -ForegroundColor Green
Write-Host "Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host ""

Write-Host "QUY TRINH TAO COLLECTION ROOMS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Buoc 1: Trong giao dien PocketBase Admin" -ForegroundColor Green
Write-Host "  - Ban dang o trang: Collections / players" -ForegroundColor White
Write-Host "  - O ben trai, tim muc 'Collections'" -ForegroundColor White
Write-Host "  - Nhan vao 'Collections' de mo danh sach" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 2: Tao Collection moi" -ForegroundColor Green
Write-Host "  - Ben phai, tim nut '+ New collection'" -ForegroundColor White
Write-Host "  - Nhan vao nut do" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 3: Dien thong tin Collection" -ForegroundColor Green
Write-Host "  - Name: rooms" -ForegroundColor White
Write-Host "  - Type: base" -ForegroundColor White
Write-Host "  - Nhan 'Create collection'" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 4: Them cac truong (Fields)" -ForegroundColor Green
Write-Host "  - Sau khi tao collection, nhan vao ten 'rooms'" -ForegroundColor White
Write-Host "  - Trong trang chi tiet, tim muc 'Schema'" -ForegroundColor White
Write-Host "  - Nhan 'Add field' de them tung truong" -ForegroundColor White
Write-Host ""

Write-Host "CAC TRUONG CAN THEM:" -ForegroundColor Magenta
Write-Host ""

$fields = @(
    @{name="id"; type="text"; required="true"; desc="ID phong game"},
    @{name="name"; type="text"; required="true"; desc="Ten phong game"},
    @{name="game_mode"; type="select"; required="true"; desc="Che do game"},
    @{name="max_players"; type="number"; required="true"; desc="So nguoi choi toi da"},
    @{name="current_players"; type="number"; required="false"; desc="So nguoi choi hien tai"},
    @{name="status"; type="select"; required="true"; desc="Trang thai phong"},
    @{name="host_player_id"; type="text"; required="true"; desc="ID nguoi tao phong"},
    @{name="created_at"; type="date"; required="true"; desc="Ngay tao"},
    @{name="updated_at"; type="date"; required="true"; desc="Ngay cap nhat"},
    @{name="settings"; type="json"; required="false"; desc="Cai dat bo sung"}
)

Write-Host "┌─────────────────┬─────────┬──────────┬──────────────────┐" -ForegroundColor DarkGray
Write-Host "│     TRUONG      │   KIEU  │ BAT BUOC │      MO TA       │" -ForegroundColor DarkGray
Write-Host "├─────────────────┼─────────┼──────────┼──────────────────┤" -ForegroundColor DarkGray

foreach ($field in $fields) {
    $name = $field.name.PadRight(17)
    $type = $field.type.PadRight(9)
    $required = if ($field.required -eq "true") { "YES" } else { "NO" }
    $required = $required.PadRight(10)
    $desc = $field.desc
    Write-Host "│ $name│ $type│ $required│ $desc│" -ForegroundColor White
}

Write-Host "└─────────────────┴─────────┴──────────┴──────────────────┘" -ForegroundColor DarkGray
Write-Host ""

Write-Host "CHI TIET CAC TRUONG:" -ForegroundColor Yellow
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

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SAU KHI TAO XONG:" -ForegroundColor Magenta
Write-Host ""
Write-Host "Ban se thay collection 'rooms' trong danh sach" -ForegroundColor Green
Write-Host "Co the nhan vao de xem chi tiet cac truong" -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
