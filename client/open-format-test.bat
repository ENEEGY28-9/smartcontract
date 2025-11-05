@echo off
echo 🚀 Opening Ethereum Format Test (No Dev Server Required)
echo.
echo 🔍 This is a standalone HTML file for quick format validation
echo 📋 Uses CDN for viem library - no dev server needed
echo.
echo 🎯 Your test address: 0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
echo.
echo 💡 Features:
echo - Works completely offline (no network calls for validation)
echo - Format validation (42 characters, 0x prefix)
echo - EIP-55 checksum validation
echo - Real-time validation as you type
echo.
echo 🌐 Opening format test...
echo.

start "" "file://%~dp0ethereum-format-test.html"

echo ✅ Format test opened in browser!
echo.
echo If the page doesn't load:
echo 1. Copy this path to your browser: file://%~dp0ethereum-format-test.html
echo 2. Or drag the HTML file directly into your browser
echo.
echo 🎯 Expected result: "VALID Ethereum Address" with full validation details!
echo.
pause
