@echo off
echo 🔄 Force restarting development server...

echo 📁 Changing to client directory...
cd client

echo 🧹 Clearing SvelteKit cache...
if exist ".svelte-kit" rmdir /s /q ".svelte-kit"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

echo 🛑 Stopping any running node processes...
taskkill /f /im node.exe 2>nul

echo ⏳ Waiting for processes to stop...
timeout /t 3 /nobreak

echo 🚀 Starting development server...
npm run dev

echo ✅ Development server restarted!
echo 🌐 Open http://localhost:5173/wallet-test in your browser
echo 🔄 Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R) to clear cache
pause
