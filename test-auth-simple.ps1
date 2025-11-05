# Simple test for PocketBase authentication
Write-Host "=== Testing PocketBase Authentication ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "1. Testing PocketBase health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET
    Write-Host "   ✓ PocketBase is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ PocketBase not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Try to list collections (should fail without auth)
Write-Host "2. Testing collections access without auth..." -ForegroundColor Yellow
try {
    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET
    Write-Host "   ⚠️  Collections accessible without auth (unexpected)" -ForegroundColor Yellow
} catch {
    Write-Host "   ✓ Collections require authentication (expected)" -ForegroundColor Green
}

# Test 3: Authenticate as admin
Write-Host "3. Testing admin authentication..." -ForegroundColor Yellow
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    Write-Host "   ✓ Admin authentication successful" -ForegroundColor Green
    $token = $authResponse.token
} catch {
    Write-Host "   ✗ Admin authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Access collections with token
Write-Host "4. Testing collections access with auth..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers
    Write-Host "   ✓ Collections access with auth successful" -ForegroundColor Green
    Write-Host "   Found $($collections.Count) collections:" -ForegroundColor Cyan
    foreach ($collection in $collections) {
        Write-Host "     - $($collection.name) ($($collection.type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Collections access with auth failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All authentication tests passed!" -ForegroundColor Green

