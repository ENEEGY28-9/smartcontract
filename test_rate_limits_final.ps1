# 🚀 Final Rate Limiting Test
# Test để kiểm tra xem rate limits có hoạt động không

Write-Host "🚀 Testing Rate Limiting" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Yellow

$rateLimited = 0
$success = 0
$total = 0

Write-Host "📤 Sending 15 rapid requests from same IP..." -ForegroundColor Cyan

for ($i = 1; $i -le 15; $i++) {
    $json = @{
        name = "Rate Test $i"
        maxPlayers = 4
        gameMode = "classic"
        hostName = "Player $i"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/rooms/create" `
            -Method POST `
            -ContentType "application/json" `
            -Body $json `
            -TimeoutSec 3 `
            -ErrorAction SilentlyContinue

        $total++
        $statusCode = $response.StatusCode

        if ($statusCode -eq 429) {
            $rateLimited++
            Write-Host "Request $i`: Rate limited (429)" -ForegroundColor Red
        } elseif ($statusCode -eq 404) {
            $success++
            Write-Host "Request $i`: Success (404)" -ForegroundColor Green
        } else {
            Write-Host "Request $i`: Status $statusCode" -ForegroundColor Yellow
        }
    }
    catch {
        $total++
        Write-Host "🔥 Request $i`: Error/Timeout" -ForegroundColor Red
    }

    # Small delay between requests
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "🎯 RESULTS" -ForegroundColor Green
Write-Host "=========" -ForegroundColor Yellow
Write-Host "📊 Total requests: $total"
Write-Host "✅ Success (404): $success"
Write-Host "🚫 Rate limited (429): $rateLimited"

$rateLimitPercentage = ($rateLimited / $total) * 100

if ($rateLimited -gt 0) {
    Write-Host ""
    Write-Host "🎉 RATE LIMITING IS WORKING!" -ForegroundColor Green
    Write-Host "   Successfully blocked $rateLimited requests with 429" -ForegroundColor Green
    Write-Host "   Rate limit percentage: $($rateLimitPercentage.ToString('F1'))%" -ForegroundColor Cyan

    if ($rateLimitPercentage -lt 5) {
        Write-Host "✅ TARGET ACHIEVED: <5% rate limit errors" -ForegroundColor Green
    } else {
        Write-Host "📈 Rate limiting active but above 5%" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⚠️  No rate limiting detected" -ForegroundColor Yellow
    Write-Host "   This could mean:" -ForegroundColor Yellow
    Write-Host "   - Rate limits are too high" -ForegroundColor Yellow
    Write-Host "   - API endpoint not implemented" -ForegroundColor Yellow
    Write-Host "   - Rate limiting not active for this endpoint" -ForegroundColor Yellow
}

# Check gateway health
Write-Host ""
Write-Host "🔍 Gateway Status:" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/rooms/create" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"name":"Health Check","maxPlayers":2,"gameMode":"test","hostName":"Test"}' `
        -TimeoutSec 2 `
        -ErrorAction SilentlyContinue

    if ($healthResponse) {
        Write-Host "   ✅ Gateway is running and responding" -ForegroundColor Green
        Write-Host "   📊 Status Code: $($healthResponse.StatusCode)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "   ❌ Cannot connect to gateway" -ForegroundColor Red
    Write-Host "   💡 Make sure gateway is running: cd gateway && cargo run" -ForegroundColor Yellow
}
