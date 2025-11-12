@echo off
echo Testing Wallet Transfer Functionality
echo ====================================
echo.

cd /d "%~dp0"

if exist "test_wallet_transfer.js" (
    echo Running wallet transfer test...
    node test_wallet_transfer.js
) else (
    echo test_wallet_transfer.js not found in current directory
    dir *.js
)

echo.
echo Press any key to exit...
pause >nul







