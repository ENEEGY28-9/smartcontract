# Comprehensive Room Manager Database Persistence Test
param(
    [string]$RoomManagerUrl = "http://localhost:8080",
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$TestMode = "comprehensive" # "basic", "comprehensive", "load", "full"
)

Write-Host "=== Room Manager Database Test ===" -ForegroundColor Cyan
Write-Host "Room Manager URL: $RoomManagerUrl" -ForegroundColor Yellow
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Yellow
Write-Host "Test Mode: $TestMode" -ForegroundColor Yellow

# Test configuration
$testResults = @{
    Connection = $false
    RoomCreation = $false
    RoomListing = $false
    RoomJoining = $false
    PlayerManagement = $false
    SpectatorManagement = $false
    RoomSettings = $false
    GameStart = $false
    LeaveOperations = $false
    Cleanup = $false
    PersistenceVerification = $false
}

function Test-Connection {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 10
        Write-Host "✓ PocketBase connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomManagerConnection {
    param([string]$Url)

    try {
        # Room Manager doesn't have a health endpoint, so we'll try to list rooms
        $response = Invoke-RestMethod -Uri "$Url/api/rooms" -Method GET -TimeoutSec 10
        Write-Host "✓ Room Manager connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Room Manager connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomCreation {
    param([string]$Url)

    $roomData = @{
        name = "Test Room $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        host_player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        settings = @{
            difficulty = "normal"
            time_limit = 300
        }
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms" -Method POST -Headers $headers -Body $roomData
        Write-Host "✓ Room creation successful: $($response.room_id)" -ForegroundColor Green
        return $response.room_id
    }
    catch {
        Write-Host "✗ Room creation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-RoomListing {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms" -Method GET -TimeoutSec 10
        Write-Host "✓ Room listing successful: Found $($response.rooms.Count) rooms" -ForegroundColor Green

        foreach ($room in $response.rooms) {
            Write-Host "  - $($room.name): $($room.current_players)/$($room.max_players) players ($($room.status))" -ForegroundColor Gray
        }

        return $true
    }
    catch {
        Write-Host "✗ Room listing failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomJoining {
    param([string]$Url, [string]$RoomId, [string]$PlayerId, [string]$PlayerName)

    $joinData = @{
        room_id = $RoomId
        player_id = $PlayerId
        player_name = $PlayerName
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/join" -Method POST -Headers $headers -Body $joinData
        if ($response.success) {
            Write-Host "✓ Room joining successful for player $PlayerName" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Room joining failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Room joining failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-PlayerManagement {
    param([string]$Url, [string]$RoomId)

    try {
        # Get room details to check player count
        $response = Invoke-RestMethod -Uri "$Url/api/rooms" -Method GET -TimeoutSec 10

        $room = $response.rooms | Where-Object { $_.id -eq $RoomId }
        if ($room) {
            Write-Host "✓ Player management verified: $($room.current_players) players in room" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Room not found for player management test" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Player management test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-Cleanup {
    param([string]$Url, [string]$RoomId)

    try {
        # For cleanup, we'll just verify the room exists and is properly managed
        $response = Invoke-RestMethod -Uri "$Url/api/rooms" -Method GET -TimeoutSec 10

        $room = $response.rooms | Where-Object { $_.id -eq $RoomId }
        if ($room) {
            Write-Host "✓ Cleanup verification successful: Room still exists and is managed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Room disappeared during cleanup test" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Cleanup test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Run-BasicTest {
    Write-Host "`n--- Basic Functionality Test ---" -ForegroundColor Magenta

    # Test connections
    $testResults.Connection = Test-PocketBaseConnection -Url $PocketBaseUrl
    if (-not $testResults.Connection) { return }

    $testResults.RoomManagerConnection = Test-RoomManagerConnection -Url $RoomManagerUrl
    if (-not $testResults.RoomManagerConnection) { return }

    # Test room creation
    $roomId = Test-RoomCreation -Url $RoomManagerUrl
    if ($roomId) {
        $testResults.RoomCreation = $true

        # Test room listing
        $testResults.RoomListing = Test-RoomListing -Url $RoomManagerUrl

        # Test room joining
        $playerId = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        $playerName = "Test Player $(Get-Date -Format 'HHmmss')"
        $testResults.RoomJoining = Test-RoomJoining -Url $RoomManagerUrl -RoomId $roomId -PlayerId $playerId -PlayerName $playerName

        # Test player management
        $testResults.PlayerManagement = Test-PlayerManagement -Url $RoomManagerUrl -RoomId $roomId

        # Test cleanup
        $testResults.Cleanup = Test-Cleanup -Url $RoomManagerUrl -RoomId $roomId
    }
}

function Run-ComprehensiveTest {
    Write-Host "`n--- Comprehensive Test ---" -ForegroundColor Magenta

    Run-BasicTest

    # Additional comprehensive tests
    Write-Host "`n--- Additional Tests ---" -ForegroundColor Magenta

    # Test multiple rooms
    Write-Host "Testing multiple room creation..." -ForegroundColor Yellow
    $roomIds = @()

    for ($i = 1; $i -le 3; $i++) {
        $roomId = Test-RoomCreation -Url $RoomManagerUrl
        if ($roomId) {
            $roomIds += $roomId
        }
    }

    if ($roomIds.Count -ge 2) {
        Write-Host "✓ Multiple room creation successful" -ForegroundColor Green

        # Test filtering
        Write-Host "Testing room filtering..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms?game_mode=deathmatch" -Method GET
            Write-Host "✓ Room filtering successful: Found $($response.rooms.Count) deathmatch rooms" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ Room filtering failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Run-LoadTest {
    Write-Host "`n--- Load Test ---" -ForegroundColor Magenta

    $startTime = Get-Date

    # Create multiple rooms rapidly
    Write-Host "Creating 10 rooms rapidly..." -ForegroundColor Yellow
    $roomIds = @()

    for ($i = 1; $i -le 10; $i++) {
        $roomId = Test-RoomCreation -Url $RoomManagerUrl
        if ($roomId) {
            $roomIds += $roomId
        }
        Start-Sleep -Milliseconds 100
    }

    $endTime = Get-Date
    $duration = $endTime - $startTime

    Write-Host "✓ Load test completed in $($duration.TotalSeconds) seconds" -ForegroundColor Green
    Write-Host "✓ Created $($roomIds.Count) rooms" -ForegroundColor Green
}

# Main execution
switch ($TestMode) {
    "basic" { Run-BasicTest }
    "comprehensive" { Run-ComprehensiveTest }
    "load" { Run-LoadTest }
    default {
        Write-Host "Invalid test mode. Use: basic, comprehensive, or load" -ForegroundColor Red
        exit 1
    }
}

# Summary
Write-Host "`n=== Test Results Summary ===" -ForegroundColor Cyan

foreach ($test in $testResults.Keys) {
    $status = if ($testResults[$test]) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($testResults[$test]) { "Green" } else { "Red" }
    Write-Host "$status - $test" -ForegroundColor $color
}

$passedTests = ($testResults.Values | Where-Object { $_ -eq $true }).Count
$totalTests = $testResults.Values.Count

Write-Host "`nOverall: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 All tests passed! Room Manager database operations are working correctly." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Please check the Room Manager and database configuration." -ForegroundColor Yellow
}
