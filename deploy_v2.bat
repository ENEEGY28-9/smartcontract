@echo off
echo Starting Smart Contract V2 Deployment...
echo ========================================

cd game_token

echo Building smart contract V2...
anchor build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Deploying to devnet...
anchor deploy --provider.cluster devnet

if %ERRORLEVEL% NEQ 0 (
    echo Deploy failed!
    pause
    exit /b 1
)

echo.
echo Initializing PDAs...
node deploy_v2_contract.js

if %ERRORLEVEL% NEQ 0 (
    echo PDA initialization failed!
    pause
    exit /b 1
)

echo.
echo Testing auto-mint...
node test_auto_mint_v2.js

echo.
echo DEPLOYMENT COMPLETE!
echo Check the results above.
pause




