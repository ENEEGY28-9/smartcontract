@echo off
echo 🚨 PHANTOM WALLET SETTINGS FIX
echo ================================
echo.

echo 🔍 Current Issue: Testnet Mode is OFF
echo 💡 This is why connection is failing!
echo.

echo ✅ REQUIRED SETTINGS:
echo.

echo 1️⃣ Testnet Mode: ON
echo    - Required for devnet connection
echo    - Without this, Phantom uses Mainnet
echo    - localhost can't connect to Mainnet easily
echo.

echo 2️⃣ Auto-Confirm on localhost: ON (optional)
echo    - Makes testing easier
echo    - Auto-approves connection requests
echo.

echo 📋 INSTRUCTIONS:
echo 1. Open Phantom extension (fox icon)
echo 2. Click Settings (gear icon)
echo 3. Scroll down to Developer Settings
echo 4. Toggle "Testnet Mode" to ON (white)
echo 5. Toggle "Auto-Confirm on localhost" to ON (white)
echo 6. Close settings
echo 7. Refresh browser page
echo 8. Click "Connect Wallet" again
echo.

echo 🌐 Then go to: http://localhost:5176/wallet-test
echo.

pause

