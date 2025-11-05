@echo off
echo 🚀 Testing Rate Limiting with Flood Requests
echo ===========================================

set count=0
set rate_limited=0
set success=0

echo 📤 Sending 15 rapid requests from same IP...

for /l %%i in (1,1,15) do (
    echo.
    curl.exe -s -w "%%{http_code}" -X POST http://localhost:8080/api/rooms/create ^
        -H "Content-Type: application/json" ^
        -d "{\"name\":\"Flood Test %%i\",\"maxPlayers\":4,\"gameMode\":\"classic\",\"hostName\":\"Player %%i\"}" ^
        --max-time 3

    set /a count+=1

    if errorlevel 1 (
        echo ❌ Request %%i: Error
    )
)

echo.
echo 🎯 RESULTS
echo =========
echo 📊 Total requests: %count%
echo ✅ Success (404): %success%
echo 🚫 Rate limited (429): %rate_limited%

if %rate_limited% gtr 0 (
    echo.
    echo 🎉 RATE LIMITING IS WORKING!
    echo    Successfully blocked %rate_limited% requests with 429
    echo    Rate limit percentage: %rate_limited%/%count% = %%rate_limited%%
) else (
    echo.
    echo ⚠️  No rate limiting detected
    echo    This could mean rate limits are too high or not implemented
)
