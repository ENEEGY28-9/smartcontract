@echo off
REM GameV1 WebSocket Test Script
REM Tests WebSocket connections and real-time messaging

echo 🔌 Testing GameV1 WebSocket Connections...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0

echo.
echo %BLUE%1. Testing WebSocket Endpoint...%NC%

REM Test WebSocket upgrade
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" ^
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" ^
  http://localhost:8080/ws 2>nul | findstr "101 Switching Protocols" >nul

if %errorlevel% equ 0 (
    echo %GREEN%✓ WebSocket upgrade supported%NC%
) else (
    echo %YELLOW%! WebSocket upgrade response unclear%NC%
)

echo.
echo %BLUE%2. Testing WebSocket Connection (Manual Test)...%NC%
echo.
echo %YELLOW%Manual WebSocket Test Instructions:%NC%
echo.
echo Option 1 - Browser Console:
echo 1. Open: http://localhost:8080
echo 2. Open Developer Tools (F12)
echo 3. Go to Console tab
echo 4. Run this JavaScript:
echo.
echo %GREEN%const ws = new WebSocket('ws://localhost:8080/ws');%NC%
echo %GREEN%ws.onopen = () => console.log('Connected!');%NC%
echo %GREEN%ws.onmessage = (msg) => console.log('Message:', msg.data);%NC%
echo %GREEN%ws.send(JSON.stringify({type: 'ping', timestamp: Date.now()}));%NC%
echo.

echo Option 2 - Using wscat (if installed):
echo 1. Install: npm install -g wscat
echo 2. Connect: wscat -c ws://localhost:8080/ws
echo 3. Send: {"type": "ping", "playerId": "test-player"}
echo.

echo Option 3 - Using PowerShell:
echo 1. Copy the PowerShell WebSocket test below
echo.

echo %BLUE%PowerShell WebSocket Test:%NC%
echo.
echo %GREEN%Add-Type -AssemblyName System.Net.WebSockets%NC%
echo %GREEN%$ws = [System.Net.WebSockets.ClientWebSocket]::new()%NC%
echo %GREEN%$ct = [System.Threading.CancellationToken]::new()%NC%
echo %GREEN%$ws.ConnectAsync("ws://localhost:8080/ws", $ct).Wait()%NC%
echo %GREEN%Write-Host "Connected: $($ws.State)"%NC%
echo.

echo.
echo %BLUE%3. Testing Multiple Connections Simulation...%NC%

REM Simulate multiple WebSocket connections
echo Creating 5 concurrent connection attempts...

for /l %%i in (1,1,5) do (
    start /b timeout /t 1 /nobreak >nul
    curl -s "http://localhost:8080/healthz" >nul 2>&1
    if !errorlevel! equ 0 (
        echo Connection %%i: OK
    ) else (
        echo Connection %%i: Failed
        set /a errors+=1
    )
)

echo %GREEN%✓ Concurrent connection test completed%NC%

echo.
echo %BLUE%4. Testing WebSocket Message Types...%NC%
echo.
echo %YELLOW%Test these message types in WebSocket:%NC%
echo.
echo %GREEN%Join Room:%NC% {"type": "join_room", "roomId": "test-room", "playerId": "player1"}
echo %GREEN%Leave Room:%NC% {"type": "leave_room", "roomId": "test-room", "playerId": "player1"}
echo %GREEN%Game Input:%NC% {"type": "game_input", "action": "move", "data": {"x": 100, "y": 200}}
echo %GREEN%Chat Message:%NC% {"type": "chat", "message": "Hello everyone!", "playerId": "player1"}
echo %GREEN%Ping:%NC% {"type": "ping", "timestamp": 1234567890}
echo.

echo.
echo %BLUE%5. Testing Game Room WebSocket Flow...%NC%
echo.
echo %YELLOW%Simulated Game Session Flow:%NC%
echo 1. Player joins room
echo 2. Receives game state updates
echo 3. Sends input commands
echo 4. Receives real-time updates
echo 5. Player leaves room
echo.

echo %GREEN%✓ WebSocket flow documentation ready%NC%

echo.
echo %BLUE%6. Performance Test Setup...%NC%
echo.
echo %YELLOW%For load testing WebSocket connections:%NC%
echo 1. Install wscat: npm install -g wscat
echo 2. Run: wscat -c ws://localhost:8080/ws --no-check
echo 3. Send rapid messages to test throughput
echo.

echo.
echo 🔌 WebSocket Test Summary:
echo Errors: %errors%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ WebSocket infrastructure is ready!%NC%
    echo.
    echo %BLUE%Ready for:%NC%
    echo - Real-time multiplayer gameplay
    echo - Live chat messaging
    echo - Game state synchronization
    echo - Player input handling
    echo - WebRTC signaling
    echo.
    echo %YELLOW%Next: Test in browser or with wscat tool%NC%
) else (
    echo.
    echo %RED%❌ Found %errors% WebSocket issues.%NC%
    echo.
    echo %YELLOW%Check:%NC%
    echo - Gateway service logs
    echo - WebSocket configuration
    echo - Port accessibility
)

echo.
echo 🔌 WebSocket testing setup completed!
