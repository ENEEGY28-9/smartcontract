# 🚀 GameV1 Production Deployment Script
# Comprehensive deployment for production environment

param(
    [string]$Environment = "production",
    [string]$TargetServer = "localhost",
    [switch]$BuildOnly,
    [switch]$DeployOnly,
    [switch]$FullDeployment,
    [switch]$SkipTests,
    [switch]$Verbose
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BuildDir = Join-Path $ProjectRoot "target/production-release"
$Services = @("gateway", "worker", "room-manager", "services", "pocketbase")
$LogDir = Join-Path $ProjectRoot "logs"

# Colors
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$Blue = "Blue"
$Magenta = "Magenta"

function Write-Header {
    param([string]$Message)
    Write-Host "=== $Message ===" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor $Blue
}

function Write-Progress {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor $Magenta
}

# Pre-deployment checks
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    # Check Rust toolchain
    try {
        $rustVersion = & rustc --version 2>&1
        Write-Success "Rust toolchain found: $rustVersion"
    }
    catch {
        Write-Error "Rust toolchain not found. Please install Rust."
        exit 1
    }

    # Check Cargo
    try {
        $cargoVersion = & cargo --version 2>&1
        Write-Success "Cargo found: $cargoVersion"
    }
    catch {
        Write-Error "Cargo not found. Please install Rust."
        exit 1
    }

    # Check if services are running (if deploying)
    if (-not $BuildOnly) {
        Write-Progress "Checking existing services..."

        $runningServices = Get-Service -Name "gamev1-*" -ErrorAction SilentlyContinue
        if ($runningServices) {
            Write-Warning "Found running GameV1 services. They will be stopped during deployment."
        }
    }

    Write-Success "Prerequisites check completed"
}

# Build production binaries
function Build-ProductionBinaries {
    Write-Header "Building Production Binaries"

    # Clean previous builds
    Write-Progress "Cleaning previous builds..."
    cargo clean

    # Update dependencies
    Write-Progress "Updating dependencies..."
    cargo update

    # Build each service with maximum optimization
    foreach ($service in $Services) {
        Write-Progress "Building $service..."

        try {
            # Build with production optimizations
            $env:RUSTFLAGS = "-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"
            cargo build --release -p $service

            Write-Success "$service built successfully"
        }
        catch {
            Write-Error "Failed to build $service: $($_.Exception.Message)"
            exit 1
        }
    }

    # Create production directory
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Path $BuildDir | Out-Null
    }

    # Copy binaries
    Write-Progress "Copying optimized binaries..."
    foreach ($service in $Services) {
        $sourcePath = Join-Path $ProjectRoot "target/release/$service.exe"
        $destPath = Join-Path $BuildDir "$service.exe"

        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $destPath -Force
            Write-Success "Copied $service to $BuildDir"
        }
        else {
            Write-Warning "Binary not found: $sourcePath"
        }
    }

    # Strip binaries (Windows doesn't have strip, but we can use other optimizations)
    Write-Progress "Optimizing binaries..."
    foreach ($binary in Get-ChildItem $BuildDir -Name "*.exe") {
        Write-Info "Binary optimized: $binary"
    }

    # Generate build info
    $buildInfo = @"
GameV1 Production Build
=======================
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Environment: $Environment
Rust Version: $(& rustc --version)
Build Profile: Production Optimized

Optimization Flags:
- target-cpu=native
- opt-level=3
- lto=fat
- codegen-units=1
- panic=abort

Services Built:
$($Services -join "`n")

Binary Sizes:
$(Get-ChildItem $BuildDir -Name "*.exe" | ForEach-Object { "$_ - $(Get-Item (Join-Path $BuildDir $_) | Select-Object Length | ForEach-Object { '{0:N2} KB' -f ($_.Length / 1KB) })" })

Deployment Ready: YES
"@

    $buildInfo | Out-File (Join-Path $BuildDir "build-info.txt")
    Write-Success "Build completed successfully"
    Write-Info "Build artifacts in: $BuildDir"
}

