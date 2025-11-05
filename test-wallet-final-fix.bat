@echo off
echo 🧪 Testing Wallet Interface - Final Fix
echo ======================================
echo.

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Testing multiple ports for wallet interface...
for /l %%i in (5173,1,5180) do (
    curl -s http://localhost:%%i/wallet-test >nul 2>nul
    if !errorlevel! equ 0 (
        echo ✅ SUCCESS: Wallet interface found on port %%i!
        echo.
        echo 🎉 Access your wallet test at:
        echo    http://localhost:%%i/wallet-test
        echo.
        echo 💰 Your wallet: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
        echo 🌐 Get test SOL: https://faucet.solana.com/
        echo.
        echo 🚀 Opening in browser...
        start http://localhost:%%i/wallet-test
        goto :success
    )
)

echo ❌ Server not responding
echo Please check for errors and run: npm run dev
goto :end

:success
echo.
echo ✅ All wallet functionality should be working!
echo.
echo Press any key to exit...
pause >nul

:end


