@echo off
echo 🚀 Starting Wallet Test Development Server
echo.
echo 📋 This will:
echo 1. Start the dev server on http://localhost:5173
echo 2. Open wallet test interface
echo 3. Ready for dual network testing
echo.
echo 💡 Make sure you're in the client directory!
echo.

cd /d "%~dp0"

if not exist "package.json" (
    echo ❌ Error: package.json not found in current directory
    echo Please run this script from the client directory
    pause
    exit /b 1
)

echo 🔍 Starting Vite dev server...
start "Wallet Test Server" cmd /c "npm run dev"

echo ⏳ Waiting for server to start...
timeout /t 3 /nobreak >nul

echo 🌐 Opening wallet test interface...
start "" "http://localhost:5173/wallet-test"

echo ✅ Done!
echo.
echo 🎯 Ready to test:
echo - Solana addresses with Phantom wallet
echo - Ethereum addresses with MetaMask wallet
echo - Your address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 If the page doesn't load, check the server console for errors
echo.
pause
