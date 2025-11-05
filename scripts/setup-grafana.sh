#!/bin/bash

# GameV1 Grafana Setup Script
# This script sets up Grafana with all dashboards and configurations

set -e

echo "🎯 Setting up Grafana for GameV1..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker-compose is running
if ! docker-compose ps | grep -q "gamev1-grafana"; then
    echo -e "${YELLOW}Starting Grafana service...${NC}"
    docker-compose up -d gamev1-grafana gamev1-prometheus
fi

# Wait for Grafana to be ready
echo -e "${BLUE}Waiting for Grafana to start...${NC}"
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}Grafana is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}Grafana failed to start within 60 seconds${NC}"
    exit 1
fi

echo -e "${BLUE}Setting up Grafana configurations...${NC}"

# Set admin password via API
echo -e "${BLUE}Setting admin password...${NC}"
curl -X PUT -H "Content-Type: application/json" -d '{
  "oldPassword": "admin",
  "newPassword": "gamev1_admin_2024",
  "confirmNew": "gamev1_admin_2024"
}' http://admin:admin@localhost:3000/api/admin/users/1/password

# Create API key for automation
echo -e "${BLUE}Creating API key...${NC}"
API_KEY=$(curl -X POST -H "Content-Type: application/json" -d '{
  "name": "GameV1 Automation",
  "role": "Admin"
}' http://admin:gamev1_admin_2024@localhost:3000/api/auth/keys | jq -r '.key')

echo -e "${GREEN}API Key created: ${API_KEY}${NC}"

# Setup datasources
echo -e "${BLUE}Configuring datasources...${NC}"
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://gamev1-prometheus:9090",
    "access": "proxy",
    "isDefault": true
  }' http://localhost:3000/api/datasources

echo -e "${GREEN}Datasources configured!${NC}"

# Import dashboards
echo -e "${BLUE}Importing dashboards...${NC}"

DASHBOARDS=(
    "gamev1-overview"
    "gateway-performance"
    "game-metrics"
    "system-health"
    "alert-overview"
)

for dashboard in "${DASHBOARDS[@]}"; do
    echo -e "${YELLOW}Importing ${dashboard} dashboard...${NC}"

    # Check if dashboard file exists
    if [ -f "config/grafana/dashboards/${dashboard}.json" ]; then
        # Import dashboard
        curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${API_KEY}" \
          -d @config/grafana/dashboards/${dashboard}.json \
          http://localhost:3000/api/dashboards/db
        echo -e "${GREEN}${dashboard} dashboard imported!${NC}"
    else
        echo -e "${RED}Dashboard file not found: ${dashboard}.json${NC}"
    fi
done

echo -e "${GREEN}All dashboards imported!${NC}"

# Setup notification channels
echo -e "${BLUE}Setting up notification channels...${NC}"

# Discord webhook (if configured)
if [ ! -z "${DISCORD_WEBHOOK_URL}" ]; then
    curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${API_KEY}" \
      -d '{
        "name": "Discord",
        "type": "discord",
        "settings": {
          "webhookUrl": "'${DISCORD_WEBHOOK_URL}'"
        }
      }' http://localhost:3000/api/alert-notifications
    echo -e "${GREEN}Discord notifications configured!${NC}"
fi

# Email notifications
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "name": "Email",
    "type": "email",
    "settings": {
      "addresses": "admin@gamev1.com"
    }
  }' http://localhost:3000/api/alert-notifications

echo -e "${GREEN}Email notifications configured!${NC}"

# Setup basic alert rules
echo -e "${BLUE}Setting up alert rules...${NC}"

# Create folder for alert rules
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "title": "GameV1 Alerts"
  }' http://localhost:3000/api/folders

echo -e "${GREEN}Alert rules folder created!${NC}"

echo -e "${GREEN}Grafana setup completed!${NC}"
echo ""
echo -e "${BLUE}Access Grafana at: ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}Username: ${GREEN}admin${NC}"
echo -e "${BLUE}Password: ${GREEN}gamev1_admin_2024${NC}"
echo ""
echo -e "${YELLOW}Available dashboards:${NC}"
echo -e "  • ${GREEN}GameV1 Overview${NC} - General system overview"
echo -e "  • ${GREEN}Gateway Performance${NC} - API and connection monitoring"
echo -e "  • ${GREEN}Game Metrics${NC} - Gameplay and performance metrics"
echo -e "  • ${GREEN}System Health${NC} - Infrastructure monitoring"
echo -e "  • ${GREEN}Alert Overview${NC} - Alert monitoring and status"
