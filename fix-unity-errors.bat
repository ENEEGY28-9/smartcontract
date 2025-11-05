@echo off
echo 🔧 Unity Error Auto-Fixer
echo ========================
powershell -ExecutionPolicy Bypass -File "%~dp0unity-error-fixer.ps1" -ProjectPath "SubwaySurfers-Unity"
pause
