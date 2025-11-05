#!/bin/bash

# 🛑 Stop GameV1 Native Services

set -e

echo "🛑 Stopping GameV1 native services..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Stop services by PID files
if [ -d "pids" ]; then
    echo -e "${YELLOW}📋 Stopping services by PID files...${NC}"
    for pid_file in pids/*.pid; do
        if [ -f "$pid_file" ]; then
            service_name=$(basename "$pid_file" .pid)
            pid=$(cat "$pid_file")

            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}🛑 Stopping $service_name (PID: $pid)...${NC}"
                kill -TERM "$pid"

                # Wait up to 10 seconds for graceful shutdown
                for i in {1..10}; do
                    if ! kill -0 "$pid" 2>/dev/null; then
                        echo -e "${GREEN}✅ $service_name stopped gracefully${NC}"
                        break
                    fi
                    sleep 1
                done

                # Force kill if still running
                if kill -0 "$pid" 2>/dev/null; then
                    echo -e "${YELLOW}⚠️  Force killing $service_name...${NC}"
                    kill -KILL "$pid"
                    echo -e "${GREEN}✅ $service_name force stopped${NC}"
                fi
            else
                echo -e "${YELLOW}ℹ️  $service_name (PID: $pid) already stopped${NC}"
            fi

            rm "$pid_file"
        fi
    done
else
    echo -e "${YELLOW}ℹ️  No PID files found${NC}"
fi

# Stop Redis
echo -e "${YELLOW}🔴 Stopping Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    redis-cli shutdown || sudo systemctl stop redis-server || echo -e "${YELLOW}⚠️  Could not stop Redis gracefully${NC}"
    echo -e "${GREEN}✅ Redis stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  Redis CLI not found${NC}"
fi

# Clean up directories
if [ -d "logs" ]; then
    echo -e "${YELLOW}🧹 Cleaning up log files older than 7 days...${NC}"
    find logs/ -name "*.log" -type f -mtime +7 -delete
    echo -e "${GREEN}✅ Cleanup completed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All GameV1 services stopped!${NC}"
echo ""
echo "📊 System Status:"
echo "   - Check active processes: ps aux | grep gamev1"
echo "   - Check ports: netstat -tuln | grep -E '(8080|50051|8090)'"
