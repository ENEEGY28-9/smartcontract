# Debug the startup script issue
Write-Host "Debugging Startup Script..." -ForegroundColor Cyan

# Simulate the startup script logic
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Script root: $scriptRoot" -ForegroundColor Yellow

# Test the Start-ServiceProcess function logic
function Debug-StartServiceProcess {
    param(
        $ServiceName,
        $Command,
        $WorkingDirectory = ".",
        $Arguments = @()
    )

    Write-Host "Starting $ServiceName..." -ForegroundColor Cyan
    Write-Host "  Command: $Command" -ForegroundColor Gray
    Write-Host "  WorkingDirectory: $WorkingDirectory" -ForegroundColor Gray

    try {
        # Convert relative path to absolute path if needed
        if ($WorkingDirectory -ne ".") {
            $absolutePath = Join-Path $scriptRoot $WorkingDirectory
            Write-Host "  Absolute path: $absolutePath" -ForegroundColor Gray
        } else {
            $absolutePath = $scriptRoot
            Write-Host "  Absolute path: $absolutePath (script root)" -ForegroundColor Gray
        }

        # Test if path exists
        if (Test-Path $absolutePath) {
            Write-Host "  Path exists: YES" -ForegroundColor Green
        } else {
            Write-Host "  Path exists: NO" -ForegroundColor Red
            throw "Cannot find path '$absolutePath' because it does not exist."
        }

        Push-Location $absolutePath
        Write-Host "  Successfully pushed location to: $(Get-Location)" -ForegroundColor Green

        $cmdLine = if ($Arguments.Count -gt 0) {
            "/c $Command $($Arguments -join ' ')"
        } else {
            "/c $Command"
        }
        Write-Host "  Command line: cmd.exe $cmdLine" -ForegroundColor Gray

        $process = Start-Process "cmd.exe" -ArgumentList $cmdLine -PassThru -WindowStyle Hidden
        Write-Host "  Process started with PID: $($process.Id)" -ForegroundColor Green

        Pop-Location
        Write-Host "  Successfully popped location back to: $(Get-Location)" -ForegroundColor Green

        # Wait a moment for process to start
        Start-Sleep -Seconds 2

        if (!$process.HasExited) {
            Write-Host "OK $ServiceName started successfully (PID: $($process.Id))" -ForegroundColor Green
            return $process
        } else {
            Write-Host "ERROR $ServiceName failed to start" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "ERROR Failed to start $ServiceName : $($_.Exception.Message)" -ForegroundColor Red
        # Only pop if we're still in a pushed location
        try {
            Pop-Location
            Write-Host "  Popped location in error handler" -ForegroundColor Yellow
        }
        catch {
            Write-Host "  Could not pop location (might not be pushed)" -ForegroundColor Yellow
        }
        return $null
    }
}

# Test worker startup
Write-Host "" -ForegroundColor White
Write-Host "Testing Worker Startup..." -ForegroundColor Cyan
$workerProcess = Debug-StartServiceProcess -ServiceName "Worker" -Command "cargo run" -WorkingDirectory "worker"

if ($workerProcess) {
    Write-Host "Worker test successful" -ForegroundColor Green
    Stop-Process -Id $workerProcess.Id -Force
} else {
    Write-Host "Worker test failed" -ForegroundColor Red
}
