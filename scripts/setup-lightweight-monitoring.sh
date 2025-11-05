#!/bin/bash

# 📊 Setup Lightweight Monitoring cho GameV1
# Không dùng Docker - sử dụng tools native

set -e

echo "📊 Setting up lightweight monitoring for GameV1..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root${NC}"
    exit 1
fi

# Install monitoring tools
echo -e "${YELLOW}📦 Installing monitoring tools...${NC}"

# Install htop, iotop, iftop for basic monitoring
apt-get update
apt-get install -y htop iotop iftop nethogs

# Install collectd for metrics collection
apt-get install -y collectd collectd-utils

# Configure collectd for gamev1
echo -e "${YELLOW}⚙️  Configuring collectd...${NC}"
cat > /etc/collectd/collectd.conf << EOF
# GameV1 optimized collectd config

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

# Network monitoring
LoadPlugin network
<Plugin network>
    Server "127.0.0.1" "25826"
</Plugin>

# Process monitoring for game services
LoadPlugin processes
<Plugin processes>
    Process "gamev1-gateway"
    Process "gamev1-worker"
    Process "gamev1-room-manager"
    Process "gamev1-services"
    Process "redis-server"
</Plugin>

# Custom monitoring script
LoadPlugin exec
<Plugin exec>
    Exec "gamev1" "/opt/gamev1/monitor.sh"
</Plugin>
EOF

# Create custom monitoring script
echo -e "${YELLOW}📜 Creating custom monitoring script...${NC}"
cat > /opt/gamev1/monitor.sh << 'EOF'
#!/bin/bash
# Custom metrics for GameV1

while true; do
    # Get service status
    GATEWAY_STATUS=$(systemctl is-active gamev1-gateway 2>/dev/null || echo "inactive")
    WORKER_STATUS=$(systemctl is-active gamev1-worker 2>/dev/null || echo "inactive")
    REDIS_STATUS=$(systemctl is-active redis-server 2>/dev/null || echo "inactive")

    # Get connection counts
    GATEWAY_CONNS=$(ss -tuln | grep :8080 | wc -l || echo "0")
    WORKER_CONNS=$(ss -tuln | grep :50051 | wc -l || echo "0")

    # Get memory usage
    GATEWAY_MEM=$(ps -o rss= -p $(pgrep -f "gamev1-gateway" | head -1) 2>/dev/null || echo "0")
    WORKER_MEM=$(ps -o rss= -p $(pgrep -f "gamev1-worker" | head -1) 2>/dev/null || echo "0")

    # Output metrics in collectd format
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

chmod +x /opt/gamev1/monitor.sh
chown gamev1:gamev1 /opt/gamev1/monitor.sh

# Set up simple dashboard script
echo -e "${YELLOW}📊 Creating simple dashboard script...${NC}"
cat > /opt/gamev1/dashboard.sh << 'EOF'
#!/bin/bash
# Simple real-time dashboard for GameV1

echo "🎮 GameV1 Dashboard - $(date)"
echo "================================="

# Service status
echo "🔧 Services:"
systemctl status gamev1-gateway --no-pager -l | grep Active:
systemctl status gamev1-worker --no-pager -l | grep Active:
systemctl status gamev1-pocketbase --no-pager -l | grep Active:
systemctl status redis-server --no-pager -l | grep Active:
echo ""

# Resource usage
echo "💾 Resource Usage:"
echo "CPU: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1fG/%.1fG (%.0f%%)", $3/1024/1024, $2/1024/1024, $3*100/$2 }')"
echo "Disk: $(df -h / | awk 'NR==2{print $5} used')"
echo ""

# Network connections
echo "🌐 Network:"
echo "Gateway (8080): $(ss -tuln | grep :8080 | wc -l) connections"
echo "Worker (50051): $(ss -tuln | grep :50051 | wc -l) connections"
echo ""

# Top processes
echo "🔥 Top GameV1 processes:"
ps aux --sort=-%cpu | grep gamev1 | head -5 | awk '{printf "%-10s %5.1f%% CPU %7.1fMB MEM\n", $11, $3, $6/1024}'
echo ""

# Logs summary
echo "📜 Recent errors (last 5):"
journalctl -u gamev1-* --since "5 minutes ago" --no-pager | grep -i error | wc -l
EOF

chmod +x /opt/gamev1/dashboard.sh
chown gamev1:gamev1 /opt/gamev1/dashboard.sh

# Install Grafana if needed (lightweight web dashboard)
echo -e "${YELLOW}📈 Installing Grafana (optional web dashboard)...${NC}"
if ! command -v grafana-server &> /dev/null; then
    # Add Grafana repo
    wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
    echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list

    apt-get update
    apt-get install -y grafana

    # Configure Grafana for minimal resource usage
    mkdir -p /etc/grafana/provisioning/datasources
    cat > /etc/grafana/provisioning/datasources/collectd.yml << 'EOF'
apiVersion: 1

datasources:
  - name: CollectD
    type: influxdb
    access: proxy
    url: http://localhost:8086
    database: collectd
    isDefault: true
    editable: true

  - name: GameV1 Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: false
    editable: true
EOF

    # Configure Grafana for GameV1 specific dashboards
    mkdir -p /etc/grafana/provisioning/dashboards
    cat > /etc/grafana/provisioning/dashboards/gamev1.yml << 'EOF'
apiVersion: 1

providers:
  - name: GameV1
    orgId: 1
    folder: GameV1
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    systemctl enable grafana-server
    systemctl start grafana-server
fi

# Enable and start collectd
systemctl enable collectd
systemctl start collectd

echo -e "${GREEN}✅ Lightweight monitoring setup completed!${NC}"
echo ""
echo "📊 Monitoring Tools Available:"
echo "   - Real-time dashboard: /opt/gamev1/dashboard.sh"
echo "   - Process monitor: htop"
echo "   - Network monitor: iftop, nethogs"
echo "   - System metrics: collectd"
echo "   - Web dashboard: http://localhost:3000 (admin/admin)"
echo ""
echo "🔍 Quick Commands:"
echo "   - View dashboard: /opt/gamev1/dashboard.sh"
echo "   - Monitor processes: htop"
echo "   - Check connections: ss -tuln | grep gamev1"
echo "   - View logs: journalctl -u gamev1-* -f"
