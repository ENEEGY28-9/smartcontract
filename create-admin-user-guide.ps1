Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                HƯỚNG DẪN TẠO ADMIN USER                     ║" -ForegroundColor Cyan
Write-Host "║                    TRONG POCKETBASE                         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 QUY TRÌNH TẠO ADMIN USER:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Bước 1: Truy cập Admin Panel" -ForegroundColor Green
Write-Host "  • Mở trình duyệt web" -ForegroundColor White
Write-Host "  • Truy cập: http://localhost:8090/_/" -ForegroundColor White
Write-Host ""

Write-Host "Bước 2: Tạo Admin User đầu tiên" -ForegroundColor Green
Write-Host "  • Trong giao diện PocketBase Admin" -ForegroundColor White
Write-Host "  • Vào phần 'Admins' hoặc 'Settings'" -ForegroundColor White
Write-Host "  • Nhấn 'Create Admin' hoặc 'Add Admin'" -ForegroundColor White
Write-Host ""

Write-Host "Bước 3: Điền thông tin Admin" -ForegroundColor Green
Write-Host "  • Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  • Password: admin123456" -ForegroundColor White
Write-Host "  • Confirm Password: admin123456" -ForegroundColor White
Write-Host ""

Write-Host "Bước 4: Lưu Admin User" -ForegroundColor Green
Write-Host "  • Nhấn 'Create' hoặc 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "🔐 THÔNG TIN ADMIN SẼ TẠO:" -ForegroundColor Magenta
Write-Host "  Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  Password: admin123456" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  LƯU Ý QUAN TRỌNG:" -ForegroundColor Red
Write-Host "  • Đây là admin user đầu tiên trong PocketBase" -ForegroundColor Yellow
Write-Host "  • Cần tạo thông qua giao diện web trước khi dùng API" -ForegroundColor Yellow
Write-Host "  • Sau khi tạo xong, script sẽ hoạt động bình thường" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 SAU KHI TẠO ADMIN THÀNH CÔNG:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bạn sẽ chạy lệnh này để tạo collection rooms:" -ForegroundColor Green
Write-Host ".\test-rooms-collection-fixed.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Hoặc sử dụng script đầy đủ:" -ForegroundColor Green
Write-Host ".\create-rooms-collection-simple.ps1" -ForegroundColor White
Write-Host ""

Write-Host "📱 TRUY CẬP NGAY:" -ForegroundColor Magenta
Write-Host "👉 http://localhost:8090/_/" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan

# Mo trinh duyet tu dong (neu co the)
try {
    Start-Process "http://localhost:8090/_/"
    Write-Host "Da mo trinh duyet tu dong!" -ForegroundColor Green
} catch {
    Write-Host "Hay mo trinh duyet va truy cap: http://localhost:8090/_/" -ForegroundColor Yellow
}
