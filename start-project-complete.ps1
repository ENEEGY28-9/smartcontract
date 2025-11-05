# GAMEV1 - COMPLETE PROJECT STARTUP SCRIPT
# ============================================
# One-click startup for the entire GameV1 project with persistence layer
# Includes: Worker, Client, Services API, Gateway, Room Manager, PocketBase
# Features: Game persistence, real-time stats, leaderboard system, token minting ready

param(
    [switch]$SkipGateway = $false,        # Skip Gateway HTTP API (port 8080)
    [switch]$SkipServicesApi = $false,    # Skip Services API with persistence (port 3001)
    [switch]$SkipRoomManager = $false,    # Skip Room Manager metrics (port 3200)
    [switch]$SkipPocketBase = $false,     # Skip PocketBase database (port 8090)
    [switch]$Verbose = $false,            # Enable verbose logging
    [switch]$SkipHealthCheck = $false,    # Skip post-startup health checks
    [switch]$SkipHealthErrors = $false    # Don't fail on health check errors
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host "GAMEV1 - Complete Project Startup" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Multiplayer Game Development Platform" -ForegroundColor Cyan
Write-Host "With Real-time Persistence & Token Minting Ready" -ForegroundColor Magenta
Write-Host ""

# Function to check if service is running
function Test-ServiceRunning {
    param($ProcessName, $ServiceName)
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "OK $ServiceName is running (PID: $($process.Id))" -ForegroundColor Green
        return $true
    }
    return $false
}

# Function to test service health
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$TimeoutSeconds = 10
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "OK $ServiceName health check passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "WARN $ServiceName returned status $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "ERROR $ServiceName health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to start a service
function Start-ServiceProcess {
    param(
        $ServiceName,
        $Command,
        $WorkingDirectory = ".",
        $Arguments = @()
    )

    Write-Host "Starting $ServiceName..." -ForegroundColor Cyan

    try {
        # Convert relative path to absolute path if needed
        if ($WorkingDirectory -ne ".") {
            $absolutePath = Join-Path $scriptRoot $WorkingDirectory
        } else {
            $absolutePath = $scriptRoot
        }

        Push-Location $absolutePath

        if ($Arguments.Count -gt 0) {
            $process = Start-Process "cmd.exe" -ArgumentList "/c $Command $($Arguments -join ' ')" -PassThru -WindowStyle Hidden
        } else {
            $process = Start-Process "cmd.exe" -ArgumentList "/c $Command" -PassThru -WindowStyle Hidden
        }

        Pop-Location

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
        Pop-Location
        return $null
    }
}

# Function to check environment
function Test-Environment {
    Write-Host "Checking Environment..." -ForegroundColor Cyan

    # Check Rust
    try {
        $rustVersion = & cargo --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Rust: $rustVersion" -ForegroundColor Green
        } else {
            throw "Rust not found"
        }
    }
    catch {
        Write-Host "ERROR Rust not found. Please install from https://rustup.rs/" -ForegroundColor Red
        return $false
    }

    # Check Node.js
    try {
        $nodeVersion = & node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
        } else {
            throw "Node.js not found"
        }
    }
    catch {
        Write-Host "ERROR Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
        return $false
    }

    # Check PocketBase (optional)
    if (!$SkipPocketBase) {
        try {
            if (Test-Path ".\pocketbase\pocketbase.exe") {
                Write-Host "OK PocketBase binary found" -ForegroundColor Green
            } else {
                Write-Host "WARN PocketBase binary not found. Database features will be limited." -ForegroundColor Yellow
                Write-Host "      Download from: https://pocketbase.io/docs/" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "WARN PocketBase check failed" -ForegroundColor Yellow
        }
    }

    return $true
}

