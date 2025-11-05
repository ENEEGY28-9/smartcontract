@echo off
REM Build Smart Contract with Admin Privileges
REM Run this as Administrator to install platform tools

echo 🔨 BUILDING SMART CONTRACT WITH ADMIN PRIVILEGES
echo ================================================
echo.

REM Set all necessary environment variables
set HOME=%USERPROFILE%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup
set PATH=%PATH%;%~dp0game_token\solana-release\bin;%USERPROFILE%\.cargo\bin

echo 📁 Environment variables set:
echo HOME=%HOME%
echo CARGO_HOME=%CARGO_HOME%
echo RUSTUP_HOME=%RUSTUP_HOME%
echo.

REM Navigate to smart contract directory
cd game_token

echo 🧹 Cleaning previous build...
anchor clean

echo 🔨 Building smart contract...
echo This may take several minutes...
echo.

anchor build

if %errorlevel% equ 0 (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo ===================

    REM Check for the .so file
    if exist "target\deploy\game_token.so" (
        echo ✅ Smart contract .so file created:
        dir target\deploy\*.so
        echo.
        echo 📁 File location: %CD%\target\deploy\game_token.so
        echo 📏 File size: & for %%A in (target\deploy\game_token.so) do echo %%~zA bytes
    ) else (
        echo ❌ .so file not found in target/deploy/
        echo Checking target directory structure:
        if exist "target" (
            tree target /F
        ) else (
            echo Target directory doesn't exist
        )
    )

    echo.
    echo 🎉 Smart contract build completed successfully!
    echo 🚀 Ready for deployment to Solana Devnet

) else (
    echo.
    echo ❌ BUILD FAILED!
    echo ================
    echo Error code: %errorlevel%
    echo.
    echo 🔍 Troubleshooting tips:
    echo 1. Ensure you ran this script as Administrator
    echo 2. Check that all environment variables are set correctly
    echo 3. Verify Rust and Anchor are properly installed
    echo 4. Try: anchor clean && anchor build
    echo.
    echo 📋 Build logs are in: %CD%\target\debug\build\
)

cd ..
echo.
pause
