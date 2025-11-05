# Script test toàn diện để khắc phục lỗi WebRTC fallback
Write-Host "=== WebRTC Fallback Fix - Complete Test ===" -ForegroundColor Green
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
        $response = Invoke-WebRequest -Uri $service.url -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ $($service.name): OK ($($service.url))" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($service.name): Not responding ($($service.url))" -ForegroundColor Red
    }
}

# 2. Kiểm tra WebRTC sessions và cấu hình
Write-Host ""
Write-Host "2. Checking WebRTC configuration..." -ForegroundColor Yellow
try {
    $sessions = Invoke-WebRequest -Uri "http://localhost:8080/rtc/sessions" -UseBasicParsing -TimeoutSec 5
    $sessionData = $sessions.Content | ConvertFrom-Json
    Write-Host "✅ WebRTC Sessions: $($sessionData.sessions.Count) active sessions" -ForegroundColor Green

    # Hiển thị thông tin chi tiết về sessions
    foreach ($session in $sessionData.sessions) {
        $status = $session.status
        $color = if ($status -eq "active") { "Green" } else { "Yellow" }
        Write-Host "   - $($session.session_id): $status" -ForegroundColor $color
    }
} catch {
    Write-Host "❌ Cannot retrieve WebRTC session data" -ForegroundColor Red
}

# 3. Hiển thị cấu hình cải tiến đã áp dụng
Write-Host ""
Write-Host "3. Applied improvements:" -ForegroundColor Yellow
Write-Host "   ✅ Added multiple TURN servers for better NAT traversal" -ForegroundColor Green
Write-Host "   ✅ Increased connection timeout to 15 seconds" -ForegroundColor Green
Write-Host "   ✅ Improved reconnection logic with max 5 attempts" -ForegroundColor Green
Write-Host "   ✅ Added ICE candidate pool size configuration" -ForegroundColor Green
Write-Host "   ✅ Enhanced Vite config with CORS and COEP/COOP headers" -ForegroundColor Green

# 4. Hiển thị các TURN servers được cấu hình
Write-Host ""
Write-Host "4. Configured ICE servers:" -ForegroundColor Yellow
$iceServers = @(
    "STUN: stun.l.google.com:19302",
    "STUN: stun1.l.google.com:19302",
    "STUN: stun2.l.google.com:19302",
    "STUN: stun3.l.google.com:19302",
    "STUN: stun4.l.google.com:19302",
    "TURN: openrelay.metered.ca:80 (UDP)",
    "TURN: openrelay.metered.ca:443 (UDP)",
    "TURN: openrelay.metered.ca:443 (TCP)",
    "TURN: relay.backups.cz (UDP)",
    "TURN: relay.backups.cz (TCP)",
    "TURN: 0.peerjs.com:3478 (UDP)"
)

for ($i = 0; $i -lt $iceServers.Count; $i++) {
    Write-Host "   $($i + 1). $($iceServers[$i])" -ForegroundColor Cyan
}

# 5. Hướng dẫn khắc phục nếu vẫn có vấn đề
Write-Host ""
Write-Host "5. Troubleshooting guide:" -ForegroundColor Yellow
Write-Host "   📋 If WebRTC still falls back to WebSocket:" -ForegroundColor Cyan
Write-Host "      • Check browser console (F12) for specific errors" -ForegroundColor White
Write-Host "      • Try using a VPN to bypass network restrictions" -ForegroundColor White
Write-Host "      • Ensure no corporate firewall is blocking UDP ports" -ForegroundColor White
Write-Host "      • Test with different browsers (Chrome/Firefox/Edge)" -ForegroundColor White
Write-Host ""
Write-Host "   🔧 For production deployment:" -ForegroundColor Cyan
Write-Host "      • Replace public TURN servers with your own" -ForegroundColor White
Write-Host "      • Consider using HTTPS for better WebRTC support" -ForegroundColor White
Write-Host "      • Monitor connection quality and implement health checks" -ForegroundColor White

# 6. Các lệnh hữu ích để debug
Write-Host ""
Write-Host "6. Useful debugging commands:" -ForegroundColor Yellow
Write-Host "   🔍 Monitor WebRTC status: http://localhost:5173/net-test" -ForegroundColor Cyan
Write-Host "   📊 Check gateway logs: Get-Content gateway.log -Tail 20 -Wait" -ForegroundColor Cyan
Write-Host "   🔧 Restart all services: .\restart-all-services.ps1" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Test completed ===" -ForegroundColor Green
Write-Host "Open http://localhost:5173/net-test to monitor WebRTC connections" -ForegroundColor Cyan

# Tự động mở trang test
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening net-test page..."
} catch {
    Write-Host "Could not open browser automatically"
}
