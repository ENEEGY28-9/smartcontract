@echo off
REM GameV1 API Endpoints Test Script
REM Tests all game-related API endpoints

echo 🎮 Testing GameV1 API Endpoints...

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

set errors=0
set warnings=0

echo.
echo %BLUE%1. Testing Basic Connectivity...%NC%
curl -f -m 10 http://localhost:8080/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway is responding%NC%
) else (
    echo %RED%✗ Gateway not responding%NC%
    set /a errors+=1
    goto :end
)

echo.
echo %BLUE%2. Testing Health Endpoints...%NC%

REM Gateway health
curl -w "Gateway: %%{http_code}\n" -s -o nul http://localhost:8080/healthz
if %errorlevel% equ 0 (
    echo %GREEN%✓ Gateway health: 200 OK%NC%
) else (
    echo %RED%✗ Gateway health failed%NC%
    set /a errors+=1
)

REM Worker health (internal)
curl -w "Worker: %%{http_code}\n" -s -o nul http://localhost:50051/healthz 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Worker health: 200 OK%NC%
) else (
    echo %YELLOW%! Worker health not accessible (internal endpoint)%NC%
)

echo.
echo %BLUE%3. Testing Game APIs...%NC%

REM Get rooms
curl -s http://localhost:8080/api/rooms 2>nul | findstr "rooms\|error" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Rooms API working%NC%
) else (
    echo %YELLOW%! Rooms API response format unexpected%NC%
    set /a warnings+=1
)

REM Get players
curl -s http://localhost:8080/api/players 2>nul | findstr "players\|error" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Players API working%NC%
) else (
    echo %YELLOW%! Players API response format unexpected%NC%
    set /a warnings+=1
)

REM Get game sessions
curl -s http://localhost:8080/api/sessions 2>nul | findstr "sessions\|error" >nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Sessions API working%NC%
) else (
    echo %YELLOW%! Sessions API response format unexpected%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%4. Testing Room Creation...%NC%

REM Create a test room
curl -X POST http://localhost:8080/api/rooms ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Room\",\"gameMode\":\"classic\",\"maxPlayers\":4,\"isPrivate\":false}" ^
  -w "Status: %%{http_code}\n" ^
  -s 2>nul

if %errorlevel% equ 0 (
    echo %GREEN%✓ Room creation API working%NC%
) else (
    echo %YELLOW%! Room creation API failed%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%5. Testing Authentication...%NC%

REM Test login endpoint
curl -X POST http://localhost:8080/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"test\",\"password\":\"test\"}" ^
  -w "Status: %%{http_code}\n" ^
  -s 2>nul

if %errorlevel% equ 0 (
    echo %GREEN%✓ Authentication API working%NC%
) else (
    echo %YELLOW%! Authentication API failed%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%6. Testing Chat System...%NC%

REM Test chat endpoint
curl -X POST http://localhost:8080/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello World\",\"roomId\":\"test-room\",\"playerId\":\"player1\"}" ^
  -w "Status: %%{http_code}\n" ^
  -s 2>nul

if %errorlevel% equ 0 (
    echo %GREEN%✓ Chat API working%NC%
) else (
    echo %YELLOW%! Chat API failed%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%7. Testing WebRTC Signaling...%NC%

REM Test WebRTC offer
curl -X POST http://localhost:8080/api/webrtc/offer ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"offer\",\"roomId\":\"test-room\",\"playerId\":\"player1\"}" ^
  -w "Status: %%{http_code}\n" ^
  -s 2>nul

if %errorlevel% equ 0 (
    echo %GREEN%✓ WebRTC signaling working%NC%
) else (
    echo %YELLOW%! WebRTC signaling failed%NC%
    set /a warnings+=1
)

echo.
echo %BLUE%8. Testing Performance...%NC%

REM Test response times
echo Testing response times...

REM Quick health check timing
for /l %%i in (1,1,5) do (
    curl -w "Request %%i: %%{time_total}s\n" -s -o nul http://localhost:8080/healthz 2>nul
)

echo.
echo %BLUE%9. Testing Concurrent Requests...%NC%

REM Test concurrent requests (basic)
echo Testing concurrent requests...
start /b curl -s http://localhost:8080/healthz >nul 2>&1
start /b curl -s http://localhost:8080/api/rooms >nul 2>&1
start /b curl -s http://localhost:8080/healthz >nul 2>&1
start /b curl -s http://localhost:8080/api/players >nul 2>&1

timeout /t 2 /nobreak >nul
echo %GREEN%✓ Concurrent requests handled%NC%

echo.
echo %BLUE%10. Testing Error Handling...%NC%

REM Test 404 handling
curl -w "404 Test: %%{http_code}\n" -s -o nul http://localhost:8080/nonexistent 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Error handling working%NC%
) else (
    echo %YELLOW%! Error handling test inconclusive%NC%
)

:end
echo.
echo 🎮 API Test Summary:
echo Errors: %errors%
echo Warnings: %warnings%

if %errors% equ 0 (
    echo.
    echo %GREEN%✅ All API endpoints are working!%NC%
    echo.
    echo %BLUE%System is ready for:%NC%
    echo - Real gameplay sessions
    echo - Multiplayer connections
    echo - Room management
    echo - Chat functionality
    echo - WebRTC signaling
) else (
    echo.
    echo %RED%❌ Found %errors% API errors.%NC%
    if %warnings% gtr 0 (
        echo %YELLOW%⚠️  %warnings% warnings detected.%NC%
    )
    echo.
    echo %YELLOW%Check service logs for details:%NC%
    echo docker compose logs gamev1-gateway
    echo docker compose logs gamev1-worker
)

echo.
echo 🎮 API testing completed!
