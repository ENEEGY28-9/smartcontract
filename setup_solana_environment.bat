@echo off
REM Comprehensive Solana Environment Setup for Game Token Deployment

echo 🚀 Setting up complete Solana environment for Game Token deployment...

REM Step 1: Check if Solana CLI is installed
echo 🔍 Checking Solana CLI installation...
solana --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not found. Installing...
    goto :install_solana
) else (
    echo ✅ Solana CLI found
    goto :configure_solana
)

:install_solana
echo 📥 Downloading Solana CLI...
powershell -Command "try { Invoke-WebRequest -Uri 'https://release.solana.com/v1.18.4/solana-install-init-x86_64-pc-windows-msvc.exe' -OutFile 'solana-installer.exe' -TimeoutSec 30 } catch { Write-Host 'Network timeout, retrying...'; Start-Sleep 2; Invoke-WebRequest -Uri 'https://release.solana.com/v1.18.4/solana-install-init-x86_64-pc-windows-msvc.exe' -OutFile 'solana-installer.exe' }"

if not exist solana-installer.exe (
    echo ❌ Failed to download Solana CLI
    echo 🔄 Trying alternative download method...
    REM Try GitHub release
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2' -OutFile 'solana-release.tar.bz2'"
    goto :extract_solana
)

echo 🛠️ Installing Solana CLI...
solana-installer.exe
goto :configure_solana

:extract_solana
echo 📦 Extracting Solana CLI...
if exist solana-release.tar.bz2 (
    REM Extract tar.bz2 (requires 7zip or similar)
    echo Please extract solana-release.tar.bz2 manually to a folder and add to PATH
    echo Then run: solana config set --url https://api.devnet.solana.com
    pause
    goto :end
)

:configure_solana
echo 🔧 Configuring Solana for Devnet...

REM Set devnet
solana config set --url https://api.devnet.solana.com
if %errorlevel% neq 0 (
    echo ❌ Failed to set Solana config
    goto :end
)

REM Check current config
echo 📋 Current Solana config:
solana config get

REM Generate keypair if not exists
if not exist "%USERPROFILE%\.config\solana\id.json" (
    echo 🔑 Generating new keypair...
    solana-keygen new --no-bip39-passphrase --silent
) else (
    echo ✅ Keypair already exists
)

REM Show public key
echo 🔍 Your public key:
solana address

REM Try to airdrop SOL
echo 💰 Requesting airdrop...
solana airdrop 2
if %errorlevel% neq 0 (
    echo ⚠️  Airdrop failed (might be rate limited)
    echo 💡 You can get devnet SOL from: https://faucet.solana.com
}

REM Check balance
echo 📊 Current balance:
solana balance

REM Step 2: Install Anchor (if not already installed)
echo ⚓ Checking Anchor installation...
avm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing Anchor...
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
)

echo 🔄 Installing latest Anchor version...
avm install latest
avm use latest

echo ✅ Anchor version:
anchor --version

REM Step 3: Install Node.js dependencies for Anchor
echo 📦 Installing Node.js dependencies...
if exist "blockchain-service\programs\game-token\package.json" (
    cd blockchain-service\programs\game-token
    npm install
    cd ..\..\..
)

echo 🎉 Solana environment setup complete!
echo.
echo 📋 Next steps:
echo 1. Make sure you have enough SOL (at least 0.5 SOL for deployment)
echo 2. Run: deploy_smart_contract.bat
echo 3. Update program ID in game_token_client.rs
echo 4. Test real minting

:end
echo Press any key to continue...
pause >nul

