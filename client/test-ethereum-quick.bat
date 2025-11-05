@echo off
echo 🚀 Quick Ethereum Address Test
echo.
echo 📋 Testing address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 Instructions:
echo 1. Switch to Ethereum network in the interface
echo 2. Use "Basic Test" mode (no network calls needed)
echo 3. Should show "VALID" result immediately
echo.
echo 🔗 Opening wallet test interface...
echo.

start "" "http://localhost:5173/wallet-test"

echo ✅ Interface opened!
echo.
echo If not working, try:
echo - Copy URL: http://localhost:5173/wallet-test
echo - Make sure dev server is running: npm run dev
echo.
pause
