# Check and install Docker
Write-Host "CHECKING DOCKER" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($dockerVersion -like "*Docker*") {
        Write-Host "SUCCESS: Docker is installed: $dockerVersion" -ForegroundColor Green
        Write-Host "Great! You can proceed with the build step!" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "ERROR: Docker is not installed!" -ForegroundColor Red
    Write-Host "" -ForegroundColor White
    Write-Host "DOCKER DESKTOP INSTALLATION GUIDE:" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "1. Visit: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "2. Download Docker Desktop for Windows" -ForegroundColor White
    Write-Host "3. Run the installer (.exe file)" -ForegroundColor White
    Write-Host "4. Start Docker Desktop" -ForegroundColor White
    Write-Host "5. Wait for Docker to fully start (may take a few minutes)" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "IMPORTANT:" -ForegroundColor Yellow
    Write-Host "   - Make sure Docker Desktop is running (blue whale icon)" -ForegroundColor Yellow
    Write-Host "   - You may need to restart PowerShell after installation" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor White
    Write-Host "AFTER INSTALLATION, RUN THIS SCRIPT AGAIN:" -ForegroundColor Green
    Write-Host "   .\check_and_install_docker.ps1" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "NEXT STEPS AFTER DOCKER IS READY:" -ForegroundColor Cyan
    Write-Host "   .\build_sbf_windows.ps1" -ForegroundColor Cyan
    Write-Host "   .\verify_installation_fixed.ps1" -ForegroundColor Cyan

    # Open browser to Docker download page
    try {
        Start-Process "https://www.docker.com/products/docker-desktop"
    } catch {
        Write-Host "Could not open browser automatically. Please visit manually." -ForegroundColor Yellow
    }
}
