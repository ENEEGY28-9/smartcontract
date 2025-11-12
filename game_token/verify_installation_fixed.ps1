# PowerShell script to verify Solana CLI installation and run build/deploy

Write-Host "Verifying Solana CLI Installation" -ForegroundColor Green
Write-Host =================================== -ForegroundColor Green

# Check if Solana CLI is installed
Write-Host "Checking Solana CLI..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Solana CLI found: $version" -ForegroundColor Green
    } else {
        Write-Host "Solana CLI not found!" -ForegroundColor Red
        Write-Host "Please run .\install_solana_windows_fixed.ps1 as Administrator first" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Solana CLI not found!" -ForegroundColor Red
    exit 1
}

# Check Solana CLI configuration
Write-Host "Checking configuration..." -ForegroundColor Yellow
& solana config get

# Check balance
Write-Host "Checking balance..." -ForegroundColor Yellow
$balance = & solana balance --url devnet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Balance: $balance" -ForegroundColor Green
} else {
    Write-Host "Could not check balance" -ForegroundColor Yellow
}

# Check current directory
Write-Host "Checking current directory..." -ForegroundColor Yellow
$currentDir = Get-Location
if ($currentDir.Path -like "*game_token") {
    Write-Host "In game_token directory" -ForegroundColor Green
} else {
    Write-Host "Not in game_token directory" -ForegroundColor Yellow
    Write-Host "Please navigate to: cd C:\Users\Fit\Downloads\eneegy-main\game_token" -ForegroundColor Cyan
}

# Check required files
Write-Host "Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "target\deploy\game_token-keypair.json",
    "target\deploy\game_token.so",
    "programs\game_token_v2\src\lib.rs",
    "player_claim_real.js"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "Found: $file" -ForegroundColor Green
    } else {
        Write-Host "Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "Some required files are missing!" -ForegroundColor Red
    exit 1
}

Write-Host "READY TO BUILD AND DEPLOY!" -ForegroundColor Green
Write-Host ============================== -ForegroundColor Green

# Build and deploy
Write-Host "Building and deploying..." -ForegroundColor Yellow

# Check if .so file already exists from WSL build
$soFile = "target\deploy\game_token.so"
if (Test-Path $soFile) {
    Write-Host "Using existing .so file from WSL build" -ForegroundColor Green
    $fileSize = (Get-Item $soFile).Length
    Write-Host ".so file found: $soFile ($fileSize bytes)" -ForegroundColor Green

    # Deploy directly
    Write-Host "Deploying to devnet..." -ForegroundColor Cyan
    & solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json --url devnet

    if ($LASTEXITCODE -eq 0) {
        Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green

        # Get program ID
        $programId = & solana-keygen pubkey target/deploy/game_token-keypair.json
        Write-Host "Program ID: $programId" -ForegroundColor Cyan

        # Test player claim
        Write-Host "Testing player claim..." -ForegroundColor Cyan
        & node player_claim_real.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 30

        if ($LASTEXITCODE -eq 0) {
            Write-Host "PLAYER CLAIM TEST SUCCESSFUL!" -ForegroundColor Green
            Write-Host "GAME TOKEN SYSTEM IS FULLY OPERATIONAL!" -ForegroundColor Green
        } else {
            Write-Host "Player claim test failed, but deployment was successful" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
        Write-Host "Error details:" -ForegroundColor Yellow
        # Show last error
    }
} else {
    Write-Host "No .so file found!" -ForegroundColor Red
    Write-Host "Please run WSL build first to create the .so file" -ForegroundColor Yellow
    exit 1
}

Write-Host "Process completed!" -ForegroundColor Green
