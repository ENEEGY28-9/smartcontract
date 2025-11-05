@echo off
echo 🚀 PHANTOM WALLET CONNECTION TEST
echo =================================
echo.

echo 🔍 Checking server status...
netstat -an | findstr :5176 >nul
if %errorlevel% equ 0 (
    echo ✅ Server is running on port 5176
) else (
    echo ❌ Server is not running on port 5176
    echo 💡 Start server with: npm run dev
)

echo.
echo 🔍 Checking Phantom wallet...
echo 💡 Open browser and go to: http://localhost:5176/wallet-test
echo 💡 Press F12 and run this in console:
echo.

echo // Copy and paste this into browser console
echo console.log('🔍 QUICK PHANTOM TEST');
echo console.log('======================');
echo console.log('Phantom available:', !!window.solana);
echo if (window.solana) {
echo   console.log('Is connected:', window.solana.isConnected);
echo   console.log('Is Phantom:', window.solana.isPhantom);
echo   console.log('Public key:', window.solana.publicKey?.toString());
echo   console.log('Available methods:', Object.keys(window.solana));
echo }
echo.

echo 💡 After running the script above, try:
echo 1. Click "Connect Wallet" button
echo 2. Approve in Phantom popup
echo 3. Check if connection works
echo.

pause

