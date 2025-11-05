#!/bin/bash

# Start Prometheus for GameV1 Development Monitoring
# This script starts Prometheus with the development configuration

set -e

echo "🚀 Starting GameV1 Development Monitoring Stack..."

# Check if Prometheus is installed
if ! command -v prometheus &> /dev/null; then
    echo "❌ Prometheus is not installed. Please install Prometheus first."
    echo "   Visit: https://prometheus.io/download/"
    echo "   Or install via package manager:"
    echo "   - Ubuntu/Debian: sudo apt install prometheus"
    echo "   - macOS: brew install prometheus"
    exit 1
fi

# Check if Grafana is installed
if ! command -v grafana-server &> /dev/null; then
    echo "⚠️  Grafana is not installed. Prometheus will start without Grafana."
    echo "   To install Grafana:"
    echo "   - Ubuntu/Debian: sudo apt install grafana"
    echo "   - macOS: brew install grafana"
    echo "   - Or visit: https://grafana.com/grafana/download"
fi

# Create necessary directories
mkdir -p logs

# Function to start Prometheus
start_prometheus() {
    echo "📊 Starting Prometheus..."
    echo "   Config: config/prometheus.yml"
    echo "   Storage: data/prometheus"
    echo "   Logs: logs/prometheus.log"

    # Create data directory
    mkdir -p data/prometheus

    # Start Prometheus in background
    nohup prometheus \
        --config.file=config/prometheus.yml \
        --storage.tsdb.path=data/prometheus \
        --web.console.templates=consoles \
        --web.console.libraries=console_libraries \
        --web.listen-address=0.0.0.0:9090 \
        --web.external-url=http://localhost:9090 \
        --log.level=info \
        > logs/prometheus.log 2>&1 &
    PROMETHEUS_PID=$!

    echo "✅ Prometheus started with PID: $PROMETHEUS_PID"
    echo "   Web UI: http://localhost:9090"
    echo "   Metrics: http://localhost:9090/metrics"
    echo ""
}

# Function to start Grafana
start_grafana() {
    if command -v grafana-server &> /dev/null; then
        echo "📈 Starting Grafana..."

        # Create Grafana data directory
        mkdir -p data/grafana

        # Start Grafana in background
        nohup grafana-server \
            --homepath=/usr/share/grafana \
            --config=/etc/grafana/grafana.ini \
            web \
            > logs/grafana.log 2>&1 &
        GRAFANA_PID=$!

        echo "✅ Grafana started with PID: $GRAFANA_PID"
        echo "   Web UI: http://localhost:3000"
        echo "   Default login: admin/admin"
        echo ""
    else
        echo "⚠️  Skipping Grafana (not installed)"
        echo ""
    fi
}

# Function to setup Grafana datasource (if Grafana is available)
setup_grafana_datasource() {
    if command -v grafana-server &> /dev/null; then
        echo "🔧 Setting up Grafana datasource..."

        # Wait for Grafana to start
        sleep 5

        # Create Prometheus datasource config
        mkdir -p config/grafana/provisioning/datasources

        cat > config/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: true
    jsonData:
      httpMethod: POST
      timeInterval: "15s"
EOF

        echo "✅ Grafana datasource configured"
        echo ""
    fi
}

# Function to show monitoring URLs
show_urls() {
    echo "🌐 Monitoring URLs:"
    echo "   Prometheus: http://localhost:9090"
    echo "   Grafana: http://localhost:3000 (if installed)"
    echo ""
    echo "📊 Available Metrics:"
    echo "   Gateway: http://localhost:8080/metrics"
    echo "   Worker: http://localhost:3100/metrics"
    echo "   Room Manager: http://localhost:3200/metrics"
    echo ""
}

# Function to show example queries
show_example_queries() {
    echo "🔍 Example Prometheus Queries:"
    echo "   - Gateway response time: rate(gateway_response_time_seconds_bucket[5m])"
    echo "   - Active connections: gateway_active_connections"
    echo "   - Worker frame time: rate(worker_frame_time_seconds_bucket[5m])"
    echo "   - RPC calls: rate(worker_rpc_calls_total[5m])"
    echo "   - Room activity: room_manager_active_rooms"
    echo ""
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping monitoring services..."

    if [ ! -z "${PROMETHEUS_PID:-}" ]; then
        echo "Stopping Prometheus (PID: $PROMETHEUS_PID)"
        kill $PROMETHEUS_PID 2>/dev/null || true
    fi

    if [ ! -z "${GRAFANA_PID:-}" ]; then
        echo "Stopping Grafana (PID: $GRAFANA_PID)"
        kill $GRAFANA_PID 2>/dev/null || true
    fi

    echo "✅ Monitoring services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Start services
start_prometheus
start_grafana
setup_grafana_datasource
show_urls
show_example_queries

echo "🎯 To start your game services:"
echo "   1. Gateway: cargo run -p gateway"
echo "   2. Worker: cargo run -p worker"
echo "   3. Room Manager: cargo run -p room-manager"
echo ""
echo "📝 Press Ctrl+C to stop monitoring services"
echo ""

# Wait for services to keep script running
wait