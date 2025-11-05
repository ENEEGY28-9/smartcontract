@echo off
echo ========================================
echo      ENEEGY GAME - TOKEN INTEGRATION
echo ========================================
echo.
echo Starting Game with Token System Integration...
echo.
echo Instructions:
echo - Game will open at: http://localhost:5173
echo - Connect wallet to enable real token minting
echo - Collect particles to earn tokens!
echo.
echo Features:
echo - Real blockchain token minting
echo - 80/20 distribution (game/owner)
echo - Wallet integration (Phantom/Solflare)
echo - Real-time balance updates
echo.
echo ========================================

cd /d "%~dp0"

REM Check if we're in the right directory
if not exist "client" (
    echo ERROR: client directory not found!
    echo Please run this script from the eneegy-main directory
    pause
    exit /b 1
)

REM Change to client directory
cd client

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found! Please install Node.js
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting Vite dev server...
echo.
echo ========================================
echo GAME WILL OPEN AUTOMATICALLY
echo ========================================
echo.
echo If browser doesn't open automatically:
echo - Open: http://localhost:5173
echo.
echo Controls in game:
echo - Arrow Keys or WASD: Move player
echo - Collect yellow particles to earn tokens!
echo - Connect wallet for real blockchain minting
echo.
echo ========================================

REM Start the dev server
start cmd /k "npm run dev"

REM Wait a moment for server to start
timeout /t 3 >nul

REM Try to open browser
start http://localhost:5173

echo.
echo Game server started!
echo Check the command window for any errors.
echo Press any key to exit this launcher...
pause >nul
