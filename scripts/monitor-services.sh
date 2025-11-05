#!/bin/bash

# 🚀 GameV1 Service Monitor
# Real-time monitoring của tất cả services

echo "🚀 GameV1 Service Monitor"
echo "========================"
echo ""
echo "📊 Press Ctrl+C to stop monitoring"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show header
show_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}GameV1 Services Status${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Function to check all services
check_all_services() {
    local issues=0

    # Check each service
    for service in gamev1-gateway gamev1-worker gamev1-pocketbase gamev1-room-manager gamev1-services; do
        if systemctl is-active --quiet "$service"; then
            echo -e "${GREEN}✅ $service${NC}"
        else
            echo -e "${RED}❌ $service${NC}"
            issues=$((issues + 1))
        fi
    done

    echo ""
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}🎉 All services are running!${NC}"
    else
        echo -e "${RED}⚠️ $issues service(s) have issues${NC}"
    fi

    return $issues
}

# Function to show resource usage
show_resources() {
    echo ""
    echo -e "${BLUE}📈 System Resources:${NC}"

    # Memory usage
    echo "Memory Usage:"
    free -h | grep -E "(Mem|Swap)" | sed 's/^/  /'

    # Disk usage
    echo ""
    echo "Disk Usage (/opt/gamev1):"
    df -h /opt/gamev1 | tail -1 | awk '{print "  Used: " $3 " / Total: " $2 " (" $5 " used)"}'

    # Load average
    echo ""
    echo "Load Average:"
    uptime | awk -F'load average:' '{print "  " $2}'
}

# Function to show recent errors
show_recent_errors() {
    echo ""
    echo -e "${BLUE}🚨 Recent Errors (last 5 minutes):${NC}"

    local error_count=0
    for service in gamev1-gateway gamev1-worker gamev1-pocketbase gamev1-room-manager gamev1-services; do
        local count=$(journalctl -u "$service" --since "5 minutes ago" -p err..alert | wc -l)
        if [ "$count" -gt 0 ]; then
            echo -e "  ${RED}$service: $count errors${NC}"
            error_count=$((error_count + count))
        fi
    done

    if [ "$error_count" -eq 0 ]; then
        echo -e "  ${GREEN}No errors in the last 5 minutes${NC}"
    else
        echo -e "  ${RED}Total: $error_count errors${NC}"
    fi
}

# Function to show performance metrics
show_performance() {
    echo ""
    echo -e "${BLUE}⚡ Performance Metrics:${NC}"

    # Network connections
    echo "Active Connections:"
    if command -v ss &> /dev/null; then
        ss -tuln | grep -E "(8080|50051|8090)" | wc -l | awk '{print "  GameV1 ports: " $1 " connections"}'
    fi

    # Process count
    local process_count=$(ps aux | grep gamev1 | grep -v grep | wc -l)
    echo "GameV1 Processes: $process_count"

    # Uptime
    echo ""
    echo "Service Uptime:"
    for service in gamev1-gateway gamev1-worker gamev1-pocketbase; do
        local uptime=$(systemctl show "$service" -p ActiveEnterTimestamp --value 2>/dev/null | cut -d' ' -f1-2 || echo "Unknown")
        echo "  $service: $uptime"
    done
}

# Main monitoring loop
main() {
    # Trap Ctrl+C to exit gracefully
    trap 'echo -e "\n${GREEN}👋 Stopping monitor...${NC}"; exit 0' INT

    while true; do
        # Clear screen and show header
        clear
        show_header

        # Show current time
        echo -e "${YELLOW}📅 $(date)${NC}"
        echo ""

        # Check all services
        check_all_services
        local issues=$?

        # Show resources if there are no issues
        if [ $issues -eq 0 ]; then
            show_resources
            show_performance
        fi

        # Always show recent errors
        show_recent_errors

        # Wait before next update
        echo ""
        echo -e "${YELLOW}🔄 Next update in 10 seconds...${NC}"
        sleep 10
    done
}

# Run main function
main "$@"
