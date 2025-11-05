@echo off
echo 🚀 Opening Fixed Wallet Test Interface
echo.
echo 🔗 URL: http://localhost:5173/wallet-test
echo.
echo ✅ FIXES APPLIED:
echo - Fixed Svelte syntax errors
echo - Added TypeScript declarations
echo - Updated to use viem instead of ethers
echo - Fixed try-catch block structure
echo - Removed duplicate code
echo - Added proper error handling
echo.
echo 🎯 Ready to test:
echo - Solana addresses (Phantom wallet)
echo - Ethereum addresses (MetaMask wallet)
echo - Your address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 Instructions:
echo 1. Switch to Ethereum network
echo 2. Select "Basic Test" mode (no network calls)
echo 3. Test your address - should show VALID
echo.
echo 🌐 Opening interface...
echo.

start "" "http://localhost:5173/wallet-test"

echo ✅ Interface opened!
echo.
echo If not working:
echo - Wait for dev server to fully start
echo - Check console for any remaining errors
echo - Try refreshing the page
echo.
pause
