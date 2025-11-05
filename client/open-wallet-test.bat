@echo off
echo 🧪 Opening Wallet Test Interface...
echo.
echo Choose an option:
echo 1. Standalone Test (works in any browser, no server needed)
echo 2. Full Development Server (localhost:5173)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo ✅ Opening standalone wallet test...
    start "" "wallet-test-standalone.html"
    echo.
    echo 📂 File opened: wallet-test-standalone.html
    echo 🌐 You can also open this file directly in any browser
) else if "%choice%"=="2" (
    echo ✅ Starting development server...
    npm run dev
) else (
    echo ❌ Invalid choice. Opening standalone version...
    start "" "wallet-test-standalone.html"
)

echo.
echo 💡 Tips:
echo - Standalone version works without any setup
echo - Mock wallet simulates all Phantom functionality
echo - Perfect for testing and development
echo.
pause






















