@echo off
echo 🧪 Testing Fixed Wallet Development Server
echo =========================================
echo.

timeout /t 3 /nobreak >nul

echo Testing connection to http://localhost:5173...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ SUCCESS: Server is running!
    echo.
    echo 🎉 Wallet Test Interface Available:
    echo    🏠 Home: http://localhost:5173/
    echo    🧪 Wallet Test: http://localhost:5173/wallet-test
    echo    🎮 Game Rooms: http://localhost:5173/rooms
    echo    👁️ Spectator: http://localhost:5173/spectator
    echo.
    echo 💰 Your Wallet Address: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
    echo 🌐 Get SOL: https://faucet.solana.com/
    echo.
    echo 🚀 Ready to test wallet functionality!
    echo.
    echo Press any key to open wallet test in browser...
    pause >nul
    start http://localhost:5173/wallet-test
) else (
    echo ❌ ERROR: Server not responding
    echo.
    echo 🔧 Troubleshooting:
    echo    1. Check if server is still starting
    echo    2. Run: npm run dev
    echo    3. Check for error messages
    echo.
    echo 📋 Alternative: Open test-wallet.html directly in browser
)


