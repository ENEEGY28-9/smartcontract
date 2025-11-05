#!/bin/bash

# 🚀 GameV1 Service Restart Script
# Restart tất cả services theo đúng thứ tự

set -e

echo "🚀 Restarting GameV1 Services..."
echo "==============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ Please run as root (sudo)${NC}"
        exit 1
    fi
}

# Function to stop all services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"

    # Stop services in reverse order
    for service in gamev1-gateway gamev1-services gamev1-worker gamev1-room-manager gamev1-pocketbase; do
        if systemctl is-active --quiet "$service"; then
            echo -e "${BLUE}⏹️ Stopping $service...${NC}"
            systemctl stop "$service"
            sleep 2
        else
            echo -e "${YELLOW}⚠️ $service already stopped${NC}"
        fi
    done

    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Function to start all services
start_services() {
    echo -e "${YELLOW}🚀 Starting all services...${NC}"

    # Start services in correct order
    echo -e "${BLUE}▶️ Starting gamev1-pocketbase...${NC}"
    systemctl start gamev1-pocketbase
    sleep 3

    echo -e "${BLUE}▶️ Starting gamev1-room-manager...${NC}"
    systemctl start gamev1-room-manager
    sleep 2

    echo -e "${BLUE}▶️ Starting gamev1-worker...${NC}"
    systemctl start gamev1-worker
    sleep 2

    echo -e "${BLUE}▶️ Starting gamev1-services...${NC}"
    systemctl start gamev1-services
    sleep 2

    echo -e "${BLUE}▶️ Starting gamev1-gateway...${NC}"
    systemctl start gamev1-gateway
    sleep 3

    echo -e "${GREEN}✅ All services started${NC}"
}

# Function to check service status
check_status() {
    echo -e "${YELLOW}📊 Checking service status...${NC}"
    echo ""

    local all_running=true

    for service in gamev1-gateway gamev1-worker gamev1-pocketbase gamev1-room-manager gamev1-services; do
        if systemctl is-active --quiet "$service"; then
            echo -e "${GREEN}✅ $service${NC}"
        else
            echo -e "${RED}❌ $service${NC}"
            all_running=false
        fi
    done

    echo ""
    if $all_running; then
        echo -e "${GREEN}🎉 All services are running!${NC}"
        echo ""
        echo "🔧 Quick access:"
        echo "   Monitor: ./scripts/monitor-services.sh"
        echo "   Logs: sudo journalctl -u gamev1-* -f"
        echo "   Status: sudo systemctl status gamev1-*"
    else
        echo -e "${RED}⚠️ Some services failed to start${NC}"
        echo ""
        echo "🔧 Troubleshooting:"
        echo "   Check logs: sudo journalctl -u gamev1-* --since '1 minute ago'"
        echo "   Service status: sudo systemctl status gamev1-gateway"
    fi
}

# Function to perform health check
health_check() {
    echo -e "${YELLOW}🏥 Performing health check...${NC}"

    local all_healthy=true

    # Test gateway
    if curl -s http://localhost:8080/healthz > /dev/null; then
        echo -e "${GREEN}✅ Gateway: Healthy${NC}"
    else
        echo -e "${RED}❌ Gateway: Unhealthy${NC}"
        all_healthy=false
    fi

    # Test pocketbase
    if curl -s http://localhost:8090/api/health > /dev/null; then
        echo -e "${GREEN}✅ PocketBase: Healthy${NC}"
    else
        echo -e "${RED}❌ PocketBase: Unhealthy${NC}"
        all_healthy=false
    fi

    echo ""
    if $all_healthy; then
        echo -e "${GREEN}🎉 All services are healthy!${NC}"
    else
        echo -e "${RED}⚠️ Some services are unhealthy${NC}"
    fi
}

# Main function
main() {
    echo -e "${GREEN}🔄 GameV1 Service Restart${NC}"
    echo "========================"

    check_root

    echo ""
    echo "📋 Restart Plan:"
    echo "   1. Stop all services (reverse order)"
    echo "   2. Start all services (correct order)"
    echo "   3. Verify all services are running"
    echo "   4. Perform health check"
    echo ""

    read -p "⚠️ This will restart all services. Continue? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}👋 Restart cancelled${NC}"
        exit 0
    fi

    echo -e "${BLUE}🔄 Starting restart process...${NC}"

    stop_services
    sleep 2
    start_services
    sleep 3
    check_status
    sleep 2
    health_check

    echo ""
    echo -e "${GREEN}✅ Restart completed!${NC}"
    echo ""
    echo "📚 Useful Commands:"
    echo "   Monitor services: ./scripts/monitor-services.sh"
    echo "   View logs: sudo journalctl -u gamev1-* -f"
    echo "   Check status: sudo systemctl status gamev1-*"
    echo "   Restart single service: sudo systemctl restart gamev1-gateway"
    echo ""
    echo -e "${GREEN}🚀 GameV1 services are ready!${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "stop")
        check_root
        stop_services
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    "start")
        check_root
        start_services
        echo -e "${GREEN}✅ All services started${NC}"
        ;;
    "status")
        check_status
        ;;
    "health")
        health_check
        ;;
    *)
        main "$@"
        ;;
esac
