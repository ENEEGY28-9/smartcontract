@echo off
echo 🔧 STOP AUTO-CONNECT SPAM
echo ========================
echo.

echo 📋 COPY-PASTE THIS INTO BROWSER CONSOLE (F12):
echo.

echo // Disable auto-connect spam
echo clearInterval(window.autoConnectInterval);
echo clearTimeout(window.walletStoreAutoConnect);
echo console.log('✅ Auto-connect disabled - console should be clean now');
echo.

echo 🎯 THEN TRY MANUAL CONNECTION:
echo.

echo 1️⃣  Click the green "Connect Wallet" button on the page
echo 2️⃣  Look for Phantom popup window
echo 3️⃣  Click "Approve" or "Connect" in the popup
echo 4️⃣  Connection should work immediately!
echo.

echo 🌐 URL: http://localhost:5176/wallet-test
echo.

echo 💡 This will stop the 10 auto-connect attempts
echo    and let you test manual connection instead.
echo.

pause

