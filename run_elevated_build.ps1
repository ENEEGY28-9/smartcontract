# PowerShell script to run build with elevated privileges

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "Script not running as Administrator. Elevating..." -ForegroundColor Red
    $scriptPath = $MyInvocation.MyCommand.Path
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    try {
        Start-Process powershell.exe -ArgumentList $arguments -Verb RunAs -Wait
        exit
    }
    catch {
        Write-Host "Failed to elevate privileges." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Running with Administrator privileges" -ForegroundColor Green

# Set working directory
Set-Location $PSScriptRoot

# Set environment variables
$env:HOME = $env:USERPROFILE
$env:CARGO_HOME = "$env:USERPROFILE\.cargo"
$env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
$env:PATH = "$env:PATH;$PSScriptRoot\game_token\solana-release\bin;$env:USERPROFILE\.cargo\bin"

# Navigate to smart contract directory
Set-Location game_token

Write-Host "Cleaning previous build..." -ForegroundColor Yellow
anchor clean

Write-Host "Building smart contract..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

# Try to build
anchor build

if ($LASTEXITCODE -eq 0) {
    Write-Host "" -ForegroundColor Green
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "====================" -ForegroundColor Green

    # Check for .so file
    if (Test-Path "target\deploy\game_token.so") {
        Write-Host "Smart contract .so file created successfully" -ForegroundColor Green
        Get-Item target\deploy\*.so | Format-Table Name, Length -AutoSize
        Write-Host "Location: $(Get-Location)\target\deploy\game_token.so" -ForegroundColor Cyan
        Write-Host "Size: $((Get-Item target\deploy\game_token.so).Length) bytes" -ForegroundColor Cyan
    } else {
        Write-Host ".so file not found in target/deploy/" -ForegroundColor Red
        if (Test-Path "target\deploy") {
            Get-ChildItem target\deploy\
        } else {
            Write-Host "Target directory does not exist" -ForegroundColor Red
        }
    }

    Write-Host "" -ForegroundColor Green
    Write-Host "Smart contract build completed successfully!" -ForegroundColor Green
    Write-Host "Ready for deployment to Solana Devnet" -ForegroundColor Green
}
else {
    Write-Host "" -ForegroundColor Red
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    Write-Host "=================" -ForegroundColor Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check build logs in: $(Get-Location)\target\debug\build" -ForegroundColor Yellow
    Write-Host "2. Verify all tools are properly installed" -ForegroundColor Yellow
    Write-Host "3. Try running: anchor clean; anchor build" -ForegroundColor Yellow
}

# Return to original directory
Set-Location $PSScriptRoot

Write-Host "" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If build successful: Run .\full_deployment_automated.bat" -ForegroundColor Cyan
Write-Host "2. Check deployment status in SOLANA_SETUP_GUIDE.md" -ForegroundColor Cyan