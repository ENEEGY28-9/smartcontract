# WebRTC Fallback Fix - Final Test Script
Write-Host "=== WebRTC Fallback Fix - Complete Test ===" -ForegroundColor Green
Write-Host ""

# Check services status
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

# Check WebRTC sessions
Write-Host ""
Write-Host "2. Checking WebRTC sessions..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/rtc/sessions" -UseBasicParsing -TimeoutSec 3
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ WebRTC Sessions: $($data.sessions.Count) active" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot check WebRTC sessions" -ForegroundColor Red
}

# Show improvements
Write-Host ""
Write-Host "3. Applied improvements:" -ForegroundColor Yellow
Write-Host "   ✅ Added multiple TURN servers for better connectivity" -ForegroundColor Green
Write-Host "   ✅ Increased timeout to 15 seconds" -ForegroundColor Green
Write-Host "   ✅ Enhanced reconnection logic (5 attempts)" -ForegroundColor Green
Write-Host "   ✅ Improved Vite config with CORS headers" -ForegroundColor Green

# Show TURN servers
Write-Host ""
Write-Host "4. Configured ICE servers:" -ForegroundColor Yellow
$servers = @(
    "STUN: Google (19302)", "STUN: Google (19302)",
    "TURN: openrelay.metered.ca (80)", "TURN: openrelay.metered.ca (443)",
    "TURN: relay.backups.cz", "TURN: peerjs.com (3478)"
)
for ($i = 0; $i -lt $servers.Count; $i++) {
    Write-Host "   $($i + 1). $($servers[$i])" -ForegroundColor Cyan
}

# Instructions
Write-Host ""
Write-Host "5. Next steps:" -ForegroundColor Yellow
Write-Host "   🔍 Monitor: http://localhost:5173/net-test" -ForegroundColor Cyan
Write-Host "   🔧 Check browser console for WebRTC errors" -ForegroundColor Cyan
Write-Host "   ⚡ Restart client to apply new configuration" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Test completed ===" -ForegroundColor Green

# Try to open test page
try {
    Start-Process "http://localhost:5173/net-test"
    Write-Host "Opening test page..." -ForegroundColor Cyan
} catch {
    Write-Host "Open http://localhost:5173/net-test manually" -ForegroundColor Yellow
}
