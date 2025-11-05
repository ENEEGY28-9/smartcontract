@echo off
REM Build Smart Contract with cargo-build-sbf directly

echo 🔨 BUILDING WITH CARGO-BUILD-SBF DIRECTLY
echo ==========================================
echo.

cd game_token

REM Set environment
set HOME=%USERPROFILE%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup
set PATH=%PATH%;%~dp0solana-release\bin;%USERPROFILE%\.cargo\bin

echo 📁 Environment configured
echo.

echo 🧹 Cleaning target directory...
if exist "target" rmdir /s /q target

echo 🔨 Building smart contract...
cargo-build-sbf --manifest-path programs/game_token/Cargo.toml

if %errorlevel% equ 0 (
    echo ✅ Build successful!

    REM Check for output files
    if exist "target\deploy\game_token.so" (
        echo ✅ .so file created successfully!
        echo 📁 Location: %CD%\target\deploy\game_token.so
        dir target\deploy\*.so
        for %%A in (target\deploy\game_token.so) do echo 📏 Size: %%~zA bytes
    ) else (
        echo ❌ .so file not found in target/deploy/
        echo Checking what was created:
        if exist "target" (
            tree target /F
        ) else (
            echo No target directory created
        )
    )

    REM Also check for keypair
    if exist "target\deploy\game_token-keypair.json" (
        echo ✅ Keypair file exists
    ) else (
        echo ❌ Keypair file missing
    )

) else (
    echo ❌ Build failed with error code: %errorlevel%
    echo.
    echo 🔍 Troubleshooting:
    echo - Check that all environment variables are set
    echo - Verify Rust and Solana tools are in PATH
    echo - Try running as Administrator
)

cd ..
echo.
pause
