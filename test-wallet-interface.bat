@echo off
echo 🧪 Testing Wallet Interface
echo ==========================
echo.

echo Starting test...
timeout /t 3 /nobreak >nul

echo Testing server connection...
curl -s http://localhost:5173/wallet-test >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ SUCCESS: Wallet interface is working!
    echo.
    echo 🎉 Access your wallet test at:
    echo    http://localhost:5173/wallet-test
    echo.
    echo 💰 Your wallet: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
    echo 🌐 Get test SOL: https://faucet.solana.com/
    echo.
    echo 🚀 Ready for wallet testing!
) else (
    echo ❌ Server not responding
    echo Trying alternative ports...
    timeout /t 2 /nobreak >nul

    for /l %%i in (5174,1,5180) do (
        curl -s http://localhost:%%i/wallet-test >nul 2>nul
        if !errorlevel! equ 0 (
            echo ✅ Found server on port %%i
            echo Access: http://localhost:%%i/wallet-test
            goto :success
        )
    )

    echo ❌ Cannot find server
    echo Please run: npm run dev
    goto :end

    :success
    echo.
    echo 💰 Your wallet: 57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB
    echo 🌐 Get test SOL: https://faucet.solana.com/
)

:end
echo.
echo Press any key to exit...
pause >nul


