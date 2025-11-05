# 🚀 Start Game System with Optimized Rate Limits
# Script để khởi động hệ thống với rate limits cao hơn (5000/10000)

Write-Host "🚀 Starting Game System with Optimized Rate Limits" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Yellow

# Thiết lập các biến môi trường rate limiting cao hơn
Write-Host "📊 Setting Rate Limit Environment Variables..." -ForegroundColor Cyan

$env:RATE_LIMIT_DEFAULT_IP_BURST = "5000"
$env:RATE_LIMIT_DEFAULT_IP_SUSTAINED = "10000"
$env:RATE_LIMIT_DEFAULT_USER_BURST = "2000"
$env:RATE_LIMIT_DEFAULT_USER_SUSTAINED = "5000"

# Các biến rate limiting khác cho game endpoints
$env:RATE_LIMIT_ROOMS_CREATE_IP_BURST = "100"
$env:RATE_LIMIT_ROOMS_CREATE_USER_BURST = "50"
$env:RATE_LIMIT_ROOMS_JOIN_IP_BURST = "150"
$env:RATE_LIMIT_ROOMS_JOIN_USER_BURST = "75"
$env:RATE_LIMIT_UPDATE_PLAYER_IP_BURST = "1000"
$env:RATE_LIMIT_UPDATE_PLAYER_USER_BURST = "750"

Write-Host "✅ Rate Limits Configuration:" -ForegroundColor Green
Write-Host "  Default IP Burst:     $env:RATE_LIMIT_DEFAULT_IP_BURST"
Write-Host "  Default IP Sustained: $env:RATE_LIMIT_DEFAULT_IP_SUSTAINED"
Write-Host "  Default User Burst:   $env:RATE_LIMIT_DEFAULT_USER_BURST"
Write-Host "  Default User Sustained: $env:RATE_LIMIT_DEFAULT_USER_SUSTAINED"
Write-Host "  Game Updates IP:      $env:RATE_LIMIT_UPDATE_PLAYER_IP_BURST"
Write-Host "  Game Updates User:    $env:RATE_LIMIT_UPDATE_PLAYER_USER_BURST"
Write-Host ""

# Kiểm tra các services cần thiết
Write-Host "🔍 Checking Required Services..." -ForegroundColor Cyan

# Kiểm tra Redis
try {
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if (-not $redisProcess) {
        Write-Host "⚠️  Redis not running. Please start Redis first." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Redis not running. Please start Redis first." -ForegroundColor Yellow
}

# Kiểm tra PocketBase
try {
    $pbProcess = Get-Process -Name "pocketbase" -ErrorAction SilentlyContinue
    if (-not $pbProcess) {
        Write-Host "⚠️  PocketBase not running. Please start PocketBase first." -ForegroundColor Yellow
    } else {
        Write-Host "✅ PocketBase is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  PocketBase not running. Please start PocketBase first." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Services..." -ForegroundColor Cyan

# Start Worker
Write-Host "Starting Worker..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command cd worker; cargo run" -NoNewWindow

# Wait a moment
Start-Sleep -Seconds 2

# Start Gateway
Write-Host "Starting Gateway..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command cd gateway; RUST_LOG=info cargo run" -NoNewWindow

Write-Host ""
Write-Host "✅ Services started with optimized rate limits!" -ForegroundColor Green
Write-Host "📈 Rate limits increased from 10/60 to 5000/10000 (IP/User)" -ForegroundColor Green
Write-Host "🎮 System is ready for high-throughput gaming!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 To monitor rate limiting:" -ForegroundColor Yellow
Write-Host "  - Check logs for rate limit hits"
Write-Host "  - Monitor metrics at http://localhost:8080/metrics"
Write-Host "  - Test with: node test_rate_limit_429.js"
Write-Host ""
Write-Host "🛠️  To stop services: Get-Process -Name 'cargo' | Stop-Process -Force" -ForegroundColor Yellow
