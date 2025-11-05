# Script kiểm tra đơn giản chức năng tạo collection rooms

Write-Host "🧪 KIỂM TRA CHỨC NĂNG TẠO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra kết nối PocketBase
Write-Host "Bước 1: Kiểm tra kết nối PocketBase..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ PocketBase đang chạy" -ForegroundColor Green
} catch {
    Write-Host "✗ Không thể kết nối đến PocketBase" -ForegroundColor Red
    Write-Host "Lỗi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Hướng dẫn:" -ForegroundColor Yellow
    Write-Host "1. Chạy PocketBase: .\pocketbase.exe serve" -ForegroundColor White
    Write-Host "2. Kiểm tra cổng 8090" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Bước 2: Thông tin đăng nhập admin" -ForegroundColor Yellow
Write-Host "Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "Password: admin123456" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Tiếp tục với thông tin này? (y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "Cập nhật thông tin trong script trước khi chạy" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Bước 3: Đăng nhập admin..." -ForegroundColor Yellow
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "✓ Đăng nhập thành công" -ForegroundColor Green
} catch {
    Write-Host "✗ Đăng nhập thất bại" -ForegroundColor Red
    Write-Host "Lỗi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Có thể cần tạo admin user trước" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Bước 4: Tạo collection rooms..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$roomsSchema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true }
        @{ name = "name"; type = "text"; required = $true }
        @{ name = "game_mode"; type = "select"; required = $true; options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") } }
        @{ name = "max_players"; type = "number"; required = $true; options = @{ min = 2; max = 8 } }
        @{ name = "current_players"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") } }
        @{ name = "host_player_id"; type = "text"; required = $true }
        @{ name = "created_at"; type = "date"; required = $true }
        @{ name = "updated_at"; type = "date"; required = $true }
        @{ name = "settings"; type = "json"; required = $false }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "✓ Tạo collection rooms thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Collection: $($response.name)" -ForegroundColor White
    Write-Host "Trường: $($response.schema.Count)" -ForegroundColor White
} catch {
    Write-Host "✗ Tạo collection thất bại" -ForegroundColor Red
    Write-Host "Lỗi: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
