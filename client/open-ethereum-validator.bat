@echo off
echo 🚀 Opening Standalone Ethereum Address Validator
echo.
echo 🔍 This is a standalone HTML file that works without dev server
echo 📋 Perfect for quick validation of Ethereum addresses
echo.
echo 🎯 Your test address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 Features:
echo - No dev server needed
echo - No network calls (format validation only)
echo - Works offline
echo - EIP-55 checksum validation
echo.
echo 🌐 Opening validator...
echo.

start "" "file://%~dp0test-ethereum-validation.html"

echo ✅ Validator opened in browser!
echo.
echo If the page doesn't load:
echo 1. Copy this path to your browser: file://%~dp0test-ethereum-validation.html
echo 2. Or drag the HTML file directly into your browser
echo.
echo 🎯 Expected result: Your address should show "VALID" immediately!
echo.
pause
