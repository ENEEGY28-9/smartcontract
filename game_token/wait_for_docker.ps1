# Wait for Docker to be ready
Write-Host "WAITING FOR DOCKER TO START" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

$maxAttempts = 30
$attempt = 1

while ($attempt -le $maxAttempts) {
    Write-Host "Attempt $attempt / $maxAttempts : Checking Docker..." -ForegroundColor Yellow

    try {
        $dockerVersion = docker --version 2>&1
        if ($dockerVersion -like "*Docker version*") {
            Write-Host "SUCCESS: Docker is ready! $dockerVersion" -ForegroundColor Green
            Write-Host "Great! You can now proceed with building the smart contract!" -ForegroundColor Green
            break
        } else {
            Write-Host "Docker not ready yet..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Docker not found..." -ForegroundColor Yellow
    }

    if ($attempt -eq $maxAttempts) {
        Write-Host "ERROR: Docker did not start after $maxAttempts attempts" -ForegroundColor Red
        Write-Host "Please check if Docker Desktop is running properly" -ForegroundColor Red
        Write-Host "Look for the blue whale icon in your system tray" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Waiting 10 seconds before next check..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    $attempt++
}

Write-Host ""
Write-Host "NEXT STEP: Build smart contract with Docker" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Run this command now:" -ForegroundColor Cyan
Write-Host ".\build_sbf_windows.ps1" -ForegroundColor White
