@echo off
echo 🚨 PHANTOM SETTINGS - STEP BY STEP FIX
echo ======================================
echo.

echo 📋 EXACTLY WHAT I SEE FROM YOUR SCREENSHOT:
echo   - Server: http://localhost:5176 ✅
echo   - Phantom detected: YES ✅
echo   - Connection: FAILED ❌
echo   - Auto-connect: 10 attempts, all failed ❌
echo   - Testnet Mode: OFF (this is the problem!) ❌
echo.

echo 🎯 THE FIX:
echo   Testnet Mode OFF is blocking localhost connections!
echo.

echo 📝 STEP-BY-STEP INSTRUCTIONS:
echo.

echo Step 1: Click Phantom extension
echo   - Look for fox icon in Chrome toolbar
echo   - Click on it to open Phantom
echo.

echo Step 2: Open Settings
echo   - Click gear/cog icon in Phantom
echo   - Should be in top right corner
echo.

echo Step 3: Find Developer Settings
echo   - Scroll down in settings menu
echo   - Look for "Developer Settings" section
echo.

echo Step 4: Enable Testnet Mode
echo   - Find "Testnet Mode" toggle
echo   - Switch it ON (white/gray background)
echo   - Should say "Applies to balances and app connections"
echo.

echo Step 5: Enable Auto-Confirm (optional)
echo   - Find "Auto-Confirm on localhost" toggle
echo   - Switch it ON for easier testing
echo   - Says "Allows using auto-confirm on localhost..."
echo.

echo Step 6: Save and Close
echo   - Close Phantom settings
echo   - Changes are auto-saved
echo.

echo Step 7: Refresh Browser
echo   - Press Ctrl+F5 (hard refresh)
echo   - Or close and reopen tab
echo.

echo Step 8: Test Connection
echo   - Go to: http://localhost:5176/wallet-test
echo   - Click "Connect Wallet" button
echo   - Should work immediately!
echo.

echo 🎉 EXPECTED RESULT:
echo   - Connection Status: Connected ✅
echo   - No more "wallet not available" errors ✅
echo   - Balance: 0.0000 SOL (normal for devnet) ✅
echo   - Network: Solana Devnet ✅
echo.

echo 🔍 If still not working after this:
echo   - Make sure no other wallet extensions active
echo   - Clear browser cache (Ctrl+Shift+Delete)
echo   - Try incognito mode (Ctrl+Shift+N)
echo   - Restart Chrome browser
echo.

echo ⚡ This is 100% the fix you need!
echo   Testnet Mode OFF is blocking everything.
echo.

pause

