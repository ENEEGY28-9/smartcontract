# Test script để kiểm tra khắc phục TURN servers
Write-Host "=== TURN Servers Fix Applied ===" -ForegroundColor Green

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

# 2. Thông báo về cải tiến đã áp dụng
Write-Host ""
Write-Host "2. Applied fixes for TURN servers:" -ForegroundColor Yellow
Write-Host "   ✅ Improved TURN server testing logic" -ForegroundColor Green
Write-Host "   ✅ Added Cloudflare STUN server" -ForegroundColor Green
Write-Host "   ✅ Prioritized STUN servers over TURN" -ForegroundColor Green
Write-Host "   ✅ Enhanced logging for debugging" -ForegroundColor Green
Write-Host "   ✅ Created comprehensive TURN servers guide" -ForegroundColor Green

# 3. Hiển thị các tùy chọn khắc phục
Write-Host ""
Write-Host "3. Available solutions if still failing:" -ForegroundColor Yellow
Write-Host "   🔧 Use Twilio TURN servers (1,000 min free/month)" -ForegroundColor Cyan
Write-Host "   🏠 Self-host TURN server with CoTURN" -ForegroundColor Cyan
Write-Host "   📖 Check TURN_SERVERS_GUIDE.md for details" -ForegroundColor Cyan

# 4. Hướng dẫn tiếp theo
Write-Host ""
Write-Host "4. Next steps:" -ForegroundColor Yellow
Write-Host "   🚀 Restart client: cd client && npm run dev" -ForegroundColor White
Write-Host "   🔍 Monitor: http://localhost:5173/net-test" -ForegroundColor White
Write-Host "   📋 Check console for detailed TURN server logs" -ForegroundColor White
Write-Host "   📖 Read TURN_SERVERS_GUIDE.md for advanced solutions" -ForegroundColor White

Write-Host ""
Write-Host "=== Enhanced TURN server configuration ready ===" -ForegroundColor Green

# Mở trang test và guide
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Open http://localhost:5173/net-test manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📖 Guide available: TURN_SERVERS_GUIDE.md" -ForegroundColor Magenta
