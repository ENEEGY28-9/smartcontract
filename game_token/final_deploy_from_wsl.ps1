# Final deployment script that runs WSL deployment
Write-Host "Final Deployment from WSL" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

Write-Host "Running deployment from WSL..." -ForegroundColor Yellow

# Run WSL deployment
wsl bash -c "cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token && ./deploy_from_wsl_final.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Smart contract is now live on Solana devnet!" -ForegroundColor Green
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
}


