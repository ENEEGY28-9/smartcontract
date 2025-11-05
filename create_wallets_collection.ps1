# Simple script to create wallets collection in PocketBase

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "Creating wallets collection..." -ForegroundColor Yellow

# Authenticate
$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = ($response.Content | ConvertFrom-Json).token
    Write-Host "Authenticated successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to authenticate" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create wallets collection
$walletsSchema = @{
    name = "wallets"
    type = "base"
    schema = @(
        @{ name = "user_id"; type = "relation"; required = $true; options = @{ collectionId = "users"; cascadeDelete = $false; minSelect = $null; maxSelect = 1 } }
        @{ name = "address"; type = "text"; required = $true; options = @{ maxSize = 200 } }
        @{ name = "private_key"; type = "text"; required = $false; options = @{ maxSize = 2000 } }
        @{ name = "wallet_type"; type = "select"; required = $true; options = @{ values = @("generated", "phantom", "metamask", "sui", "other") } }
        @{ name = "network"; type = "select"; required = $true; options = @{ values = @("solana", "ethereum", "sui") } }
        @{ name = "balance"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "is_connected"; type = "bool"; required = $false }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "updated_at"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $walletsSchema
    Write-Host "Wallets collection created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Wallets collection may already exist or failed to create" -ForegroundColor Yellow
}

Write-Host "Setup complete!" -ForegroundColor Green
