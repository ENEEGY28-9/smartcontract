param(
    [string]$PocketBaseUrl = "http://127.0.0.1:8090",
    [string]$AdminToken = $env:POCKETBASE_ADMIN_TOKEN
)

if (-not $AdminToken) {
    Write-Host "POCKETBASE_ADMIN_TOKEN not set" -ForegroundColor Red
    exit 1
}

Write-Host "Starting test room flow..."

function Invoke-PB {
    param($Method, $Uri, $Body=$null)
    if ($Body) {
        return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Admin $AdminToken" } -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 5)
    } else {
        return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Admin $AdminToken" }
    }
}

$roomData = @{ name = "test-room-$(Get-Random)"; host_player_id = "host-user-1"; players = @( @{ id = "host-user-1"; name = "Host"; isHost = $true } ); player_count = 1; spectator_count = 0; status = 'waiting'; settings = @{ maxPlayers = 6; gameMode = 'deathmatch'; timeLimit = 300 }; created_at = (Get-Date).ToString('o'); updated_at = (Get-Date).ToString('o'); last_activity = (Get-Date).ToString('o') }

Write-Host "Creating room..."
$create = Invoke-PB -Method Post -Uri "$PocketBaseUrl/api/collections/rooms/records" -Body $roomData
Write-Host "Created room id: $($create.id)"

Write-Host "Adding player user-2..."
$players = $create.players + @{ id = 'user-2'; name = 'Player2'; isHost = $false }
$update = @{ players = $players; player_count = ($players.Count); updated_at = (Get-Date).ToString('o'); last_activity = (Get-Date).ToString('o') }
Invoke-PB -Method Patch -Uri "$PocketBaseUrl/api/collections/rooms/records/$($create.id)" -Body $update
Write-Host "Player added."

Write-Host "Kicking player user-2..."
$playersAfterKick = $players | Where-Object { $_.id -ne 'user-2' }
Invoke-PB -Method Patch -Uri "$PocketBaseUrl/api/collections/rooms/records/$($create.id)" -Body @{ players = $playersAfterKick; player_count = ($playersAfterKick.Count); updated_at = (Get-Date).ToString('o'); last_activity = (Get-Date).ToString('o') }
Write-Host "Player kicked."

Write-Host "Host leaving (simulate) -- should delete room if empty"
$playersAfterHostLeave = @()
Invoke-PB -Method Patch -Uri "$PocketBaseUrl/api/collections/rooms/records/$($create.id)" -Body @{ players = $playersAfterHostLeave; player_count = 0; updated_at = (Get-Date).ToString('o'); last_activity = (Get-Date).ToString('o') }

Write-Host "Deleting empty room..."
Invoke-PB -Method Delete -Uri "$PocketBaseUrl/api/collections/rooms/records/$($create.id)"
Write-Host "Test flow completed."



