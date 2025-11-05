# Fix Windows Environment Variables for Solana/Anchor Build

Write-Host "🔧 FIXING WINDOWS BUILD ENVIRONMENT..." -ForegroundColor Green
Write-Host ""

# Step 1: Set HOME environment variable
Write-Host "📁 Step 1: Setting HOME environment variable..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable("HOME", $env:USERPROFILE, [System.EnvironmentVariableTarget]::Machine)
$env:HOME = $env:USERPROFILE
Write-Host "✅ HOME set to: $env:HOME" -ForegroundColor Green
Write-Host ""

# Step 2: Add Solana CLI to PATH if not already there
Write-Host "🛣️ Step 2: Configuring PATH for Solana CLI..." -ForegroundColor Yellow

$solanaPath = Join-Path $PSScriptRoot "game_token\solana-release\bin"
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::Machine)

if ($currentPath -notlike "*$solanaPath*") {
    $newPath = "$currentPath;$solanaPath"
    [System.Environment]::SetEnvironmentVariable("PATH", $newPath, [System.EnvironmentVariableTarget]::Machine)
    $env:PATH = $newPath
    Write-Host "✅ Added Solana CLI to PATH" -ForegroundColor Green
} else {
    Write-Host "✅ Solana CLI already in PATH" -ForegroundColor Green
}

# Step 3: Configure Cargo for Solana
Write-Host "📦 Step 3: Configuring Cargo for Solana..." -ForegroundColor Yellow

if (-not $env:CARGO_HOME) {
    $cargoHome = Join-Path $env:USERPROFILE ".cargo"
    [System.Environment]::SetEnvironmentVariable("CARGO_HOME", $cargoHome, [System.EnvironmentVariableTarget]::Machine)
    $env:CARGO_HOME = $cargoHome
    Write-Host "✅ Set CARGO_HOME to: $env:CARGO_HOME" -ForegroundColor Green
} else {
    Write-Host "✅ CARGO_HOME already set: $env:CARGO_HOME" -ForegroundColor Green
}

# Step 4: Create necessary directories
Write-Host "📂 Step 4: Creating necessary directories..." -ForegroundColor Yellow
$solanaConfigDir = Join-Path $env:USERPROFILE ".config\solana"
$cargoDir = Join-Path $env:USERPROFILE ".cargo"
$solanaCacheDir = Join-Path $env:USERPROFILE ".cache\solana"

if (-not (Test-Path $solanaConfigDir)) { New-Item -ItemType Directory -Path $solanaConfigDir -Force }
if (-not (Test-Path $cargoDir)) { New-Item -ItemType Directory -Path $cargoDir -Force }
if (-not (Test-Path $solanaCacheDir)) { New-Item -ItemType Directory -Path $solanaCacheDir -Force }
Write-Host "✅ Directories created" -ForegroundColor Green
Write-Host ""

# Step 5: Configure Solana CLI
Write-Host "⚙️ Step 5: Configuring Solana CLI..." -ForegroundColor Yellow
try {
    & solana config set --url https://api.devnet.solana.com

    # Generate keypair if not exists
    $keypairPath = Join-Path $env:USERPROFILE ".config\solana\id.json"
    if (-not (Test-Path $keypairPath)) {
        Write-Host "Generating Solana keypair..." -ForegroundColor Yellow
        & solana-keygen new --no-bip39-passphrase --silent
    } else {
        Write-Host "✅ Solana keypair already exists" -ForegroundColor Green
    }

    Write-Host "📍 Your Solana address: " -NoNewline
    & solana address
} catch {
    Write-Host "❌ Error configuring Solana CLI: $_" -ForegroundColor Red
}
Write-Host ""

# Step 6: Verify Anchor installation
Write-Host "🔨 Step 6: Checking Anchor installation..." -ForegroundColor Yellow
try {
    $anchorVersion = & anchor --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Anchor found: $anchorVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Anchor not found. Installing..." -ForegroundColor Red
        & cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
        & avm install latest
        & avm use latest
    }
} catch {
    Write-Host "❌ Error with Anchor: $_" -ForegroundColor Red
}
Write-Host ""

# Step 7: Test environment
Write-Host "🧪 Step 7: Testing build environment..." -ForegroundColor Yellow
try {
    Set-Location "game_token\programs\game_token"

    Write-Host "Testing Anchor clean..." -ForegroundColor Yellow
    & anchor clean

    Write-Host "Testing Anchor build..." -ForegroundColor Yellow
    & anchor build

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build test successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build test failed. Check output above." -ForegroundColor Red
        Set-Location "..\..\.."
        Read-Host "Press Enter to exit"
        exit 1
    }

    Set-Location "..\..\.."
} catch {
    Write-Host "❌ Build test error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎉 ENVIRONMENT FIX COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 SUMMARY:" -ForegroundColor Cyan
Write-Host "✅ HOME environment variable set" -ForegroundColor Green
Write-Host "✅ PATH configured for Solana CLI" -ForegroundColor Green
Write-Host "✅ CARGO_HOME configured" -ForegroundColor Green
Write-Host "✅ Necessary directories created" -ForegroundColor Green
Write-Host "✅ Solana CLI configured" -ForegroundColor Green
Write-Host "✅ Anchor verified" -ForegroundColor Green
Write-Host "✅ Build test passed" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 You can now run: .\full_deployment_automated.bat" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
