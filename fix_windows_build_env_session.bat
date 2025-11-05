@echo off
REM Fix Windows Environment Variables for Current Session Only

echo 🔧 FIXING WINDOWS BUILD ENVIRONMENT (SESSION ONLY)...
echo.

REM Step 1: Set HOME environment variable for this session
echo 📁 Step 1: Setting HOME environment variable...
set HOME=%USERPROFILE%
echo ✅ HOME set to: %HOME%
echo.

REM Step 2: Add Solana CLI to PATH for this session
echo 🛣️ Step 2: Adding Solana CLI to PATH...

REM Check if Solana CLI path is already in PATH
echo %PATH% | findstr /C:"solana-release\bin" >nul
if %errorlevel% neq 0 (
    set PATH=%PATH%;%~dp0game_token\solana-release\bin
    echo ✅ Added Solana CLI to PATH for this session
) else (
    echo ✅ Solana CLI already in PATH
)

REM Step 3: Set Cargo home for this session
echo 📦 Step 3: Setting Cargo home...
if "%CARGO_HOME%"=="" (
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
    echo This may take several minutes...
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
) else (
    echo ✅ Anchor found: & anchor --version
)
echo.

REM Step 7: Test build
echo 🧪 Step 7: Testing smart contract build...
cd game_token\programs\game_token

echo Testing Anchor build...
anchor build

if %errorlevel% equ 0 (
    echo ✅ Build test successful!
    cd ..\..\..
) else (
    echo ❌ Build test failed. Check output above.
    cd ..\..\..
    goto :error
)

echo.
echo 🎉 SESSION ENVIRONMENT FIX COMPLETE!
echo.
echo 📋 SUMMARY:
echo ✅ HOME environment variable set for session
echo ✅ PATH configured for Solana CLI
echo ✅ CARGO_HOME configured
echo ✅ Necessary directories created
echo ✅ Solana CLI configured
echo ✅ Anchor verified
echo ✅ Build test passed
echo.
echo ⚠️ IMPORTANT: These changes are only for this session.
echo For permanent changes, run this as Administrator or set manually:
echo.
echo Set these environment variables permanently:
echo - HOME = %USERPROFILE%
echo - Add to PATH: %~dp0game_token\solana-release\bin
echo - CARGO_HOME = %USERPROFILE%\.cargo
echo.
echo 🚀 You can now run: full_deployment_automated.bat
echo.

pause
exit /b 0

:error
echo.
echo ❌ ENVIRONMENT FIX FAILED!
echo.
echo 🔧 To fix manually:
echo 1. Set environment variable: HOME = %USERPROFILE%
echo 2. Add to PATH: %~dp0game_token\solana-release\bin
echo 3. Set CARGO_HOME = %USERPROFILE%\.cargo
echo 4. Restart command prompt and try again
echo.
pause
exit /b 1

