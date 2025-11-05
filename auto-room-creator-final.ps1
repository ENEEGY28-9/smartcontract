# Script tự động tạo room hoàn chỉnh - không cần authentication phức tạp
param(
    [int]$NumberOfRooms = 3,
    [string]$GameMode = "deathmatch"
)

Write-Host "🎮 TỰ ĐỘNG TẠO ROOM HOÀN CHỈNH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Số lượng rooms cần tạo: $NumberOfRooms" -ForegroundColor White
Write-Host "Game mode: $GameMode" -ForegroundColor White
Write-Host ""

# Đếm số lần chạy để tạo nhiều room
Write-Host "🚀 Đang tạo $NumberOfRooms rooms tự động..." -ForegroundColor Yellow

$createdRooms = @()
$successCount = 0

for ($i = 1; $i -le $NumberOfRooms; $i++) {
    Write-Host "Đang tạo Room $i..." -ForegroundColor Gray

    # Set biến môi trường để chạy ở chế độ test
    $env:ROOM_MANAGER_TEST = "1"

    # Tạo tên room unique
    $roomName = "Auto Room $i - $(Get-Date -Format 'HH:mm:ss')"

    # Chạy Room Manager để tạo room (sẽ tự động tạo và hiển thị kết quả)
    try {
        $output = & cargo run -p room-manager 2>&1

        # Tìm room ID trong output
        $roomIdMatch = $output | Select-String -Pattern "Created room.*: ([a-f0-9-]+)" | Select-Object -First 1
        if ($roomIdMatch) {
            $roomId = $roomIdMatch.Matches.Groups[1].Value
            $createdRooms += $roomId
            $successCount++
            Write-Host "✅ Room $i thành công: $roomId" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Room $i tạo nhưng không tìm thấy ID" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Lỗi khi tạo Room $i" -ForegroundColor Red
    }

    # Đợi 2 giây giữa các lần tạo
    if ($i -lt $NumberOfRooms) {
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "📊 KẾT QUẢ TẠO ROOM:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tổng số rooms cần tạo: $NumberOfRooms" -ForegroundColor White
Write-Host "Số rooms tạo thành công: $successCount" -ForegroundColor Green
Write-Host "Tỷ lệ thành công: $([math]::Round(($successCount / $NumberOfRooms) * 100, 1))%" -ForegroundColor Cyan

if ($createdRooms.Count -gt 0) {
    Write-Host ""
    Write-Host "🏠 DANH SÁCH ROOMS ĐÃ TẠO:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $createdRooms.Count; $i++) {
        Write-Host "  $($i + 1). $($createdRooms[$i])" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔗 THÔNG TIN TRUY CẬP:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Game Client: http://localhost:5173" -ForegroundColor White
Write-Host "Game trực tiếp: http://localhost:5173/game" -ForegroundColor White
Write-Host "Room Manager: http://localhost:8080/api/rooms" -ForegroundColor White
Write-Host "PocketBase Admin: http://localhost:8090/_/" -ForegroundColor White

Write-Host ""
Write-Host "💡 HƯỚNG DẪN SỬ DỤNG:" -ForegroundColor Yellow
Write-Host "1. Mở trình duyệt và truy cập: http://localhost:5173" -ForegroundColor White
Write-Host "2. Nhấn 'Play Game' để bắt đầu chơi" -ForegroundColor White
Write-Host "3. Sử dụng SPACE, A/D, S để điều khiển nhân vật" -ForegroundColor White
Write-Host "4. Để chơi multiplayer, cần thiết lập PocketBase admin trước" -ForegroundColor White

Write-Host ""
Write-Host "🎉 HOÀN THÀNH! Bạn đã có $successCount rooms sẵn sàng để chơi!" -ForegroundColor Green

# Lưu kết quả vào file để tham khảo
$resultFile = "room-creation-results.txt"
@"
TỔNG KẾT TẠO ROOM
================
Thời gian: $(Get-Date)
Số rooms cần tạo: $NumberOfRooms
Số rooms thành công: $successCount
Tỷ lệ thành công: $([math]::Round(($successCount / $NumberOfRooms) * 100, 1))%

DANH SÁCH ROOMS:
$($createdRooms -join "`n")

LINKS:
- Game: http://localhost:5173
- Room Manager API: http://localhost:8080/api/rooms
- PocketBase Admin: http://localhost:8090/_/
"@ | Out-File -FilePath $resultFile -Encoding UTF8

Write-Host ""
Write-Host "📄 Kết quả đã được lưu vào file: $resultFile" -ForegroundColor Magenta
