@echo off
echo 🧪 Wallet Test Setup Fixer
echo =========================
echo.

echo Step 1: Checking files...
if exist "src\routes\+layout.svelte" (
    echo ✅ Layout file found
) else (
    echo ❌ Layout file missing
    echo Creating backup and fixing...
    copy "src\routes\+layout.backup.svelte" "src\routes\+layout.svelte" 2>nul
)

echo.
echo Step 2: Installing dependencies...
npm install

echo.
echo Step 3: Starting development server...
echo Server will start at: http://localhost:5173
echo Wallet test available at: http://localhost:5173/wallet-test
echo.

echo Starting server in new window...
start cmd /k "npm run dev"

echo.
echo Step 4: Testing wallet interface...
timeout /t 3 /nobreak >nul

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running successfully!
    echo.
    echo 🎉 Ready to test wallet functionality!
    echo 📍 Your wallet: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
    echo 🌐 Test interface: http://localhost:5173/wallet-test
    echo 💰 Get SOL: https://faucet.solana.com/
) else (
    echo ❌ Server not responding
    echo Please check for errors and run: npm run dev
)

echo.
echo Press any key to exit...
pause >nul


