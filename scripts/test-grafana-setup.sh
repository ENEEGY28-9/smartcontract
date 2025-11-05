#!/bin/bash

# Test Grafana Setup Script
# This script verifies that Grafana is properly configured

set -e

echo "🧪 Testing Grafana Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Grafana is running
echo -e "${BLUE}1. Checking Grafana service...${NC}"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Grafana is running${NC}"
else
    echo -e "${RED}✗ Grafana is not running${NC}"
    echo -e "${YELLOW}Start Grafana: docker-compose up -d gamev1-grafana${NC}"
    exit 1
fi

# Check if Prometheus is running
echo -e "${BLUE}2. Checking Prometheus service...${NC}"
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prometheus is running${NC}"
else
    echo -e "${RED}✗ Prometheus is not running${NC}"
    exit 1
fi

# Check metrics endpoints
echo -e "${BLUE}3. Testing metrics endpoints...${NC}"

# Gateway metrics
if curl -f http://localhost:8080/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Gateway metrics available${NC}"
else
    echo -e "${YELLOW}! Gateway metrics not available (service not running?)${NC}"
fi

# Worker metrics (if available)
if curl -f http://localhost:3100/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Worker metrics available${NC}"
else
    echo -e "${YELLOW}! Worker metrics not available (service not running?)${NC}"
fi

# Room manager metrics (if available)
if curl -f http://localhost:3200/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Room Manager metrics available${NC}"
else
    echo -e "${YELLOW}! Room Manager metrics not available (service not running?)${NC}"
fi

# Check Prometheus targets
echo -e "${BLUE}4. Checking Prometheus targets...${NC}"
TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[].health' | grep -c "up" || echo "0")

if [ "$TARGETS" -gt "0" ]; then
    echo -e "${GREEN}✓ Prometheus has $TARGETS active targets${NC}"
else
    echo -e "${YELLOW}! No active Prometheus targets${NC}"
fi

# Test dashboard files exist
echo -e "${BLUE}5. Checking dashboard files...${NC}"
DASHBOARDS=(
    "gamev1-overview.json"
    "gateway-performance.json"
    "game-metrics.json"
    "system-health.json"
    "alert-overview.json"
)

MISSING_DASHBOARDS=()
for dashboard in "${DASHBOARDS[@]}"; do
    if [ -f "config/grafana/dashboards/$dashboard" ]; then
        echo -e "${GREEN}✓ $dashboard exists${NC}"
    else
        echo -e "${RED}✗ $dashboard missing${NC}"
        MISSING_DASHBOARDS+=("$dashboard")
    fi
done

# Check provisioning files
echo -e "${BLUE}6. Checking provisioning files...${NC}"
if [ -f "config/grafana/datasources/prometheus.yml" ]; then
    echo -e "${GREEN}✓ Datasource provisioning configured${NC}"
else
    echo -e "${RED}✗ Datasource provisioning missing${NC}"
fi

if [ -f "config/grafana/dashboards/dashboards.yml" ]; then
    echo -e "${GREEN}✓ Dashboard provisioning configured${NC}"
else
    echo -e "${RED}✗ Dashboard provisioning missing${NC}"
fi

# Test Grafana API access
echo -e "${BLUE}7. Testing Grafana API access...${NC}"
if curl -f -u admin:gamev1_admin_2024 http://localhost:3000/api/datasources > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Grafana API access working${NC}"
else
    echo -e "${YELLOW}! Grafana API access failed (check credentials)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Test Summary:${NC}"

if [ ${#MISSING_DASHBOARDS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All dashboard files present${NC}"
else
    echo -e "${RED}✗ Missing dashboards: ${MISSING_DASHBOARDS[*]}${NC}"
fi

echo -e "${BLUE}📈 Next Steps:${NC}"
echo "1. Access Grafana: http://localhost:3000"
echo "2. Username: admin, Password: gamev1_admin_2024"
echo "3. Check dashboards are imported correctly"
echo "4. Verify metrics are being collected"
echo "5. Test alerting functionality"

echo ""
echo -e "${GREEN}🎉 Grafana setup test completed!${NC}"
