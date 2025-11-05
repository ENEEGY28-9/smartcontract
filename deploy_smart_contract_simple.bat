@echo off
echo 🚀 DEPLOYING SMART CONTRACT TO SOLANA DEVNET
echo ============================================

cd /d %~dp0

echo 📍 Current directory: %CD%

echo 🔍 Checking Solana CLI...
where solana >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not found in PATH
    echo 💡 Please add Solana CLI to PATH or use full path
    pause
    exit /b 1
)

echo ✅ Solana CLI found

echo 🔍 Checking Anchor...
where anchor >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Anchor CLI not found, trying alternative build method
    goto :alternative_build
) else (
    echo ✅ Anchor CLI found
    goto :anchor_build
)

:anchor_build
echo 🏗️ Building with Anchor...
anchor build
if %errorlevel% neq 0 (
    echo ❌ Anchor build failed
    goto :alternative_build
)
goto :deploy

:alternative_build
echo 🏗️ Building with Cargo (alternative)...
cd programs\game_token
cargo build-sbf --manifest-path Cargo.toml
if %errorlevel% neq 0 (
    echo ❌ Cargo build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ Build completed
goto :deploy

:deploy
echo 🚀 Deploying to Solana Devnet...

REM Check if .so file exists
if not exist "target\deploy\game_token.so" (
    echo ❌ game_token.so not found
    echo 💡 Build failed or file not generated
    pause
    exit /b 1
)

echo 📦 Found smart contract binary: target\deploy\game_token.so

REM Deploy smart contract
echo ⬆️ Deploying program...
solana program deploy target/deploy/game_token.so --url https://api.devnet.solana.com

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    echo 💡 Check your SOL balance and network connection
    pause
    exit /b 1
)

echo ✅ Smart contract deployed successfully!

REM Get program ID
for /f "tokens=*" %%i in ('solana program deploy target/deploy/game_token.so --url https://api.devnet.solana.com 2^>nul ^| find "Program Id:"') do set PROGRAM_ID_LINE=%%i
echo 📝 Program ID: %PROGRAM_ID_LINE%

echo 🎉 DEPLOYMENT COMPLETE!
echo 💡 Update your Anchor.toml with the new Program ID
echo 🔗 Monitor: https://explorer.solana.com/?cluster=devnet

pause

