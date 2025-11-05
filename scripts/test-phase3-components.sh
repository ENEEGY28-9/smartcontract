#!/bin/bash

# 🚀 GameV1 Phase 3 Components Test
# Test các components đã triển khai trong Phase 3 trên môi trường development

set -e

echo "🚀 Testing GameV1 Phase 3 Components..."
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Test 1: Kiểm tra cấu hình Load Balancer
echo -e "${BLUE}${BOLD}⚖️  Test 1: Load Balancer Configuration${NC}"
echo "Checking load balancer configuration files..."
if [ -f "phase3-load-balancer/nginx.conf" ]; then
    echo -e "${GREEN}✅ Load balancer configuration: EXISTS${NC}"
    echo "  - Nginx config: $(wc -l < phase3-load-balancer/nginx.conf) lines"
    echo "  - Service template: $(wc -l < phase3-load-balancer/nginx.service) lines"
    echo "  - Dashboard: $(wc -l < phase3-load-balancer/load-balancer-dashboard.json) lines"
else
    echo -e "${RED}❌ Load balancer configuration: MISSING${NC}"
fi
echo ""

# Test 2: Kiểm tra cấu hình Database Clustering
echo -e "${BLUE}${BOLD}🗄️  Test 2: Database Clustering Configuration${NC}"
echo "Checking database clustering configuration files..."
if [ -f "phase3-database-cluster/postgresql-master.conf" ]; then
    echo -e "${GREEN}✅ Database clustering configuration: EXISTS${NC}"
    echo "  - Master config: $(wc -l < phase3-database-cluster/postgresql-master.conf) lines"
    echo "  - Replica config: $(wc -l < phase3-database-cluster/postgresql-replica.conf) lines"
    echo "  - Setup script: $(wc -l < phase3-database-cluster/setup-replication.sh) lines"
    echo "  - Monitor script: $(wc -l < phase3-database-cluster/monitor-database-cluster.sh) lines"
else
    echo -e "${RED}❌ Database clustering configuration: MISSING${NC}"
fi
echo ""

# Test 3: Kiểm tra cấu hình Monitoring
echo -e "${BLUE}${BOLD}📊 Test 3: Monitoring Configuration${NC}"
echo "Checking monitoring configuration files..."
if [ -f "phase3-monitoring/collectd.conf" ]; then
    echo -e "${GREEN}✅ Monitoring configuration: EXISTS${NC}"
    echo "  - Collectd config: $(wc -l < phase3-monitoring/collectd.conf) lines"
    echo "  - Service file: $(wc -l < phase3-monitoring/collectd.service) lines"
    echo "  - Deploy script: $(wc -l < phase3-monitoring/deploy-collectd.sh) lines"
else
    echo -e "${RED}❌ Monitoring configuration: MISSING${NC}"
fi
echo ""

# Test 4: Kiểm tra cấu hình Hybrid Deployment
echo -e "${BLUE}${BOLD}🏗️  Test 4: Hybrid Deployment Configuration${NC}"
echo "Checking hybrid deployment configuration files..."
if [ -f "phase3-hybrid/hybrid-deployment-strategy.md" ]; then
    echo -e "${GREEN}✅ Hybrid deployment configuration: EXISTS${NC}"
    echo "  - Strategy doc: $(wc -l < phase3-hybrid/hybrid-deployment-strategy.md) lines"
    echo "  - Native config: $(wc -l < phase3-hybrid/native-deployment.yml) lines"
    echo "  - Container config: $(wc -l < phase3-hybrid/container-deployment.yml) lines"
    echo "  - Docker compose: $(wc -l < phase3-hybrid/docker-compose.hybrid.yml) lines"
    echo "  - Migration script: $(wc -l < phase3-hybrid/migrate-to-hybrid.sh) lines"
else
    echo -e "${RED}❌ Hybrid deployment configuration: MISSING${NC}"
fi
echo ""

# Test 5: Kiểm tra các binary production
echo -e "${BLUE}${BOLD}🚀 Test 5: Production Binaries${NC}"
echo "Checking production binaries..."
if [ -f "production/bin/gateway.exe" ]; then
    echo -e "${GREEN}✅ Production binaries: EXISTS${NC}"
    ls -lh production/bin/ | while read line; do
        echo "  $line"
    done
else
    echo -e "${RED}❌ Production binaries: MISSING${NC}"
fi
echo ""

# Test 6: Kiểm tra systemd services
echo -e "${BLUE}${BOLD}🔧 Test 6: Systemd Services${NC}"
echo "Checking systemd service files..."
SERVICE_COUNT=0
for service in systemd/gamev1-*.service; do
    if [ -f "$service" ]; then
        SERVICE_COUNT=$((SERVICE_COUNT + 1))
        echo -e "${GREEN}✅ $(basename "$service"): EXISTS${NC}"
    fi
done

if [ $SERVICE_COUNT -eq 0 ]; then
    echo -e "${RED}❌ Systemd services: MISSING${NC}"
else
    echo -e "${GREEN}✅ Found $SERVICE_COUNT systemd services${NC}"
fi
echo ""

# Test 7: Kiểm tra local services đang chạy
echo -e "${BLUE}${BOLD}🔍 Test 7: Local Services Status${NC}"
echo "Checking if local GameV1 services are running..."

# Check if PocketBase is running (on port 8090)
if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PocketBase (port 8090): RUNNING${NC}"
else
    echo -e "${YELLOW}⚠️  PocketBase (port 8090): NOT RUNNING${NC}"
fi

# Check if gateway would be accessible (port 8080)
if curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway (port 8080): RUNNING${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway (port 8080): NOT RUNNING${NC}"
fi

# Check if worker would be accessible (port 50051)
# Note: gRPC port, harder to test without client
echo -e "${YELLOW}⚠️  Worker (port 50051): gRPC - Manual check needed${NC}"
echo ""

# Summary
echo -e "${BLUE}${BOLD}📋 Phase 3 Components Test Summary${NC}"
echo "================================="

TOTAL_TESTS=7
PASSED_TESTS=0

# Count passed tests based on file existence
if [ -f "phase3-load-balancer/nginx.conf" ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if [ -f "phase3-database-cluster/postgresql-master.conf" ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if [ -f "phase3-monitoring/collectd.conf" ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if [ -f "phase3-hybrid/hybrid-deployment-strategy.md" ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if [ -f "production/bin/gateway.exe" ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if [ $SERVICE_COUNT -gt 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi

echo -e "${BOLD}Test Results: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Phase 3 components are properly configured.${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "  1. Deploy configurations to production servers"
    echo "  2. Test on actual multi-server environment"
    echo "  3. Monitor performance and adjust as needed"
else
    echo -e "${YELLOW}⚠️  Some components need attention${NC}"
    echo "  Check the test output above for missing configurations"
fi

echo ""
echo -e "${GREEN}✅ Phase 3 components test completed!${NC}"
