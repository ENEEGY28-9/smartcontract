@echo off
echo 🚀 Unity Project Health Check
echo ============================
powershell -ExecutionPolicy Bypass -File "%~dp0unity-project-health-check.ps1" -ProjectPath "SubwaySurfers-Unity"
pause
