@echo off
echo 🚀 RUN THIS AFTER CHANGING PHANTOM SETTINGS
echo ===========================================
echo.

echo 🔍 VERIFYING SETTINGS CHANGE...
echo.

echo ✅ Did you:
echo   [ ] Click Phantom extension (fox icon)?
echo   [ ] Click Settings (gear icon)?
echo   [ ] Scroll to Developer Settings?
echo   [ ] Toggle Testnet Mode: OFF → ON?
echo   [ ] Toggle Auto-Confirm: OFF → ON?
echo   [ ] Refresh browser (Ctrl+F5)?
echo.

echo 🌐 OPENING TEST PAGE...
echo.

start http://localhost:5176/wallet-test

echo.
echo 📋 COPY-PASTE TEST CODE:
echo   Open browser console (F12) and paste this:
echo.

echo console.log('🔍 Testing connection...');^if (window.solana) {^window.solana.connect().then(r =^> {^console.log('✅ SUCCESS:', r.publicKey.toString());^}).catch(e =^> {^console.error('❌ FAILED:', e.message);^});^} else {^console.log('❌ Phantom not found');^}
echo.

echo 🎯 WHAT TO EXPECT:
echo   ✅ Connection Status: Connected (not "Not connected")
echo   ✅ Balance: 0.0000 SOL
echo   ✅ No more "wallet not available" errors
echo   ✅ Console should show SUCCESS message
echo.

echo 🔧 IF STILL NOT WORKING:
echo   - Make sure both toggles are ON (white/gray background)
echo   - Clear browser cache (Ctrl+Shift+Delete)
echo   - Try incognito mode (Ctrl+Shift+N)
echo.

echo ⚡ This should work immediately after settings change!
echo.

pause

