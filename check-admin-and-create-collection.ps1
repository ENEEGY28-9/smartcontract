# KIEM TRA ADMIN USER VA TAO COLLECTION ROOMS

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "KIEM TRA ADMIN VA TAO COLLECTION" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$pbUrl = "http://localhost:8090"
$adminEmail = "admin2@pocketbase.local"
$adminPassword = "admin123456"

Write-Host "DANG KIEM TRA TRANG THAI..." -ForegroundColor Yellow
Write-Host ""

# Buoc 1: Kiem tra ket noi PocketBase
Write-Host "Buoc 1: Kiem tra ket noi..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$pbUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "  - Ket noi thanh cong" -ForegroundColor Green
} catch {
    Write-Host "  - Loi ket noi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Buoc 2: Thu dang nhap admin
Write-Host "Buoc 2: Thu dang nhap admin..." -ForegroundColor Yellow
$authBody = @{
    identity = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$pbUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "  - Dang nhap thanh cong!" -ForegroundColor Green
    Write-Host "  - Token: $($token.Substring(0, 20))..." -ForegroundColor White
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "  - Loi dang nhap: $errorMsg" -ForegroundColor Red

    if ($errorMsg -like "*404*") {
        Write-Host ""
        Write-Host "NGUYEN NHAN: Chua tao admin user trong PocketBase" -ForegroundColor Red
        Write-Host "HAY LAM THEO CAC BUOC:" -ForegroundColor Yellow
        Write-Host "1. Tim muc 'Admins' o sidebar ben trai" -ForegroundColor White
        Write-Host "2. Tao admin user voi thong tin tren" -ForegroundColor White
        Write-Host "3. Dang nhap lai bang tai khoan do" -ForegroundColor White
        Write-Host "4. Chay lai script nay" -ForegroundColor White
    }
    exit 1
}

# Buoc 3: Tao collection rooms
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
        @{
            name = "id"
            type = "text"
            required = $true
            options = @{ max = 50; min = 1 }
        }
        @{
            name = "name"
            type = "text"
            required = $true
            options = @{ max = 100; min = 1 }
        }
        @{
            name = "game_mode"
            type = "select"
            required = $true
            options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") }
        }
        @{
            name = "max_players"
            type = "number"
            required = $true
            options = @{ min = 2; max = 8 }
        }
        @{
            name = "current_players"
            type = "number"
            required = $false
            options = @{ min = 0 }
        }
        @{
            name = "status"
            type = "select"
            required = $true
            options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") }
        }
        @{
            name = "host_player_id"
            type = "text"
            required = $true
            options = @{ max = 100; min = 1 }
        }
        @{
            name = "created_at"
            type = "date"
            required = $true
        }
        @{
            name = "updated_at"
            type = "date"
            required = $true
        }
        @{
            name = "settings"
            type = "json"
            required = $false
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "  - Tao collection thanh cong!" -ForegroundColor Green
    Write-Host ""
    Write-Host "THONG TIN COLLECTION:" -ForegroundColor Cyan
    Write-Host "  Ten: $($response.name)" -ForegroundColor White
    Write-Host "  Loai: $($response.type)" -ForegroundColor White
    Write-Host "  So truong: $($response.schema.Count)" -ForegroundColor White
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "  - Loi tao collection: $errorMsg" -ForegroundColor Red

    if ($errorMsg -like "*already exists*") {
        Write-Host "  - Collection da ton tai!" -ForegroundColor Yellow
    }
}

# Buoc 4: Hien thi collections hien co
Write-Host ""
Write-Host "Buoc 4: Hien thi collections hien co..." -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method GET -Headers $headers
    Write-Host "  - Tim thay $($collections.Count) collections:" -ForegroundColor Green
    foreach ($collection in $collections) {
        Write-Host "    - $($collection.name) ($($collection.type))" -ForegroundColor White
    }
} catch {
    Write-Host "  - Loi lay danh sach collections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "HOAN THANH!" -ForegroundColor Green
Write-Host ""
Write-Host "Admin da dang nhap va Collection da duoc tao/kiem tra!" -ForegroundColor Green
Write-Host "Truy cap http://localhost:8090/_/ de xem ket qua" -ForegroundColor White
