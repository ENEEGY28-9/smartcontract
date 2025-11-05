# Script tạo room đơn giản
param(
    [string]$PocketBaseUrl = "http://localhost:8090"
)

Write-Host "Creating Room (Simple Method)..." -ForegroundColor Cyan

# Kiểm tra kết nối cơ bản
try {
    $health = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method Get -TimeoutSec 5
    Write-Host "✓ PocketBase is running" -ForegroundColor Green
}
catch {
    Write-Host "✗ Cannot connect to PocketBase: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Tạo một collection đơn giản nếu chưa tồn tại
Write-Host "Creating collections..." -ForegroundColor Yellow

# Collection rooms cơ bản
$roomsCollection = @{
    name = "rooms"
    schema = @(
        @{ name = "name"; type = "text"; required = $true }
        @{ name = "game_mode"; type = "text"; required = $true }
        @{ name = "max_players"; type = "number"; required = $true }
        @{ name = "current_players"; type = "number"; required = $true }
        @{ name = "status"; type = "text"; required = $true }
        @{ name = "host_id"; type = "text"; required = $true }
    )
} | ConvertTo-Json -Depth 3

# Thử tạo collection mà không cần authentication (có thể không thành công)
try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method Post -Body $roomsCollection -ContentType "application/json" -TimeoutSec 10
    Write-Host "✓ Collections created" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️  Collections may already exist or need authentication: $($_.Exception.Message)" -ForegroundColor Blue
}

# Tạo room mới
Write-Host "Creating a new room..." -ForegroundColor Yellow

$roomData = @{
    name = "Test Room $(Get-Date -Format 'HH:mm:ss')"
    game_mode = "deathmatch"
    max_players = 4
    current_players = 0
    status = "waiting"
    host_id = "host_$(Get-Random -Minimum 1000 -Maximum 9999)"
} | ConvertTo-Json

try {
    # Thử tạo record mà không cần authentication (có thể không thành công)
    $roomResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records" -Method Post -Body $roomData -ContentType "application/json" -TimeoutSec 10

    Write-Host "✓ Room created successfully!" -ForegroundColor Green
    Write-Host "Room Name: $($roomResponse.name)" -ForegroundColor Cyan
    Write-Host "Game Mode: $($roomResponse.game_mode)" -ForegroundColor Cyan
    Write-Host "Max Players: $($roomResponse.max_players)" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Room creation failed (likely needs authentication): $($_.Exception.Message)" -ForegroundColor Red

    # Hướng dẫn người dùng
    Write-Host ""
    Write-Host "📋 To create rooms properly, you need to:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:8090/_/ in your browser" -ForegroundColor White
    Write-Host "2. Create an admin user with email: admin2@pocketbase.local" -ForegroundColor White
    Write-Host "3. Password: admin123456" -ForegroundColor White
    Write-Host "4. Then run the script with authentication" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative: Use the room manager API directly if it's running" -ForegroundColor Yellow

    # Kiểm tra room manager
    try {
        $rmResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method Get -TimeoutSec 5
        Write-Host "✓ Room Manager is running at http://localhost:8080" -ForegroundColor Green

        # Tạo room qua room manager API
        $rmRoomData = @{
            name = "Test Room $(Get-Date -Format 'HH:mm:ss')"
            game_mode = "deathmatch"
            max_players = 4
            host_player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
            settings = @{
                difficulty = "normal"
                time_limit = 300
            }
        } | ConvertTo-Json

        $rmResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/rooms" -Method Post -Body $rmRoomData -ContentType "application/json" -TimeoutSec 10

        Write-Host "✓ Room created via Room Manager!" -ForegroundColor Green
        Write-Host "Room ID: $($rmResponse.room_id)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "✗ Room Manager not available: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please start the Room Manager service first" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Room creation process completed!" -ForegroundColor Green
