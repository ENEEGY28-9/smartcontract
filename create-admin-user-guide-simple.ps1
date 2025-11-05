Write-Host "HUONG DAN TAO ADMIN USER TRONG POCKETBASE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "QUY TRINH TAO ADMIN USER:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Buoc 1: Truy cap Admin Panel" -ForegroundColor Green
Write-Host "  - Mo trinh duyet web" -ForegroundColor White
Write-Host "  - Truy cap: http://localhost:8090/_/" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 2: Tao Admin User dau tien" -ForegroundColor Green
Write-Host "  - Trong giao dien PocketBase Admin" -ForegroundColor White
Write-Host "  - Vao phan 'Admins' hoac 'Settings'" -ForegroundColor White
Write-Host "  - Nhan 'Create Admin' hoac 'Add Admin'" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 3: Dien thong tin Admin" -ForegroundColor Green
Write-Host "  - Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  - Password: admin123456" -ForegroundColor White
Write-Host "  - Confirm Password: admin123456" -ForegroundColor White
Write-Host ""

Write-Host "Buoc 4: Luu Admin User" -ForegroundColor Green
Write-Host "  - Nhan 'Create' hoac 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "THONG TIN ADMIN SE TAO:" -ForegroundColor Magenta
Write-Host "  Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "  Password: admin123456" -ForegroundColor White
Write-Host ""

Write-Host "LUU Y QUAN TRONG:" -ForegroundColor Red
Write-Host "  - Day la admin user dau tien trong PocketBase" -ForegroundColor Yellow
Write-Host "  - Can tao thong qua giao dien web truoc khi dung API" -ForegroundColor Yellow
Write-Host "  - Sau khi tao xong, script se hoat dong binh thuong" -ForegroundColor Yellow
Write-Host ""

Write-Host "SAU KHI TAO ADMIN THANH CONG:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ban se chay lenh nay de tao collection rooms:" -ForegroundColor Green
Write-Host ".\test-rooms-collection-fixed.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Hoac su dung script day du:" -ForegroundColor Green
Write-Host ".\create-rooms-collection-simple.ps1" -ForegroundColor White
Write-Host ""

Write-Host "TRUY CAP NGAY:" -ForegroundColor Magenta
Write-Host "http://localhost:8090/_/" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan

# Mo trinh duyet tu dong
try {
    Start-Process "http://localhost:8090/_/"
    Write-Host "Da mo trinh duyet tu dong!" -ForegroundColor Green
} catch {
    Write-Host "Hay mo trinh duyet va truy cap: http://localhost:8090/_/" -ForegroundColor Yellow
}
