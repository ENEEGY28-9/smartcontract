#!/bin/bash

# 🚀 Start GameV1 Native Services
# Tối ưu performance - không dùng Docker

set -e

echo "🎮 Starting GameV1 with native deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if binaries exist
BINARY_DIR="target/static-release"
if [ ! -d "$BINARY_DIR" ]; then
    echo -e "${RED}❌ Binary directory not found. Run build script first:${NC}"
    echo "   ./scripts/build-static-binaries.sh"
    exit 1
fi

# Function để start service với logging
start_service() {
    local service_name="$1"
    local binary_path="$2"
    local log_file="logs/${service_name}.log"

    mkdir -p logs

    echo -e "${YELLOW}🚀 Starting $service_name...${NC}"

    # Start service in background với proper logging
    nohup "$binary_path" > "$log_file" 2>&1 &
    local pid=$!

    # Wait a moment và check if still running
    sleep 2
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✅ $service_name started (PID: $pid)${NC}"
        echo "$pid" > "pids/${service_name}.pid"
        mkdir -p pids
    else
        echo -e "${RED}❌ Failed to start $service_name${NC}"
        echo "📄 Check logs: $log_file"
        return 1
    fi
}

# Start Redis (native installation required)
echo -e "${YELLOW}🔴 Starting Redis...${NC}"
if command -v redis-server &> /dev/null; then
    sudo systemctl start redis-server || redis-server --daemonize yes
    echo -e "${GREEN}✅ Redis started${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not installed. Install with: sudo apt-get install redis-server${NC}"
fi

# Start PocketBase (native binary)
cd "$BINARY_DIR"
if [ -f "pocketbase" ]; then
    start_service "pocketbase" "./pocketbase serve --http=0.0.0.0:8090"
else
    echo -e "${RED}❌ PocketBase binary not found${NC}"
fi

# Start Services
if [ -f "services" ]; then
    start_service "services" "./services"
else
    echo -e "${RED}❌ Services binary not found${NC}"
fi

# Start Room Manager
if [ -f "room-manager" ]; then
    start_service "room-manager" "./room-manager"
else
    echo -e "${RED}❌ Room Manager binary not found${NC}"
fi

# Start Worker
if [ -f "worker" ]; then
    start_service "worker" "./worker"
else
    echo -e "${RED}❌ Worker binary not found${NC}"
fi

# Start Gateway (last để đảm bảo dependencies ready)
if [ -f "gateway" ]; then
    start_service "gateway" "./gateway"
else
    echo -e "${RED}❌ Gateway binary not found${NC}"
fi

cd - > /dev/null

echo ""
echo -e "${GREEN}🎉 GameV1 started successfully!${NC}"
echo ""
echo "📊 Service Status:"
echo "   🌐 Gateway: http://localhost:8080"
echo "   🎮 Worker: localhost:50051"
echo "   🗄️  PocketBase: http://localhost:8090"
echo "   📊 Services: Check logs for port"
echo ""
echo "📝 Log files:"
ls -la logs/ 2>/dev/null || echo "   No logs yet"
echo ""
echo "🛑 To stop all services:"
echo "   ./scripts/stop-game-native.sh"
