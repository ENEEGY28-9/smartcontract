# DEBUG VA KIEM TRA ADMIN LOGIN
# De tim nguyen nhan loi 404 khi dang nhap

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DEBUG ADMIN LOGIN POCKETBASE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$pbUrl = "http://localhost:8090"
$adminEmail = "admin2@pocketbase.local"
$adminPassword = "admin123456"

Write-Host "Thong tin dang nhap:" -ForegroundColor Yellow
Write-Host "  URL: $pbUrl" -ForegroundColor White
Write-Host "  Email: $adminEmail" -ForegroundColor White
Write-Host "  Password: $adminPassword" -ForegroundColor White
Write-Host ""

# Buoc 1: Kiem tra ket noi co ban
Write-Host "Buoc 1: Kiem tra ket noi co ban..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$pbUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "  - Ket noi thanh cong" -ForegroundColor Green
} catch {
    Write-Host "  - Loi ket noi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Buoc 2: Thu truy cap API khong can xac thuc
Write-Host "Buoc 2: Thu truy cap API khong can xac thuc..." -ForegroundColor Yellow
try {
    # Thu lay danh sach collections (neu co quyen)
    $collections = Invoke-RestMethod -Uri "$pbUrl/api/collections" -Method GET -TimeoutSec 5
    Write-Host "  - Co $($collections.Count) collections" -ForegroundColor Green
    $collections | ForEach-Object { Write-Host "    - $($_.name)" -ForegroundColor White }
} catch {
    Write-Host "  - Khong the truy cap collections: $($_.Exception.Message)" -ForegroundColor Red
}

# Buoc 3: Thu tao admin user moi
Write-Host ""
Write-Host "Buoc 3: Thu tao admin user moi..." -ForegroundColor Yellow
$adminData = @{
    email = $adminEmail
    password = $adminPassword
    passwordConfirm = $adminPassword
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$pbUrl/api/admins" -Method POST -Body $adminData -ContentType "application/json"
    Write-Host "  - Tao admin thanh cong!" -ForegroundColor Green
    Write-Host "  - Admin ID: $($result.id)" -ForegroundColor White
} catch {
    Write-Host "  - Loi tao admin: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "  - Admin da ton tai, thu dang nhap..." -ForegroundColor Yellow
    }
}

# Buoc 4: Thu dang nhap lai
Write-Host ""
Write-Host "Buoc 4: Thu dang nhap lai..." -ForegroundColor Yellow
$authBody = @{
    identity = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$pbUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "  - Dang nhap thanh cong!" -ForegroundColor Green
    Write-Host "  - Token: $($token.Substring(0, 20))..." -ForegroundColor White

    # Thu tao collection de test
    Write-Host ""
    Write-Host "Buoc 5: Thu tao collection rooms..." -ForegroundColor Yellow

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
    Write-Host "  - Tao collection thanh cong!" -ForegroundColor Green
    Write-Host "  - Collection: $($response.name)" -ForegroundColor White

} catch {
    Write-Host "  - Loi dang nhap: $($_.Exception.Message)" -ForegroundColor Red

    Write-Host ""
    Write-Host "HUONG DAN KHAC PHUC:" -ForegroundColor Red
    Write-Host "1. Truy cap: http://localhost:8090/_/" -ForegroundColor White
    Write-Host "2. Tao admin user dau tien trong giao dien web" -ForegroundColor White
    Write-Host "3. Sau do chay lai script nay" -ForegroundColor White
    Write-Host ""
    Write-Host "HOAC thu chay:" -ForegroundColor Green
    Write-Host ".\create-rooms-collection-final.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
