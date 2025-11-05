try {
    Write-Host '🔍 Checking existing collections...'
    $response = Invoke-WebRequest -Uri 'http://localhost:8090/api/collections' -Method Get -TimeoutSec 10
    Write-Host 'Collections:' $response.Content
} catch {
    Write-Host '❌ Cannot fetch collections:' $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host 'Status:' $_.Exception.Response.StatusCode
    }
}

