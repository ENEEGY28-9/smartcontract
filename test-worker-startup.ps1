# Simple test script to check worker startup
Write-Host "Testing Worker Startup..." -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Script root: $scriptRoot" -ForegroundColor Yellow

$workerPath = Join-Path $scriptRoot "worker"
Write-Host "Worker path: $workerPath" -ForegroundColor Yellow

if (Test-Path $workerPath) {
    Write-Host "Worker directory exists" -ForegroundColor Green

    # Test cd to worker directory
    try {
        Push-Location $workerPath
        Write-Host "Successfully changed to worker directory" -ForegroundColor Green
        Write-Host "Current location: $(Get-Location)" -ForegroundColor Green
        Pop-Location
    }
    catch {
        Write-Host "ERROR: Failed to change to worker directory: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test cargo run
    Write-Host "Testing cargo run in worker directory..." -ForegroundColor Cyan
    try {
        $process = Start-Process "cmd.exe" -ArgumentList "/c cd $workerPath && cargo run" -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 3

        if (!$process.HasExited) {
            Write-Host "Worker started successfully (PID: $($process.Id))" -ForegroundColor Green
            Stop-Process -Id $process.Id -Force
            Write-Host "Worker stopped for testing" -ForegroundColor Yellow
        } else {
            Write-Host "Worker failed to start" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "ERROR: Failed to start worker: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Worker directory does not exist at $workerPath" -ForegroundColor Red
}
