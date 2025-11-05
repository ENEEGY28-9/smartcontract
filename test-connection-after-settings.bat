@echo off
echo 🚀 TEST CONNECTION AFTER SETTINGS FIX
echo =====================================
echo.

echo 🔍 Step 1: Verify Settings
echo   - Testnet Mode: Should be ON (white toggle)
echo   - Auto-Confirm: Should be ON (white toggle)
echo.

echo 🔍 Step 2: Refresh Browser
echo   - Press Ctrl+F5 to hard refresh
echo   - Or close and reopen browser tab
echo.

echo 🔍 Step 3: Check Console
echo   - Press F12 to open Developer Tools
echo   - Click Console tab
echo   - Copy and paste this code:
echo.

echo // PHANTOM CONNECTION TEST
echo console.log('🔍 Testing Phantom Connection...');
echo setTimeout(async () => {
echo   if (window.solana) {
echo     try {
echo       console.log('✅ Phantom found, attempting connection...');
echo       const response = await window.solana.connect();
echo       console.log('🎉 SUCCESS! Connected to:', response.publicKey.toString());
echo       console.log('🌐 Network should be Devnet');
echo       console.log('💰 Balance should be 0 SOL');
echo     } catch (error) {
echo       console.error('❌ Connection failed:', error.message);
echo       console.log('💡 Make sure Testnet Mode is ON in Phantom settings');
echo     }
echo   } else {
echo     console.log('❌ Phantom not found');
echo   }
echo }, 1000);
echo.

echo 🔍 Step 4: Click Connect Button
echo   - Go to: http://localhost:5176/wallet-test
echo   - Click the green "Connect Wallet" button
echo   - Should connect without errors now
echo.

echo 🎯 EXPECTED RESULTS:
echo   ✅ Connection Status: Connected
echo   ✅ Network: Solana Devnet
echo   ✅ Balance: 0.0000 SOL
echo   ✅ No error messages
echo.

pause

