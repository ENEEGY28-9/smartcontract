@echo off
REM Start Prometheus for GameV1 Development Monitoring (Windows)
REM This script starts Prometheus with the development configuration

echo 🚀 Starting GameV1 Development Monitoring Stack...

REM Check if Prometheus is installed
prometheus --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Prometheus is not installed. Please install Prometheus first.
    echo    Visit: https://prometheus.io/download/
    echo    Download and extract to a folder, then add to PATH
    goto :end
)

REM Create necessary directories
if not exist logs mkdir logs
if not exist data mkdir data
if not exist data\prometheus mkdir data\prometheus

echo 📊 Starting Prometheus...
echo    Config: config/prometheus.yml
echo    Storage: data/prometheus
echo    Logs: logs/prometheus.log

REM Start Prometheus in background
start /B prometheus ^
    --config.file=config/prometheus.yml ^
    --storage.tsdb.path=data/prometheus ^
    --web.console.templates=consoles ^
    --web.console.libraries=console_libraries ^
    --web.listen-address=0.0.0.0:9090 ^
    --web.external-url=http://localhost:9090 ^
    --log.level=info ^
    > logs/prometheus.log 2>&1

echo ✅ Prometheus started
echo    Web UI: http://localhost:9090
echo    Metrics: http://localhost:9090/metrics
echo.

REM Check if Grafana is installed
grafana-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Grafana is not installed. Prometheus will start without Grafana.
    echo    To install Grafana:
    echo    - Download from: https://grafana.com/grafana/download
    echo    - Install and add to PATH
    goto :skip_grafana
)

echo 📈 Starting Grafana...

REM Create Grafana data directory
if not exist data\grafana mkdir data\grafana

REM Start Grafana in background
start /B grafana-server ^
    --homepath=C:\Program Files\GrafanaLabs\grafana ^
    --config=C:\Program Files\GrafanaLabs\grafana\conf\grafana.ini ^
    web ^
    > logs/grafana.log 2>&1

echo ✅ Grafana started
echo    Web UI: http://localhost:3000
echo    Default login: admin/admin
echo.

:skip_grafana

echo 🌐 Monitoring URLs:
echo    Prometheus: http://localhost:9090
echo    Grafana: http://localhost:3000 (if installed)
echo.
echo 📊 Available Metrics:
echo    Gateway: http://localhost:8080/metrics
echo    Worker: http://localhost:3100/metrics
echo    Room Manager: http://localhost:3200/metrics
echo.
echo 🎯 To start your game services:
echo    1. Gateway: cargo run -p gateway
echo    2. Worker: cargo run -p worker
echo    3. Room Manager: cargo run -p room-manager
echo.
echo 🔍 Example Prometheus Queries:
echo    - Gateway response time: rate(gateway_response_time_seconds_bucket[5m])
echo    - Active connections: gateway_active_connections
echo    - Worker frame time: rate(worker_frame_time_seconds_bucket[5m])
echo    - RPC calls: rate(worker_rpc_calls_total[5m])
echo    - Room activity: room_manager_active_rooms
echo.
echo 📝 Press Ctrl+C to stop monitoring services
echo.

REM Wait for user to press Ctrl+C
:wait
timeout /t 1 >nul
goto wait

:end
echo 🛑 Monitoring services stopped
pause