Write-Host "Testing PocketBase..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:8090/api/health" -Method GET
Write-Host "PocketBase OK: $($response.message)" -ForegroundColor Green

Write-Host "Testing Room Manager..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" -Method GET
Write-Host "Room Manager OK: $($response.rooms.Count) rooms" -ForegroundColor Green

Write-Host "All tests passed!" -ForegroundColor Cyan
