@echo off
echo 🚀 Setting up WSL environment for smart contract build...
echo.

echo 📦 Checking Docker installation in WSL...
wsl -d Ubuntu -- bash -c "docker --version"
if %errorlevel% neq 0 (
    echo ❌ Docker not found in WSL. Installing Docker...
    wsl -d Ubuntu -- bash -c "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    wsl -d Ubuntu -- bash -c "sudo usermod -aG docker $USER"
    echo ✅ Docker installed. Please restart WSL and run this script again.
    pause
    exit /b 1
)

echo ✅ Docker is available in WSL
echo.

echo 📂 Navigating to project directory...
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/Fit/Downloads/eneegy-main && pwd"

echo 🚀 Starting smart contract build...
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/Fit/Downloads/eneegy-main && chmod +x docker_build.sh && ./docker_build.sh"

echo 🎉 Build process completed!
pause




