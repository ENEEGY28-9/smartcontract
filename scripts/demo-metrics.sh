#!/bin/bash

# GameV1 Metrics Demo Script
# Demonstrates the monitoring system by starting services and generating traffic

set -e

echo "🎮 GameV1 Metrics Demo"
echo "======================"
echo ""

# Check if services are already running
check_service() {
    local port=$1
    local name=$2

    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $name is already running on port $port"
        return 0
    else
        echo "❌ $name is not running on port $port"
        return 1
    fi
}

echo "🔍 Checking service status..."

GATEWAY_RUNNING=$(check_service 8080 "Gateway")
WORKER_RUNNING=$(check_service 3100 "Worker")
ROOM_MANAGER_RUNNING=$(check_service 3200 "Room Manager")
PROMETHEUS_RUNNING=$(check_service 9090 "Prometheus")

echo ""

if [ "$PROMETHEUS_RUNNING" != "0" ]; then
    echo "🚀 Starting Prometheus..."
    echo "   Make sure Prometheus is installed and configured"
    echo "   Run: ./scripts/start-monitoring.sh"
    echo ""
fi

if [ "$GATEWAY_RUNNING" != "0" ]; then
    echo "🚀 Starting Gateway..."
    echo "   Run in a new terminal: cargo run -p gateway"
    echo ""
fi

if [ "$WORKER_RUNNING" != "0" ]; then
    echo "🚀 Starting Worker..."
    echo "   Run in a new terminal: cargo run -p worker"
    echo ""
fi

if [ "$ROOM_MANAGER_RUNNING" != "0" ]; then
    echo "🚀 Starting Room Manager..."
    echo "   Run in a new terminal: cargo run -p room-manager"
    echo ""
fi

echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

echo ""
echo "🧪 Testing metrics endpoints..."

# Test metrics endpoints
test_metrics_endpoint() {
    local name=$1
    local port=$2
    local expected_metrics=$3

    echo "📊 Testing $name metrics (localhost:$port/metrics)..."

    if curl -s "http://localhost:$port/metrics" > /dev/null 2>&1; then
        echo "✅ $name metrics endpoint is responding"

        # Count metrics
        local metric_count=$(curl -s "http://localhost:$port/metrics" | grep -v '^#' | grep -c '^[a-zA-Z]')

        if [ "$metric_count" -gt 0 ]; then
            echo "✅ $name is exporting $metric_count metrics"
        else
            echo "⚠️  $name metrics endpoint returned no data"
        fi

        # Check for expected metrics
        for metric in $expected_metrics; do
            if curl -s "http://localhost:$port/metrics" | grep -q "$metric"; then
                echo "✅ Found expected metric: $metric"
            else
                echo "⚠️  Missing expected metric: $metric"
            fi
        done

    else
        echo "❌ $name metrics endpoint is not responding"
    fi

    echo ""
}

# Test each service
test_metrics_endpoint "Gateway" 8080 "gateway_response_time_seconds gateway_active_connections gateway_auth_success_total"
test_metrics_endpoint "Worker" 3100 "worker_frame_time_seconds worker_rpc_calls_total worker_gameplay_events_total"
test_metrics_endpoint "Room Manager" 3200 "room_manager_rooms_created_total room_manager_active_rooms"

echo "🔍 Checking Prometheus targets..."

# Check if Prometheus can scrape our services
if curl -s "http://localhost:9090/api/v1/targets" > /dev/null 2>&1; then
    echo "✅ Prometheus API is accessible"

    # Show target status
    echo ""
    echo "📊 Prometheus target status:"
    curl -s "http://localhost:9090/api/v1/targets" | jq -r '.data.activeTargets[] | "\(.labels.job) - \(.health)"' 2>/dev/null || echo "   (jq not available, install with: apt install jq)"

else
    echo "❌ Prometheus API is not accessible"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Prometheus: http://localhost:9090"
echo "   Gateway Metrics: http://localhost:8080/metrics"
echo "   Worker Metrics: http://localhost:3100/metrics"
echo "   Room Manager Metrics: http://localhost:3200/metrics"
echo ""

echo "🎯 Demo completed!"
echo ""
echo "📝 What to do next:"
echo "   1. Open Prometheus UI: http://localhost:9090"
echo "   2. Try these queries:"
echo "      - rate(gateway_response_time_seconds_bucket[5m])"
echo "      - gateway_active_connections"
echo "      - rate(worker_rpc_calls_total[5m])"
echo "      - room_manager_active_rooms"
echo ""
echo "   3. Generate traffic by:"
echo "      - Making HTTP requests to Gateway"
echo "      - Testing WebSocket connections"
echo "      - Creating rooms via Room Manager"
echo "      - Sending inputs via Worker"
echo ""
echo "   4. Import Grafana dashboard:"
echo "      - Open Grafana: http://localhost:3000"
echo "      - Import: config/grafana/dashboards/gamev1-overview.json"
echo ""

echo "💡 Tip: Run this script again after starting services to see real metrics!"
