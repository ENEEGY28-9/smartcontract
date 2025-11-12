# PowerShell script to verify Solana CLI installation and run build/deploy

Write-Host "🔍 Verifying Solana CLI Installation" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Check if Solana CLI is installed
Write-Host "📋 Checking Solana CLI..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Solana CLI found: $version" -ForegroundColor Green
    } else {
        Write-Host "❌ Solana CLI not found!" -ForegroundColor Red
        Write-Host "Please run install_solana_windows.ps1 as Administrator first" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Solana CLI not accessible!" -ForegroundColor Red
    Write-Host "Please restart PowerShell or check PATH" -ForegroundColor Yellow
    exit 1
}

# Check Solana CLI configuration
Write-Host "🌐 Checking configuration..." -ForegroundColor Yellow
& solana config get

# Check balance
Write-Host "💰 Checking balance..." -ForegroundColor Yellow
$balance = & solana balance --url devnet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Balance: $balance" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not check balance" -ForegroundColor Yellow
}

# Check if we're in the right directory
Write-Host "📁 Checking current directory..." -ForegroundColor Yellow
$currentDir = Get-Location
if ($currentDir.Path -like "*game_token") {
    Write-Host "✅ In game_token directory" -ForegroundColor Green
} else {
    Write-Host "⚠️ Not in game_token directory" -ForegroundColor Yellow
    Write-Host "Please navigate to: cd C:\Users\Fit\Downloads\eneegy-main\game_token" -ForegroundColor Cyan
}

# Check required files
Write-Host "📁 Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "target\deploy\game_token-keypair.json",
    "target\deploy\game_token.so",
    "programs\game_token_v2\src\lib.rs",
    "player_claim_real.js"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "❌ Some required files are missing!" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "🎯 READY TO BUILD AND DEPLOY!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "🚀 Running build and deploy process..." -ForegroundColor Yellow

# Run the build and deploy script
try {
    & ".\setup_and_build_windows.ps1"
} catch {
    Write-Host "❌ Build/deploy script failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 PROCESS COMPLETED!" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green


