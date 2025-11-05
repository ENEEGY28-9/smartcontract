# Simple room creation (for testing without full auth)
Write-Host "Creating a test room..." -ForegroundColor Yellow

try {
    # Test basic connection
     = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method Get
    Write-Host "PocketBase is running" -ForegroundColor Green

    # Try to create a simple collection without auth (might not work)
    Write-Host "Note: Full room creation requires admin authentication" -ForegroundColor Yellow
    Write-Host "Please complete admin setup first in the browser" -ForegroundColor Yellow

} catch {
    Write-Host "Error: " -ForegroundColor Red
}
