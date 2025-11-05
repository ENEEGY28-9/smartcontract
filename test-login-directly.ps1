# TEST DANG NHAP TRUC TIEP

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST DANG NHAP TRUC TIEP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$pbUrl = "http://localhost:8090"
$adminEmail = "admin2@pocketbase.local"
$adminPassword = "admin123456"

Write-Host "THU DANG NHAP VOI THONG TIN:" -ForegroundColor Yellow
Write-Host "  Email: $adminEmail" -ForegroundColor White
Write-Host "  Password: $adminPassword" -ForegroundColor White
Write-Host ""

# Thu dang nhap
$authBody = @{
    identity = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$pbUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "DANG NHAP THANH CONG!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor White

    # Thu tao collection rooms
    Write-Host ""
    Write-Host "TAO COLLECTION ROOMS..." -ForegroundColor Yellow

    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $roomsSchema = @{
        name = "rooms"
        type = "base"
        schema = @(
            @{ name = "id"; type = "text"; required = $true }
            @{ name = "name"; type = "text"; required = $true }
            @{ name = "game_mode"; type = "select"; required = $true; options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") } }
            @{ name = "max_players"; type = "number"; required = $true; options = @{ min = 2; max = 8 } }
            @{ name = "current_players"; type = "number"; required = $false; options = @{ min = 0 } }
            @{ name = "status"; type = "select"; required = $true; options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") } }
            @{ name = "host_player_id"; type = "text"; required = $true }
            @{ name = "created_at"; type = "date"; required = $true }
            @{ name = "updated_at"; type = "date"; required = $true }
            @{ name = "settings"; type = "json"; required = $false }
        )
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "TAO COLLECTION THANH CONG!" -ForegroundColor Green
    Write-Host "Ten: $($response.name)" -ForegroundColor White
    Write-Host "So truong: $($response.schema.Count)" -ForegroundColor White

} catch {
    Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Message -like "*401*") {
        Write-Host ""
        Write-Host "CO THE SAI MAT KHAU!" -ForegroundColor Red
        Write-Host "Kiem tra lai mat khau trong PocketBase" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
