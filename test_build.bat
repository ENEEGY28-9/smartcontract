@echo off
REM Test Smart Contract Build

echo 🔨 TESTING SMART CONTRACT BUILD
echo ================================
echo.

cd game_token

REM Set environment
set HOME=%USERPROFILE%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup
set PATH=%PATH%;%~dp0solana-release\bin;%USERPROFILE%\.cargo\bin

echo 📁 Environment set
echo.

echo 🧹 Cleaning...
anchor clean

echo 🔨 Building with Anchor...
anchor build

if %errorlevel% equ 0 (
    echo ✅ Anchor build successful!

    if exist "target\deploy\game_token.so" (
        echo ✅ .so file found:
        dir target\deploy\*.so
        echo.
        echo 📁 Location: %CD%\target\deploy\game_token.so
        for %%A in (target\deploy\game_token.so) do echo 📏 Size: %%~zA bytes
    ) else (
        echo ❌ .so file not found
        echo Checking target directory:
        dir target\deploy\
    )
) else (
    echo ❌ Anchor build failed
    echo Error code: %errorlevel%
)

echo.
pause
