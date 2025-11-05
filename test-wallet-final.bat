@echo off
echo 🧪 Testing Fixed Wallet Interface
echo ================================
echo.

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Testing connection to http://localhost:5173...
curl -s http://localhost:5173 >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ SUCCESS: Development server is running!
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
    echo 🚀 Opening wallet test in browser...
    start http://localhost:5173/wallet-test
    echo.
    echo ✅ All wallet functionality should now work!
    echo.
    echo Press any key to exit...
    pause >nul
) else (
    echo ❌ Server not responding
    echo Trying alternative ports...
    timeout /t 2 /nobreak >nul

    for /l %%i in (5174,1,5180) do (
        curl -s http://localhost:%%i >nul 2>nul
        if !errorlevel! equ 0 (
            echo ✅ Found server on port %%i
            echo Opening: http://localhost:%%i/wallet-test
            start http://localhost:%%i/wallet-test
            goto :end
        )
    )

    echo ❌ Cannot find running server
    echo Please run: npm run dev
    :end
)