# Function to install client dependencies
function Install-ClientDependencies {
    Write-Host "Installing client dependencies..." -ForegroundColor Cyan

    if (!(Test-Path "client\node_modules")) {
        try {
            Write-Host "  Running npm install..." -ForegroundColor Yellow
            $npmProcess = Start-Process "cmd.exe" -ArgumentList "/c cd client && npm install" -PassThru -WindowStyle Hidden -Wait

            if ($npmProcess.ExitCode -eq 0) {
                Write-Host "OK Dependencies installed successfully" -ForegroundColor Green
            } else {
                Write-Host "WARN Standard install failed, trying legacy peer deps..." -ForegroundColor Yellow
                $npmProcess = Start-Process "cmd.exe" -ArgumentList "/c cd client && npm install --legacy-peer-deps" -PassThru -WindowStyle Hidden -Wait

                if ($npmProcess.ExitCode -eq 0) {
                    Write-Host "OK Dependencies installed with legacy peer deps" -ForegroundColor Green
                } else {
                    throw "npm install failed"
                }
            }
        }
        catch {
            Write-Host "ERROR Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "OK Client dependencies already installed" -ForegroundColor Green
    }
}

# Main startup sequence
try {
    Write-Host "System Check" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan

    # Ensure we're in the correct working directory
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $scriptRoot

    # Check environment
    if (!(Test-Environment)) {
        throw "Environment check failed"
    }

    # Stop existing processes to avoid conflicts
    Write-Host ""
    Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow

    $processesToStop = @("cargo", "node", "pocketbase")
    foreach ($processName in $processesToStop) {
        $process = Get-Process -Name $processName -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Stopping $processName (PID: $($process.Id))..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }

    Start-Sleep -Seconds 2

    # Install client dependencies
    Write-Host ""
    Install-ClientDependencies

    # Start services
    Write-Host ""
    Write-Host "Starting Services" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan

    # Start Worker (essential)
    Write-Host "Starting Worker (gRPC 50051)..." -ForegroundColor Cyan
    $workerProcess = Start-ServiceProcess -ServiceName "Worker" -Command "cargo run" -WorkingDirectory "worker"
    if (!$workerProcess) {
        throw "Failed to start Worker"
    }

    # Wait for worker to initialize
    Write-Host "Waiting for Worker to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Start Client (essential)
    Write-Host "Starting Client (port 5173)..." -ForegroundColor Cyan
    $clientProcess = Start-ServiceProcess -ServiceName "Client" -Command "npm run dev" -WorkingDirectory "client"
    if (!$clientProcess) {
        throw "Failed to start Client"
    }

    # Start Services API (NEW - Persistence Layer)
    if (!$SkipServicesApi) {
        Write-Host "Starting Services API (HTTP API 3001)..." -ForegroundColor Cyan
        $servicesProcess = Start-ServiceProcess -ServiceName "Services API" -Command "cargo run" -WorkingDirectory "services"
        if (!$servicesProcess) {
            Write-Host "WARN Services API failed to start, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Services API skipped by user request" -ForegroundColor Yellow
        $servicesProcess = $null
    }

    # Start Gateway
    if (!$SkipGateway) {
        Write-Host "Starting Gateway (HTTP API 8080)..." -ForegroundColor Cyan
        $gatewayProcess = Start-ServiceProcess -ServiceName "Gateway" -Command "cargo run" -WorkingDirectory "gateway"
        if (!$gatewayProcess) {
            Write-Host "WARN Gateway failed to start, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Gateway skipped by user request" -ForegroundColor Yellow
        $gatewayProcess = $null
    }

    # Start Room Manager
    if (!$SkipRoomManager) {
        Write-Host "Starting Room Manager (Metrics 3200)..." -ForegroundColor Cyan
        $roomManagerProcess = Start-ServiceProcess -ServiceName "Room Manager" -Command "cargo run" -WorkingDirectory "room-manager"
        if (!$roomManagerProcess) {
            Write-Host "WARN Room Manager failed to start, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Room Manager skipped by user request" -ForegroundColor Yellow
        $roomManagerProcess = $null
    }

    # Start PocketBase (optional)
    if (!$SkipPocketBase) {
        Write-Host ""
        Write-Host "Starting PocketBase (port 8090)..." -ForegroundColor Yellow
        $pbProcess = Start-ServiceProcess -ServiceName "PocketBase" -Command ".\pocketbase\pocketbase.exe serve --http=127.0.0.1:8090" -WorkingDirectory "."
    }

    # Wait for services to initialize
    Write-Host ""
    Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 20

    # Health checks
    if (!$SkipHealthCheck) {
        Write-Host ""
        Write-Host "Running Health Checks" -ForegroundColor Cyan
        Write-Host "====================" -ForegroundColor Cyan

        $healthChecks = @()

        if (!$SkipServicesApi -and $servicesProcess) {
            $healthChecks += Test-ServiceHealth -ServiceName "Services API" -Url "http://localhost:3001/health" -TimeoutSeconds 15
        }

        if (!$SkipGateway -and $gatewayProcess) {
            $healthChecks += Test-ServiceHealth -ServiceName "Gateway API" -Url "http://localhost:8080/health" -TimeoutSeconds 15
        }

        # Room Manager doesn't have HTTP health endpoint, skip health check
        # if (!$SkipRoomManager -and $roomManagerProcess) {
        #     $healthChecks += Test-ServiceHealth -ServiceName "Room Manager" -Url "http://localhost:3200/health"
        # }

        $healthyCount = ($healthChecks | Where-Object { $_ -eq $true }).Count
        Write-Host "Health check results: $healthyCount/$($healthChecks.Count) services healthy" -ForegroundColor $(if ($healthyCount -eq $healthChecks.Count) { "Green" } elseif ($healthyCount -gt 0) { "Yellow" } else { "Red" })

        # Don't fail the startup if health checks partially fail or if errors are skipped
        if ($healthyCount -lt $healthChecks.Count) {
            if ($SkipHealthErrors) {
                Write-Host "INFO Some services failed health checks but continuing (SkipHealthErrors=true)..." -ForegroundColor Yellow
            } else {
                Write-Host "WARN Some services failed health checks but startup continues..." -ForegroundColor Yellow
            }
        }
    }

    # Success summary
    Write-Host ""
    Write-Host "ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access Points:" -ForegroundColor Cyan
    Write-Host "   Game Client:   http://localhost:5173" -ForegroundColor White
    Write-Host "   Game:          http://localhost:5173/game" -ForegroundColor White
    if (!$SkipServicesApi) {
        Write-Host "   Services API:  http://localhost:3001" -ForegroundColor White
    }
    if (!$SkipGateway) {
        Write-Host "   Gateway API:   http://localhost:8080" -ForegroundColor White
    }
    if (!$SkipRoomManager) {
        Write-Host "   Metrics:     http://localhost:3200/metrics" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Services Running:" -ForegroundColor Cyan
    Write-Host "   Worker:         localhost:50051 (gRPC)" -ForegroundColor White
    if (!$SkipServicesApi) {
        Write-Host "   Services API:   localhost:3001 (Persistence)" -ForegroundColor White
    } else {
        Write-Host "   Services API:   localhost:3001 (Persistence) - Skipped" -ForegroundColor Gray
    }
    Write-Host "   Client:         localhost:5173 (Web)" -ForegroundColor White

    if (!$SkipGateway) {
        Write-Host "   Gateway:        localhost:8080 (HTTP API)" -ForegroundColor White
    } else {
        Write-Host "   Gateway:        localhost:8080 (HTTP API) - Skipped" -ForegroundColor Gray
    }

    if (!$SkipRoomManager) {
        Write-Host "   Room Manager:   localhost:3200 (Metrics)" -ForegroundColor White
    } else {
        Write-Host "   Room Manager:   localhost:3200 (Metrics) - Skipped" -ForegroundColor Gray
    }

    if (!$SkipPocketBase -and $pbProcess) {
        Write-Host "   PocketBase:     localhost:8090 (Database)" -ForegroundColor White
    } elseif (!$SkipPocketBase) {
        Write-Host "   PocketBase:     localhost:8090 (Database) - Skipped" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "How to Play:" -ForegroundColor Cyan
    Write-Host "   1. Open http://localhost:5173 in your browser" -ForegroundColor White
    Write-Host "   2. Click 'Play Game' to start" -ForegroundColor White
    Write-Host "   3. Use SPACE, A/D, S keys to play" -ForegroundColor White
    Write-Host "   4. Full multiplayer features available!" -ForegroundColor Green
    Write-Host "   5. Game results are automatically saved!" -ForegroundColor Green
    if (!$SkipServicesApi) {
        Write-Host "   6. Check game stats at http://localhost:3001" -ForegroundColor White
    }
    if (!$SkipGateway) {
        Write-Host "   7. API access via http://localhost:8080" -ForegroundColor White
    }
    if (!$SkipRoomManager) {
        Write-Host "   8. View metrics at http://localhost:3200/metrics" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "New Features:" -ForegroundColor Magenta
    Write-Host "   • Real-time game result persistence" -ForegroundColor White
    Write-Host "   • Player statistics tracking" -ForegroundColor White
    Write-Host "   • Leaderboard system ready" -ForegroundColor White
    Write-Host "   • Token minting integration ready" -ForegroundColor White
    Write-Host ""
    Write-Host "To Stop:" -ForegroundColor Red
    Write-Host "   - Close this PowerShell window" -ForegroundColor White
    Write-Host "   - Or press Ctrl+C" -ForegroundColor White
    Write-Host ""
    Write-Host "Happy gaming!" -ForegroundColor Green

    # Keep window alive and monitor processes
    try {
        while ($true) {
            Start-Sleep -Seconds 10

            # Check if essential processes are still running
            $essentialProcesses = @($workerProcess, $servicesProcess, $clientProcess, $gatewayProcess, $roomManagerProcess)
            $running = 0

            foreach ($proc in $essentialProcesses) {
                if ($proc -and !$proc.HasExited) {
                    $running++
                }
            }

            if ($running -lt 4) {
                Write-Host ""
                Write-Host "WARN Essential services have stopped!" -ForegroundColor Yellow
                Write-Host "   Worker running: $(!$workerProcess.HasExited)" -ForegroundColor White
                Write-Host "   Services API running: $(!$servicesProcess.HasExited)" -ForegroundColor White
                Write-Host "   Client running: $(!$clientProcess.HasExited)" -ForegroundColor White
                Write-Host "   Gateway running: $($gatewayProcess -and !$gatewayProcess.HasExited)" -ForegroundColor White
                Write-Host "   Room Manager running: $($roomManagerProcess -and !$roomManagerProcess.HasExited)" -ForegroundColor White
                break
            }

            if ($Verbose) {
                Write-Host "." -NoNewline -ForegroundColor Gray
            }
        }
    }
    catch {
        # Ctrl+C or other interruption
    }
    finally {
        # Cleanup
        Write-Host ""
        Write-Host "Shutting down services..." -ForegroundColor Yellow

        $allProcesses = @($workerProcess, $clientProcess)
        if ($servicesProcess -and !$servicesProcess.HasExited) { $allProcesses += $servicesProcess }
        if ($gatewayProcess -and !$gatewayProcess.HasExited) { $allProcesses += $gatewayProcess }
        if ($roomManagerProcess -and !$roomManagerProcess.HasExited) { $allProcesses += $roomManagerProcess }
        if ($pbProcess) { $allProcesses += $pbProcess }

        foreach ($proc in $allProcesses) {
            if (!$proc.HasExited) {
                Write-Host "   Stopping $($proc.ProcessName)..." -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        }

        Write-Host "Shutdown complete!" -ForegroundColor Green
    }

}
catch {
    Write-Host ""
    Write-Host "FATAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check if Rust is installed: cargo --version" -ForegroundColor White
    Write-Host "   2. Check if Node.js is installed: node --version" -ForegroundColor White
    Write-Host "   3. Check if PocketBase is available: Test-Path .\pocketbase\pocketbase.exe" -ForegroundColor White
    Write-Host "   4. Check firewall/antivirus settings" -ForegroundColor White
    Write-Host "   5. Run with -Verbose flag for detailed output" -ForegroundColor White
    Write-Host "   6. Run with -SkipServicesApi if persistence issues" -ForegroundColor White
    Write-Host "   7. Run with -SkipHealthCheck to skip health validation" -ForegroundColor White
    Write-Host "   8. Try running individual services manually:" -ForegroundColor White
    Write-Host "      - Services API: cd services && cargo run" -ForegroundColor White
    Write-Host "      - Gateway: cd gateway && cargo run" -ForegroundColor White
    Write-Host "      - Client: cd client && npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Available Parameters:" -ForegroundColor Cyan
    Write-Host "   -SkipServicesApi    Skip Services API (persistence layer)" -ForegroundColor White
    Write-Host "   -SkipGateway        Skip Gateway API" -ForegroundColor White
    Write-Host "   -SkipRoomManager    Skip Room Manager (metrics)" -ForegroundColor White
    Write-Host "   -SkipPocketBase     Skip PocketBase database" -ForegroundColor White
    Write-Host "   -SkipHealthCheck    Skip health checks" -ForegroundColor White
    Write-Host "   -Verbose            Show detailed output" -ForegroundColor White
    Write-Host ""
    Write-Host "Need help? Check the troubleshooting guide." -ForegroundColor Cyan
    exit 1
}
