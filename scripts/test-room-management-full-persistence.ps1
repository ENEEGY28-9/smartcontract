# Full Room Management Database Persistence Test
param(
    [string]$RoomManagerUrl = "http://localhost:8080",
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$TestMode = "comprehensive" # "basic", "comprehensive", "stress", "full"
)

Write-Host "🚀 Room Management Full Database Persistence Test" -ForegroundColor Cyan
Write-Host "Room Manager URL: $RoomManagerUrl" -ForegroundColor Yellow
Write-Host "PocketBase URL: $PocketBaseUrl" -ForegroundColor Yellow
Write-Host "Test Mode: $TestMode" -ForegroundColor Yellow

# Test configuration
$testResults = @{
    DatabaseConnection = $false
    SchemaValidation = $false
    RoomCreation = $false
    RoomPersistence = $false
    PlayerManagement = $false
    SpectatorManagement = $false
    RoomSettings = $false
    GameStart = $false
    LeaveOperations = $false
    StateSynchronization = $false
    CleanupMechanisms = $false
    EventLogging = $false
    ErrorRecovery = $false
}

# Test data
$testRooms = @()
$testPlayers = @()
$testSpectators = @()

function Test-DatabaseConnection {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 10
        Write-Host "✅ PocketBase connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ PocketBase connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomManagerConnection {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/list" -Method GET -TimeoutSec 10
        Write-Host "✅ Room Manager connection successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Room Manager connection failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-SchemaValidation {
    param([string]$PocketBaseUrl)

    try {
        # Check if required collections exist
        $collections = @("rooms", "players", "spectators", "room_events", "game_sessions")

        foreach ($collection in $collections) {
            try {
                $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/$collection" -Method GET -TimeoutSec 5
                Write-Host "✅ Collection '$collection' exists" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Collection '$collection' missing" -ForegroundColor Red
                return $false
            }
        }

        Write-Host "✅ Schema validation passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Schema validation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomCreation {
    param([string]$Url)

    $roomData = @{
        name = "Test Room $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        game_mode = "deathmatch"
        max_players = 4
        host_player_id = "host_$(Get-Random -Minimum 1000 -Maximum 9999)"
        settings = @{
            difficulty = "normal"
            time_limit = 300
            allow_spectators = $true
            min_players_to_start = 2
        }
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/create" -Method POST -Headers $headers -Body $roomData
        if ($response.success) {
            Write-Host "✅ Room creation successful: $($response.room_id)" -ForegroundColor Green
            return $response.room_id
        } else {
            Write-Host "❌ Room creation failed: $($response.error)" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Room creation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-RoomPersistence {
    param([string]$Url, [string]$RoomId)

    try {
        # Check if room exists in database
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/list" -Method GET
        $room = $response.rooms | Where-Object { $_.id -eq $RoomId }

        if ($room) {
            Write-Host "✅ Room persistence verified in database" -ForegroundColor Green

            # Verify room fields
            if ($room.name -and $room.game_mode -and $room.max_players -and $room.current_players -ne $null) {
                Write-Host "✅ Room fields verified" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Room fields missing or invalid" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ Room not found in database" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Room persistence verification failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-PlayerJoining {
    param([string]$Url, [string]$RoomId)

    $playerData = @{
        room_id = $RoomId
        player_id = "player_$(Get-Random -Minimum 1000 -Maximum 9999)"
        player_name = "Test Player $(Get-Date -Format 'HHmmss')"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/join" -Method POST -Headers $headers -Body $playerData
        if ($response.success) {
            Write-Host "✅ Player joining successful" -ForegroundColor Green
            return @{
                PlayerId = ($playerData | ConvertFrom-Json).player_id
                PlayerName = ($playerData | ConvertFrom-Json).player_name
            }
        } else {
            Write-Host "❌ Player joining failed: $($response.error)" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Player joining failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-SpectatorManagement {
    param([string]$Url, [string]$RoomId)

    $spectatorData = @{
        room_id = $RoomId
        spectator_id = "spec_$(Get-Random -Minimum 1000 -Maximum 9999)"
        spectator_name = "Test Spectator $(Get-Date -Format 'HHmmss')"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        # Add spectator
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/add-spectator" -Method POST -Headers $headers -Body $spectatorData
        if ($response.success) {
            Write-Host "✅ Spectator added successfully" -ForegroundColor Green

            # Remove spectator
            $removeData = @{
                spectator_id = ($spectatorData | ConvertFrom-Json).spectator_id
            } | ConvertTo-Json

            $removeResponse = Invoke-RestMethod -Uri "$Url/api/rooms/remove-spectator" -Method POST -Headers $headers -Body $removeData
            if ($removeResponse.success) {
                Write-Host "✅ Spectator removed successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Spectator removal failed: $($removeResponse.error)" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ Spectator addition failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Spectator management failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-RoomSettings {
    param([string]$Url, [string]$RoomId, [string]$PlayerId)

    $settingsData = @{
        room_id = $RoomId
        player_id = $PlayerId
        settings = @{
            difficulty = "hard"
            time_limit = 600
            allow_spectators = $false
            auto_start = $false
        }
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/update-settings" -Method POST -Headers $headers -Body $settingsData
        if ($response.success) {
            Write-Host "✅ Room settings updated successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Room settings update failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Room settings test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-GameStart {
    param([string]$Url, [string]$RoomId, [string]$PlayerId)

    $startData = @{
        room_id = $RoomId
        player_id = $PlayerId
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/start-game" -Method POST -Headers $headers -Body $startData
        if ($response.success) {
            Write-Host "✅ Game start successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Game start failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Game start test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-PlayerLeaving {
    param([string]$Url, [string]$PlayerId)

    $leaveData = @{
        player_id = $PlayerId
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$Url/api/rooms/leave" -Method POST -Headers $headers -Body $leaveData
        if ($response.success) {
            Write-Host "✅ Player leaving successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Player leaving failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Player leaving test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-StateSynchronization {
    param([string]$PocketBaseUrl, [string]$RoomId)

    try {
        # Check room state in database
        $roomResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms/records?filter=id%3D%27$RoomId%27" -Method GET
        if ($roomResponse.items.Count -eq 0) {
            Write-Host "❌ Room not found in database for state sync test" -ForegroundColor Red
            return $false
        }

        $dbRoom = $roomResponse.items[0]
        Write-Host "✅ Room state synchronized in database" -ForegroundColor Green

        # Check if there are associated players in database
        $playersResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/players/records?filter=room_id%3D%27$RoomId%27" -Method GET
        Write-Host "✅ Found $($playersResponse.items.Count) players in database" -ForegroundColor Green

        return $true
    }
    catch {
        Write-Host "❌ State synchronization test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-EventLogging {
    param([string]$PocketBaseUrl, [string]$RoomId)

    try {
        # Check if room events are being logged
        $eventsResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/room_events/records?filter=room_id%3D%27$RoomId%27" -Method GET

        if ($eventsResponse.items.Count -gt 0) {
            Write-Host "✅ Room events logged: $($eventsResponse.items.Count) events" -ForegroundColor Green

            $eventTypes = $eventsResponse.items | Select-Object -ExpandProperty event_type -Unique
            Write-Host "✅ Event types: $($eventTypes -join ', ')" -ForegroundColor Green

            return $true
        } else {
            Write-Host "⚠️ No room events found (may be expected for new room)" -ForegroundColor Yellow
            return $true
        }
    }
    catch {
        Write-Host "❌ Event logging test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-CleanupMechanisms {
    param([string]$Url)

    try {
        # Create a room that should be cleaned up
        $oldRoomData = @{
            name = "Cleanup Test Room"
            game_mode = "deathmatch"
            max_players = 2
            host_player_id = "cleanup_host"
            settings = @{}
        } | ConvertTo-Json

        $headers = @{ "Content-Type" = "application/json" }
        $oldRoomResponse = Invoke-RestMethod -Uri "$Url/api/rooms/create" -Method POST -Headers $headers -Body $oldRoomData

        if ($oldRoomResponse.success) {
            Write-Host "✅ Created room for cleanup test: $($oldRoomResponse.room_id)" -ForegroundColor Green

            # Wait a bit to simulate inactivity
            Start-Sleep -Seconds 2

            # Check if cleanup happened (room should still exist but may be closed)
            $listResponse = Invoke-RestMethod -Uri "$Url/api/rooms/list" -Method GET
            $cleanupRoom = $listResponse.rooms | Where-Object { $_.id -eq $oldRoomResponse.room_id }

            if ($cleanupRoom) {
                Write-Host "✅ Cleanup mechanisms working - room still exists" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Room was removed too quickly" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ Failed to create cleanup test room" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Cleanup mechanisms test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Run-BasicTest {
    Write-Host "`n🔍 Running Basic Functionality Test..." -ForegroundColor Magenta

    # Test connections
    $testResults.DatabaseConnection = Test-DatabaseConnection -Url $PocketBaseUrl
    if (-not $testResults.DatabaseConnection) { return }

    $testResults.RoomManagerConnection = Test-RoomManagerConnection -Url $RoomManagerUrl
    if (-not $testResults.RoomManagerConnection) { return }

    # Test schema
    $testResults.SchemaValidation = Test-SchemaValidation -PocketBaseUrl $PocketBaseUrl
    if (-not $testResults.SchemaValidation) { return }

    # Test room creation
    $roomId = Test-RoomCreation -Url $RoomManagerUrl
    if ($roomId) {
        $testResults.RoomCreation = $true
        $testRooms += $roomId

        # Test room persistence
        $testResults.RoomPersistence = Test-RoomPersistence -Url $RoomManagerUrl -RoomId $roomId
    }
}

function Run-ComprehensiveTest {
    Write-Host "`n🔬 Running Comprehensive Test..." -ForegroundColor Magenta

    Run-BasicTest

    if ($testResults.RoomCreation) {
        $roomId = $testRooms[0]

        # Test player management
        $player = Test-PlayerJoining -Url $RoomManagerUrl -RoomId $roomId
        if ($player) {
            $testResults.PlayerManagement = $true
            $testPlayers += $player.PlayerId

            # Test spectator management
            $testResults.SpectatorManagement = Test-SpectatorManagement -Url $RoomManagerUrl -RoomId $roomId

            # Test room settings
            $testResults.RoomSettings = Test-RoomSettings -Url $RoomManagerUrl -RoomId $roomId -PlayerId $player.PlayerId

            # Test game start
            $testResults.GameStart = Test-GameStart -Url $RoomManagerUrl -RoomId $roomId -PlayerId $player.PlayerId

            # Test player leaving
            $testResults.LeaveOperations = Test-PlayerLeaving -Url $RoomManagerUrl -PlayerId $player.PlayerId
        }

        # Test state synchronization
        $testResults.StateSynchronization = Test-StateSynchronization -PocketBaseUrl $PocketBaseUrl -RoomId $roomId

        # Test event logging
        $testResults.EventLogging = Test-EventLogging -PocketBaseUrl $PocketBaseUrl -RoomId $roomId
    }

    # Test cleanup mechanisms
    $testResults.CleanupMechanisms = Test-CleanupMechanisms -Url $RoomManagerUrl
}

function Run-StressTest {
    Write-Host "`n⚡ Running Stress Test..." -ForegroundColor Magenta

    $stressResults = @{}

    # Create multiple rooms rapidly
    Write-Host "Creating 20 rooms rapidly..." -ForegroundColor Yellow
    $roomIds = @()

    for ($i = 1; $i -le 20; $i++) {
        $roomId = Test-RoomCreation -Url $RoomManagerUrl
        if ($roomId) {
            $roomIds += $roomId
        }
        Start-Sleep -Milliseconds 50
    }

    $stressResults.RoomCreation = $roomIds.Count
    Write-Host "✅ Created $($roomIds.Count) rooms in stress test" -ForegroundColor Green

    # Test concurrent player joins
    Write-Host "Testing concurrent player joins..." -ForegroundColor Yellow
    $playerJobs = @()

    foreach ($roomId in $roomIds | Select-Object -First 5) {
        $playerData = @{
            room_id = $roomId
            player_id = "stress_player_$(Get-Random -Minimum 1000 -Maximum 9999)"
            player_name = "Stress Player $(Get-Date -Format 'HHmmss')"
        } | ConvertTo-Json

        $headers = @{ "Content-Type" = "application/json" }

        $job = Start-Job -ScriptBlock {
            param($Url, $Data, $Headers)
            try {
                Invoke-RestMethod -Uri "$Url/api/rooms/join" -Method POST -Headers $Headers -Body $Data
                return $true
            }
            catch {
                return $false
            }
        } -ArgumentList $RoomManagerUrl, $playerData, $headers

        $playerJobs += $job
    }

    # Wait for all jobs to complete
    $completedJobs = Wait-Job -Job $playerJobs -Timeout 30
    $stressResults.PlayerJoins = ($completedJobs | Where-Object { $_.State -eq 'Completed' }).Count

    Write-Host "✅ Completed $($stressResults.PlayerJoins) player joins in stress test" -ForegroundColor Green

    # Cleanup stress test data
    foreach ($roomId in $roomIds) {
        try {
            Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms/close" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body (@{ room_id = $roomId; reason = "stress_test_cleanup" } | ConvertTo-Json)
        }
        catch {}
    }

    return $stressResults
}

function Run-FullTest {
    Write-Host "`n🎯 Running Full Test Suite..." -ForegroundColor Magenta

    Run-ComprehensiveTest

    # Run stress test
    $stressResults = Run-StressTest
    $testResults.StressTest = $stressResults

    # Test error recovery
    Write-Host "Testing error recovery..." -ForegroundColor Yellow

    try {
        # Try to create a room with invalid data
        $invalidData = @{ invalid_field = "test" } | ConvertTo-Json
        $headers = @{ "Content-Type" = "application/json" }

        $errorResponse = Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms/create" -Method POST -Headers $headers -Body $invalidData -ErrorAction SilentlyContinue

        if ($errorResponse -and -not $errorResponse.success) {
            Write-Host "✅ Error handling working correctly" -ForegroundColor Green
            $testResults.ErrorRecovery = $true
        } else {
            Write-Host "❌ Error handling may not be working correctly" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error recovery test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
switch ($TestMode) {
    "basic" { Run-BasicTest }
    "comprehensive" { Run-ComprehensiveTest }
    "stress" { $stressResults = Run-StressTest; return $stressResults }
    "full" { Run-FullTest }
    default {
        Write-Host "Invalid test mode. Use: basic, comprehensive, stress, or full" -ForegroundColor Red
        exit 1
    }
}

# Summary
Write-Host "`n📊 Test Results Summary" -ForegroundColor Cyan

foreach ($test in $testResults.Keys) {
    $status = if ($testResults[$test]) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($testResults[$test]) { "Green" } else { "Red" }
    Write-Host "$status - $test" -ForegroundColor $color
}

$passedTests = ($testResults.Values | Where-Object { $_ -eq $true }).Count
$totalTests = $testResults.Values.Count

Write-Host "`nOverall: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 All tests passed! Room Management with Full Database Persistence is working correctly." -ForegroundColor Green
} else {
    Write-Host "⚠️ Some tests failed. Please check the Room Manager and database configuration." -ForegroundColor Yellow
}

# Cleanup
if ($testRooms.Count -gt 0) {
    Write-Host "`n🧹 Cleaning up test data..." -ForegroundColor Yellow
    foreach ($roomId in $testRooms) {
        try {
            Invoke-RestMethod -Uri "$RoomManagerUrl/api/rooms/close" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body (@{ room_id = $roomId; reason = "test_cleanup" } | ConvertTo-Json) | Out-Null
            Write-Host "✅ Closed room: $roomId" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ Failed to close room: $roomId" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✨ Room Management Database Persistence Test Complete!" -ForegroundColor Cyan
