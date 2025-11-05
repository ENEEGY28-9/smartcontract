# Setup wallet collection in PocketBase
# This script creates the necessary collections for wallet management

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [switch]$CreateAdmin,
    [string]$AdminEmail = "admin@example.com",
    [string]$AdminPassword = "admin123456"
)

Write-Host "🚀 Setting up PocketBase wallet collections..." -ForegroundColor Green

# Function to make API calls
function Invoke-PocketBaseApi {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null
    )

    $url = "$PocketBaseUrl/api/$Endpoint"
    $headers = @{}

    if ($Body) {
        $headers["Content-Type"] = "application/json"
    }

    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10) -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
        }
        return $response
    }
    catch {
        Write-Warning "API call failed: $($_.Exception.Message)"
        return $null
    }
}

# Create admin user if requested
if ($CreateAdmin) {
    Write-Host "📝 Creating admin user..." -ForegroundColor Yellow

    $adminData = @{
        email = $AdminEmail
        password = $AdminPassword
        passwordConfirm = $AdminPassword
    }

    try {
        $result = Invoke-PocketBaseApi -Endpoint "admins" -Method "POST" -Body $adminData
        if ($result) {
            Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "ℹ️ Admin user may already exist or creation failed" -ForegroundColor Yellow
    }
}

# Users collection schema
$usersCollection = @{
    name = "users"
    schema = @(
        @{
            name = "email"
            type = "email"
            required = $true
            options = @{
                exceptDomains = @()
                onlyDomains = @()
            }
        }
        @{
            name = "name"
            type = "text"
            required = $false
            options = @{
                maxSize = 200
            }
        }
        @{
            name = "avatar"
            type = "file"
            required = $false
            options = @{
                maxSize = 5242880
                mimeTypes = @("image/jpeg", "image/png", "image/gif")
                thumbs = @()
            }
        }
    )
    listRule = $null
    viewRule = $null
    createRule = $null
    updateRule = $null
    deleteRule = $null
}

# Wallets collection schema
$walletsCollection = @{
    name = "wallets"
    schema = @(
        @{
            name = "user_id"
            type = "relation"
            required = $false
            options = @{
                collectionId = "users"
                cascadeDelete = $false
                minSelect = $null
                maxSelect = 1
            }
        }
        @{
            name = "address"
            type = "text"
            required = $true
            options = @{
                maxSize = 200
            }
        }
        @{
            name = "private_key"
            type = "text"
            required = $false
            options = @{
                maxSize = 2000
            }
        }
        @{
            name = "mnemonic"
            type = "text"
            required = $false
            options = @{
                maxSize = 1000
            }
        }
        @{
            name = "wallet_type"
            type = "select"
            required = $true
            options = @{
                values = @("metamask", "phantom", "generated", "bitcoin", "other")
            }
        }
        @{
            name = "network"
            type = "select"
            required = $true
            options = @{
                values = @("ethereum", "solana", "bitcoin")
            }
        }
        @{
            name = "balance"
            type = "number"
            required = $false
            options = @{
                min = 0
            }
        }
        @{
            name = "balance_last_updated"
            type = "date"
            required = $false
        }
        @{
            name = "is_connected"
            type = "bool"
            required = $false
        }
        @{
            name = "notes"
            type = "text"
            required = $false
            options = @{
                maxSize = 1000
            }
        }
    )
    listRule = "user_id = @request.auth.id"
    viewRule = "user_id = @request.auth.id"
    createRule = "@request.auth.id != ''"
    updateRule = "user_id = @request.auth.id"
    deleteRule = "user_id = @request.auth.id"
}

# Create users collection
Write-Host "📝 Creating users collection..." -ForegroundColor Yellow
try {
    $result = Invoke-PocketBaseApi -Endpoint "collections" -Method "POST" -Body $usersCollection
    if ($result) {
        Write-Host "✅ Users collection created successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Host "ℹ️ Users collection may already exist" -ForegroundColor Yellow
}

# Create wallets collection
Write-Host "📝 Creating wallets collection..." -ForegroundColor Yellow
try {
    $result = Invoke-PocketBaseApi -Endpoint "collections" -Method "POST" -Body $walletsCollection
    if ($result) {
        Write-Host "✅ Wallets collection created successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Host "ℹ️ Wallets collection may already exist" -ForegroundColor Yellow
}

# Verify collections
Write-Host "🔍 Verifying collections..." -ForegroundColor Yellow
try {
    $collections = Invoke-PocketBaseApi -Endpoint "collections"
    if ($collections) {
        $usersExists = $collections | Where-Object { $_.name -eq "users" }
        $walletsExists = $collections | Where-Object { $_.name -eq "wallets" }

        if ($usersExists) {
            Write-Host "✅ Users collection verified" -ForegroundColor Green
        } else {
            Write-Host "❌ Users collection not found" -ForegroundColor Red
        }

        if ($walletsExists) {
            Write-Host "✅ Wallets collection verified" -ForegroundColor Green
        } else {
            Write-Host "❌ Wallets collection not found" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "⚠️ Could not verify collections" -ForegroundColor Yellow
}

Write-Host "🎉 PocketBase wallet setup complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start PocketBase server: ./pocketbase serve" -ForegroundColor White
Write-Host "2. Open admin panel: http://localhost:8090/_/" -ForegroundColor White
Write-Host "3. Create an admin user if you haven't already" -ForegroundColor White
Write-Host "4. Start the wallet test: npm run dev" -ForegroundColor White
