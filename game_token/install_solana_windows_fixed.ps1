# PowerShell script to install Solana CLI on Windows
# Run this as Administrator

Write-Host "Installing Solana CLI on Windows" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Create installation directory
$solanaDir = "C:\solana"
if (-not (Test-Path $solanaDir)) {
    Write-Host "Creating installation directory: $solanaDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $solanaDir -Force | Out-Null
}

# Download Solana CLI
$solanaUrl = "https://github.com/anza-xyz/agave/releases/download/v1.18.26/solana-release-x86_64-pc-windows-msvc.tar.bz2"
$solanaZip = "$env:TEMP\solana-release.tar.bz2"

Write-Host "Downloading Solana CLI..." -ForegroundColor Yellow
Write-Host "From: $solanaUrl" -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri $solanaUrl -OutFile $solanaZip -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Download failed!" -ForegroundColor Red
    Write-Host "Please download manually from: $solanaUrl" -ForegroundColor Yellow
    exit 1
}

# Extract using PowerShell
Write-Host "Extracting Solana CLI..." -ForegroundColor Yellow
try {
    $tempDir = "$env:TEMP\solana-extract"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }

    # Use tar if available (from WSL or Git)
    if (Get-Command "tar" -ErrorAction SilentlyContinue) {
        Write-Host "Using tar for extraction..." -ForegroundColor Cyan
        & tar -xf $solanaZip -C $tempDir
    } else {
        Write-Host "Please install tar or extract manually" -ForegroundColor Red
        Write-Host "Extract $solanaZip to C:\solana\" -ForegroundColor Yellow
        exit 1
    }

    # Copy files
    $extractedItems = Get-ChildItem $tempDir -Recurse
    foreach ($item in $extractedItems) {
        if ($item.PSIsContainer) {
            continue
        }
        $relativePath = $item.FullName.Replace($tempDir, "").TrimStart("\")
        $destPath = Join-Path $solanaDir $relativePath
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $item.FullName $destPath -Force
    }

    Write-Host "Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed!" -ForegroundColor Red
    exit 1
}

# Add to PATH
$solanaBinPath = "$solanaDir\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$solanaBinPath*") {
    Write-Host "Adding Solana CLI to PATH..." -ForegroundColor Yellow
    $newPath = "$currentPath;$solanaBinPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    $env:Path = "$env:Path;$solanaBinPath"
    Write-Host "Added to PATH" -ForegroundColor Green
}

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Solana CLI installed successfully!" -ForegroundColor Green
        Write-Host "Version: $version" -ForegroundColor Green
    } else {
        Write-Host "Verification failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Verification failed!" -ForegroundColor Red
    exit 1
}

# Configure
Write-Host "Configuring Solana CLI..." -ForegroundColor Yellow
& solana config set --url devnet

Write-Host "SOLANA CLI INSTALLATION COMPLETED!" -ForegroundColor Green
Write-Host "Restart PowerShell and run: .\verify_installation.ps1" -ForegroundColor Cyan


