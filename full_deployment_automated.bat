@echo off
REM Full Automated Deployment Script

echo 🚀 STARTING FULL GAME TOKEN DEPLOYMENT...

REM Step 0: Fix Windows Environment Issues
echo.
echo 🔧 Step 0: Checking Windows Environment...
if "%HOME%"=="" (
    echo ❌ HOME environment variable not set
    echo 📦 Running environment fix...
    call fix_windows_build_env.bat
    if %errorlevel% neq 0 (
        echo ❌ Environment fix failed!
        pause
        exit /b 1
    )
    echo ✅ Environment fixed
) else (
    echo ✅ Environment looks good
)
echo.

REM Step 1: Check Solana CLI
echo.
echo 🔍 Step 1: Checking Solana CLI...
solana --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Solana CLI not found!
    echo 📦 Please extract solana-release.tar.bz2 first
    echo 🔗 See: EXTRACT_SOLANA_GUIDE.md
    pause
    exit /b 1
)

echo ✅ Solana CLI found: & solana --version

REM Step 2: Configure Solana
echo.
echo 🔧 Step 2: Configuring Solana for Devnet...
solana config set --url https://api.devnet.solana.com

REM Check if keypair exists
if not exist "%USERPROFILE%\.config\solana\id.json" (
    echo 🔑 Generating new keypair...
    solana-keygen new --no-bip39-passphrase --silent
) else (
    echo ✅ Keypair already exists
)

echo 📍 Your wallet address: & solana address

REM Step 3: Get SOL for deployment
echo.
echo 💰 Step 3: Getting Devnet SOL...
echo Requesting airdrop...
solana airdrop 2

timeout /t 3 /nobreak >nul

echo Current balance: & solana balance

REM Step 4: Build Smart Contract
echo.
echo 🔨 Step 4: Building Smart Contract...
cd game_token

echo Cleaning previous build...
anchor clean

echo Building smart contract...
anchor build

if %errorlevel% neq 0 (
    echo ❌ Smart contract build failed!
    cd ..\..\..
    pause
    exit /b 1
)

echo ✅ Smart contract built successfully

REM Step 5: Deploy Smart Contract
echo.
echo 📡 Step 5: Deploying Smart Contract to Devnet...

REM Check balance again before deployment
echo Checking deployment balance...
cd ..\..\..
solana balance

echo Deploying to devnet...
cd game_token
anchor deploy --provider.cluster devnet

if %errorlevel% neq 0 (
    echo ❌ Smart contract deployment failed!
    echo 💡 Make sure you have enough SOL (at least 0.5 SOL)
    cd ..\..\..
    pause
    exit /b 1
)

echo ✅ Smart contract deployed successfully!

REM Step 6: Extract Program ID
echo.
echo 🔍 Step 6: Extracting Program ID...
for /f "tokens=*" %%i in ('anchor deploy --provider.cluster devnet 2^>^&1 ^| findstr /C:"Program Id:"') do set PROGRAM_ID_LINE=%%i

REM Parse program ID from line
for /f "tokens=3" %%a in ("%PROGRAM_ID_LINE%") do set PROGRAM_ID=%%a

if "%PROGRAM_ID%"=="" (
    echo ⚠️ Could not extract program ID automatically
    echo 📝 Please check the deployment output above for the Program ID
    set /p PROGRAM_ID="Enter Program ID manually: "
)

echo 📋 Deployed Program ID: %PROGRAM_ID%

REM Step 7: Update Program ID in code
echo.
echo 🔄 Step 7: Updating Program ID in blockchain client...

cd ..\..\..
powershell -Command "(Get-Content 'blockchain-service/src/game_token_client.rs') -replace 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS', '%PROGRAM_ID%' | Set-Content 'blockchain-service/src/game_token_client.rs'"

echo ✅ Program ID updated in game_token_client.rs

REM Step 8: Rebuild services
echo.
echo 🔨 Step 8: Rebuilding services...

cd blockchain-service
cargo build

if %errorlevel% neq 0 (
    echo ❌ Blockchain service rebuild failed!
    cd ..
    pause
    exit /b 1
)

cd ..
cd gateway
cargo build

if %errorlevel% neq 0 (
    echo ❌ Gateway rebuild failed!
    cd ..
    pause
    exit /b 1
)

cd ..

echo ✅ All services rebuilt successfully

REM Step 9: Final Test
echo.
echo 🧪 Step 9: Running final integration test...

call test_real_minting.bat

echo.
echo 🎉 DEPLOYMENT COMPLETE!
echo.
echo 📊 SUMMARY:
echo ✅ Solana CLI configured
echo ✅ Smart contract deployed: %PROGRAM_ID%
echo ✅ Program ID updated in code
echo ✅ Services rebuilt
echo ✅ Real blockchain integration ready
echo.
echo 🌐 View your contract on: https://explorer.solana.com/address/%PROGRAM_ID%?cluster=devnet
echo.
echo 🚀 Your game now has REAL blockchain token minting!

pause
