# Quick Deploy Script
param(
    [switch]$NoMonitor,
    [switch]$SkipTests
)

Write-Host "Starting Quick Deploy..." -ForegroundColor Green

# Step 1: Run auto deploy
Write-Host "Step 1: Triggering deployment..." -ForegroundColor Blue
try {
    & ".\auto_deploy.ps1" -SkipTests:$SkipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Deployment trigger failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Deployment triggered successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Deployment trigger failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Start monitoring
if (!$NoMonitor) {
    Write-Host "Step 2: Starting monitoring..." -ForegroundColor Blue
    try {
        & ".\monitor_deployment.ps1"
    }
    catch {
        Write-Host "Monitoring failed, but deployment was triggered!" -ForegroundColor Yellow
        Write-Host "Check: https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor Yellow
    }
}

Write-Host "Quick Deploy Complete!" -ForegroundColor Green
Write-Host "Check GitHub Actions for progress: https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor Cyan
