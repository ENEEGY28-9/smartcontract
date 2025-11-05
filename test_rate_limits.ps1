# Script để test rate limiting với configuration mới

# Thiết lập các biến môi trường rate limiting cao hơn
$env:RATE_LIMIT_DEFAULT_IP_BURST = "5000"
$env:RATE_LIMIT_DEFAULT_IP_SUSTAINED = "10000"
$env:RATE_LIMIT_DEFAULT_USER_BURST = "2000"
$env:RATE_LIMIT_DEFAULT_USER_SUSTAINED = "5000"

# Các biến khác
$env:RATE_LIMIT_ROOMS_CREATE_IP_BURST = "100"
$env:RATE_LIMIT_ROOMS_CREATE_USER_BURST = "50"
$env:RATE_LIMIT_ROOMS_JOIN_IP_BURST = "150"
$env:RATE_LIMIT_ROOMS_JOIN_USER_BURST = "75"
$env:RATE_LIMIT_UPDATE_PLAYER_IP_BURST = "1000"
$env:RATE_LIMIT_UPDATE_PLAYER_USER_BURST = "750"

Write-Host "🚀 Đã thiết lập rate limits cao hơn:"
Write-Host "  RATE_LIMIT_DEFAULT_IP_BURST: $env:RATE_LIMIT_DEFAULT_IP_BURST"
Write-Host "  RATE_LIMIT_DEFAULT_IP_SUSTAINED: $env:RATE_LIMIT_DEFAULT_IP_SUSTAINED"
Write-Host "  RATE_LIMIT_DEFAULT_USER_BURST: $env:RATE_LIMIT_DEFAULT_USER_BURST"
Write-Host "  RATE_LIMIT_DEFAULT_USER_SUSTAINED: $env:RATE_LIMIT_DEFAULT_USER_SUSTAINED"

# Kiểm tra các biến môi trường
Get-ChildItem env:RATE_LIMIT_* | Format-Table Name, Value

Write-Host ""
Write-Host "✅ Các biến môi trường đã được thiết lập. Bạn có thể chạy gateway với configuration mới này."
