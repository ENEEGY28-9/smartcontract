Write-Host "Testing Fixed Wallet Interface..." -ForegroundColor Cyan

Start-Sleep -Seconds 3

# Test multiple ports
$ports = @(5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180)
$foundServer = $false

foreach ($port in $ports) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS: Development server found on port $port!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Wallet Test Interface Available:" -ForegroundColor Yellow
            Write-Host "   Home: http://localhost:$port/" -ForegroundColor White
            Write-Host "   Wallet Test: http://localhost:$port/wallet-test" -ForegroundColor White
            Write-Host "   Game Rooms: http://localhost:$port/rooms" -ForegroundColor White
            Write-Host "   Spectator: http://localhost:$port/spectator" -ForegroundColor White
            Write-Host ""
            Write-Host "Your Wallet Address: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB" -ForegroundColor Cyan
            Write-Host "Get SOL: https://faucet.solana.com/" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Opening wallet test in browser..." -ForegroundColor Yellow

            # Try to open browser
            Start-Process "http://localhost:$port/wallet-test"

            Write-Host "All wallet functionality should now work!" -ForegroundColor Green
            $foundServer = $true
            break
        }
    } catch {
        # Continue to next port
    }
}

if (-not $foundServer) {
    Write-Host "ERROR: Cannot find development server" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Make sure server is running (npm run dev)" -ForegroundColor Gray
    Write-Host "   2. Check for error messages" -ForegroundColor Gray
    Write-Host "   3. Try opening test-wallet.html directly" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternative: Open test-wallet.html in browser (no server needed)" -ForegroundColor Yellow
}


