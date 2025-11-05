@echo off
REM Deploy Smart Contract to Solana Devnet

echo 🚀 Deploying Game Token Smart Contract...

REM Change to smart contract directory
cd game_token

REM Build the smart contract
echo 🔨 Building smart contract...
anchor build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

REM Deploy to Devnet
echo 📡 Deploying to Solana Devnet...
anchor deploy --provider.cluster devnet

if %errorlevel% neq 0 (
    echo ❌ Deploy failed
    exit /b 1
)

echo ✅ Smart contract deployed successfully!

REM Test the deployment
echo 🧪 Testing deployed contract...
anchor test --provider.cluster devnet

echo 🎉 Smart contract is LIVE on Devnet!
echo 📋 Contract Address: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

pause
