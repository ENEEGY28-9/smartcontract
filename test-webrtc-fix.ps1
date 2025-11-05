# Test script để khắc phục lỗi WebRTC fallback
Write-Host "=== WebRTC Fallback Fix Test ===" -ForegroundColor Green

# 1. Kiểm tra trạng thái các service
Write-Host "1. Checking service status..." -ForegroundColor Yellow
try {
    $gateway = Invoke-WebRequest -Uri "http://localhost:8080/healthz" -UseBasicParsing -TimeoutSec 3
    Write-Host "✅ Gateway: OK (Port 8080)" -ForegroundColor Green
} catch {
    Write-Host "❌ Gateway: Not responding on port 8080" -ForegroundColor Red
}

try {
    $pocketbase = Invoke-WebRequest -Uri "http://localhost:8090/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "✅ PocketBase: OK (Port 8090)" -ForegroundColor Green
} catch {
    Write-Host "❌ PocketBase: Not responding on port 8090" -ForegroundColor Red
}

try {
    $client = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
    Write-Host "✅ Client: OK (Port 5173)" -ForegroundColor Green
} catch {
    Write-Host "❌ Client: Not responding on port 5173" -ForegroundColor Red
}

# 2. Kiểm tra WebRTC sessions
Write-Host "2. Checking WebRTC sessions..." -ForegroundColor Yellow
try {
    $sessions = Invoke-WebRequest -Uri "http://localhost:8080/rtc/sessions" -UseBasicParsing -TimeoutSec 3
    $sessionData = $sessions.Content | ConvertFrom-Json
    Write-Host "✅ WebRTC Sessions: $($sessionData.sessions.Count) active sessions" -ForegroundColor Green
    foreach ($session in $sessionData.sessions) {
        Write-Host "   - $($session.session_id): $($session.status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ WebRTC Sessions: Cannot retrieve session data" -ForegroundColor Red
}

# 3. Kiểm tra cấu hình TURN servers
Write-Host "3. Checking TURN server connectivity..." -ForegroundColor Yellow
$turnServers = @(
    "stun:stun.l.google.com:19302",
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443"
)

foreach ($server in $turnServers) {
    try {
        # Sử dụng tcping để kiểm tra kết nối UDP/TCP
        Write-Host "   Checking $server..." -ForegroundColor Cyan
        # Note: Trong môi trường thực tế, bạn cần công cụ như tcping để test UDP
    } catch {
        Write-Host "   ⚠️  Cannot test $server connectivity" -ForegroundColor Yellow
    }
}

# 4. Hướng dẫn khắc phục
Write-Host "4. Recommendations:" -ForegroundColor Yellow
Write-Host "   📋 Open http://localhost:5173/net-test to monitor WebRTC status" -ForegroundColor Cyan
Write-Host "   🔧 Check browser console (F12) for WebRTC errors" -ForegroundColor Cyan
Write-Host "   🌐 If still failing, consider using a VPN or different network" -ForegroundColor Cyan
Write-Host "   ⚙️  For production, use your own TURN servers instead of public ones" -ForegroundColor Cyan

Write-Host "=== Test completed ===" -ForegroundColor Green

# Tự động mở trang test
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening net-test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Could not open browser automatically" -ForegroundColor Yellow
}