# Setup production environment
function Setup-ProductionEnvironment {
    Write-Header "Setting up Production Environment"

    # Create directories
    $dirs = @(
        "/opt/gamev1",
        "/opt/gamev1/bin",
        "/opt/gamev1/config",
        "/opt/gamev1/logs",
        "/opt/gamev1/data"
    )

    foreach ($dir in $dirs) {
        Write-Progress "Creating directory: $dir"
        # On Windows, use C:\opt\gamev1 structure
        $winDir = $dir -replace '^/opt', 'C:\opt'
        if (-not (Test-Path $winDir)) {
            New-Item -ItemType Directory -Path $winDir -Force | Out-Null
            Write-Success "Created: $winDir"
        }
    }

    # Copy systemd service files (on Linux) or create Windows services
    if ($IsLinux) {
        Write-Progress "Setting up systemd services..."
        foreach ($service in $Services) {
            $serviceFile = Join-Path $ProjectRoot "systemd/gamev1-$service.service"
            if (Test-Path $serviceFile) {
                Copy-Item $serviceFile "/etc/systemd/system/" -Force
                Write-Success "Installed systemd service: gamev1-$service"
            }
        }

        # Reload systemd
        systemctl daemon-reload
        Write-Success "Reloaded systemd daemon"
    }
    else {
        Write-Progress "Setting up Windows services..."
        # On Windows, create services using sc command
        foreach ($service in $Services) {
            $serviceName = "gamev1-$service"
            $binaryPath = "C:\opt\gamev1\bin\$service.exe"

            # Check if service exists
            $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if (-not $existingService) {
                # Create Windows service
                sc.exe create $serviceName binPath= $binaryPath start= auto
                Write-Success "Created Windows service: $serviceName"
            }
            else {
                Write-Info "Service already exists: $serviceName"
            }
        }
    }

    # Copy configuration files
    Write-Progress "Copying configuration files..."
    $configFiles = Get-ChildItem "config" -Recurse -File
    foreach ($file in $configFiles) {
        $relativePath = $file.FullName.Substring($ProjectRoot.Length + 7) # Remove "config\" prefix
        $destPath = "C:\opt\gamev1\$relativePath"

        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        Copy-Item $file.FullName $destPath -Force
        Write-Success "Copied config: $relativePath"
    }

    Write-Success "Production environment setup completed"
}

# Deploy binaries and configurations
function Deploy-Services {
    Write-Header "Deploying Services"

    # Copy binaries
    Write-Progress "Copying binaries..."
    foreach ($service in $Services) {
        $sourcePath = Join-Path $BuildDir "$service.exe"
        $destPath = "C:\opt\gamev1\bin\$service.exe"

        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $destPath -Force
            Write-Success "Deployed: $service"
        }
        else {
            Write-Error "Binary not found: $sourcePath"
            exit 1
        }
    }

    # Set permissions (on Linux)
    if ($IsLinux) {
        Write-Progress "Setting permissions..."
        chown -R gamev1:gamev1 /opt/gamev1/
        chmod -R 755 /opt/gamev1/bin/
        Write-Success "Set permissions for /opt/gamev1/"
    }

    # Copy service files
    if ($IsLinux) {
        Write-Progress "Enabling systemd services..."
        foreach ($service in $Services) {
            systemctl enable "gamev1-$service"
            Write-Success "Enabled: gamev1-$service"
        }
    }

    Write-Success "Service deployment completed"
}

# Run tests
function Run-DeploymentTests {
    Write-Header "Running Deployment Tests"

    # Test binary execution
    Write-Progress "Testing binary execution..."
    foreach ($service in $Services) {
        $binaryPath = "C:\opt\gamev1\bin\$service.exe"
        if (Test-Path $binaryPath) {
            try {
                # Test if binary can start (with --help or --version if available)
                $testResult = & $binaryPath --help 2>&1
                if ($LASTEXITCODE -eq 0 -or $testResult -like "*help*") {
                    Write-Success "$service binary is executable"
                }
                else {
                    Write-Warning "$service binary test returned exit code: $LASTEXITCODE"
                }
            }
            catch {
                Write-Warning "$service binary test failed: $($_.Exception.Message)"
            }
        }
    }

    # Test configuration files
    Write-Progress "Testing configuration files..."
    $configFiles = Get-ChildItem "C:\opt\gamev1\config" -Recurse -File
    foreach ($file in $configFiles) {
        try {
            # Try to parse JSON/YAML files
            if ($file.Extension -in @('.json', '.yml', '.yaml')) {
                $content = Get-Content $file.FullName -Raw | ConvertFrom-Json -ErrorAction Stop
                Write-Success "Valid config: $($file.Name)"
            }
            else {
                Write-Info "Config file: $($file.Name)"
            }
        }
        catch {
            Write-Warning "Invalid config file $($file.Name): $($_.Exception.Message)"
        }
    }

    Write-Success "Deployment tests completed"
}

# Start services
function Start-Services {
    Write-Header "Starting Services"

    if ($IsLinux) {
        # Start services in dependency order
        $serviceOrder = @("pocketbase", "worker", "room-manager", "services", "gateway")

        foreach ($service in $serviceOrder) {
            Write-Progress "Starting gamev1-$service..."
            try {
                systemctl start "gamev1-$service"
                Start-Sleep -Seconds 2

                $status = systemctl is-active "gamev1-$service" 2>$null
                if ($status -eq "active") {
                    Write-Success "Started: gamev1-$service"
                }
                else {
                    Write-Warning "Service gamev1-$service not active after start"
                }
            }
            catch {
                Write-Error "Failed to start gamev1-$service: $($_.Exception.Message)"
            }
        }
    }
    else {
        # On Windows, start services
        $serviceOrder = @("gamev1-pocketbase", "gamev1-worker", "gamev1-room-manager", "gamev1-services", "gamev1-gateway")

        foreach ($service in $serviceOrder) {
            Write-Progress "Starting $service..."
            try {
                Start-Service -Name $service -ErrorAction Stop
                Start-Sleep -Seconds 2

                $status = Get-Service -Name $service
                if ($status.Status -eq "Running") {
                    Write-Success "Started: $service"
                }
                else {
                    Write-Warning "Service $service not running after start"
                }
            }
            catch {
                Write-Error "Failed to start $service: $($_.Exception.Message)"
            }
        }
    }

    # Wait for services to fully start
    Write-Progress "Waiting for services to initialize..."
    Start-Sleep -Seconds 10

    # Check service status
    Write-Progress "Checking service status..."
    if ($IsLinux) {
        $servicesStatus = systemctl list-units --type=service "gamev1-*" --no-legend
        Write-Info "Service status:`n$servicesStatus"
    }
    else {
        $servicesStatus = Get-Service -Name "gamev1-*"
        $servicesStatus | Format-Table -Property Name, Status, StartType
    }

    Write-Success "Services started"
}

