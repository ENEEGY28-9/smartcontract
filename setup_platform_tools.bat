@echo off
REM Setup Platform Tools for Solana Build on Windows
REM This script extracts platform tools to avoid admin requirements

echo 🔧 SETTING UP PLATFORM TOOLS FOR WINDOWS BUILD
echo ===============================================
echo.

cd game_token\solana-release\bin

echo 📂 Checking platform tools archive...
if exist "platform-tools.tar.bz2" (
    echo ✅ Found platform-tools.tar.bz2

    REM Try to extract using tar (available in newer Windows)
    echo 📦 Extracting platform tools...
    tar -xf platform-tools.tar.bz2

    if %errorlevel% equ 0 (
        echo ✅ Platform tools extracted successfully

        REM Check if extraction worked
        if exist "platform-tools" (
            echo ✅ Platform tools directory created
            dir platform-tools\
        ) else (
            echo ❌ Extraction failed - platform-tools directory not found
            REM Try alternative extraction method
            echo 🔄 Trying alternative extraction...

            REM Use PowerShell to extract
            powershell -Command "Expand-Archive -Path platform-tools.tar.bz2 -DestinationPath ."
        )
    ) else (
        echo ❌ Tar extraction failed, trying PowerShell...
        powershell -Command "try { $stream = New-Object System.IO.FileStream('platform-tools.tar.bz2', [System.IO.FileMode]::Open); $reader = New-Object System.IO.BinaryReader($stream); # Simple extraction logic would go here, but this is complex } catch { Write-Host 'PowerShell extraction also failed' }"
    )
) else (
    echo ❌ platform-tools.tar.bz2 not found
    dir *.tar*
)

echo.
cd ..\..\..

echo 🧪 Testing platform tools setup...
echo Setting environment variables...
set HOME=%USERPROFILE%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup
set PATH=%PATH%;%~dp0game_token\solana-release\bin;%USERPROFILE%\.cargo\bin

echo Testing cargo-build-sbf...
cargo-build-sbf --version

if %errorlevel% equ 0 (
    echo ✅ Platform tools working!

    echo 🔨 Now attempting smart contract build...
    cd game_token

    REM Try direct cargo build with sbf target
    echo Building with cargo-build-sbf...
    cargo-build-sbf --manifest-path programs/game_token/Cargo.toml --target sbf-solana-solana --out-dir target/deploy

    if %errorlevel% equ 0 (
        echo ✅ Smart contract built successfully with cargo-build-sbf!

        REM Check for output files
        if exist "target\deploy\game_token.so" (
            echo ✅ .so file created:
            dir target\deploy\*.so
        ) else (
            echo ❌ .so file not found
            dir target\deploy\
        )
    ) else (
        echo ❌ Direct cargo-build-sbf failed, trying Anchor...
        anchor build
    )

    cd ..
) else (
    echo ❌ Platform tools setup failed
)

echo.
pause
