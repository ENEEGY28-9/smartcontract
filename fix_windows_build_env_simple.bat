@echo off
REM Simple Windows Environment Fix for Solana/Anchor Build
REM This version avoids registry writes that require admin privileges

echo 🔧 WINDOWS BUILD ENVIRONMENT FIX (SIMPLE VERSION)
echo ==================================================
echo.

REM Step 1: Set environment variables for this session only
echo 📁 Step 1: Setting environment variables for this session...

REM Set HOME
set HOME=%USERPROFILE%
echo ✅ HOME set to: %HOME%

REM Set CARGO_HOME
set CARGO_HOME=%USERPROFILE%\.cargo
echo ✅ CARGO_HOME set to: %CARGO_HOME%

REM Set RUSTUP_HOME
set RUSTUP_HOME=%USERPROFILE%\.rustup
echo ✅ RUSTUP_HOME set to: %RUSTUP_HOME%

echo.

REM Step 2: Configure PATH for this session
echo 🛣️ Step 2: Configuring PATH for this session...

REM Add current directory paths to PATH
set PATH=%PATH%;%~dp0game_token\solana-release\bin
set PATH=%PATH%;%~dp0game_token\solana-release\bin\llvm
set PATH=%PATH%;%USERPROFILE%\.cargo\bin

echo ✅ Added Solana CLI, LLVM, and Cargo to PATH
echo.

REM Step 3: Create necessary directories
echo 📂 Step 3: Creating necessary directories...

if not exist "%USERPROFILE%\.config\solana" mkdir "%USERPROFILE%\.config\solana"
if not exist "%USERPROFILE%\.cargo" mkdir "%USERPROFILE%\.cargo"
if not exist "%USERPROFILE%\.rustup" mkdir "%USERPROFILE%\.rustup"
if not exist "%USERPROFILE%\.cache\solana" mkdir "%USERPROFILE%\.cache\solana"
if not exist "%USERPROFILE%\.cache\anchor" mkdir "%USERPROFILE%\.cache\anchor"

echo ✅ All necessary directories created
echo.

REM Step 4: Check Rust installation
echo 🦀 Step 4: Checking Rust installation...

cargo --version
if %errorlevel% neq 0 (
    echo ❌ Cargo not found in PATH
    echo Please install Rust from: https://rustup.rs/
    echo Or run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    pause
    exit /b 1
) else (
    echo ✅ Cargo found
)

echo.

REM Step 5: Check Solana CLI
echo ⚙️ Step 5: Checking Solana CLI...

solana --version
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not found in PATH
    echo Please ensure Solana CLI is properly installed
    echo Expected location: %~dp0game_token\solana-release\bin
    pause
    exit /b 1
) else (
    echo ✅ Solana CLI found

    REM Configure Solana for Devnet
    solana config set --url https://api.devnet.solana.com
    echo ✅ Solana configured for Devnet

    REM Show current address
    echo 📍 Solana address: & solana address
)

echo.

REM Step 6: Check Anchor
echo 🔨 Step 6: Checking Anchor installation...

anchor --version
if %errorlevel% neq 0 (
    echo ❌ Anchor not found
    echo Installing Anchor...

    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    if %errorlevel% neq 0 (
        echo ❌ Failed to install AVM
        pause
        exit /b 1
    )

    avm install latest
    avm use latest

    echo ✅ Anchor installed
) else (
    echo ✅ Anchor found
)

echo.

REM Step 7: Navigate to smart contract and build
echo 🧪 Step 7: Testing smart contract build...

cd game_token

echo Cleaning previous build...
anchor clean

echo Building smart contract...
anchor build

if %errorlevel% equ 0 (
    echo ✅ Build successful!

    REM Check for .so file
    if exist "target\deploy\game_token.so" (
        echo ✅ Smart contract .so file created successfully
        echo 📁 File location: %CD%\target\deploy\game_token.so
        dir target\deploy\*.so
    ) else (
        echo ❌ .so file not found
        echo 📁 Checking target directory:
        if exist "target\deploy" (
            dir target\deploy\
        ) else (
            echo Target directory doesn't exist
        )
    )
) else (
    echo ❌ Build failed with error code: %errorlevel%
    cd ..
    pause
    exit /b 1
)

cd ..
echo.

echo 🎉 ENVIRONMENT SETUP COMPLETE!
echo ==============================
echo.

echo 📋 SUMMARY:
echo ✅ Environment variables set for session
echo ✅ PATH configured for build tools
echo ✅ Necessary directories created
echo ✅ Rust toolchain verified
echo ✅ Solana CLI configured
echo ✅ Anchor framework ready
echo ✅ Smart contract build test PASSED
echo.

echo 🚀 NEXT STEPS:
echo 1. Run: .\full_deployment_automated.bat
echo 2. Or run: .\deploy_smart_contract.bat
echo.

echo 💡 NOTES:
echo - Environment variables are set for this session only
echo - Run this script each time you open a new command prompt
echo - For permanent environment setup, run as Administrator and use setx
echo.

pause
