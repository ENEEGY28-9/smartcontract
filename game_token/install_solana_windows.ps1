# PowerShell script to install Solana CLI on Windows
# Run this as Administrator

Write-Host "Installing Solana CLI on Windows" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Create installation directory
$solanaDir = "C:\solana"
if (-not (Test-Path $solanaDir)) {
    Write-Host "📁 Creating installation directory: $solanaDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $solanaDir -Force | Out-Null
}

# Download Solana CLI
$solanaUrl = "https://github.com/anza-xyz/agave/releases/download/v1.18.26/solana-release-x86_64-pc-windows-msvc.tar.bz2"
$solanaZip = "$env:TEMP\solana-release.tar.bz2"

Write-Host "📦 Downloading Solana CLI..." -ForegroundColor Yellow
Write-Host "From: $solanaUrl" -ForegroundColor Cyan
Write-Host "To: $solanaZip" -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri $solanaUrl -OutFile $solanaZip -UseBasicParsing
    Write-Host "✅ Download completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Try downloading manually from: $solanaUrl" -ForegroundColor Yellow
    exit 1
}

# Extract the archive
Write-Host "📦 Extracting Solana CLI..." -ForegroundColor Yellow
try {
    # Use 7zip if available, otherwise use Expand-Archive
    if (Get-Command "7z" -ErrorAction SilentlyContinue) {
        Write-Host "Using 7-Zip for extraction..." -ForegroundColor Cyan
        & 7z x $solanaZip -o"$env:TEMP\solana-extract" -y
        $extractedDir = Get-ChildItem "$env:TEMP\solana-extract" -Directory | Select-Object -First 1
        Copy-Item "$extractedDir\*" "$solanaDir\" -Recurse -Force
    } else {
        Write-Host "Using PowerShell Expand-Archive..." -ForegroundColor Cyan
        # For tar.bz2, we need to handle it differently
        # First extract .bz2 to .tar
        $tarFile = "$env:TEMP\solana-release.tar"
        & bzip2 -d -c $solanaZip > $tarFile

        # Then extract .tar
        $tempExtract = "$env:TEMP\solana-temp"
        if (-not (Test-Path $tempExtract)) {
            New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
        }

        # Use tar command if available
        if (Get-Command "tar" -ErrorAction SilentlyContinue) {
            & tar -xf $tarFile -C $tempExtract
        } else {
            Write-Host "❌ Neither 7z nor tar available for extraction" -ForegroundColor Red
            Write-Host "Please install 7-Zip or extract manually:" -ForegroundColor Yellow
            Write-Host "1. Extract $solanaZip to get .tar file" -ForegroundColor Cyan
            Write-Host "2. Extract .tar file to C:\solana\" -ForegroundColor Cyan
            exit 1
        }

        # Copy extracted files
        $extractedItems = Get-ChildItem $tempExtract
        foreach ($item in $extractedItems) {
            Copy-Item $item.FullName "$solanaDir\" -Recurse -Force
        }
    }

    Write-Host "✅ Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Extraction failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add to PATH environment variable
$solanaBinPath = "$solanaDir\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$solanaBinPath*") {
    Write-Host "🔧 Adding Solana CLI to PATH..." -ForegroundColor Yellow
    $newPath = "$currentPath;$solanaBinPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "✅ Added to system PATH" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Solana CLI already in PATH" -ForegroundColor Cyan
}

# Update current session PATH
$env:Path = "$env:Path;$solanaBinPath"

# Verify installation
Write-Host "🔍 Verifying installation..." -ForegroundColor Yellow
try {
    $version = & solana --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Solana CLI installed successfully!" -ForegroundColor Green
        Write-Host "Version: $version" -ForegroundColor Green
    } else {
        throw "Command failed"
    }
} catch {
    Write-Host "❌ Solana CLI verification failed!" -ForegroundColor Red
    Write-Host "Please restart PowerShell and try again" -ForegroundColor Yellow
    exit 1
}

# Configure Solana CLI
Write-Host "🌐 Configuring Solana CLI..." -ForegroundColor Yellow
& solana config set --url devnet

# Display configuration
Write-Host "📋 Current configuration:" -ForegroundColor Yellow
& solana config get

# Check balance
Write-Host "💰 Checking wallet balance..." -ForegroundColor Yellow
$balance = & solana balance --url devnet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Balance: $balance" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not check balance (may need to set up wallet)" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 SOLANA CLI INSTALLATION COMPLETED!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell" -ForegroundColor Cyan
Write-Host "2. Navigate to game_token directory" -ForegroundColor Cyan
Write-Host "3. Run: .\setup_and_build_windows.ps1" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "🚀 Your Game Token smart contract will be deployed!" -ForegroundColor Green