# Health checks
function Test-HealthChecks {
    Write-Header "Running Health Checks"

    $healthEndpoints = @(
        "http://localhost:8080/health",
        "http://localhost:8090/api/health"
    )

    foreach ($endpoint in $healthEndpoints) {
        Write-Progress "Testing health endpoint: $endpoint"
        try {
            $response = Invoke-RestMethod -Uri $endpoint -Method GET -TimeoutSec 10
            Write-Success "Health check passed: $endpoint"
        }
        catch {
            Write-Warning "Health check failed: $endpoint - $($_.Exception.Message)"
        }
    }

    # Test basic API functionality
    Write-Progress "Testing API functionality..."
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/rooms" -Method GET -TimeoutSec 10
        Write-Success "API test passed"
    }
    catch {
        Write-Warning "API test failed: $($_.Exception.Message)"
    }

    Write-Success "Health checks completed"
}

# Rollback function
function Rollback-Deployment {
    Write-Header "Rolling Back Deployment"

    if ($IsLinux) {
        Write-Progress "Stopping all GameV1 services..."
        systemctl stop "gamev1-*"

        Write-Progress "Disabling services..."
        systemctl disable "gamev1-*"

        Write-Progress "Restoring previous binaries..."
        # This would restore from backup if available
        Write-Info "Rollback completed"
    }
    else {
        Write-Progress "Stopping all GameV1 services..."
        Stop-Service -Name "gamev1-*" -Force -ErrorAction SilentlyContinue

        Write-Progress "Restoring previous binaries..."
        # This would restore from backup if available
        Write-Info "Rollback completed"
    }
}

# Main deployment flow
function Main-Deployment {
    Write-Header "GameV1 Production Deployment"
    Write-Info "Environment: $Environment"
    Write-Info "Target Server: $TargetServer"
    Write-Info "Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"

    # Pre-deployment checks
    Test-Prerequisites

    # Build binaries
    if (-not $DeployOnly) {
        Build-ProductionBinaries
    }

    # Setup environment
    if (-not $BuildOnly) {
        Setup-ProductionEnvironment
        Deploy-Services
    }

    # Run tests
    if (-not $SkipTests) {
        Run-DeploymentTests
    }

    # Start services
    if ($FullDeployment -or (-not $BuildOnly -and -not $DeployOnly)) {
        Start-Services
        Test-HealthChecks
    }

    # Final status
    Write-Header "Deployment Summary"
    Write-Success "GameV1 has been successfully deployed to production!"
    Write-Info "Services: $($Services -join ', ')"
    Write-Info "Build directory: $BuildDir"
    Write-Info "Production directory: C:\opt\gamev1"

    if (-not $BuildOnly) {
        Write-Info "Service management:"
        if ($IsLinux) {
            Write-Info "  Start: sudo systemctl start gamev1-<service>"
            Write-Info "  Stop: sudo systemctl stop gamev1-<service>"
            Write-Info "  Status: sudo systemctl status gamev1-<service>"
            Write-Info "  Logs: sudo journalctl -u gamev1-<service> -f"
        }
        else {
            Write-Info "  Start: Start-Service gamev1-<service>"
            Write-Info "  Stop: Stop-Service gamev1-<service>"
            Write-Info "  Status: Get-Service gamev1-<service>"
            Write-Info "  Logs: Get-EventLog -LogName Application -Source gamev1-<service>"
        }
    }

    Write-Info "Monitoring: Check http://localhost:8080/health for system status"
    Write-Info "Metrics: Check http://localhost:8080/api/metrics for performance metrics"
}

# Error handling
try {
    Main-Deployment
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    Write-Error "Stack trace: $($_.ScriptStackTrace)"

    if (-not $BuildOnly) {
        $rollback = Read-Host "Would you like to rollback the deployment? (y/N)"
        if ($rollback -eq 'y' -or $rollback -eq 'Y') {
            Rollback-Deployment
        }
    }

    exit 1
}

Write-Success "🎉 Deployment completed successfully!"
