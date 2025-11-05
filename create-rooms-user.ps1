# Try creating rooms collection with user credentials
$pbUrl = 'http://localhost:8090'
$email = 'admin@example.com'  # Using admin email but as user
$pass = 'admin123456'

Write-Host '🔄 Logging in as user...'
try {
    $loginBody = @{
        identity = $email
        password = $pass
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$pbUrl/api/collections/users/auth-with-password" -Method Post -ContentType 'application/json' -Body $loginBody
    $userToken = $loginResponse.token

    Write-Host '✅ User login successful, got token'

    # Create collection with user token (might not work but let's try)
    $schema = @(
        @{
            name = 'name'
            type = 'text'
            required = $true
        },
        @{
            name = 'game_mode'
            type = 'select'
            required = $true
            options = @{
                values = @('deathmatch', 'team_deathmatch', 'capture_the_flag', 'king_of_the_hill')
            }
        },
        @{
            name = 'max_players'
            type = 'number'
            required = $true
        },
        @{
            name = 'player_count'
            type = 'number'
            required = $true
        },
        @{
            name = 'spectator_count'
            type = 'number'
            required = $true
        },
        @{
            name = 'status'
            type = 'select'
            required = $true
            options = @{
                values = @('waiting', 'starting', 'in_progress', 'finished', 'closed')
            }
        },
        @{
            name = 'host_player_id'
            type = 'text'
            required = $true
        },
        @{
            name = 'created_at'
            type = 'date'
            required = $true
        },
        @{
            name = 'updated_at'
            type = 'date'
            required = $true
        },
        @{
            name = 'last_activity'
            type = 'date'
            required = $true
        },
        @{
            name = 'settings'
            type = 'json'
        },
        @{
            name = 'ttl_seconds'
            type = 'number'
        }
    )

    $collectionBody = @{
        name = 'rooms'
        type = 'base'
        schema = $schema
    } | ConvertTo-Json -Depth 10

    Write-Host '🔄 Trying to create rooms collection with user token...'
    $createResponse = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method Post -Headers @{ Authorization = "Bearer $userToken" } -ContentType 'application/json' -Body $collectionBody

    Write-Host '✅ Rooms collection created successfully!'
    Write-Host ('Collection ID: ' + $createResponse.id)

} catch {
    Write-Host ('❌ Error: ' + $_.Exception.Message)
    if ($_.Exception.Response) {
        Write-Host ('Status: ' + $_.Exception.Response.StatusCode)
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader $stream
        $content = $reader.ReadToEnd()
        Write-Host ('Response: ' + $content)
    }
}

