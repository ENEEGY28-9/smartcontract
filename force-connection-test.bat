@echo off
echo 🚨 FORCE MANUAL CONNECTION TEST
echo ===============================
echo.

echo 📋 CURRENT SITUATION:
echo   ✅ Testnet Mode: ON (from your screenshot)
echo   ✅ Auto-Confirm: ON (from your screenshot)
echo   ✅ Solana Devnet: Selected (from your screenshot)
echo   ❌ Auto-connect: Failing 10/10 times
echo   ❌ Manual connect: Not attempted
echo.

echo 🎯 WHY AUTO-CONNECT IS FAILING:
echo   - Auto-connect may not work immediately after enabling Testnet Mode
echo   - Wallet might need manual unlock
echo   - First manual connection is required to establish the link
echo   - This is normal behavior for localhost development
echo.

echo 📋 IMMEDIATE MANUAL TEST:
echo.

echo 1️⃣  OPEN BROWSER CONSOLE (F12):
echo    - Go to: http://localhost:5176/wallet-test
echo    - Press F12 to open developer tools
echo    - Click on "Console" tab
echo.

echo 2️⃣  COPY AND PASTE THIS CODE:
echo.

echo console.log('🔍 Testing manual connection...');^if(window.solana){^console.log('✅ Phantom found');^window.solana.connect().then(r=^>{^console.log('🎉 SUCCESS! Address:',r.publicKey.toString());^}).catch(e=^>{^console.error('❌ Error:',e.message);^});^}else{^console.log('❌ No Phantom');^}
echo.

echo 3️⃣  ALSO TRY THE UI BUTTON:
echo    - On the wallet test page
echo    - Click the green "Connect Wallet" button
echo    - Look for Phantom popup and approve it
echo.

echo 🎉 WHAT SHOULD HAPPEN:
echo   ✅ Console shows: "SUCCESS! Address: [your-wallet-address]"
echo   ✅ UI shows: Connection Status: Connected
echo   ✅ UI shows: Balance: 0.0000 SOL
echo   ✅ UI shows: Your wallet address
echo.

echo 🔍 IF CONSOLE SHOWS ERROR:
echo   - "User rejected": Click approve in Phantom popup
echo   - "locked": Unlock Phantom wallet first
echo   - "Network": Make sure Devnet is selected
echo   - Other error: Check browser console for details
echo.

echo ⚡ Once manual connection works, auto-connect should work too!
echo   This is just the first-time setup requirement.
echo.

pause

