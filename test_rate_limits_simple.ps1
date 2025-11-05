# Simple Rate Limiting Test
Write-Host "Testing Rate Limiting"

$rateLimited = 0
$success = 0
$total = 0

Write-Host "Sending 15 rapid requests..."

for ($i = 1; $i -le 15; $i++) {
    $json = '{"name":"Rate Test ' + $i + '","maxPlayers":4,"gameMode":"classic","hostName":"Player ' + $i + '"}'

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/rooms/create" `
            -Method POST `
            -ContentType "application/json" `
            -Body $json `
            -TimeoutSec 3 `
            -ErrorAction SilentlyContinue

        $total++
        $statusCode = $response.StatusCode

        if ($statusCode -eq 429) {
            $rateLimited++
            Write-Host "Request $i`: Rate limited (429)"
        } elseif ($statusCode -eq 404) {
            $success++
            Write-Host "Request $i`: Success (404)"
        } else {
            Write-Host "Request $i`: Status $statusCode"
        }
    }
    catch {
        $total++
        Write-Host "Request $i`: Error/Timeout"
    }

    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "RESULTS"
Write-Host "Total requests: $total"
Write-Host "Success (404): $success"
Write-Host "Rate limited (429): $rateLimited"

$rateLimitPercentage = ($rateLimited / $total) * 100

if ($rateLimited -gt 0) {
    Write-Host ""
    Write-Host "RATE LIMITING IS WORKING!"
    Write-Host "Successfully blocked $rateLimited requests with 429"
    Write-Host "Rate limit percentage: $($rateLimitPercentage.ToString('F1'))%"

    if ($rateLimitPercentage -lt 5) {
        Write-Host "TARGET ACHIEVED: less than 5% rate limit errors"
    } else {
        Write-Host "Rate limiting active but above 5%"
    }
} else {
    Write-Host ""
    Write-Host "No rate limiting detected"
    Write-Host "This could mean rate limits are too high or not implemented"
}

# Check gateway health
Write-Host ""
Write-Host "Gateway Status:"
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/rooms/create" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"name":"Health Check","maxPlayers":2,"gameMode":"test","hostName":"Test"}' `
        -TimeoutSec 2 `
        -ErrorAction SilentlyContinue

    if ($healthResponse) {
        Write-Host "Gateway is running and responding"
        Write-Host "Status Code: $($healthResponse.StatusCode)"
    }
}
catch {
    Write-Host "Cannot connect to gateway"
    Write-Host "Make sure gateway is running: cd gateway && cargo run"
}
