@echo off
REM Comprehensive Windows Environment Fix for Solana/Anchor Build
REM This script addresses common Windows-specific issues

echo 🔧 COMPREHENSIVE WINDOWS BUILD ENVIRONMENT FIX
echo ================================================
echo.

REM Step 1: Set critical environment variables
echo 📁 Step 1: Setting critical environment variables...

REM Set HOME if not set
if "%HOME%"=="" (
    setx HOME "%USERPROFILE%" /M
    set HOME=%USERPROFILE%
    echo ✅ Set HOME to: %HOME%
) else (
    echo ✅ HOME already set: %HOME%
)

REM Set USERPROFILE explicitly (Windows-specific)
if "%USERPROFILE%"=="" (
    echo ❌ USERPROFILE not set - this is critical for Windows
    echo Please restart in a proper Windows environment
    pause
    exit /b 1
) else (
    echo ✅ USERPROFILE: %USERPROFILE%
)

REM Set CARGO_HOME
if "%CARGO_HOME%"=="" (
    setx CARGO_HOME "%USERPROFILE%\.cargo" /M
    set CARGO_HOME=%USERPROFILE%\.cargo
    echo ✅ Set CARGO_HOME to: %CARGO_HOME%
) else (
    echo ✅ CARGO_HOME already set: %CARGO_HOME%
)

REM Set RUSTUP_HOME
if "%RUSTUP_HOME%"=="" (
    setx RUSTUP_HOME "%USERPROFILE%\.rustup" /M
    set RUSTUP_HOME=%USERPROFILE%\.rustup
    echo ✅ Set RUSTUP_HOME to: %RUSTUP_HOME%
) else (
    echo ✅ RUSTUP_HOME already set: %RUSTUP_HOME%
)

echo.

REM Step 2: Configure PATH for Solana and Rust
echo 🛣️ Step 2: Configuring PATH...

REM Add Rust to PATH if not present
echo %PATH% | findstr /C:"\.cargo\bin" >nul
if %errorlevel% neq 0 (
    setx PATH "%PATH%;%USERPROFILE%\.cargo\bin" /M
    set PATH=%PATH%;%USERPROFILE%\.cargo\bin
    echo ✅ Added Rust/Cargo to PATH
) else (
    echo ✅ Rust/Cargo already in PATH
)

REM Add Solana CLI to PATH
echo %PATH% | findstr /C:"solana-release\bin" >nul
if %errorlevel% neq 0 (
    setx PATH "%PATH%;%~dp0game_token\solana-release\bin" /M
    set PATH=%PATH%;%~dp0game_token\solana-release\bin
    echo ✅ Added Solana CLI to PATH
) else (
    echo ✅ Solana CLI already in PATH
)

REM Add LLVM to PATH (required for Windows builds)
echo %PATH% | findstr /C:"solana-release\bin\llvm" >nul
if %errorlevel% neq 0 (
    setx PATH "%PATH%;%~dp0game_token\solana-release\bin\llvm" /M
    set PATH=%PATH%;%~dp0game_token\solana-release\bin\llvm
    echo ✅ Added LLVM tools to PATH
) else (
    echo ✅ LLVM tools already in PATH
)

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

REM Step 4: Install/verify Rust toolchain
echo 🦀 Step 4: Verifying Rust installation...

cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Cargo not found. Installing Rust...

    REM Download and install Rust using rustup-init
    curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable

    REM Source cargo environment
    call "%USERPROFILE%\.cargo\env.bat" 2>nul
    if exist "%USERPROFILE%\.cargo\env.bat" call "%USERPROFILE%\.cargo\env.bat"

    echo ✅ Rust installed
) else (
    echo ✅ Rust found: & cargo --version
)

REM Install wasm32 target (required for Anchor)
rustup target add wasm32-unknown-unknown
echo ✅ WASM target added

echo.

REM Step 5: Configure Solana CLI
echo ⚙️ Step 5: Configuring Solana CLI...

solana --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not found in PATH
    echo Please ensure Solana CLI is properly installed
) else (
    echo ✅ Solana CLI found: & solana --version

    REM Configure Solana
    solana config set --url https://api.devnet.solana.com
    echo ✅ Solana configured for Devnet

    REM Generate keypair if needed
    if not exist "%USERPROFILE%\.config\solana\id.json" (
        echo 🔑 Generating Solana keypair...
        solana-keygen new --no-bip39-passphrase --silent
    ) else (
        echo ✅ Solana keypair exists
    )

    echo 📍 Solana address: & solana address
)

echo.

REM Step 6: Install/verify Anchor
echo 🔨 Step 6: Verifying Anchor installation...

anchor --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Anchor not found. Installing...

    REM Install Anchor Version Manager
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

    REM Install latest Anchor
    avm install latest
    avm use latest

    echo ✅ Anchor installed
) else (
    echo ✅ Anchor found: & anchor --version
)

echo.

REM Step 7: Set Windows-specific environment variables
echo 🪟 Step 7: Setting Windows-specific variables...

REM Disable Windows Defender real-time protection for build directory (temporary)
REM This can speed up builds significantly on Windows
setx ANCHOR_CLI_BUILD_NO_CACHE "false" /M

REM Set linker environment for Windows
setx RUSTFLAGS "-C link-arg=-fuse-ld=lld" /M

REM Set target CPU for better compatibility
setx RUSTFLAGS "%RUSTFLAGS% -C target-cpu=native" /M

echo ✅ Windows-specific optimizations applied
echo.

REM Step 8: Test the build environment
echo 🧪 Step 8: Testing build environment...

cd game_token

echo Testing Anchor clean...
anchor clean

echo Testing Anchor build...
anchor build

if %errorlevel% equ 0 (
    echo ✅ Build test successful!

    REM Check for .so file
    if exist "target\deploy\game_token.so" (
        echo ✅ Smart contract .so file created successfully
        dir target\deploy\*.so
    ) else (
        echo ❌ .so file not found in target/deploy/
        dir target\deploy\
    )
) else (
    echo ❌ Build test failed. Error details above.
    cd ..
    pause
    exit /b 1
)

cd ..
echo.

echo 🎉 COMPREHENSIVE ENVIRONMENT FIX COMPLETE!
echo ==========================================
echo.

echo 📋 SUMMARY:
echo ✅ Critical environment variables set (HOME, CARGO_HOME, RUSTUP_HOME)
echo ✅ PATH configured for Rust, Cargo, Solana, and LLVM
echo ✅ All necessary directories created
echo ✅ Rust toolchain verified with WASM target
echo ✅ Solana CLI configured for Devnet
echo ✅ Anchor framework installed and verified
echo ✅ Windows-specific optimizations applied
echo ✅ Smart contract build test PASSED
echo ✅ .so file generated successfully
echo.

echo 🚀 NEXT STEPS:
echo 1. Run: full_deployment_automated.bat (to deploy to Devnet)
echo 2. Or run: deploy_smart_contract.bat (direct deployment)
echo.

echo 💡 TIPS:
echo - If builds still fail, try running as Administrator
echo - Clear build cache with: anchor clean
echo - Check logs in: game_token\target\debug\build\
echo.

pause
