@echo off
REM Check current status and provide guidance

echo 🔍 CHECKING CURRENT DEPLOYMENT STATUS...
echo.

REM Check environment variables
echo 📋 Environment Variables:
echo HOME: %HOME%
echo CARGO_HOME: %CARGO_HOME%
echo.

REM Check if running as admin
echo 🔐 Administrator Check:
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Running with Administrator privileges
) else (
    echo ❌ NOT running as Administrator
    echo ⚠️  You need Administrator rights for smart contract build
)
echo.

REM Check Solana CLI
echo 🛠️ Solana CLI Status:
solana --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Solana CLI found: & solana --version
) else (
    echo ❌ Solana CLI not found or not in PATH
)
echo.

REM Check Anchor
echo 🔨 Anchor Status:
anchor --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Anchor found: & anchor --version
) else (
    echo ❌ Anchor not found
)
echo.

REM Check if smart contract exists
echo 📂 Smart Contract Directory:
echo Current directory: %CD%
echo Checking: game_token\programs\game_token\Cargo.toml
if exist "game_token\programs\game_token\Cargo.toml" (
    echo ✅ Smart contract files found at: game_token\programs\game_token\
) else (
    echo ❌ Smart contract files not found at expected location
    echo 🔍 Checking alternative locations...
    if exist "blockchain-service\programs\game-token\Cargo.toml" (
        echo ✅ Found smart contract at: blockchain-service\programs\game-token\
    ) else (
        echo ❌ Smart contract not found in common locations
        dir game_token\programs\ 2>nul
    )
)
echo.

REM Check build status
echo 🏗️ Build Status:
if exist "game_token\programs\game_token\target\deploy\game_token.so" (
    echo ✅ Smart contract already built (game_token.so exists)
    echo 🚀 Ready for deployment!
) else (
    echo ❌ Smart contract not built yet
    echo 📍 Build artifacts will be created in: game_token\programs\game_token\target\deploy\
)
echo.

echo 📋 RECOMMENDED NEXT STEPS:
echo.

if not exist "game_token\programs\game_token\target\deploy\game_token.so" (
    echo 1. 🔧 Fix Environment Variables (if not set):
    echo    - Run: sysdm.cpl → Environment Variables
    echo    - Set: HOME=C:\Users\Fit
    echo    - Set: CARGO_HOME=C:\Users\Fit\.cargo
    echo.
    echo 2. 🔑 Run Build as Administrator:
    echo    - Right-click run_as_admin.bat → Run as administrator
    echo.
) else (
    echo 1. 🚀 Run Full Deployment:
    echo    - Right-click full_deployment_automated.bat → Run as administrator
    echo.
)

echo 📖 For detailed instructions: WINDOWS_DEPLOYMENT_SOLUTION.md
echo.

pause
