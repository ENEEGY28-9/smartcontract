#!/bin/bash

# 📊 Setup Native Monitoring (Không cần Docker)
# Thay thế hoàn toàn monitoring stack bằng native tools

set -e

echo "📊 Setting up native monitoring for GameV1 (no Docker)..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Install native monitoring tools
echo -e "${YELLOW}📦 Installing native monitoring tools...${NC}"

# Install system monitoring tools
sudo apt-get update
sudo apt-get install -y collectd collectd-utils grafana

# Install additional monitoring tools
sudo apt-get install -y htop iotop iftop nethogs sysstat

# Configure Collectd for GameV1
echo -e "${YELLOW}⚙️  Configuring Collectd...${NC}"
sudo tee /etc/collectd/collectd.conf > /dev/null << EOF
# GameV1 Native Monitoring Configuration

Hostname "$(hostname)"
FQDNLookup false
Interval 10

LoadPlugin syslog
LoadPlugin cpu
LoadPlugin memory
LoadPlugin disk
LoadPlugin interface
LoadPlugin load
LoadPlugin processes
LoadPlugin uptime

# GameV1 specific monitoring
LoadPlugin exec
<Plugin exec>
    Exec "gamev1" "/opt/gamev1/collect-game-metrics.sh"
</Plugin>

# Network monitoring for game services
LoadPlugin network
<Plugin network>
    Server "127.0.0.1" "25826"
</Plugin>
EOF

# Create custom metrics collection script
echo -e "${YELLOW}📜 Creating GameV1 metrics collector...${NC}"
sudo tee /opt/gamev1/collect-game-metrics.sh > /dev/null << 'EOF'
#!/bin/bash
# Collect GameV1 specific metrics

while true; do
    # Get service status
    GATEWAY_STATUS=$(systemctl is-active gamev1-gateway 2>/dev/null || echo "0")
    WORKER_STATUS=$(systemctl is-active gamev1-worker 2>/dev/null || echo "0")
    REDIS_STATUS=$(systemctl is-active redis-server 2>/dev/null || echo "0")

    # Get connection counts
    GATEWAY_CONNS=$(ss -tuln | grep :8080 | wc -l || echo "0")
    WORKER_CONNS=$(ss -tuln | grep :50051 | wc -l || echo "0")

    # Get memory usage
    GATEWAY_MEM=$(ps -o rss= -p $(pgrep -f "gamev1-gateway" | head -1) 2>/dev/null || echo "0")
    WORKER_MEM=$(ps -o rss= -p $(pgrep -f "gamev1-worker" | head -1) 2>/dev/null || echo "0")

    # Output in Collectd format
    echo "PUTVAL \"$(hostname)/gamev1/gauge-gateway_status\" N:$(echo $GATEWAY_STATUS | sed 's/active/1/;s/inactive/0/')"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-worker_status\" N:$(echo $WORKER_STATUS | sed 's/active/1/;s/inactive/0/')"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-redis_status\" N:$(echo $REDIS_STATUS | sed 's/active/1/;s/inactive/0/')"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-gateway_connections\" N:$GATEWAY_CONNS"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-worker_connections\" N:$WORKER_CONNS"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-gateway_memory\" N:${GATEWAY_MEM:-0}"
    echo "PUTVAL \"$(hostname)/gamev1/gauge-worker_memory\" N:${WORKER_MEM:-0}"

    sleep 10
done
EOF

sudo chmod +x /opt/gamev1/collect-game-metrics.sh
sudo chown gamev1:gamev1 /opt/gamev1/collect-game-metrics.sh

# Configure Grafana for native deployment
echo -e "${YELLOW}🎨 Configuring Grafana...${NC}"
sudo tee /etc/grafana/grafana.ini > /dev/null << EOF
[server]
http_port = 3000
domain = localhost

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[session]
provider = file
provider_config = sessions

[analytics]
check_for_updates = false

[security]
admin_password = admin
EOF

# Create Grafana dashboards directory
sudo mkdir -p /etc/grafana/dashboards /etc/grafana/provisioning/datasources

