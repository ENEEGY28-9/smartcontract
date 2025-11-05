@echo off
REM Setup Solana CLI after manual extraction

echo 🔧 Setting up Solana CLI...

REM Check if solana-cli directory exists
if not exist "solana-cli" (
    echo ❌ solana-cli directory not found!
    echo 📋 Please extract solana-release.tar.bz2 to solana-cli folder first
    echo 🔄 Run this script again after extraction
    pause
    exit /b 1
)

REM Add to PATH for this session
set "PATH=%CD%\solana-cli\solana-release\bin;%PATH%"

REM Verify installation
echo 🔍 Verifying Solana CLI...
solana --version
if %errorlevel% neq 0 (
    echo ❌ Solana CLI verification failed
    pause
    exit /b 1
)

echo ✅ Solana CLI ready!

REM Configure for Devnet
echo 🔧 Configuring for Devnet...
solana config set --url https://api.devnet.solana.com

REM Generate keypair
echo 🔑 Generating keypair...
solana-keygen new --no-bip39-passphrase --silent

REM Show address
echo 📍 Your wallet address:
solana address

REM Try airdrop
echo 💰 Requesting airdrop...
solana airdrop 2

REM Check balance
echo 📊 Current balance:
solana balance

echo 🎉 Solana CLI setup complete!
echo.
echo 🚀 Next step: Run deploy_smart_contract.bat

pause
