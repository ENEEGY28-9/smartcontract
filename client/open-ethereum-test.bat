@echo off
echo 🚀 Starting Ethereum Wallet Test...
echo.
echo 🔗 Opening: ethereum-wallet-test.html
echo 📍 Location: %~dp0ethereum-wallet-test.html
echo.
echo 💡 Make sure you have MetaMask installed!
echo 🌐 MetaMask download: https://metamask.io/
echo.
echo 📋 Your test address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo Press any key to continue...
pause >nul

start "" "file://%~dp0ethereum-wallet-test.html"

echo ✅ File opened in your default browser!
echo.
echo If the page doesn't load, try:
echo 1. Copy this path to your browser: file://%~dp0ethereum-wallet-test.html
echo 2. Or run a local server: python3 -m http.server 8000
echo 3. Then visit: http://localhost:8000/ethereum-wallet-test.html
echo.
pause
