#!/bin/bash

# 🚀 GameV1 Service Status Checker
# Monitor tất cả services trong hệ thống

set -e

echo "🚀 GameV1 Service Status Check..."
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check service status
check_service() {
    local service_name=$1
    local port=${2:-""}

    echo ""
    echo -e "${BLUE}📊 $service_name Status:${NC}"

    # Check systemd status
    if systemctl is-active --quiet "$service_name"; then
        echo -e "${GREEN}✅ $service_name is running${NC}"

        # Check port if specified
        if [ ! -z "$port" ]; then
            if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
                echo -e "${GREEN}✅ Port $port is listening${NC}"
            else
                echo -e "${YELLOW}⚠️ Port $port not found (service may still be starting)${NC}"
            fi
        fi

        # Show recent logs
        echo -e "${BLUE}📋 Recent logs:${NC}"
        journalctl -u "$service_name" -n 3 --no-pager | sed 's/^/  /'

    else
        echo -e "${RED}❌ $service_name is not running${NC}"

        # Show failed status
        systemctl status "$service_name" --no-pager -l | head -10 | sed 's/^/  /'
    fi
}

# Function to check overall health
check_health() {
    echo ""
    echo -e "${BLUE}🏥 Health Check:${NC}"

    local all_healthy=true

    # Test gateway health endpoint
    if curl -s http://localhost:8080/healthz > /dev/null; then
        echo -e "${GREEN}✅ Gateway health check: PASS${NC}"
    else
        echo -e "${RED}❌ Gateway health check: FAIL${NC}"
        all_healthy=false
    fi

    # Test worker connectivity (if accessible)
    if curl -s http://localhost:50051/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Worker connectivity: OK${NC}"
    else
        echo -e "${YELLOW}⚠️ Worker health endpoint not accessible${NC}"
    fi

    # Test database connectivity
    if curl -s http://localhost:8090/api/health > /dev/null; then
        echo -e "${GREEN}✅ PocketBase connectivity: OK${NC}"
    else
        echo -e "${RED}❌ PocketBase connectivity: FAIL${NC}"
        all_healthy=false
    fi

    echo ""
    if $all_healthy; then
        echo -e "${GREEN}🎉 All critical services are healthy!${NC}"
    else
        echo -e "${RED}⚠️ Some services have issues${NC}"
    fi
}

# Function to show resource usage
show_resources() {
    echo ""
    echo -e "${BLUE}📈 Resource Usage:${NC}"

    # Show process information
    echo "Process Information:"
    ps aux | grep gamev1 | grep -v grep | while read line; do
        echo "  $line"
    done

    # Show memory usage
    echo ""
    echo "Memory Usage:"
    if command -v systemd-cgtop &> /dev/null; then
        systemd-cgtop -b -n 1 | grep gamev1 | head -5 | sed 's/^/  /'
    fi
}

# Function to show logs summary
show_logs_summary() {
    echo ""
    echo -e "${BLUE}📋 Logs Summary:${NC}"

    # Show error counts
    echo "Error Summary (last 1000 lines):"
    for service in gamev1-gateway gamev1-worker gamev1-pocketbase gamev1-room-manager gamev1-services; do
        error_count=$(journalctl -u "$service" --since "1 hour ago" -p err..alert | wc -l)
        if [ "$error_count" -gt 0 ]; then
            echo -e "  ${RED}$service: $error_count errors${NC}"
        else
            echo -e "  ${GREEN}$service: No errors${NC}"
        fi
    done
}

# Main function
main() {
    # Check individual services
    check_service "gamev1-gateway" "8080"
    check_service "gamev1-worker" "50051"
    check_service "gamev1-pocketbase" "8090"
    check_service "gamev1-room-manager"
    check_service "gamev1-services"

    # Health check
    check_health

    # Resource usage
    show_resources

    # Logs summary
    show_logs_summary

    echo ""
    echo -e "${GREEN}✅ Status check completed${NC}"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   Monitor all logs: sudo journalctl -u gamev1-* -f"
    echo "   Restart service: sudo systemctl restart gamev1-gateway"
    echo "   View service logs: sudo journalctl -u gamev1-gateway -f"
    echo "   Check resource usage: htop"
}

# Run main function
main "$@"