# Create simple dashboard for GameV1
sudo tee /etc/grafana/dashboards/gamev1-overview.json > /dev/null << EOF
{
  "dashboard": {
    "title": "GameV1 Server Overview",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "cpu_usage",
            "legendFormat": "CPU %"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "memory_usage",
            "legendFormat": "Memory %"
          }
        ]
      },
      {
        "title": "Game Services Status",
        "type": "stat",
        "targets": [
          {
            "expr": "gamev1_gateway_status",
            "legendFormat": "Gateway"
          },
          {
            "expr": "gamev1_worker_status",
            "legendFormat": "Worker"
          }
        ]
      }
    ]
  }
}
EOF

# Create datasource configuration
sudo tee /etc/grafana/provisioning/datasources/collectd.yml > /dev/null << EOF
apiVersion: 1

datasources:
  - name: CollectD
    type: influxdb
    access: proxy
    url: http://localhost:8086
    database: collectd
    isDefault: true
    editable: true
EOF

# Setup log rotation for monitoring logs
sudo tee /etc/logrotate.d/gamev1-monitoring > /dev/null << EOF
/var/log/collectd.log /opt/gamev1/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 gamev1 gamev1
}
EOF

# Enable and start services
echo -e "${YELLOW}🚀 Starting native monitoring services...${NC}"
sudo systemctl enable collectd
sudo systemctl start collectd

sudo systemctl enable grafana-server
sudo systemctl start grafana-server

# Create real-time dashboard script
echo -e "${YELLOW}📊 Creating real-time dashboard...${NC}"
sudo tee /opt/gamev1/dashboard.sh > /dev/null << 'EOF'
#!/bin/bash
# Real-time dashboard for GameV1

echo "🎮 GameV1 Dashboard - $(date)"
echo "================================"

# Service status
echo "🔧 Services Status:"
systemctl is-active gamev1-gateway && echo "✅ Gateway: Running" || echo "❌ Gateway: Stopped"
systemctl is-active gamev1-worker && echo "✅ Worker: Running" || echo "❌ Worker: Stopped"
systemctl is-active gamev1-pocketbase && echo "✅ PocketBase: Running" || echo "❌ PocketBase: Stopped"
systemctl is-active redis-server && echo "✅ Redis: Running" || echo "❌ Redis: Stopped"
echo ""

# Resource usage
echo "💾 Resource Usage:"
echo "CPU: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1fG/%.1fG (%.0f%%)", $3/1024/1024, $2/1024/1024, $3*100/$2 }')"
echo "Disk: $(df -h / | awk 'NR==2{print $5} used')"
echo ""

# Network connections
echo "🌐 Network Connections:"
echo "Gateway (8080): $(ss -tuln | grep :8080 | wc -l) connections"
echo "Worker (50051): $(ss -tuln | grep :50051 | wc -l) connections"
echo ""

# Top processes
echo "🔥 Top GameV1 Processes:"
ps aux --sort=-%cpu | grep gamev1 | head -3 | awk '{printf "%-15s %5.1f%% CPU %7.1fMB MEM\n", $11, $3, $6/1024}'
echo ""

# Recent errors
echo "📜 Recent Errors (last 5 min):"
journalctl -u gamev1-* --since "5 minutes ago" | grep -i error | wc -l
EOF

sudo chmod +x /opt/gamev1/dashboard.sh
sudo chown gamev1:gamev1 /opt/gamev1/dashboard.sh

echo -e "${GREEN}✅ Native monitoring setup completed!${NC}"
echo ""
echo "📊 Monitoring Services Available:"
echo "   🌐 Grafana: http://localhost:3000 (admin/admin)"
echo "   📈 Collectd: Running with GameV1 metrics"
echo "   💻 Dashboard: /opt/gamev1/dashboard.sh"
echo ""
echo "🔍 Quick Commands:"
echo "   - View dashboard: /opt/gamev1/dashboard.sh"
echo "   - Check services: systemctl status gamev1-*"
echo "   - View logs: journalctl -u gamev1-* -f"
echo "   - Monitor resources: htop"
