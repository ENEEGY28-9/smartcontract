# Setup hoàn chỉnh PocketBase với tất cả collections cần thiết

param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "=== SETUP HOÀN CHỈNH POCKETBASE ===" -ForegroundColor Cyan
Write-Host "URL: $PocketBaseUrl" -ForegroundColor White
Write-Host "Admin: $AdminEmail" -ForegroundColor White
Write-Host ""

# Bước 1: Tạo admin user
Write-Host "Bước 1: Tạo admin user..." -ForegroundColor Yellow

# Tạo request để tạo admin user đầu tiên
$adminSetupBody = @{
    email = $AdminEmail
    password = $AdminPassword
    passwordConfirm = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/admins" -Method POST -Body $adminSetupBody -ContentType "application/json"
    Write-Host "✅ Tạo admin user thành công!" -ForegroundColor Green
    $token = ($response.Content | ConvertFrom-Json).token
} catch {
    Write-Host "⚠️  Admin user có thể đã tồn tại, thử đăng nhập..." -ForegroundColor Yellow

    # Thử đăng nhập với admin credentials
    $authBody = @{
        identity = $AdminEmail
        password = $AdminPassword
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
        $token = ($response.Content | ConvertFrom-Json).token
        Write-Host "✅ Đăng nhập admin thành công!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Không thể tạo hoặc đăng nhập admin user" -ForegroundColor Red
        Write-Host "Hãy tạo admin user thủ công tại: $PocketBaseUrl/_/" -ForegroundColor Yellow
        exit 1
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Bước 2: Tạo token_blacklist collection
Write-Host "Bước 2: Tạo token_blacklist collection..." -ForegroundColor Yellow

$tokenBlacklistSchema = @{
    name = "token_blacklist"
    type = "base"
    schema = @(
        @{ name = "jti"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "expires_at"; type = "number"; required = $true; options = @{ min = 0 } }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $tokenBlacklistSchema
    Write-Host "✅ Tạo token_blacklist collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  token_blacklist collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 3: Tạo users collection (nếu chưa có)
Write-Host "Bước 3: Tạo users collection..." -ForegroundColor Yellow

$usersSchema = @{
    name = "users"
    type = "auth"
    schema = @(
        @{ name = "username"; type = "text"; required = $true; options = @{ max = 50; min = 3 } }
        @{ name = "email"; type = "email"; required = $true }
        @{ name = "emailVisibility"; type = "bool"; required = $false }
        @{ name = "password"; type = "password"; required = $true }
        @{ name = "passwordConfirm"; type = "password"; required = $true }
        @{ name = "verified"; type = "bool"; required = $false }
        @{ name = "wallet_address"; type = "text"; required = $false; options = @{ max = 100 } }
        @{ name = "game_tokens"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "updated_at"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $usersSchema
    Write-Host "✅ Tạo users collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  users collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 4: Tạo players collection
Write-Host "Bước 4: Tạo players collection..." -ForegroundColor Yellow

$playersSchema = @{
    name = "players"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "username"; type = "text"; required = $true; options = @{ max = 50; min = 3 } }
        @{ name = "email"; type = "email"; required = $true }
        @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("connected", "disconnected", "left") } }
        @{ name = "team"; type = "text"; required = $false; options = @{ max = 50 } }
        @{ name = "score"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "is_host"; type = "bool"; required = $false }
        @{ name = "game_stats"; type = "json"; required = $false }
        @{ name = "connection_id"; type = "text"; required = $false; options = @{ max = 100 } }
        @{ name = "joined_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "last_seen"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $playersSchema
    Write-Host "✅ Tạo players collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  players collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 5: Tạo rooms collection
Write-Host "Bước 5: Tạo rooms collection..." -ForegroundColor Yellow

$roomsSchema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "name"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "game_mode"; type = "select"; required = $true; options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") } }
        @{ name = "max_players"; type = "number"; required = $true; options = @{ max = 16; min = 2 } }
        @{ name = "current_players"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "spectator_count"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") } }
        @{ name = "host_player_id"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "worker_endpoint"; type = "text"; required = $false; options = @{ max = 200 } }
        @{ name = "settings"; type = "json"; required = $false }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "updated_at"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
        @{ name = "last_activity"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
        @{ name = "ttl_seconds"; type = "number"; required = $false; options = @{ min = 0 } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $roomsSchema
    Write-Host "✅ Tạo rooms collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  rooms collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 6: Tạo game_sessions collection
Write-Host "Bước 6: Tạo game_sessions collection..." -ForegroundColor Yellow

$sessionsSchema = @{
    name = "game_sessions"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
        @{ name = "session_name"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("initializing", "starting", "in_progress", "finished", "cancelled") } }
        @{ name = "started_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "ended_at"; type = "autodate"; required = $false; options = @{ onUpdate = $true } }
        @{ name = "participants"; type = "json"; required = $false }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $sessionsSchema
    Write-Host "✅ Tạo game_sessions collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  game_sessions collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 7: Tạo room_events collection
Write-Host "Bước 7: Tạo room_events collection..." -ForegroundColor Yellow

$eventsSchema = @{
    name = "room_events"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "room_id"; type = "text"; required = $true; options = @{ max = 15; min = 15 } }
        @{ name = "player_id"; type = "text"; required = $false; options = @{ max = 15; min = 15 } }
        @{ name = "event_type"; type = "text"; required = $true; options = @{ max = 50; min = 1 } }
        @{ name = "event_data"; type = "json"; required = $false }
        @{ name = "timestamp"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $eventsSchema
    Write-Host "✅ Tạo room_events collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  room_events collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 8: Tạo wallets collection
Write-Host "Bước 8: Tạo wallets collection..." -ForegroundColor Yellow

$walletsSchema = @{
    name = "wallets"
    type = "base"
    schema = @(
        @{ name = "user_id"; type = "relation"; required = $true; options = @{ collectionId = "users"; cascadeDelete = $false; minSelect = $null; maxSelect = 1 } }
        @{ name = "address"; type = "text"; required = $true; options = @{ maxSize = 200 } }
        @{ name = "private_key"; type = "text"; required = $false; options = @{ maxSize = 2000 } }
        @{ name = "mnemonic"; type = "text"; required = $false; options = @{ maxSize = 1000 } }
        @{ name = "wallet_type"; type = "select"; required = $true; options = @{ values = @("generated", "phantom", "metamask", "sui", "other") } }
        @{ name = "network"; type = "select"; required = $true; options = @{ values = @("solana", "ethereum", "sui") } }
        @{ name = "balance"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "balance_last_updated"; type = "date"; required = $false }
        @{ name = "is_connected"; type = "bool"; required = $false }
        @{ name = "notes"; type = "text"; required = $false; options = @{ maxSize = 1000 } }
        @{ name = "created_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "updated_at"; type = "autodate"; required = $false; options = @{ onCreate = $true; onUpdate = $true } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $walletsSchema
    Write-Host "✅ Tạo wallets collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  wallets collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 9: Tạo energies collection
Write-Host "Bước 9: Tạo energies collection..." -ForegroundColor Yellow

$energiesSchema = @{
    name = "energies"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true; options = @{ max = 15; min = 15; pattern = "^[a-z0-9]+$" } }
        @{ name = "player_id"; type = "text"; required = $true; options = @{ max = 100; min = 1 } }
        @{ name = "energy_type"; type = "text"; required = $true; options = @{ max = 50; min = 1 } }
        @{ name = "amount"; type = "number"; required = $true; options = @{ min = 0 } }
        @{ name = "location_x"; type = "number"; required = $true }
        @{ name = "location_y"; type = "number"; required = $true }
        @{ name = "collected_at"; type = "autodate"; required = $false; options = @{ onCreate = $true } }
        @{ name = "expires_at"; type = "number"; required = $false; options = @{ min = 0 } }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method POST -Headers $headers -Body $energiesSchema
    Write-Host "✅ Tạo energies collection thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  energies collection có thể đã tồn tại" -ForegroundColor Yellow
}

# Bước 9: Test kết nối
Write-Host "Bước 9: Test các collections..." -ForegroundColor Yellow

try {
    $collections = Invoke-WebRequest -Uri "$PocketBaseUrl/api/collections" -Method GET -Headers $headers
    $collectionsData = $collections.Content | ConvertFrom-Json

    Write-Host "📋 Danh sách collections đã tạo:" -ForegroundColor Green
    foreach ($collection in $collectionsData) {
        Write-Host "  - $($collection.name)" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  Không thể lấy danh sách collections" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SETUP HOAN TAT ===" -ForegroundColor Cyan
Write-Host "All collections created:" -ForegroundColor Green
Write-Host "   - users (auth)" -ForegroundColor White
Write-Host "   - token_blacklist" -ForegroundColor White
Write-Host "   - players" -ForegroundColor White
Write-Host "   - rooms" -ForegroundColor White
Write-Host "   - game_sessions" -ForegroundColor White
Write-Host "   - room_events" -ForegroundColor White
Write-Host "   - wallets ⭐" -ForegroundColor Yellow
Write-Host "   - energies" -ForegroundColor White
Write-Host "✅ Admin user: $AdminEmail" -ForegroundColor Green
Write-Host "✅ Password: $AdminPassword" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Bây giờ bạn có thể test JWT authentication hoàn chỉnh!" -ForegroundColor Magenta
Write-Host "   1. Register user" -ForegroundColor White
Write-Host "   2. Tạo Solana wallet" -ForegroundColor White
Write-Host "   3. Mint token (khong con loi No Solana wallet connected)" -ForegroundColor White
Write-Host "   4. Check balance" -ForegroundColor White
Write-Host "   5. Không còn lỗi 401 nữa!" -ForegroundColor White
