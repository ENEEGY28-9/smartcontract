@echo off
echo 🔍 Unity Error Checker
echo ====================
powershell -ExecutionPolicy Bypass -File "%~dp0unity-error-checker.ps1" -ProjectPath "SubwaySurfers-Unity"
pause
