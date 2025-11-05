@echo off
echo 🧪 Starting Wallet Test Interface
echo ================================
echo.

echo Step 1: Starting development server...
echo Server will be available at: http://localhost:5173
echo Wallet test: http://localhost:5173/wallet-test
echo.

echo Starting server...
start cmd /k "npm run dev"

echo.
echo Step 2: Opening wallet test in browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173/wallet-test

echo.
echo Step 3: Testing standalone HTML version...
echo Opening test-wallet.html (works without server)
start test-wallet.html

echo.
echo ✅ Wallet testing setup complete!
echo.
echo 📋 What you can do now:
echo    1. Use development server: http://localhost:5173/wallet-test
echo    2. Use standalone HTML: test-wallet.html (already opened)
echo    3. Install Phantom wallet and test connection
echo    4. Get SOL from: https://faucet.solana.com/
echo.
echo 🎮 Your wallet address: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
echo.
echo Press any key to exit...
pause >nul


