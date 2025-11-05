# Setup PocketBase binary for Windows
Write-Host "Setting up PocketBase..."

# Create pocketbase directory if it doesn't exist
if (!(Test-Path "pocketbase")) {
    New-Item -ItemType Directory -Path "pocketbase" | Out-Null
}

$PocketBasePath = "pocketbase/pocketbase.exe"
$PocketBaseUrl = "https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_windows_amd64.zip"
$ZipPath = "pocketbase/pocketbase.zip"

# Download PocketBase if not exists
if (!(Test-Path $PocketBasePath)) {
    Write-Host "Downloading PocketBase..."

    try {
        # Download the zip file
        Invoke-WebRequest -Uri $PocketBaseUrl -OutFile $ZipPath

        # Extract the zip file
        Write-Host "Extracting PocketBase..."
        Expand-Archive -Path $ZipPath -DestinationPath "pocketbase" -Force

        # Clean up zip file
        Remove-Item -Path $ZipPath -Force

        Write-Host "PocketBase setup completed!"
    }
    catch {
        Write-Host "Failed to download PocketBase: $($_.Exception.Message)"
        Write-Host "Please download manually from: https://github.com/pocketbase/pocketbase/releases"
        exit 1
    }
} else {
    Write-Host "PocketBase already exists at $PocketBasePath"
}

Write-Host "PocketBase is ready!"