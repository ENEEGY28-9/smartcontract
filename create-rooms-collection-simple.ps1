# Tự động tạo Collection Rooms trong PocketBase
# Script đơn giản để tạo collection "rooms" với các trường cơ bản

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== Tự động tạo Collection Rooms trong PocketBase ===" -ForegroundColor Cyan
Write-Host "Bước 1: Kiểm tra kết nối PocketBase..." -ForegroundColor Yellow

# Test connection
try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "✓ Kết nối PocketBase thành công" -ForegroundColor Green
} catch {
    Write-Host "✗ Không thể kết nối đến PocketBase: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Hãy đảm bảo PocketBase đang chạy tại $PocketBaseUrl" -ForegroundColor Yellow
    exit 1
}

Write-Host "Bước 2: Đăng nhập admin..." -ForegroundColor Yellow

# Authenticate as admin
$authBody = @{
    identity = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    $token = $response.token
    Write-Host "✓ Đăng nhập admin thành công" -ForegroundColor Green
} catch {
    Write-Host "✗ Đăng nhập admin thất bại: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Kiểm tra lại thông tin đăng nhập:" -ForegroundColor Yellow
    Write-Host "  Email: $AdminEmail" -ForegroundColor Yellow
    Write-Host "  Password: $AdminPassword" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Bước 3: Tạo collection rooms..." -ForegroundColor Yellow

# Tạo schema cho collection rooms
$roomsSchema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{
            name = "id"
            type = "text"
            required = $true
            options = @{
                max = 50
                min = 1
            }
        }
        @{
            name = "name"
            type = "text"
            required = $true
            options = @{
                max = 100
                min = 1
            }
        }
        @{
            name = "game_mode"
            type = "select"
            required = $true
            options = @{
                values = @("deathmatch", "team_deathmatch", "capture_the_flag")
            }
        }
        @{
            name = "max_players"
            type = "number"
            required = $true
            options = @{
                min = 2
                max = 8
            }
        }
        @{
            name = "current_players"
            type = "number"
            required = $false
            options = @{
                min = 0
            }
        }
        @{
            name = "status"
            type = "select"
            required = $true
            options = @{
                values = @("waiting", "starting", "in_progress", "finished", "closed")
            }
        }
        @{
            name = "host_player_id"
            type = "text"
            required = $true
            options = @{
                max = 100
                min = 1
            }
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
    $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "✓ Tạo collection rooms thành công!" -ForegroundColor Green
    Write-Host "" -ForegroundColor Cyan
    Write-Host "=== Thông tin Collection đã tạo ===" -ForegroundColor Cyan
    Write-Host "Tên: $($response.name)" -ForegroundColor White
    Write-Host "Loại: $($response.type)" -ForegroundColor White
    Write-Host "Số trường: $($response.schema.Count)" -ForegroundColor White
    Write-Host "" -ForegroundColor Cyan
    Write-Host "Các trường đã tạo:" -ForegroundColor Yellow
    foreach ($field in $response.schema) {
        $required = if ($field.required) { "BẮT BUỘC" } else { "TÙY CHỌN" }
        Write-Host "  - $($field.name) ($($field.type)) - $required" -ForegroundColor White
    }
} catch {
    Write-Host "✗ Tạo collection thất bại: $($_.Exception.Message)" -ForegroundColor Red

    # Nếu collection đã tồn tại, thử cập nhật
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "Collection đã tồn tại, thử cập nhật schema..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms" -Method GET -Headers $headers
            $updateResponse = Invoke-RestMethod -Uri "$PocketBaseUrl/api/collections/rooms" -Method PATCH -Headers $headers -Body $roomsSchema
            Write-Host "✓ Cập nhật collection rooms thành công!" -ForegroundColor Green
        } catch {
            Write-Host "✗ Cập nhật collection thất bại: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "" -ForegroundColor Cyan
Write-Host "=== Hoàn thành! ===" -ForegroundColor Cyan
Write-Host "Bạn có thể kiểm tra collection trong PocketBase Admin UI tại:" -ForegroundColor White
Write-Host "http://localhost:8090/_/" -ForegroundColor Green
Write-Host "" -ForegroundColor Cyan
Write-Host "Thông tin đăng nhập admin:" -ForegroundColor Yellow
Write-Host "Email: $AdminEmail" -ForegroundColor White
Write-Host "Password: $AdminPassword" -ForegroundColor White
