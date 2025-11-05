@echo off
REM Run Smart Contract Build with Administrator Privileges

echo 🚀 RUNNING SMART CONTRACT BUILD AS ADMINISTRATOR...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This script must be run as Administrator!
    echo.
    echo 🔧 To fix:
    echo 1. Right-click this .bat file
    echo 2. Select "Run as administrator"
    echo 3. Try again
    echo.
    pause
    exit /b 1
)

echo ✅ Running with Administrator privileges
echo.

REM Set environment variables (in case they weren't set system-wide)
set HOME=C:\Users\Fit
set CARGO_HOME=C:\Users\Fit\.cargo
set PATH=%PATH%;C:\Users\Fit\Downloads\eneegy-main\game_token\solana-release\bin

echo 📁 Environment variables set:
echo HOME = %HOME%
echo CARGO_HOME = %CARGO_HOME%
echo.

REM Navigate to smart contract directory
cd game_token\programs\game_token
echo 📂 Changed to: %CD%
echo.

REM Clean previous build
echo 🧹 Cleaning previous build...
anchor clean
echo ✅ Clean completed
echo.

REM Build smart contract
echo 🔨 Building smart contract...
anchor build

if %errorlevel% equ 0 (
    echo ✅ SMART CONTRACT BUILD SUCCESSFUL!
    echo.
    echo 📁 Build artifacts created in: target/deploy/
    dir target\deploy\
    echo.
    echo 🚀 You can now run: full_deployment_automated.bat
    echo.
) else (
    echo ❌ BUILD FAILED!
    echo.
    echo 🔍 Check the error messages above
    echo 💡 Make sure you have:
    echo   - Administrator privileges
    echo   - Internet connection
    echo   - Sufficient disk space
    echo.
)

pause
