@echo off
REM GameV1 Grafana Setup Script for Windows
REM This script sets up Grafana with all dashboards and configurations

echo 🎯 Setting up Grafana for GameV1...

REM Colors for output (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%Checking if Grafana service is running...%NC%

REM Check if docker-compose is running
docker-compose ps | findstr "gamev1-grafana" >nul
if %errorlevel% neq 0 (
    echo %YELLOW%Starting Grafana service...%NC%
    docker-compose up -d gamev1-grafana gamev1-prometheus
)

REM Wait for Grafana to be ready
echo %BLUE%Waiting for Grafana to start...%NC%
for /l %%i in (1,1,30) do (
    curl -f http://localhost:3000/api/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo %GREEN%Grafana is ready!%NC%
        goto :grafana_ready
    )
    echo -n .
    timeout /t 2 /nobreak >nul
)

echo %RED%Grafana failed to start within 60 seconds%NC%
exit /b 1

:grafana_ready
echo %BLUE%Setting up Grafana configurations...%NC%

REM Set admin password via API
echo %BLUE%Setting admin password...%NC%
curl -X PUT -H "Content-Type: application/json" -d "{\"oldPassword\": \"admin\", \"newPassword\": \"gamev1_admin_2024\", \"confirmNew\": \"gamev1_admin_2024\"}" http://admin:admin@localhost:3000/api/admin/users/1/password

REM Create API key for automation
echo %BLUE%Creating API key...%NC%
for /f "delims=" %%i in ('curl -X POST -H "Content-Type: application/json" -d "{\"name\": \"GameV1 Automation\", \"role\": \"Admin\"}" http://admin:gamev1_admin_2024@localhost:3000/api/auth/keys') do set "response=%%i"

REM Extract API key using PowerShell (since Windows doesn't have jq)
for /f "delims=" %%i in ('powershell -Command "$json='%response%'; $obj = ConvertFrom-Json $json; if ($obj.key) { $obj.key } else { 'ERROR' }"') do set "API_KEY=%%i"

echo %GREEN%API Key created: %API_KEY%%NC%

REM Setup datasources
echo %BLUE%Configuring datasources...%NC%
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %API_KEY%" -d "{\"name\": \"Prometheus\", \"type\": \"prometheus\", \"url\": \"http://gamev1-prometheus:9090\", \"access\": \"proxy\", \"isDefault\": true}" http://localhost:3000/api/datasources

echo %GREEN%Datasources configured!%NC%

REM Import dashboards
echo %BLUE%Importing dashboards...%NC%

set "DASHBOARDS=gamev1-overview gateway-performance game-metrics system-health alert-overview"

for %%d in (%DASHBOARDS%) do (
    echo %YELLOW%Importing %%d dashboard...%NC%

    REM Check if dashboard file exists
    if exist "config/grafana/dashboards/%%d.json" (
        REM Import dashboard
        curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %API_KEY%" -d @config/grafana/dashboards/%%d.json http://localhost:3000/api/dashboards/db
        echo %GREEN%%%d dashboard imported!%NC%
    ) else (
        echo %RED%Dashboard file not found: %%d.json%NC%
    )
)

echo %GREEN%All dashboards imported!%NC%

REM Setup notification channels
echo %BLUE%Setting up notification channels...%NC%

REM Discord webhook (if configured)
if defined DISCORD_WEBHOOK_URL (
    curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %API_KEY%" -d "{\"name\": \"Discord\", \"type\": \"discord\", \"settings\": {\"webhookUrl\": \"%DISCORD_WEBHOOK_URL%\"}}" http://localhost:3000/api/alert-notifications
    echo %GREEN%Discord notifications configured!%NC%
)

REM Email notifications
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %API_KEY%" -d "{\"name\": \"Email\", \"type\": \"email\", \"settings\": {\"addresses\": \"admin@gamev1.com\"}}" http://localhost:3000/api/alert-notifications

echo %GREEN%Email notifications configured!%NC%

REM Setup basic alert rules
echo %BLUE%Setting up alert rules...%NC%

REM Create folder for alert rules
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %API_KEY%" -d "{\"title\": \"GameV1 Alerts\"}" http://localhost:3000/api/folders

echo %GREEN%Alert rules folder created!%NC%

echo %GREEN%Grafana setup completed!%NC%
echo.
echo %BLUE%Access Grafana at: %GREEN%http://localhost:3000%NC%
echo %BLUE%Username: %GREEN%admin%NC%
echo %BLUE%Password: %GREEN%gamev1_admin_2024%NC%
echo.
echo %YELLOW%Available dashboards:%NC%
echo   • %GREEN%GameV1 Overview%NC% - General system overview
echo   • %GREEN%Gateway Performance%NC% - API and connection monitoring
echo   • %GREEN%Game Metrics%NC% - Gameplay and performance metrics
echo   • %GREEN%System Health%NC% - Infrastructure monitoring
echo   • %GREEN%Alert Overview%NC% - Alert monitoring and status
