@echo off
echo Testing server connection...
timeout /t 2 /nobreak >nul

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running successfully!
    echo 🌐 Access your wallet test at: http://localhost:5173/wallet-test
    echo.
    echo 📋 Available routes:
    echo    🏠 http://localhost:5173/          - Home
    echo    🧪 http://localhost:5173/wallet-test - Wallet Test
    echo    🎮 http://localhost:5173/rooms     - Game Rooms
    echo    👁️ http://localhost:5173/spectator  - Spectator
) else (
    echo ❌ Cannot connect to server. Make sure it's running:
    echo    Run: npm run dev
)


