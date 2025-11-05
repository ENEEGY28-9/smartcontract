# =====================================================
# HƯỚNG DẪN TỰ ĐỘNG TẠO COLLECTION ROOMS TRONG POCKETBASE
# =====================================================

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           HƯỚNG DẪN TẠO COLLECTION ROOMS                    ║" -ForegroundColor Cyan
Write-Host "║              TRONG POCKETBASE                               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 QUY TRÌNH TỰ ĐỘNG:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Bước 1: Chuẩn bị môi trường" -ForegroundColor Green
Write-Host "  • Đảm bảo PocketBase đang chạy tại http://localhost:8090" -ForegroundColor White
Write-Host "  • Chuẩn bị thông tin đăng nhập admin" -ForegroundColor White
Write-Host ""

Write-Host "Bước 2: Chạy script tự động" -ForegroundColor Green
Write-Host "  • Mở PowerShell trong thư mục dự án" -ForegroundColor White
Write-Host "  • Chạy lệnh: .\create-rooms-collection-simple.ps1" -ForegroundColor White
Write-Host ""

Write-Host "Bước 3: Kiểm tra kết quả" -ForegroundColor Green
Write-Host "  • Mở trình duyệt truy cập: http://localhost:8090/_/" -ForegroundColor White
Write-Host "  • Đăng nhập với tài khoản admin đã tạo" -ForegroundColor White
Write-Host "  • Vào Collections để kiểm tra collection 'rooms'" -ForegroundColor White
Write-Host ""

Write-Host "🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:" -ForegroundColor Magenta
Write-Host "  Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  Password: admin123456" -ForegroundColor White
Write-Host ""

Write-Host "📊 CẤU TRÚC COLLECTION ROOMS SẼ TẠO:" -ForegroundColor Blue
Write-Host ""

$fields = @(
    @{name="id"; type="text"; required="BẮT BUỘC"; desc="ID phòng game (unique)"},
    @{name="name"; type="text"; required="BẮT BUỘC"; desc="Tên phòng game"},
    @{name="game_mode"; type="select"; required="BẮT BUỘC"; desc="Chế độ game"},
    @{name="max_players"; type="number"; required="BẮT BUỘC"; desc="Số người chơi tối đa (2-8)"},
    @{name="current_players"; type="number"; required="TÙY CHỌN"; desc="Số người chơi hiện tại"},
    @{name="status"; type="select"; required="BẮT BUỘC"; desc="Trạng thái phòng"},
    @{name="host_player_id"; type="text"; required="BẮT BUỘC"; desc="ID người tạo phòng"},
    @{name="created_at"; type="date"; required="BẮT BUỘC"; desc="Ngày tạo"},
    @{name="updated_at"; type="date"; required="BẮT BUỘC"; desc="Ngày cập nhật"},
    @{name="settings"; type="json"; required="TÙY CHỌN"; desc="Cài đặt bổ sung"}
)

Write-Host "┌──────────────┬─────────┬──────────┬────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "│    TRƯỜNG    │   KIỂU  │  BẮT BUỘC │             MÔ TẢ                   │" -ForegroundColor DarkGray
Write-Host "├──────────────┼─────────┼──────────┼────────────────────────────────────┤" -ForegroundColor DarkGray

foreach ($field in $fields) {
    $name = $field.name.PadRight(14)
    $type = $field.type.PadRight(9)
    $required = $field.required.PadRight(10)
    $desc = $field.desc
    Write-Host "│ $name│ $type│ $required│ $desc│" -ForegroundColor White
}

Write-Host "└──────────────┴─────────┴──────────┴────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host ""

Write-Host "🎯 CHẾ ĐỘ GAME (game_mode):" -ForegroundColor Yellow
Write-Host "  • deathmatch" -ForegroundColor White
Write-Host "  • team_deathmatch" -ForegroundColor White
Write-Host "  • capture_the_flag" -ForegroundColor White
Write-Host ""

Write-Host "📊 TRẠNG THÁI PHÒNG (status):" -ForegroundColor Yellow
Write-Host "  • waiting    - Chờ người chơi" -ForegroundColor White
Write-Host "  • starting   - Đang bắt đầu" -ForegroundColor White
Write-Host "  • in_progress - Đang chơi" -ForegroundColor White
Write-Host "  • finished   - Đã kết thúc" -ForegroundColor White
Write-Host "  • closed     - Đã đóng" -ForegroundColor White
Write-Host ""

Write-Host "⚡ CÁCH SỬ DỤNG SCRIPT:" -ForegroundColor Red
Write-Host ""
Write-Host "Cách 1 - Sử dụng thông tin mặc định:" -ForegroundColor Green
Write-Host "  .\create-rooms-collection-simple.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Cách 2 - Chỉ định thông số cụ thể:" -ForegroundColor Green
Write-Host "  .\create-rooms-collection-simple.ps1 -PocketBaseUrl 'http://localhost:8090' -AdminEmail 'admin2@pocketbase.local' -AdminPassword 'admin123456'" -ForegroundColor White
Write-Host ""

Write-Host "🔧 KHẮC PHỤC LỖI THƯỜNG GẶP:" -ForegroundColor Red
Write-Host ""
Write-Host "Lỗi 1: 'Không thể kết nối đến PocketBase'" -ForegroundColor Yellow
Write-Host "  → Khởi động PocketBase: .\pocketbase.exe serve" -ForegroundColor White
Write-Host ""
Write-Host "Lỗi 2: 'Đăng nhập admin thất bại'" -ForegroundColor Yellow
Write-Host "  → Kiểm tra email/password trong script" -ForegroundColor White
Write-Host "  → Đảm bảo tài khoản admin đã được tạo" -ForegroundColor White
Write-Host ""
Write-Host "Lỗi 3: 'Collection đã tồn tại'" -ForegroundColor Yellow
Write-Host "  → Script sẽ tự động cập nhật collection hiện có" -ForegroundColor White
Write-Host ""

Write-Host "✨ TÍNH NĂNG NỔI BẬT:" -ForegroundColor Magenta
Write-Host ""
Write-Host "✓ Tự động xác thực admin" -ForegroundColor Green
Write-Host "✓ Tự động tạo collection với đúng schema" -ForegroundColor Green
Write-Host "✓ Xử lý trường hợp collection đã tồn tại" -ForegroundColor Green
Write-Host "✓ Hiển thị thông tin chi tiết sau khi tạo" -ForegroundColor Green
Write-Host "✓ Thông báo lỗi rõ ràng và hướng dẫn khắc phục" -ForegroundColor Green
Write-Host "✓ Hỗ trợ tiếng Việt hoàn toàn" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 SẴN SÀNG CHẠY SCRIPT!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bạn có muốn chạy script ngay bây giờ không? (y/n): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Đang chạy script tạo collection rooms..." -ForegroundColor Green
    .\create-rooms-collection-simple.ps1
} else {
    Write-Host ""
    Write-Host "Để chạy script sau, hãy sử dụng lệnh:" -ForegroundColor Yellow
    Write-Host ".\create-rooms-collection-simple.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
