@echo off
echo 🚨 URGENT: PHANTOM TESTNET MODE FIX
echo ===================================
echo.

echo 🔍 FROM YOUR SCREENSHOT I CAN SEE:
echo   ❌ Testnet Mode: OFF (This is the problem!)
echo   ❌ Auto-Confirm: OFF
echo   ✅ Solana Devnet selected but Testnet Mode OFF
echo.

echo 💡 WHY THIS IS FAILING:
echo   - Testnet Mode OFF = Phantom blocks localhost connections
echo   - Auto-connect can't work without Testnet Mode ON
echo   - "wallet not available" error because of this setting
echo.

echo ✅ IMMEDIATE FIX REQUIRED:
echo.

echo 1️⃣ Click Phantom extension (fox icon in Chrome)
echo 2️⃣ Click Settings (gear icon)
echo 3️⃣ Scroll down to "Developer Settings"
echo 4️⃣ Toggle "Testnet Mode" to ON (white/switch right)
echo 5️⃣ Toggle "Auto-Confirm on localhost" to ON (white/switch right)
echo 6️⃣ Close settings
echo 7️⃣ Refresh browser page (Ctrl+F5)
echo 8️⃣ Click "Connect Wallet" again
echo.

echo 🌐 Current URL: http://localhost:5176/wallet-test
echo.

echo 🎯 AFTER FIXING:
echo   ✅ Connection Status: Connected (not "Not connected")
echo   ✅ No more "wallet not available" errors
echo   ✅ Auto-connect should work
echo   ✅ Balance: 0.0000 SOL (normal for devnet)
echo.

echo ⚡ Do this NOW and the connection will work immediately!
echo.

pause

