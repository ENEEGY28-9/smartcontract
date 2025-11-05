try {
    Write-Host '🔄 Testing admin login...'
    $response = Invoke-WebRequest -Uri 'http://localhost:8090/api/admins/auth-with-password' -Method Post -ContentType 'application/json' -Body '{"identity":"admin@example.com","password":"admin123456"}' -TimeoutSec 10
    Write-Host '✅ Login successful'
    Write-Host 'Response:' $response.Content
} catch {
    Write-Host '❌ Login failed:' $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host 'Status:' $_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader $stream
        $content = $reader.ReadToEnd()
        Write-Host 'Response body:' $content
    }
}

