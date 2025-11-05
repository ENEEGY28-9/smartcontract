@echo off
REM Fix Windows Environment Variables for Solana/Anchor Build

echo 🔧 FIXING WINDOWS BUILD ENVIRONMENT...
echo.

REM Step 1: Set HOME environment variable
echo 📁 Step 1: Setting HOME environment variable...
setx HOME "%USERPROFILE%" /M
set HOME=%USERPROFILE%
echo ✅ HOME set to: %HOME%
echo.

REM Step 2: Add Solana CLI to PATH if not already there
echo 🛣️ Step 2: Configuring PATH for Solana CLI...

REM Check if Solana CLI is in PATH
where solana >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding Solana CLI to PATH...
    setx PATH "%PATH%;%~dp0game_token\solana-release\bin" /M
    set PATH=%PATH%;%~dp0game_token\solana-release\bin
    echo ✅ Added Solana CLI to PATH
) else (
    echo ✅ Solana CLI already in PATH
)

REM Step 3: Configure Cargo for Solana
echo 📦 Step 3: Configuring Cargo for Solana...

REM Set Cargo home if not set
if "%CARGO_HOME%"=="" (
    setx CARGO_HOME "%USERPROFILE%\.cargo" /M
    set CARGO_HOME=%USERPROFILE%\.cargo
    echo ✅ Set CARGO_HOME to: %CARGO_HOME%
) else (
    echo ✅ CARGO_HOME already set: %CARGO_HOME%
)

REM Step 4: Create necessary directories
echo 📂 Step 4: Creating necessary directories...
if not exist "%USERPROFILE%\.config\solana" mkdir "%USERPROFILE%\.config\solana"
if not exist "%USERPROFILE%\.cargo" mkdir "%USERPROFILE%\.cargo"
if not exist "%USERPROFILE%\.cache\solana" mkdir "%USERPROFILE%\.cache\solana"
echo ✅ Directories created
echo.

REM Step 5: Configure Solana CLI
echo ⚙️ Step 5: Configuring Solana CLI...
solana config set --url https://api.devnet.solana.com

REM Generate keypair if not exists
if not exist "%USERPROFILE%\.config\solana\id.json" (
    echo 🔑 Generating Solana keypair...
    solana-keygen new --no-bip39-passphrase --silent
) else (
    echo ✅ Solana keypair already exists
)

echo 📍 Your Solana address: & solana address
echo.

REM Step 6: Verify Anchor installation
echo 🔨 Step 6: Checking Anchor installation...
anchor --version
if %errorlevel% neq 0 (
    echo ❌ Anchor not found. Installing...
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
) else (
    echo ✅ Anchor found: & anchor --version
)
echo.

REM Step 7: Test environment
echo 🧪 Step 7: Testing build environment...
cd game_token\programs\game_token

echo Testing Anchor clean...
anchor clean

echo Testing Anchor build...
anchor build

if %errorlevel% equ 0 (
    echo ✅ Build test successful!
) else (
    echo ❌ Build test failed. Check output above.
    cd ..\..\..
    pause
    exit /b 1
)

cd ..\..\..
echo.

echo 🎉 ENVIRONMENT FIX COMPLETE!
echo.
echo 📋 SUMMARY:
echo ✅ HOME environment variable set
echo ✅ PATH configured for Solana CLI
echo ✅ CARGO_HOME configured
echo ✅ Necessary directories created
echo ✅ Solana CLI configured
echo ✅ Anchor verified
echo ✅ Build test passed
echo.
echo 🚀 You can now run: full_deployment_automated.bat
echo.

pause

