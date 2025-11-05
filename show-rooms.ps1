Write-Host '🎮 Creating and showing rooms...' -ForegroundColor Cyan
Write-Host ''

# Test tạo room qua Room Manager API
Write-Host 'Testing room creation...' -ForegroundColor Yellow
try {
    $roomData = @{
        name = "Test Room $(Get-Date -Format 'HH:mm:ss')"
        game_mode = 'deathmatch'
        max_players = 4
        host_player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        settings = @{
            difficulty = 'normal'
            time_limit = 300
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri 'http://localhost:8080/api/rooms' -Method Post -Body $roomData -ContentType 'application/json'
    Write-Host '✅ Room created successfully!' -ForegroundColor Green
    Write-Host 'Room ID: $($response.room_id)' -ForegroundColor Cyan
    Write-Host 'Room Name: $($response.name)' -ForegroundColor Cyan
}
catch {
    Write-Host '❌ Room creation failed: $($_.Exception.Message)' -ForegroundColor Red
}

Write-Host ''
Write-Host '📋 Current rooms in Room Manager:' -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri 'http://localhost:8080/api/rooms' -Method Get
    foreach ($room in $rooms.rooms) {
        Write-Host '  - $($room.name) (ID: $($room.id)) - $($room.current_players)/$($room.max_players) players - Status: $($room.status)' -ForegroundColor Gray
    }
}
catch {
    Write-Host '❌ Cannot fetch rooms: $($_.Exception.Message)' -ForegroundColor Red
}

Write-Host ''
Write-Host '🎯 Room Manager is ready!' -ForegroundColor Green
