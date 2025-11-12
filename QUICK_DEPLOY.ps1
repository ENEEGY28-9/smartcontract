# ⚡ QUICK DEPLOY - ONE-CLICK SMART CONTRACT DEPLOYMENT
# Run this script and everything happens automatically!

param(
    [switch]$NoMonitor,
    [switch]$SkipTests
)

Write-Host "⚡ QUICK DEPLOY - ONE-CLICK SMART CONTRACT DEPLOYMENT" -ForegroundColor Magenta
Write-Host "=====================================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Auto deploy
Write-Host "🚀 STEP 1: Triggering automated deployment..." -ForegroundColor Green
& ".\auto_deploy.ps1" -SkipTests:$SkipTests

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment trigger failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Start monitoring (unless disabled)
if (!$NoMonitor) {
    Write-Host "👀 STEP 2: Starting real-time monitoring..." -ForegroundColor Blue
    Write-Host "📊 The script will monitor progress and notify you when complete." -ForegroundColor Blue
    Write-Host "💡 You can close this window - monitoring will continue in background." -ForegroundColor Blue
    Write-Host ""

    # Start monitoring in background
    Start-Job -ScriptBlock {
        param($ScriptPath)
        & $ScriptPath -Silent
    } -ArgumentList "$PSScriptRoot\monitor_deployment.ps1" | Out-Null

    # Start monitoring in foreground
    & ".\monitor_deployment.ps1"
}
else {
    Write-Host "📋 STEP 2: Monitoring disabled (-NoMonitor)" -ForegroundColor Yellow
    Write-Host "🔗 Check progress manually at: https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 QUICK DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📞 What happens next:" -ForegroundColor Cyan
Write-Host "• GitHub Actions will run the deployment automatically" -ForegroundColor White
Write-Host "• Smart contract will be deployed to Solana Devnet" -ForegroundColor White
Write-Host "• You'll get notified when it's ready for testing" -ForegroundColor White
Write-Host ""
Write-Host "⏱️ Estimated time: 8-12 minutes" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Links:" -ForegroundColor Cyan
Write-Host "• Actions: https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor White
Write-Host "• Repo: https://github.com/ENEEGY28-9/smartcontract" -ForegroundColor White
