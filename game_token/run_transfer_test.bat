@echo off
echo Testing Wallet Transfer Functionality
echo ====================================
echo.

cd /d "%~dp0"

if exist "test_wallet_transfer_functionality.js" (
    echo Running wallet transfer test...
    node test_wallet_transfer_functionality.js
) else (
    echo test_wallet_transfer_functionality.js not found
    dir *.js
)

echo.
echo Press any key to exit...
pause >nul







