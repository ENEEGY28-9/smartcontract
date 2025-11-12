@echo off
REM Quick Session Fix for Windows Build Environment

echo 🚀 QUICK SESSION FIX FOR WINDOWS BUILD...
echo.

REM Set environment variables for this session only
set HOME=%USERPROFILE%
set CARGO_HOME=%USERPROFILE%\.cargo
set PATH=%PATH%;%~dp0game_token\solana-release\bin

echo ✅ Environment variables set for this session:
echo HOME = %HOME%
echo CARGO_HOME = %CARGO_HOME%
echo PATH updated with Solana CLI
echo.

REM Create necessary directories
if not exist "%USERPROFILE%\.config\solana" mkdir "%USERPROFILE%\.config\solana"
if not exist "%USERPROFILE%\.cargo" mkdir "%USERPROFILE%\.cargo"
echo ✅ Directories created
echo.

REM Test Solana CLI
echo 🧪 Testing Solana CLI...
solana --version
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not working. Check PATH.
    pause
    exit /b 1
)
echo ✅ Solana CLI working
echo.

REM Test Anchor
echo 🧪 Testing Anchor...
anchor --version
if %errorlevel% neq 0 (
    echo ❌ Anchor not found. Installing...
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    if %errorlevel% neq 0 (
        echo ❌ Anchor installation failed
        pause
        exit /b 1
    )
    avm install latest
    avm use latest
)
echo ✅ Anchor ready
echo.

REM Test build
echo 🧪 Testing smart contract build...
cd game_token\programs\game_token
anchor build

if %errorlevel% equ 0 (
    echo ✅ BUILD SUCCESSFUL!
    cd ..\..\..
    echo.
    echo 🎉 You can now run: full_deployment_automated.bat
    echo.
) else (
    echo ❌ BUILD FAILED!
    cd ..\..\..
    echo.
    echo 🔧 Try manual environment setup in WINDOWS_BUILD_FIX_GUIDE.md
    echo.
)

pause










