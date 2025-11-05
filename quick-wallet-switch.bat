@echo off
echo 🎮 QUICK WALLET SWITCH TEST
echo ===========================
echo.

echo 📋 CURRENT WALLET:
echo   Address: 57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB
echo   Status: Connected ✅
echo   Network: Solana Devnet ✅
echo.

echo 🎯 TO SWITCH TO DIFFERENT WALLET:
echo.

echo 1️⃣  Open Phantom Extension:
echo    - Click the 🦊 fox icon in Chrome toolbar
echo    - Click your account name at the top
echo    - Select "Create New Account" or choose existing
echo.

echo 2️⃣  Refresh Browser:
echo    - Press Ctrl+F5 (hard refresh)
echo    - Go to: http://localhost:5176/wallet-test
echo.

echo 3️⃣  COPY-PASTE TEST CODE:
echo    Open browser console (F12) and paste:
echo.

echo console.log('🔄 Wallet switch test:');^console.log('Previous: 57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB');^console.log('Current: ', window.solana?.publicKey?.toString());^console.log('Changed:', window.solana?.publicKey?.toString() !== '57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB');^console.log('Connected:', window.solana?.isConnected);
echo.

echo 🎉 EXPECTED RESULT:
echo   ✅ New Address: Different public key appears
echo   ✅ Connection: Still "Connected"
echo   ✅ Balance: Updates to new wallet
echo   ✅ Tests: All pass with new wallet
echo.

echo 🔍 Perfect for testing multiple wallet scenarios!
echo   You can switch instantly between accounts.
echo.

pause

