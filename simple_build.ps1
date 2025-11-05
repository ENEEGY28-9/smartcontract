# Simple build script test
Write-Host "Starting build..." -ForegroundColor Yellow

# Navigate to smart contract directory
Set-Location game_token

# Try to build
anchor build

if ($LASTEXITCODE -eq 0) {
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
} else {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
}

# Return to original directory
Set-Location $PSScriptRoot

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If build successful: Run .\full_deployment_automated.bat" -ForegroundColor Cyan
Write-Host "2. Check deployment status in SOLANA_SETUP_GUIDE.md" -ForegroundColor Cyan