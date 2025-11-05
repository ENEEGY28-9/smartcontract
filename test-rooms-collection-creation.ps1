# Script kiểm tra chức năng tạo collection rooms
# Để chạy thử nghiệm trước khi thực hiện chính thức

param(
    [switch]$TestOnly,
    [string]$PocketBaseUrl = "http://localhost:8090"
)

Write-Host "🧪 KIỂM TRA CHỨC NĂNG TẠO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra kết nối PocketBase
Write-Host "Bước 1: Kiểm tra kết nối PocketBase..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ PocketBase đang chạy tại $PocketBaseUrl" -ForegroundColor Green
} catch {
    Write-Host "✗ Không thể kết nối đến PocketBase" -ForegroundColor Red
    Write-Host "Lỗi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Hướng dẫn khắc phục:" -ForegroundColor Yellow
    Write-Host "1. Đảm bảo PocketBase đang chạy: .\pocketbase.exe serve" -ForegroundColor White
    Write-Host "2. Kiểm tra cổng 8090 có đang được sử dụng không" -ForegroundColor White
    exit 1
}

# Kiểm tra thông tin đăng nhập admin (sẽ cần nhập tay)
Write-Host ""
Write-Host "Bước 2: Thông tin đăng nhập admin cần thiết" -ForegroundColor Yellow
Write-Host "Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "Password: admin123456" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Bạn có muốn tiếp tục với thông tin này không? (y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "Hãy cập nhật thông tin đăng nhập trong script trước khi chạy" -ForegroundColor Yellow
    exit 0
}

# Nếu chỉ test, không thực hiện tạo collection
if ($TestOnly) {
    Write-Host ""
    Write-Host "🔍 CHẾ ĐỘ TEST - Chỉ kiểm tra kết nối và thông tin" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Các bước sẽ thực hiện:" -ForegroundColor Yellow
    Write-Host "1. ✓ Đã kiểm tra kết nối PocketBase" -ForegroundColor Green
    Write-Host "2. ⏳ Sẽ đăng nhập admin (chưa thực hiện)" -ForegroundColor Gray
    Write-Host "3. ⏳ Sẽ tạo collection rooms (chưa thực hiện)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Để thực hiện đầy đủ, chạy lệnh không có tham số -TestOnly" -ForegroundColor Cyan
    exit 0
}

# Thực hiện tạo collection
Write-Host ""
Write-Host "🚀 THỰC HIỆN TẠO COLLECTION ROOMS" -ForegroundColor Green
Write-Host ""

try {
    .\create-rooms-collection-simple.ps1
    Write-Host ""
    Write-Host "✅ HOÀN THÀNH!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "1. Mở trình duyệt truy cập: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "2. Đăng nhập với tài khoản admin" -ForegroundColor White
    Write-Host "3. Vào Collections để kiểm tra collection 'rooms'" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ LỖI KHI TẠO COLLECTION:" -ForegroundColor Red
    Write-Host "$($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Xem hướng dẫn khắc phục trong file HUONG-DAN-TAO-ROOMS-COLLECTION.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
