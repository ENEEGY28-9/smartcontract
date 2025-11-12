# PowerShell script to setup Solana CLI and build SBF on Windows
# Run this script after manually installing Solana CLI

Write-Host "🚀 Setting up Solana CLI and Building SBF on Windows" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Check if Solana CLI is installed
Write-Host "📋 Checking Solana CLI installation..." -ForegroundColor Yellow
try {
    $solanaVersion = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Solana CLI found: $solanaVersion" -ForegroundColor Green
    } else {
        throw "Solana CLI not found"
    }
} catch {
    Write-Host "❌ Solana CLI not installed!" -ForegroundColor Red
    Write-Host "Please install Solana CLI first:" -ForegroundColor Yellow
    Write-Host "1. Download: https://github.com/anza-xyz/agave/releases/download/v1.18.26/solana-release-x86_64-pc-windows-msvc.tar.bz2" -ForegroundColor Cyan
    Write-Host "2. Extract to: C:\solana\" -ForegroundColor Cyan
    Write-Host "3. Add to PATH: C:\solana\bin\" -ForegroundColor Cyan
    Write-Host "4. Restart PowerShell and run this script again" -ForegroundColor Cyan
    exit 1
}

# Configure Solana CLI
Write-Host "🌐 Configuring Solana CLI..." -ForegroundColor Yellow
& solana config set --url devnet

# Check Solana CLI configuration
Write-Host "📋 Current configuration:" -ForegroundColor Yellow
& solana config get

# Check balance
Write-Host "💰 Checking wallet balance..." -ForegroundColor Yellow
$balance = & solana balance --url devnet
Write-Host "Balance: $balance" -ForegroundColor Green

# Navigate to project directory
Set-Location "C:\Users\Fit\Downloads\eneegy-main\game_token"

# Build SBF using Solana CLI
Write-Host "🏗️ Building SBF (Solana Bytecode Format)..." -ForegroundColor Yellow
Write-Host "Command: solana program build target/deploy --program-id target/deploy/game_token-keypair.json" -ForegroundColor Cyan

try {
    & solana program build target/deploy --program-id target/deploy/game_token-keypair.json

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SBF Build successful!" -ForegroundColor Green

        # Check if .so file was created
        $soFile = "target\deploy\game_token.so"
        if (Test-Path $soFile) {
            $fileSize = (Get-Item $soFile).Length
            Write-Host "📁 .so file created: $soFile ($fileSize bytes)" -ForegroundColor Green
        } else {
            Write-Host "❌ .so file not found!" -ForegroundColor Red
            exit 1
        }

        # Try to deploy
        Write-Host "🚀 Attempting deployment..." -ForegroundColor Yellow
        & solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json --url devnet

        if ($LASTEXITCODE -eq 0) {
            Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
            Write-Host "🌐 Smart contract is now live on Solana devnet" -ForegroundColor Green

            # Get program ID
            $programId = & solana-keygen pubkey target/deploy/game_token-keypair.json
            Write-Host "📄 Program ID: $programId" -ForegroundColor Cyan

            # Test player claim
            Write-Host "🧪 Testing player claim..." -ForegroundColor Yellow
            & node player_claim_real.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 30

            if ($LASTEXITCODE -eq 0) {
                Write-Host "🎉 PLAYER CLAIM TEST SUCCESSFUL!" -ForegroundColor Green
                Write-Host "✅ Game Token System is fully operational!" -ForegroundColor Green
            } else {
                Write-Host "⚠️ Player claim test failed, but deployment was successful" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Deployment failed" -ForegroundColor Red
            Write-Host "This might be due to network issues or insufficient funds" -ForegroundColor Yellow
            Write-Host "Try again later or check your SOL balance" -ForegroundColor Yellow
        }

    } else {
        Write-Host "❌ SBF Build failed!" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Error during build/deploy process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🏁 Process completed!" -ForegroundColor Green


