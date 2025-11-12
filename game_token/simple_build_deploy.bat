@echo off
echo 🚀 Build & Deploy Smart Contract với Player Claim
echo.

echo 🧹 Cleaning old build...
if exist target rmdir /s /q target
if exist programs\game_token_v2\Cargo.lock del programs\game_token_v2\Cargo.lock
echo.

echo 🔧 Setting environment variables...
set USERPROFILE=C:\Users\Fit
set HOME=C:\Users\Fit
echo.

echo 🏗️ Building smart contract...
cargo build-sbf --manifest-path programs/game_token_v2/Cargo.toml
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    echo.
    echo 💡 Suggestions:
    echo 1. Use Linux/Mac for building Solana programs
    echo 2. Use Docker: docker run --rm -v "%cd%":/workdir -w /workdir projectserum/build:latest anchor build
    echo 3. Use WSL if available
    echo.
    echo 🔄 Trying alternative build method...
    cargo build --release --target sbf-solana-solana --manifest-path programs/game_token_v2/Cargo.toml
    if %errorlevel% neq 0 (
        echo ❌ Alternative build also failed!
        pause
        exit /b 1
    )
)
echo ✅ Build successful!
echo.

echo 📦 Checking program binary...
if not exist "target\deploy\game_token_v2.so" (
    echo ❌ Program binary not found!
    pause
    exit /b 1
)
echo ✅ Program binary found!
echo.

echo 🚀 Deploying to Solana Devnet...
anchor deploy --provider.cluster devnet
if %errorlevel% neq 0 (
    echo ❌ Deploy failed!
    echo.
    echo 💡 For manual deploy:
    echo 1. Create program account: solana program deploy target/deploy/game_token_v2.so --program-id Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf
    echo 2. Or use Solana CLI directly
    echo.
    pause
    exit /b 1
)
echo ✅ Deploy successful!
echo.

echo 🎉 SMART CONTRACT BUILD AND DEPLOY COMPLETE!
echo Smart contract deployed with Program ID: Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf
echo New instruction available: PlayerClaimTokens (tag 3)
echo.
echo 🎮 Test player claim:
echo node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 25
echo.
pause



