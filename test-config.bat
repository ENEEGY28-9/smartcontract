@echo off
REM GameV1 Configuration Test Script
REM Tests all configurations without running Docker services

echo 🧪 Testing GameV1 Configurations...

set errors=0
set warnings=0

echo.
echo 1. Checking Docker Compose Configuration...
if exist "docker-compose.yml" (
    echo ✓ docker-compose.yml exists
    type docker-compose.yml 2>nul | findstr "gamev1-room-manager" >nul
    if !errorlevel! equ 0 (
        echo ✓ Room Manager service defined
    ) else (
        echo ✗ Room Manager service missing
        set /a errors+=1
    )

    type docker-compose.yml 2>nul | findstr "gamev1-prometheus" >nul
    if !errorlevel! equ 0 (
        echo ✓ Prometheus service defined
    ) else (
        echo ✗ Prometheus service missing
        set /a errors+=1
    )

    type docker-compose.yml 2>nul | findstr "gamev1-grafana" >nul
    if !errorlevel! equ 0 (
        echo ✓ Grafana service defined
    ) else (
        echo ✗ Grafana service missing
        set /a errors+=1
    )
) else (
    echo ✗ docker-compose.yml not found
    set /a errors+=1
)

echo.
echo 2. Checking Grafana Dashboards...
set dashboardPath=config/grafana/dashboards
set requiredDashboards=gamev1-overview.json gateway-performance.json game-metrics.json system-health.json alert-overview.json

for %%d in (%requiredDashboards%) do (
    if exist "%dashboardPath%\%%d" (
        echo ✓ %%d exists
    ) else (
        echo ✗ %%d missing
        set /a errors+=1
    )
)

echo.
echo 3. Checking Grafana Provisioning...
if exist "config/grafana/datasources/prometheus.yml" (
    echo ✓ Prometheus datasource config exists
) else (
    echo ✗ Prometheus datasource config missing
    set /a errors+=1
)

if exist "config/grafana/dashboards/dashboards.yml" (
    echo ✓ Dashboard provisioning config exists
) else (
    echo ✗ Dashboard provisioning config missing
    set /a errors+=1
)

if exist "config/grafana/datasources/notifications.yml" (
    echo ✓ Notification channels config exists
) else (
    echo ✗ Notification channels config missing
    set /a errors+=1
)

echo.
echo 4. Checking Prometheus Configuration...
if exist "config/prometheus.yml" (
    echo ✓ Prometheus config exists
    type config/prometheus.yml 2>nul | findstr "gamev1-gateway" >nul
    if !errorlevel! equ 0 (
        echo ✓ Gateway scrape job configured
    ) else (
        echo ✗ Gateway scrape job missing
        set /a errors+=1
    )

    type config/prometheus.yml 2>nul | findstr "gamev1-worker" >nul
    if !errorlevel! equ 0 (
        echo ✓ Worker scrape job configured
    ) else (
        echo ✗ Worker scrape job missing
        set /a errors+=1
    )

    type config/prometheus.yml 2>nul | findstr "gamev1-room-manager" >nul
    if !errorlevel! equ 0 (
        echo ✓ Room Manager scrape job configured
    ) else (
        echo ✗ Room Manager scrape job missing
        set /a errors+=1
    )
) else (
    echo ✗ Prometheus config missing
    set /a errors+=1
)

echo.
echo 5. Checking Setup Scripts...
set requiredScripts=scripts/setup-grafana.sh scripts/setup-grafana.bat scripts/test-grafana-setup.sh scripts/test-grafana-setup.bat build-and-start.sh build-and-start.bat start-monitoring.sh start-monitoring.bat

for %%s in (%requiredScripts%) do (
    if exist "%%s" (
        echo ✓ %%s exists
    ) else (
        echo ✗ %%s missing
        set /a errors+=1
    )
)

echo.
echo 6. Checking Dockerfiles...
set dockerPath=docker/containers
set requiredDockerfiles=Dockerfile.gateway Dockerfile.worker Dockerfile.room-manager Dockerfile.pocketbase Dockerfile.redis

for %%d in (%requiredDockerfiles%) do (
    if exist "%dockerPath%\%%d" (
        echo ✓ %%d exists
    ) else (
        echo ✗ %%d missing
        set /a errors+=1
    )
)

echo.
echo 7. Checking Room Manager Code...
if exist "room-manager/src/lib.rs" (
    echo ✓ Room Manager source code exists
) else (
    echo ✗ Room Manager source code missing
    set /a errors+=1
)

echo.
echo 8. Checking Alert Configuration...
if exist "config/alerts.yml" (
    echo ✓ Alert rules config exists
) else (
    echo ✗ Alert rules config missing
    set /a errors+=1
)

echo.
echo 📊 Configuration Test Summary:
echo Errors: %errors%
echo Warnings: %warnings%

if %errors% equ 0 (
    echo.
    echo ✅ All configurations are valid!
    echo.
    echo Next steps:
    echo 1. Start services: docker compose up -d
    echo 2. Setup Grafana: scripts/setup-grafana.bat
    echo 3. Test setup: scripts/test-grafana-setup.bat
    echo 4. Access Grafana: http://localhost:3000
) else (
    echo.
    echo ❌ Found configuration errors. Please fix them before proceeding.
)

echo.
echo 🎉 Configuration test completed!
