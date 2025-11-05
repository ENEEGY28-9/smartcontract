# Test WebSocket Connection for Game
param(
    [string]$GatewayUrl = "ws://localhost:8080",
    [string]$TestMessage = "Hello from WebSocket test"
)

Write-Host "=== WebSocket Connection Test ===" -ForegroundColor Cyan
Write-Host "Gateway URL: $GatewayUrl" -ForegroundColor Yellow

try {
    # Test WebSocket connection
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $uri = New-Object System.Uri("$GatewayUrl/ws")

    Write-Host "Connecting to WebSocket..." -ForegroundColor Yellow
    $connectTask = $ws.ConnectAsync($uri, [System.Threading.CancellationToken]::None)
    $connectTask.Wait(5000)

    if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        Write-Host "✓ WebSocket connected successfully" -ForegroundColor Green

        # Send test message
        $messageBytes = [System.Text.Encoding]::UTF8.GetBytes($TestMessage)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$messageBytes)

        $sendTask = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None)
        $sendTask.Wait(5000)
        Write-Host "✓ Test message sent" -ForegroundColor Green

        # Receive response
        $buffer = New-Object byte[] 1024
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)

        $receiveTask = $ws.ReceiveAsync($segment, [System.Threading.CancellationToken]::None)
        $receiveTask.Wait(5000)

        if ($receiveTask.Result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Text) {
            $receivedMessage = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $receiveTask.Result.Count)
            Write-Host "✓ Response received: $receivedMessage" -ForegroundColor Green
        }

        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Test complete", [System.Threading.CancellationToken]::None).Wait()
        Write-Host "✓ WebSocket test completed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "✗ WebSocket connection failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ WebSocket test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== WebSocket Test Complete ===" -ForegroundColor Cyan
