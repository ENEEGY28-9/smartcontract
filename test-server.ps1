Write-Host "Testing Fixed Wallet Development Server..." -ForegroundColor Cyan

Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5

    if ($response.StatusCode -eq 200) {
        Write-Host "SUCCESS: Server is running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Wallet Test Interface Available:" -ForegroundColor Yellow
        Write-Host "   Home: http://localhost:5173/" -ForegroundColor White
        Write-Host "   Wallet Test: http://localhost:5173/wallet-test" -ForegroundColor White
        Write-Host "   Game Rooms: http://localhost:5173/rooms" -ForegroundColor White
        Write-Host "   Spectator: http://localhost:5173/spectator" -ForegroundColor White
        Write-Host ""
        Write-Host "Your Wallet Address: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB" -ForegroundColor Cyan
        Write-Host "Get SOL: https://faucet.solana.com/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Ready to test wallet functionality!" -ForegroundColor Green
    } else {
        Write-Host "Server responded with status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Server not responding" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check if server is still starting" -ForegroundColor Gray
    Write-Host "   2. Run: npm run dev" -ForegroundColor Gray
    Write-Host "   3. Check for error messages" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternative: Open test-wallet.html directly in browser" -ForegroundColor Yellow
}