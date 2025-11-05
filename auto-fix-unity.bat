@echo off
echo 🔧 Auto-Fixing Unity Errors...
echo ============================
powershell -ExecutionPolicy Bypass -File "%~dp0unity-error-fixer.ps1" -ProjectPath "SubwaySurfers-Unity"
echo.
echo ✅ Auto-fix completed!
echo 💡 Remember to restart Unity to see all changes.
pause
