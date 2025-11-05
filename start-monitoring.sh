#!/bin/bash

# Start Monitoring Stack for GameV1
# This script starts all monitoring services and sets up Grafana

set -e

echo "🎯 Starting GameV1 Monitoring Stack..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting monitoring services...${NC}"

# Start monitoring services
docker-compose up -d gamev1-prometheus gamev1-grafana

echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Check if services are running
echo -e "${BLUE}Checking service status...${NC}"

if docker-compose ps | grep -q "gamev1-prometheus.*Up"; then
    echo -e "${GREEN}✓ Prometheus is running${NC}"
else
    echo -e "${RED}✗ Prometheus failed to start${NC}"
    exit 1
fi

if docker-compose ps | grep -q "gamev1-grafana.*Up"; then
    echo -e "${GREEN}✓ Grafana is running${NC}"
else
    echo -e "${RED}✗ Grafana failed to start${NC}"
    exit 1
fi

echo -e "${BLUE}Running Grafana setup...${NC}"
chmod +x scripts/setup-grafana.sh
./scripts/setup-grafana.sh

echo -e "${BLUE}Testing setup...${NC}"
chmod +x scripts/test-grafana-setup.sh
./scripts/test-grafana-setup.sh

echo ""
echo -e "${GREEN}🎉 Monitoring stack is ready!${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "${GREEN}Grafana:${NC} http://localhost:3000"
echo -e "${GREEN}Prometheus:${NC} http://localhost:9090"
echo ""
echo -e "${BLUE}Credentials:${NC}"
echo "Username: admin"
echo "Password: gamev1_admin_2024"
echo ""
echo -e "${YELLOW}Would you like to open Grafana in browser? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open > /dev/null; then
        open http://localhost:3000
    else
        echo -e "${YELLOW}Please open http://localhost:3000 in your browser${NC}"
    fi
fi
