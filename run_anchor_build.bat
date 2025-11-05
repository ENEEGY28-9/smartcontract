@echo off
REM Build smart contract
echo 🔨 Building smart contract...

cd game_token
anchor clean
anchor build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Smart contract built successfully
pause