@echo off
REM Setup Solana CLI & Anchor for Windows

echo 🚀 Setting up Solana CLI & Anchor...

REM Create temp directory
if not exist "temp" mkdir temp
cd temp

REM Download Solana CLI installer
echo 📥 Downloading Solana CLI...
powershell -Command "Invoke-WebRequest -Uri 'https://release.solana.com/v1.18.4/solana-install-init-x86_64-pc-windows-msvc.exe' -OutFile 'solana-installer.exe'"

REM Run installer
echo 🛠️ Installing Solana CLI...
start /wait solana-installer.exe

REM Add to PATH
echo 🔧 Adding Solana to PATH...
set "PATH=%USERPROFILE%\.local\share\solana\install\active_release\bin;%PATH%"

REM Verify installation
echo ✅ Verifying Solana CLI...
solana --version

REM Setup Solana config for Devnet
echo 🔧 Setting up Solana config for Devnet...
solana config set --url https://api.devnet.solana.com

REM Generate keypair
echo 🔑 Generating keypair...
solana-keygen new --no-bip39-passphrase --silent

REM Check balance
echo 💰 Checking Devnet balance...
solana balance

REM Install Rust if not present
echo 🦀 Checking Rust installation...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing Rust...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' -OutFile 'rustup-init.exe'}"
    start /wait rustup-init.exe -y
)

REM Install Anchor
echo ⚓ Installing Anchor...
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

REM Verify Anchor
echo ✅ Verifying Anchor...
anchor --version

REM Setup Anchor
echo 🔧 Setting up Anchor...
anchor init temp-anchor-project
cd temp-anchor-project
anchor build

echo 🎉 Solana CLI & Anchor setup complete!
echo.
echo 📋 Next steps:
echo 1. Airdrop some Devnet SOL: solana airdrop 2
echo 2. Build your smart contract: cd blockchain-service/programs/game-token && anchor build
echo 3. Deploy to Devnet: anchor deploy --provider.cluster devnet

pause

