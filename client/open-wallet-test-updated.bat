@echo off
echo 🚀 Opening Updated Wallet Test Interface...
echo.
echo 🔗 URL: http://localhost:5173/wallet-test
echo.
echo ✨ NEW FEATURES:
echo   - Dual network support (Solana + Ethereum)
echo   - Network selector buttons
echo   - Ethereum address validation
echo   - MetaMask integration
echo.
echo 🎯 Your Ethereum address is pre-filled:
echo   0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 Instructions:
echo   1. Switch to Ethereum network using the buttons
echo   2. Click "Test Custom Address" to validate your ETH address
echo   3. Install MetaMask for full Ethereum functionality
echo.
echo 📋 Wallets needed:
echo   - Solana: Phantom Wallet (https://phantom.app/)
echo   - Ethereum: MetaMask (https://metamask.io/)
echo.
pause

start "" "http://localhost:5173/wallet-test"

echo ✅ Wallet test interface opened in your browser!
echo.
echo If the page doesn't load:
echo 1. Make sure dev server is running: npm run dev
echo 2. Or copy this URL: http://localhost:5173/wallet-test
echo.
pause
