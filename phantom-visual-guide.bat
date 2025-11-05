@echo off
echo 🚨 PHANTOM SETTINGS - VISUAL GUIDE
echo ===================================
echo.

echo 📸 FROM YOUR SCREENSHOT I CAN SEE:
echo   ✅ Server: http://localhost:5176
echo   ✅ Phantom detected successfully
echo   ❌ Testnet Mode: OFF (needs to be ON)
echo   ❌ Auto-Confirm: OFF (needs to be ON)
echo   ❌ Connection: Failed 10/10 attempts
echo.

echo 🎯 EXACT SETTINGS TO CHANGE:
echo.

echo 1️⃣  Testnet Mode: OFF → ON
echo     Current: OFF (gray) ❌
echo     Should be: ON (white) ✅
echo     Location: Developer Settings
echo.

echo 2️⃣  Auto-Confirm on localhost: OFF → ON
echo     Current: OFF (gray) ❌
echo     Should be: ON (white) ✅
echo     Location: Developer Settings
echo.

echo 📋 STEP-BY-STEP VISUAL INSTRUCTIONS:
echo.

echo Step 1: Open Phantom
echo   - Look for 🦊 fox icon in Chrome toolbar
echo   - Click it to open Phantom wallet
echo.

echo Step 2: Open Settings
echo   - In Phantom, click ⚙️ gear/cog icon
echo   - Should be in top-right corner of Phantom
echo.

echo Step 3: Find Developer Settings
echo   - Scroll down in the settings menu
echo   - Look for "Developer Settings" section
echo   - It should be near the bottom
echo.

echo Step 4: Change Testnet Mode
echo   - Find "Testnet Mode" toggle switch
echo   - Current state: OFF (left/gray)
echo   - Click to change: ON (right/white)
echo   - Text: "Applies to balances and app connections"
echo.

echo Step 5: Change Auto-Confirm
echo   - Find "Auto-Confirm on localhost" toggle
echo   - Current state: OFF (left/gray)
echo   - Click to change: ON (right/white)
echo   - Text: "Allows using auto-confirm on localhost"
echo.

echo Step 6: Close Settings
echo   - Click the back arrow or close button
echo   - Settings are saved automatically
echo.

echo Step 7: Refresh Browser
echo   - Press Ctrl+F5 (hard refresh)
echo   - Or close and reopen the tab
echo.

echo Step 8: Test Connection
echo   - Go to: http://localhost:5176/wallet-test
echo   - Click the green "Connect Wallet" button
echo   - Should connect immediately!
echo.

echo 🎉 WHAT WILL HAPPEN AFTER:
echo   ✅ Connection Status: Connected (not "Not connected")
echo   ✅ No more "wallet not available" errors
echo   ✅ Balance: 0.0000 SOL (normal for devnet)
echo   ✅ Network: Solana Devnet
echo   ✅ All tests: PASS
echo.

echo 🔍 IF STILL NOT WORKING:
echo   - Make sure both toggles are ON (white)
echo   - Clear browser cache (Ctrl+Shift+Delete)
echo   - Try incognito mode (Ctrl+Shift+N)
echo   - Restart Chrome browser
echo.

echo ⚡ This is the EXACT fix needed!
echo   The screenshot shows the problem clearly.
echo.

pause

