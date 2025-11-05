Write-Host "Testing PocketBase Authentication..." -ForegroundColor Cyan

# Test connection
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET
    Write-Host "✓ PocketBase is running" -ForegroundColor Green
} catch {
    Write-Host "✗ PocketBase not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test authentication
$authBody = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $authBody -ContentType "application/json"
    Write-Host "✓ Admin authentication successful" -ForegroundColor Green
    $token = $authResponse.token
    Write-Host "Token: $token" -ForegroundColor Gray
} catch {
    Write-Host "✗ Admin authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test collections access
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $collections = Invoke-RestMethod -Uri "http://localhost:8090/api/collections" -Method GET -Headers $headers
    Write-Host "✓ Collections access successful" -ForegroundColor Green
    Write-Host "Found $($collections.Count) collections:" -ForegroundColor Yellow
    foreach ($collection in $collections) {
        Write-Host "  - $($collection.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Collections access failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All tests passed!" -ForegroundColor Green

