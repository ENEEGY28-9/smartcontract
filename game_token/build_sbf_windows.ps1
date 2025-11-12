# Build SBF on Windows using Docker
Write-Host "Building Solana SBF on Windows" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if Docker is available
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Set current directory
$currentDir = Get-Location
Write-Host "Building in directory: $currentDir" -ForegroundColor Cyan

    # Build SBF using Solana Docker image
    Write-Host "Building SBF with Docker..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Cyan

    $dockerCommand = @"
docker run --rm -v ${currentDir}:/workdir -w /workdir ubuntu:22.04 /bin/bash -c "
apt-get update > /dev/null 2>&1 &&
apt-get install -y curl build-essential > /dev/null 2>&1 &&
chmod +x /workdir/docker_build.sh &&
/workdir/docker_build.sh
"
"@

Write-Host "Running: $dockerCommand" -ForegroundColor Gray

# Execute the command
try {
    Invoke-Expression $dockerCommand

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SBF Build completed successfully!" -ForegroundColor Green

        # Check if .so file was created
        $soFile = "target\deploy\game_token.so"
        if (Test-Path $soFile) {
            $fileSize = (Get-Item $soFile).Length
            Write-Host "SUCCESS: .so file created: $soFile ($fileSize bytes)" -ForegroundColor Green
            Write-Host "The file is now compatible with Windows Solana CLI!" -ForegroundColor Green
        } else {
            Write-Host "Warning: .so file not found in expected location" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Build error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Build process completed!" -ForegroundColor Green
