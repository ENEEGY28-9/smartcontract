# Build script with environment setup
Write-Host "Setting up environment..." -ForegroundColor Blue

# Set working directory
Set-Location $PSScriptRoot

# Set environment variables
$env:HOME = $env:USERPROFILE
$env:CARGO_HOME = "$env:USERPROFILE\.cargo"
$env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
$env:PATH = "$env:PATH;$PSScriptRoot\game_token\solana-release\bin;$env:USERPROFILE\.cargo\bin"

Write-Host "Environment configured:" -ForegroundColor Blue

# Navigate to smart contract directory
Set-Location game_token

Write-Host "Starting build..." -ForegroundColor Yellow
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










