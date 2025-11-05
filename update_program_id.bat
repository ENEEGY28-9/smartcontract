@echo off
REM Update Program ID after deployment

echo 🔄 Updating Game Token Program ID...

set /p PROGRAM_ID="Enter deployed Program ID: "

if "%PROGRAM_ID%"=="" (
    echo ❌ No Program ID provided
    exit /b 1
)

echo Updating blockchain-service/src/game_token_client.rs...

REM Use PowerShell to replace the program ID
powershell -Command "(Get-Content 'blockchain-service/src/game_token_client.rs') -replace 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS', '%PROGRAM_ID%' | Set-Content 'blockchain-service/src/game_token_client.rs'"

echo ✅ Program ID updated to: %PROGRAM_ID%

echo.
echo 🔧 Next steps:
echo 1. Rebuild blockchain service: cd blockchain-service && cargo build
echo 2. Start services and test real minting
echo 3. Verify transactions on Solana Explorer

pause

