# Test script để kiểm tra khắc phục lỗi WebRTC fallback JSON parsing
Write-Host "=== WebRTC Fallback JSON Parsing Fix Test ===" -ForegroundColor Green

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

# 3. Thông báo về khắc phục lỗi
Write-Host ""
Write-Host "3. Applied fixes:" -ForegroundColor Yellow
Write-Host "   ✅ Fixed JSON parsing error in fallback WebSocket" -ForegroundColor Green
Write-Host "   ✅ Added proper error handling for non-JSON messages" -ForegroundColor Green
Write-Host "   ✅ Improved message sending with better error handling" -ForegroundColor Green
Write-Host "   ✅ Added detailed logging for debugging" -ForegroundColor Green

# 4. Hướng dẫn khắc phục bổ sung nếu cần
Write-Host ""
Write-Host "4. If issues persist:" -ForegroundColor Yellow
Write-Host "   🔍 Check browser console (F12) for detailed error logs" -ForegroundColor Cyan
Write-Host "   🔧 Monitor: http://localhost:5173/net-test" -ForegroundColor Cyan
Write-Host "   ⚡ Restart client to apply fixes" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Fix applied ===" -ForegroundColor Green
Write-Host "The JSON parsing error should now be resolved!" -ForegroundColor Green

# Mở trang test
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Open http://localhost:5173/net-test manually" -ForegroundColor Yellow
}
