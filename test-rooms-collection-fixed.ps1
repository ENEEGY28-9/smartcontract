# Script kiem tra don gian chuc nang tao collection rooms

Write-Host "KIEM TRA CHUC NANG TAO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiem tra ket noi PocketBase
Write-Host "Buoc 1: Kiem tra ket noi PocketBase..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 5
    Write-Host "PocketBase dang chay" -ForegroundColor Green
} catch {
    Write-Host "Khong the ket noi den PocketBase" -ForegroundColor Red
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Huong dan:" -ForegroundColor Yellow
    Write-Host "1. Chay PocketBase: .\pocketbase.exe serve" -ForegroundColor White
    Write-Host "2. Kiem tra cong 8090" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Buoc 2: Thong tin dang nhap admin" -ForegroundColor Yellow
Write-Host "Email: admin2@pocketbase.local" -ForegroundColor White
Write-Host "Password: admin123456" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Tiep tuc voi thong tin nay? (y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "Cap nhat thong tin trong script truoc khi chay" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Buoc 3: Dang nhap admin..." -ForegroundColor Yellow
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "Dang nhap thanh cong" -ForegroundColor Green
} catch {
    Write-Host "Dang nhap that bai" -ForegroundColor Red
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Co the can tao admin user truoc" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Buoc 4: Tao collection rooms..." -ForegroundColor Yellow
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

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "Tao collection rooms thanh cong!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Collection: $($response.name)" -ForegroundColor White
    Write-Host "Truong: $($response.schema.Count)" -ForegroundColor White
} catch {
    Write-Host "Tao collection that bai" -ForegroundColor Red
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hoan thanh!" -ForegroundColor Green
