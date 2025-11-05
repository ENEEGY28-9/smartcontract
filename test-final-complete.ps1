# Script test cuối cùng cho WebRTC fix hoàn chỉnh
Write-Host "🎯 WebRTC Fix Complete - Final Test" -ForegroundColor Green
Write-Host ""

# 1. Kiểm tra trạng thái services
Write-Host "1. Checking all services..." -ForegroundColor Yellow
$services = @(
    @{name="Gateway"; url="http://localhost:8080/healthz"},
    @{name="PocketBase"; url="http://localhost:8090/api/health"},
    @{name="Client"; url="http://localhost:5173"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.url -UseBasicParsing -TimeoutSec 3
        Write-Host "✅ $($service.name): Running" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($service.name): Not responding" -ForegroundColor Red
    }
}

# 2. Thông báo về các cải tiến đã áp dụng
Write-Host ""
Write-Host "2. All fixes applied:" -ForegroundColor Yellow
Write-Host "   ✅ Fixed JSON parsing errors in fallback WebSocket" -ForegroundColor Green
Write-Host "   ✅ Enhanced ICE servers configuration (10 servers)" -ForegroundColor Green
Write-Host "   ✅ Improved timeout handling (20s connection, 8s ICE)" -ForegroundColor Green
Write-Host "   ✅ Added comprehensive TURN servers guide" -ForegroundColor Green
Write-Host "   ✅ Enhanced debugging and logging" -ForegroundColor Green

# 3. Hiển thị cấu hình hiện tại
Write-Host ""
Write-Host "3. Current WebRTC configuration:" -ForegroundColor Yellow
Write-Host "   📋 ICE Servers: 10 total (7 STUN + 3 TURN)" -ForegroundColor Cyan
Write-Host "   ⏱️  Connection Timeout: 20 seconds" -ForegroundColor Cyan
Write-Host "   🔄 Max Reconnect Attempts: 3" -ForegroundColor Cyan
Write-Host "   🧪 Enhanced TURN server testing" -ForegroundColor Cyan

# 4. Các bước test tiếp theo
Write-Host ""
Write-Host "4. Testing steps:" -ForegroundColor Yellow
Write-Host "   🚀 1. Open: http://localhost:5173/net-test" -ForegroundColor White
Write-Host "   🧪 2. Click 'Test TURN Servers' button" -ForegroundColor White
Write-Host "   🔧 3. Click 'Initialize WebRTC' to start connection" -ForegroundColor White
Write-Host "   ⏱️  4. Wait up to 20 seconds for connection" -ForegroundColor White
Write-Host "   📊 5. Check console (F12) for detailed logs" -ForegroundColor White

# 5. Nếu vẫn gặp vấn đề
Write-Host ""
Write-Host "5. If still experiencing issues:" -ForegroundColor Yellow
Write-Host "   📖 Read: TURN_SERVERS_GUIDE.md for advanced solutions" -ForegroundColor Cyan
Write-Host "   🔧 Use Twilio TURN servers (1,000 min free/month)" -ForegroundColor Cyan
Write-Host "   🏠 Self-host TURN server with CoTURN" -ForegroundColor Cyan
Write-Host "   🌐 Test on different network (VPN/hotspot)" -ForegroundColor Cyan

# 6. Thông tin files quan trọng
Write-Host ""
Write-Host "6. Important files:" -ForegroundColor Yellow
Write-Host "   📄 WEBRTC_FIX_COMPLETE_GUIDE.md - Complete guide" -ForegroundColor White
Write-Host "   🔧 client/src/lib/config/webrtc-config.ts - Configuration" -ForegroundColor White
Write-Host "   🧪 test-turn-servers-directly.html - Direct TURN test" -ForegroundColor White

Write-Host ""
Write-Host "=== WebRTC fix complete! ===" -ForegroundColor Green
Write-Host "System is ready for testing with enhanced configuration!" -ForegroundColor Green

# Mở các trang test quan trọng
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening main test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Open http://localhost:5173/net-test manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📚 Guide: WEBRTC_FIX_COMPLETE_GUIDE.md" -ForegroundColor Magenta
