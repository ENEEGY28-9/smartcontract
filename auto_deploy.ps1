# 🚀 AUTOMATED SMART CONTRACT DEPLOYMENT SCRIPT
# This script will commit changes and push to trigger GitHub Actions

param(
    [string]$CommitMessage = "🚀 Automated Smart Contract Deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [switch]$SkipTests,
    [switch]$Force
)

Write-Host "🚀 STARTING AUTOMATED DEPLOYMENT..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if we're in a git repository
if (!(Test-Path ".git")) {
    Write-Host "❌ Error: Not in a git repository!" -ForegroundColor Red
    exit 1
}

# Check git status
$gitStatus = git status --porcelain
if ($gitStatus -and !$Force) {
    Write-Host "📝 Uncommitted changes detected:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Commit these changes automatically (recommended)" -ForegroundColor Cyan
    Write-Host "2. Use -Force to skip this check" -ForegroundColor Cyan
    Write-Host "3. Manually commit your changes first" -ForegroundColor Cyan
    $choice = Read-Host "Choose option (1/2/3)"
    if ($choice -eq "3") {
        Write-Host "Please commit your changes manually and run this script again." -ForegroundColor Yellow
        exit 0
    }
}

# Add all changes
Write-Host "📦 Adding changes..." -ForegroundColor Blue
git add .

# Commit changes
Write-Host "💾 Committing changes..." -ForegroundColor Blue
git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed. You may need to resolve conflicts or add changes first." -ForegroundColor Red
    exit 1
}

# Get current branch
$currentBranch = git branch --show-current
Write-Host "🌿 Current branch: $currentBranch" -ForegroundColor Blue

# Push to trigger GitHub Actions
Write-Host "🚀 Pushing to GitHub (this will trigger deployment)..." -ForegroundColor Blue
git push origin $currentBranch

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed. Check your git configuration and network connection." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 SUCCESS! Changes pushed to GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor White
Write-Host "2. Click on the latest workflow run" -ForegroundColor White
Write-Host "3. Watch the deployment progress in real-time" -ForegroundColor White
Write-Host "4. Check the deployment report artifact when complete" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  Estimated deployment time: 5-10 minutes" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Direct links:" -ForegroundColor Cyan
Write-Host "• Actions: https://github.com/ENEEGY28-9/smartcontract/actions/workflows/deploy-fixed.yml" -ForegroundColor White
Write-Host "• Repository: https://github.com/ENEEGY28-9/smartcontract" -ForegroundColor White
Write-Host ""
Write-Host "📞 The workflow will:" -ForegroundColor Green
Write-Host "  ✅ Setup Rust, Solana CLI, and Anchor automatically" -ForegroundColor Green
Write-Host "  ✅ Create and fund a devnet wallet" -ForegroundColor Green
Write-Host "  ✅ Build the smart contract" -ForegroundColor Green
Write-Host "  ✅ Deploy to Solana Devnet" -ForegroundColor Green
Write-Host "  ✅ Verify deployment on-chain" -ForegroundColor Green
Write-Host "  ✅ Generate deployment report" -ForegroundColor Green
Write-Host "  ✅ Run basic tests" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 END GOAL: Smart contract live on Solana Devnet!" -ForegroundColor Magenta
