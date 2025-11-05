$body = @{
    identity = "admin2@pocketbase.local"
    password = "admin123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8090/api/admins/auth-with-password" -Method POST -Body $body -ContentType "application/json"
Write-Host "Token: $($response.token)"

