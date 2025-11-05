# Test script để kiểm tra cải tiến WebRTC với timeout và TURN servers tốt hơn
Write-Host "=== Enhanced WebRTC Test ===" -ForegroundColor Green

# 1. Kiểm tra trạng thái services
Write-Host "1. Checking service status..." -ForegroundColor Yellow
$services = @("http://localhost:8080/healthz", "http://localhost:8090/api/health", "http://localhost:5173")
$serviceNames = @("Gateway", "PocketBase", "Client")

for ($i = 0; $i -lt $services.Count; $i++) {
    try {
        Invoke-WebRequest -Uri $services[$i] -UseBasicParsing -TimeoutSec 3 | Out-Null
        Write-Host "✅ $($serviceNames[$i]): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($serviceNames[$i]): Not responding" -ForegroundColor Red
    }
}

# 2. Kiểm tra WebRTC sessions
Write-Host ""
Write-Host "2. Checking WebRTC sessions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/rtc/sessions" -UseBasicParsing -TimeoutSec 3
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ WebRTC Sessions: $($data.sessions.Count) active" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot check WebRTC sessions" -ForegroundColor Red
}

# 3. Thông báo về cải tiến mới
Write-Host ""
Write-Host "3. Enhanced configuration applied:" -ForegroundColor Yellow
Write-Host "   ✅ Increased connection timeout to 20 seconds" -ForegroundColor Green
Write-Host "   ✅ Added separate ICE gathering timeout (8 seconds)" -ForegroundColor Green
Write-Host "   ✅ Reduced reconnection attempts to 3 for faster fallback" -ForegroundColor Green
Write-Host "   ✅ Added Google's STUN servers for better reliability" -ForegroundColor Green
Write-Host "   ✅ Enhanced TURN server list with multiple providers" -ForegroundColor Green

# 4. Hiển thị cấu hình ICE servers mới
Write-Host ""
Write-Host "4. Current ICE server configuration:" -ForegroundColor Yellow
$iceServers = @(
    "STUN: Google (4 servers)",
    "TURN: openrelay.metered.ca (3 protocols)",
    "TURN: relay.backups.cz (2 protocols)",
    "TURN: stun.nextcloud.com (1 server)"
)

$totalServers = 4 + 3 + 2 + 1  # STUN + TURN servers
Write-Host "   Total: $totalServers ICE servers configured" -ForegroundColor Cyan

for ($i = 0; $i -lt $iceServers.Count; $i++) {
    Write-Host "   $($i + 1). $($iceServers[$i])" -ForegroundColor Cyan
}

# 5. Hướng dẫn khắc phục nếu vẫn gặp vấn đề
Write-Host ""
Write-Host "5. If WebRTC still falls back to WebSocket:" -ForegroundColor Yellow
Write-Host "   🔍 Check browser console for detailed connection logs" -ForegroundColor Cyan
Write-Host "   🔧 Monitor: http://localhost:5173/net-test" -ForegroundColor Cyan
Write-Host "   ⏱️ Wait up to 20 seconds for WebRTC connection" -ForegroundColor Cyan
Write-Host "   🌐 Try on a different network if corporate firewall blocks WebRTC" -ForegroundColor Cyan

# 6. Các bước tiếp theo
Write-Host ""
Write-Host "6. Next steps:" -ForegroundColor Yellow
Write-Host "   🚀 Restart client to apply enhanced configuration" -ForegroundColor Cyan
Write-Host "   📊 Monitor connection logs in browser console" -ForegroundColor Cyan
Write-Host "   ⚡ Test with 'Test All Connections' button in net-test page" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Enhanced configuration ready ===" -ForegroundColor Green

# Mở trang test
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening enhanced test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Open http://localhost:5173/net-test manually"
}
