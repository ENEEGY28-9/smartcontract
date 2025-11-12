# Create token_blacklist collection for JWT token validation

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== Creating token_blacklist Collection ===" -ForegroundColor Cyan

# Test connection
try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/_/" -Method GET -TimeoutSec 10
    Write-Host "+ PocketBase is running" -ForegroundColor Green
} catch {
    Write-Host "- PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# First, create admin user if it doesn't exist
Write-Host "Checking admin user..." -ForegroundColor Yellow
try {
    $authBody = @{
        identity = $AdminEmail
        password = $AdminPassword
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "+ Admin authentication successful" -ForegroundColor Green
} catch {
    Write-Host "- Admin authentication failed, creating admin user..." -ForegroundColor Yellow

    # Try to create admin via web interface simulation (this might not work)
    Write-Host "Please create admin user manually:" -ForegroundColor Red
    Write-Host "1. Open browser: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "2. Create admin with email: $AdminEmail" -ForegroundColor White
    Write-Host "3. Password: $AdminPassword" -ForegroundColor White
    Write-Host "4. Then run this script again" -ForegroundColor White
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create token_blacklist collection
Write-Host "Creating token_blacklist collection..." -ForegroundColor Yellow
$tokenBlacklistSchema = @{
    name = "token_blacklist"
    type = "base"
    schema = @(
        @{ name = "jti"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "expires_at"; type = "number"; required = $true; options = @{ min = 0 } }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $tokenBlacklistSchema
    Write-Host "+ Created token_blacklist collection" -ForegroundColor Green
} catch {
    Write-Host "- Failed to create token_blacklist collection: $($_.Exception.Message)" -ForegroundColor Red
    # Check if it already exists
    try {
        $existing = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/token_blacklist" -Method GET -Headers $headers
        Write-Host "+ token_blacklist collection already exists" -ForegroundColor Green
    } catch {
        Write-Host "- Collection doesn't exist and couldn't be created" -ForegroundColor Red
    }
}

Write-Host "=== Token Blacklist Setup Complete ===" -ForegroundColor Cyan










