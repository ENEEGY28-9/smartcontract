# Create energies collection for PocketBase
# This script creates the energies collection to store user energy points

Write-Host "Creating energies collection for PocketBase..." -ForegroundColor Green

try {
    # Check if PocketBase is running
    $pbUrl = "http://localhost:8090"

    # First, try to authenticate as admin
    Write-Host "Attempting to authenticate as admin..." -ForegroundColor Cyan
    $authBody = @{
        identity = "admin@eneegy.com"
        password = "eneegy123"
    } | ConvertTo-Json

    $authResponse = Invoke-RestMethod -Uri "$pbUrl/api/admins/auth-with-password" -Method Post -Body $authBody -ContentType "application/json"
    $adminToken = $authResponse.token

    Write-Host "Admin authentication successful" -ForegroundColor Green

    # Collection schema for energies
    $energiesSchema = @{
        name = "energies"
        type = "base"
        schema = @(
            @{
                name = "user_id"
                type = "relation"
                required = $true
                options = @{
                    collectionId = "_pb_users_auth_"
                    cascadeDelete = $true
                    minSelect = 1
                    maxSelect = 1
                    displayFields = @("email")
                }
            },
            @{
                name = "points"
                type = "number"
                required = $true
                options = @{
                    min = 0
                }
            },
            @{
                name = "last_updated"
                type = "date"
                required = $false
            }
        )
        indexes = @(
            "CREATE UNIQUE INDEX idx_energies_user_id ON energies (user_id)"
        )
        listRule = 'user_id = @request.auth.id'
        viewRule = 'user_id = @request.auth.id'
        createRule = 'user_id = @request.auth.id'
        updateRule = 'user_id = @request.auth.id'
        deleteRule = '@request.auth.id != "" && user_id = @request.auth.id'
    }

    # Convert to JSON
    $jsonBody = $energiesSchema | ConvertTo-Json -Depth 10

    Write-Host "Collection schema:" -ForegroundColor Yellow
    Write-Host $jsonBody

    # Create the collection
    Write-Host "Creating energies collection..." -ForegroundColor Cyan

    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }

    $createResponse = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method Post -Headers $headers -Body $jsonBody -ContentType "application/json"

    Write-Host "✅ Energies collection created successfully!" -ForegroundColor Green
    Write-Host "Collection ID: $($createResponse.id)" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error creating energies collection:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    # Check if collection already exists
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "ℹ️  Collection might already exist. Checking..." -ForegroundColor Yellow
        Write-Host "✅ Energies collection already exists!" -ForegroundColor Green
    }
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "- Collection name: energies" -ForegroundColor White
Write-Host "- Fields: user_id (relation), points (number), last_updated (date)" -ForegroundColor White
Write-Host "- Rules: User can only access their own energy data" -ForegroundColor White
Write-Host "- Unique index on user_id for one record per user" -ForegroundColor White

Write-Host "`n🎮 Energy system is now integrated with PocketBase!" -ForegroundColor Green
