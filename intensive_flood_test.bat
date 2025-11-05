@echo off
echo Intensive Rate Limiting Test
echo ============================

set count=0
set rate_limited=0
set success=0

echo Sending 100 rapid requests from same IP...

for /l %%i in (1,1,100) do (
    curl.exe -s -w "%%{http_code}," -X POST http://localhost:8080/api/rooms/create ^
        -H "Content-Type: application/json" ^
        -H "X-Forwarded-For: 192.168.1.100" ^
        -d "{\"name\":\"Intensive Test %%i\",\"maxPlayers\":4,\"gameMode\":\"classic\",\"hostName\":\"Player %%i\"}" ^
        --max-time 2 >nul 2>&1

    set /a count+=1

    REM Check if last request was rate limited
    for /f "tokens=*" %%a in ('curl.exe -s -w "%%{http_code}" -X POST http://localhost:8080/api/rooms/create -H "Content-Type: application/json" -H "X-Forwarded-For: 192.168.1.100" -d "{\"name\":\"Check Test\",\"maxPlayers\":4,\"gameMode\":\"classic\",\"hostName\":\"Player Check\"}" --max-time 1 2^>nul') do (
        if "%%a"=="429" (
            set /a rate_limited+=1
            echo Request %%i: Rate limited (429)
        ) else if "%%a"=="404" (
            set /a success+=1
        )
    )

    REM Progress indicator
    if %%i==25 echo 25 requests sent...
    if %%i==50 echo 50 requests sent...
    if %%i==75 echo 75 requests sent...
)

echo.
echo FINAL RESULTS
echo =============
echo Total requests: %count%
echo Success (404): %success%
echo Rate limited (429): %rate_limited%

if %rate_limited% gtr 0 (
    echo.
    echo SUCCESS! RATE LIMITING IS WORKING!
    echo Blocked %rate_limited% requests with 429
    echo Rate limit percentage: %rate_limited%/%count%
) else (
    echo.
    echo No rate limiting detected after %count% requests
    echo Rate limits might be too high or not implemented
)
