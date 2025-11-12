@echo off
echo ========================================
echo 🚀 RUNNING AUTO-MINT SYSTEM
echo ========================================
echo.
echo 📍 System will mint 100 tokens every minute
echo 🎯 Distribution: 80%% Game Pool, 20%% Owner
echo ⏰ Independent of player activity
echo.
echo 🔗 Check balances on:
echo Game Pool: https://solscan.io/account/HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq?cluster=devnet
echo Owner: https://solscan.io/account/4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9?cluster=devnet
echo.
echo 💡 Press Ctrl+C to stop the system
echo.
echo ========================================
echo.

cd /d %~dp0
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/%USERNAME%/Downloads/eneegy-main/game_token && node auto_mint_scheduler_simple.js"

echo.
echo ========================================
echo ❌ AUTO-MINT SYSTEM STOPPED
echo ========================================
pause



