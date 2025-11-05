@echo off
echo 🚀 MANUAL PHANTOM CONNECTION TEST
echo =================================
echo.

echo 📋 FROM YOUR SCREENSHOT I CAN SEE:
echo   ✅ Testnet Mode: ON (correct!)
echo   ✅ Auto-Confirm: ON (correct!)
echo   ✅ Solana Devnet: Selected (correct!)
echo   ❌ Auto-connect: Still failing 10/10 times
echo   ❌ Manual connection: Not attempted yet
echo.

echo 🎯 THE SOLUTION:
echo   Auto-connect may not work with localhost, but manual connection should work!
echo.

echo 📋 IMMEDIATE ACTION:
echo.

echo 1️⃣  Make sure Phantom wallet is UNLOCKED:
echo    - Click Phantom extension (fox icon)
echo    - If it asks for password, enter it
echo    - Make sure you see your wallet balance/address
echo.

echo 2️⃣  Go to wallet test page:
echo    - URL: http://localhost:5176/wallet-test
echo    - Wait for page to load completely
echo.

echo 3️⃣  Click the green "Connect Wallet" button:
echo    - Look for the green button in the interface
echo    - Click it once
echo    - Watch for Phantom popup
echo.

echo 4️⃣  Approve in Phantom popup:
echo    - A popup window should appear from Phantom
echo    - Click "Approve" or "Connect"
echo    - If no popup appears, check if blocked by browser
echo.

echo 🎉 EXPECTED RESULT:
echo   ✅ Connection Status: Connected (not "Not connected")
echo   ✅ Balance: 0.0000 SOL (normal for devnet)
echo   ✅ Address: Your wallet address will appear
echo   ✅ No more errors in console
echo.

echo 🔍 IF STILL NOT WORKING:
echo   1. Check if Phantom wallet is unlocked (step 1)
echo   2. Look for Phantom popup (might be behind browser window)
echo   3. Clear browser cache (Ctrl+Shift+Delete)
echo   4. Try incognito mode (Ctrl+Shift+N)
echo   5. Disable other wallet extensions
echo   6. Restart Chrome browser
echo.

echo 📋 COPY-PASTE TEST CODE:
echo   Open browser console (F12) and paste this:
echo.

echo console.log('🔍 Manual connection test...');if(window.solana){window.solana.connect().then(r=^>{console.log('✅ SUCCESS:',r.publicKey.toString())}).catch(e=^>{console.error('❌ FAILED:',e.message)});}else{console.log('❌ No Phantom');}
echo.

echo ⚡ This should work now that Testnet Mode is ON!
echo   The auto-connect failure is normal for localhost.
echo.

pause

