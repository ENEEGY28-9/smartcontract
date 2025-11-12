# Manual Solana CLI installation script
Write-Host "Manual Solana CLI Installation" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

$solanaDir = "C:\solana"
$solanaBin = "$solanaDir\bin"

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
if (-not (Test-Path $solanaBin)) {
    New-Item -ItemType Directory -Force -Path $solanaBin | Out-Null
}

# Check if we can download
Write-Host "Attempting to download Solana CLI..." -ForegroundColor Yellow

# Try multiple download methods
$urls = @(
    "https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2",
    "https://release.anza.xyz/v1.18.26/solana-release-x86_64-pc-windows-msvc.tar.bz2",
    "https://api.github.com/repos/solana-labs/solana/releases/latest"
)

$downloadSuccess = $false

foreach ($url in $urls) {
    Write-Host "Trying: $url" -ForegroundColor Cyan
    try {
        if ($url -match "api.github.com") {
            # Get latest release info
            $release = Invoke-RestMethod -Uri $url -Method Get
            $asset = $release.assets | Where-Object { $_.name -match "solana-release-x86_64-pc-windows-msvc.tar.bz2" } | Select-Object -First 1
            if ($asset) {
                $downloadUrl = $asset.browser_download_url
                Write-Host "Found download URL: $downloadUrl" -ForegroundColor Green
                Invoke-WebRequest -Uri $downloadUrl -OutFile "C:\solana\solana-cli.tar.bz2" -UseBasicParsing
                $downloadSuccess = $true
                break
            }
        } else {
            Invoke-WebRequest -Uri $url -OutFile "C:\solana\solana-cli.tar.bz2" -UseBasicParsing
            $downloadSuccess = $true
            break
        }
    } catch {
        Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
        continue
    }
}

if (-not $downloadSuccess) {
    Write-Host "Download failed. Please download manually:" -ForegroundColor Red
    Write-Host "URL: https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2" -ForegroundColor Yellow
    Write-Host "Save as: C:\solana\solana-cli.tar.bz2" -ForegroundColor Yellow
    Write-Host "Then run extraction manually." -ForegroundColor Yellow
    exit 1
}

# Extract the file
Write-Host "Extracting Solana CLI..." -ForegroundColor Yellow

# Try to use built-in tar if available (Windows 10+)
try {
    if (Get-Command "tar" -ErrorAction SilentlyContinue) {
        Write-Host "Using tar command..." -ForegroundColor Cyan
        & tar -xf "C:\solana\solana-cli.tar.bz2" -C "C:\solana"
    } else {
        Write-Host "tar not available. Please extract manually:" -ForegroundColor Red
        Write-Host "Extract C:\solana\solana-cli.tar.bz2 to C:\solana\" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please extract manually: C:\solana\solana-cli.tar.bz2 -> C:\solana\" -ForegroundColor Yellow
    exit 1
}

# Find the extracted directory
$extractedDir = Get-ChildItem "C:\solana" -Directory | Where-Object { $_.Name -match "solana" } | Select-Object -First 1
if ($extractedDir) {
    Write-Host "Found extracted directory: $($extractedDir.FullName)" -ForegroundColor Green

    # Copy bin files
    $sourceBin = Join-Path $extractedDir.FullName "bin"
    if (Test-Path $sourceBin) {
        Write-Host "Copying binary files..." -ForegroundColor Yellow
        Copy-Item "$sourceBin\*" $solanaBin -Recurse -Force
    }
}

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$solanaBin*") {
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    $newPath = "$currentPath;$solanaBin"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    # Also update current session
    $env:Path = "$env:Path;$solanaBin"
}

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! Solana CLI installed: $version" -ForegroundColor Green

        # Configure for devnet
        Write-Host "Configuring for devnet..." -ForegroundColor Yellow
        & solana config set --url devnet

        Write-Host "SOLANA CLI INSTALLATION COMPLETED!" -ForegroundColor Green
        Write-Host "Please restart PowerShell and run deployment script." -ForegroundColor Cyan

    } else {
        Write-Host "Installation verification failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "Installation verification failed: $($_.Exception.Message)" -ForegroundColor Red
}


