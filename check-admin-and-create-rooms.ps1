Write-Host "KIEM TRA ADMIN VA TAO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Kiem tra ket noi PocketBase
Write-Host "Buoc 1: Kiem tra ket noi PocketBase..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET -TimeoutSec 5
    Write-Host "PocketBase dang chay tot" -ForegroundColor Green
} catch {
    Write-Host "Khong the ket noi den PocketBase" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Buoc 2: Thu dang nhap admin..." -ForegroundColor Yellow
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "Dang nhap admin thanh cong!" -ForegroundColor Green
} catch {
    Write-Host "Dang nhap admin that bai!" -ForegroundColor Red
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "HUONG DAN:" -ForegroundColor Yellow
    Write-Host "1. Truy cap: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "2. Tao admin user dau tien" -ForegroundColor White
    Write-Host "3. Sau do chay lai script nay" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Buoc 3: Tao collection rooms..." -ForegroundColor Yellow
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
    Write-Host "So truong: $($response.schema.Count)" -ForegroundColor White
} catch {
    Write-Host "Tao collection that bai!" -ForegroundColor Red
    Write-Host "Loi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Buoc 4: Hien thi collections hien co..." -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers
    Write-Host "So collections: $($collections.Count)" -ForegroundColor Green
    foreach ($collection in $collections) {
        Write-Host "- $($collection.name) ($($collection.type))" -ForegroundColor White
    }
} catch {
    Write-Host "Khong the lay danh sach collections" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "HOAN THANH!" -ForegroundColor Green
Write-Host ""
Write-Host "Collection rooms da duoc tao thanh cong!" -ForegroundColor Green
Write-Host "Ban co the truy cap: http://localhost:8090/_/" -ForegroundColor White
Write-Host "De xem collection trong giao dien admin" -ForegroundColor White
