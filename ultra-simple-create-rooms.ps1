# Ultra simple script to create rooms collection
Write-Host "=== CREATING ROOMS COLLECTION ===" -ForegroundColor Cyan

# Test connection first
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 3
    Write-Host "✓ PocketBase is healthy" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot connect to PocketBase" -ForegroundColor Red
    exit 1
}

# Authenticate
$authBody = '{"identity":"admin2@pocketbase.local","password":"admin123456"}' | ConvertTo-Json
try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json" -TimeoutSec 5
    $token = $authResponse.token
    Write-Host "✓ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Authentication failed" -ForegroundColor Red
    exit 1
}

# Create collection
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$schema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{name="id"; type="text"; required=$true; options=@{max=15; min=15; pattern="^[a-z0-9]+$"}}
        @{name="name"; type="text"; required=$true; options=@{max=100; min=1}}
        @{name="game_mode"; type="text"; required=$true; options=@{max=50; min=1}}
        @{name="max_players"; type="number"; required=$true; options=@{max=16; min=2}}
        @{name="current_players"; type="number"; required=$false; options=@{min=0}}
        @{name="spectator_count"; type="number"; required=$false; options=@{min=0}}
        @{name="status"; type="select"; required=$true; options=@{values=@("waiting", "playing", "finished")}}
        @{name="host_player_id"; type="text"; required=$true; options=@{max=100; min=1}}
        @{name="worker_endpoint"; type="text"; required=$false; options=@{max=200}}
        @{name="settings"; type="json"; required=$false}
        @{name="created_at"; type="autodate"; required=$false; options=@{onCreate=$true}}
        @{name="updated_at"; type="autodate"; required=$false; options=@{onCreate=$true; onUpdate=$true}}
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method POST -Headers $headers -Body $schema -TimeoutSec 10
    Write-Host "✓ Rooms collection created!" -ForegroundColor Green
    Write-Host "Collection ID: $($response.id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create collection: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers -TimeoutSec 5
    $roomsCollection = $response | Where-Object { $_.name -eq "rooms" }

    if ($roomsCollection) {
        Write-Host "✓ Collection verified!" -ForegroundColor Green
        Write-Host "Name: $($roomsCollection.name)" -ForegroundColor Gray
        Write-Host "Fields: $($roomsCollection.schema.Count)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Collection not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Cannot verify collection" -ForegroundColor Red
}

Write-Host "=== DONE ===" -ForegroundColor Cyan
