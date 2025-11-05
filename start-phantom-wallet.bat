@echo off
echo 🌐 Starting Production Phantom Wallet Test...
echo.
echo This will start the dev server with Phantom wallet support for production testing
echo.

echo 1. Stopping any existing processes...
pkill -f "vite\|node" 2>nul || echo "No processes to kill"

echo 2. Clearing cache...
if exist "client\.svelte-kit" rmdir /s /q "client\.svelte-kit" 2>nul
if exist "client\node_modules\.cache" rmdir /s /q "client\node_modules\.cache" 2>nul

echo 3. Installing dependencies...
cd client
call npm install
cd ..

echo 4. Starting dev server with Phantom wallet support...
start cmd /k "cd client && npm run dev"

echo 5. Waiting for server to start...
timeout /t 5 /nobreak >nul

echo 6. Opening Phantom wallet test page...
start http://localhost:5173/wallet-test

echo.
echo ✅ Phantom wallet server started!
echo.
echo 🎯 Next steps for Phantom wallet testing:
echo 1. Install Phantom wallet: https://phantom.app/
echo 2. Create a Solana wallet in Phantom
echo 3. Switch to Devnet network in Phantom
echo 4. In wallet test page, click "Connect Wallet"
echo 5. Approve connection in Phantom popup
echo 6. Check real SOL balance and wallet info
echo.
echo 🔧 Troubleshooting:
echo • Make sure Phantom is unlocked
echo • Switch to Devnet network
echo • Try refreshing the page
echo • Check browser console for errors
echo.
echo Press any key to stop the server...
pause >nul

REM Stop server
pkill -f "vite\|node" 2>nul
echo ✅ Server stopped

