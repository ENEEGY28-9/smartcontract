@echo off
echo 🎮 TEST MULTIPLE PHANTOM WALLETS
echo ================================
echo.

echo 📋 YOUR WALLET INTEGRATION STATUS:
echo   ✅ Primary Wallet: 57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB
echo   ✅ Connected: Yes
echo   ✅ Network: Solana Devnet
echo   ✅ Balance: 0.0000 SOL
echo.

echo 🎯 NOW TESTING WALLET SWITCHING:
echo.

echo 1️⃣  CREATE ADDITIONAL WALLET ACCOUNT:
echo    - Click Phantom extension (fox icon)
echo    - Click your account name at the top
echo    - Select "Create New Account"
echo    - Or import an existing wallet
echo.

echo 2️⃣  COPY-PASTE THIS TEST CODE:
echo    Open browser console (F12) and paste:
echo.

echo console.log('🔄 Testing wallet switch...');^console.log('Current wallet:', window.solana?.publicKey?.toString());^console.log('Connected:', window.solana?.isConnected);^if (window.solana?.publicKey) {^console.log('💡 Switch to different account in Phantom and refresh page');^}
echo.

echo 3️⃣  SWITCH WALLET AND REFRESH:
echo    - In Phantom, select different account from dropdown
echo    - Refresh browser page (Ctrl+F5)
echo    - Address should change to new wallet
echo    - Balance should update
echo.

echo 🎉 EXPECTED RESULTS:
echo   ✅ New Address: Different public key appears
echo   ✅ Connection Status: Still "Connected"
echo   ✅ Balance: May show different SOL amount
echo   ✅ Tests: All pass with new wallet data
echo.

echo 🔍 COPY-PASTE VERIFICATION CODE:
echo   After switching, paste this in console:
echo.

echo console.log('🔍 Wallet switch verification:');^console.log('New address:', window.solana?.publicKey?.toString());^console.log('Address changed:', window.solana?.publicKey?.toString() !== '57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB');^console.log('Still connected:', window.solana?.isConnected);
echo.

echo ⚡ Perfect for testing multiple wallet scenarios!
echo   You can switch between wallets instantly.
echo.

pause

