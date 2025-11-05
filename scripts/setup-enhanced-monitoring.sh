#!/bin/bash

# 🚀 GameV1 Enhanced Monitoring Setup
# Lightweight monitoring với metrics và alerting tối ưu

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

MONITORING_TYPE=${1:-"lightweight"}  # lightweight, full, hybrid
CONFIG_DIR=${2:-"monitoring-config"}

echo -e "${BLUE}${BOLD}📊 GameV1 Enhanced Monitoring Setup${NC}"
echo "=================================="
echo -e "Monitoring type: ${YELLOW}$MONITORING_TYPE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to setup lightweight monitoring
setup_lightweight_monitoring() {
    echo -e "${BLUE}⚡ Setting up lightweight monitoring...${NC}"

    # Create collectd configuration for native services
    cat > "$CONFIG_DIR/collectd.conf" << EOF
# GameV1 Collectd Configuration
# Lightweight system monitoring for game servers

Hostname "$(hostname)"
FQDNLookup false
Interval 10

# Load plugins
LoadPlugin cpu
LoadPlugin memory
LoadPlugin load
LoadPlugin disk
LoadPlugin interface
LoadPlugin processes
LoadPlugin uptime
LoadPlugin users

# Process monitoring for game services
<Plugin processes>
    Process "gamev1-gateway"
    Process "gamev1-worker"
    Process "gamev1-pocketbase"
</Plugin>

# Network interface monitoring
<Plugin interface>
    Interface "lo"
    Interface "eth0"
    IgnoreSelected false
</Plugin>

# Disk monitoring (for logs and data)
<Plugin disk>
    Disk "/opt/gamev1"
    Disk "/"
    IgnoreSelected false
</Plugin>

# Write to Prometheus format
<Plugin write_prometheus>
    Port "9100"
    StaleWritesTimeout 300
</Plugin>

# Log to file
<Plugin csv>
    DataDir "/var/lib/collectd/csv"
    StoreRates false
</Plugin>

# Network server for collectd
<Plugin network>
    Listen "0.0.0.0" "25826"
</Plugin>
EOF

    # Create systemd service for collectd
    cat > "$CONFIG_DIR/collectd.service" << EOF
[Unit]
Description=Collectd - System Statistics Collection Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/collectd -C /etc/collectd/collectd.conf -f
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/collectd /var/log/collectd /tmp

# Resource limits (lightweight)
LimitNOFILE=1024
MemoryLimit=64M

[Install]
WantedBy=multi-user.target
EOF

    # Create deployment script
    cat > "$CONFIG_DIR/deploy-collectd.sh" << 'EOF'
#!/bin/bash
# Deploy collectd monitoring

set -e

echo "📊 Deploying collectd monitoring..."

# Install collectd if not present
if ! command -v collectd &> /dev/null; then
    echo "📦 Installing collectd..."
    sudo apt-get update
    sudo apt-get install -y collectd collectd-utils
fi

# Create directories
sudo mkdir -p /var/lib/collectd/csv
sudo mkdir -p /var/log/collectd

# Copy configuration
sudo cp collectd.conf /etc/collectd/collectd.conf
sudo cp collectd.service /etc/systemd/system/gamev1-collectd.service

# Set permissions
sudo chown -R collectd:collectd /var/lib/collectd /var/log/collectd

# Test configuration
sudo collectd -t -C /etc/collectd/collectd.conf

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable gamev1-collectd
sudo systemctl restart gamev1-collectd

# Verify service
if sudo systemctl is-active --quiet gamev1-collectd; then
    echo "✅ Collectd monitoring deployed successfully"
    echo ""
    echo "📊 Metrics available at: http://$(hostname -I | awk '{print $1}'):9100/metrics"
else
    echo "❌ Failed to start collectd"
    exit 1
fi
EOF

    chmod +x "$CONFIG_DIR/deploy-collectd.sh"

    echo -e "${GREEN}✅ Lightweight monitoring configuration created${NC}"
}

# Function to setup full monitoring stack
setup_full_monitoring() {
    echo -e "${BLUE}🔬 Setting up full monitoring stack...${NC}"

    # Create enhanced Prometheus configuration
    cat > "$CONFIG_DIR/prometheus-enhanced.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'gamev1-monitor'

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  # Self monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 30s

  # Alertmanager
  - job_name: 'alertmanager'
    static_configs:
      - targets: ['alertmanager:9093']
    scrape_interval: 30s

  # Game Gateway servers
  - job_name: 'gamev1-gateway'
    static_configs:
      - targets: ['gateway1:8080', 'gateway2:8080', 'gateway3:8080']
        labels:
          service: 'gateway'
    scrape_interval: 10s
    metrics_path: '/metrics'

  # Game Worker servers
  - job_name: 'gamev1-worker'
    static_configs:
      - targets: ['worker1:3100', 'worker2:3100', 'worker3:3100']
        labels:
          service: 'worker'
    scrape_interval: 10s
    metrics_path: '/metrics'

  # System monitoring (collectd)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['server1:9100', 'server2:9100', 'server3:9100']
        labels:
          service: 'system'
    scrape_interval: 30s

  # Database monitoring
  - job_name: 'pocketbase'
    static_configs:
      - targets: ['pocketbase:8090']
    scrape_interval: 30s
    metrics_path: '/metrics'

  # Redis monitoring
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF

    # Create comprehensive alert rules
    cat > "$CONFIG_DIR/alert_rules.yml" << EOF
groups:
  - name: gamev1_alerts
    rules:
      # Service availability alerts
      - alert: GameGatewayDown
        expr: up{job="gamev1-gateway"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Game Gateway is down"
          description: "Game Gateway has been down for more than 30 seconds"

      - alert: GameWorkerDown
        expr: up{job="gamev1-worker"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Game Worker is down"
          description: "Game Worker has been down for more than 30 seconds"

      # Performance alerts
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(gateway_request_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "95th percentile response time is above 1 second"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 85% for more than 5 minutes"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80% for more than 5 minutes"

      # Game-specific alerts
      - alert: HighPlayerCount
        expr: gamev1_players_active > 1000
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "High player count"
          description: "More than 1000 players currently active"

      - alert: RoomCreationSpike
        expr: increase(gamev1_rooms_created_total[5m]) > 100
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "Room creation spike"
          description: "More than 100 rooms created in 5 minutes"

      # Error rate alerts
      - alert: HighErrorRate
        expr: rate(gateway_requests_total{status=~"5.."}[5m]) / rate(gateway_requests_total[5m]) * 100 > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is above 5% for more than 2 minutes"

      # Database alerts
      - alert: DatabaseConnectionPoolExhausted
        expr: gamev1_db_connections_active / gamev1_db_connections_max > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Database connection pool usage is above 90%"

      # Rate limiting alerts
      - alert: RateLimitTriggered
        expr: increase(gamev1_rate_limited_requests_total[5m]) > 50
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Rate limiting triggered"
          description: "More than 50 requests rate limited in 5 minutes"
EOF

    # Create Alertmanager configuration
    cat > "$CONFIG_DIR/alertmanager.yml" << EOF
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@gamev1.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-notifications'

  routes:
    - match:
        severity: critical
      receiver: 'email-notifications'
      continue: true

    - match:
        severity: warning
      receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@gamev1.com'
        subject: '[GameV1 Alert] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          {{ end }}

  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#gamev1-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname']
EOF

    echo -e "${GREEN}✅ Full monitoring stack configuration created${NC}"
}

# Function to setup hybrid monitoring
setup_hybrid_monitoring() {
    echo -e "${BLUE}🔀 Setting up hybrid monitoring...${NC}"

    # Create hybrid monitoring configuration that combines lightweight and full monitoring
    setup_lightweight_monitoring
    setup_full_monitoring

    # Create hybrid deployment script
    cat > "$CONFIG_DIR/deploy-hybrid-monitoring.sh" << 'EOF'
#!/bin/bash
# Deploy hybrid monitoring setup

set -e

echo "🚀 Deploying hybrid monitoring stack..."

# Deploy collectd for lightweight monitoring
./deploy-collectd.sh

# Deploy full Prometheus stack
echo "🐳 Deploying Prometheus and Grafana..."

# Create docker-compose for monitoring
cat > docker-compose.monitoring.yml << 'DOCKER_EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus-enhanced.yml:/etc/prometheus/prometheus.yml:ro
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring-network

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
    networks:
      - monitoring-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana-datasources:/etc/grafana/provisioning/datasources:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=gamev1admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - prometheus
    networks:
      - monitoring-network

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped
    networks:
      - monitoring-network

networks:
  monitoring-network:
    driver: bridge

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
DOCKER_EOF

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to start
sleep 30

# Verify monitoring endpoints
echo "🔍 Verifying monitoring services..."

if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus: Healthy"
else
    echo "❌ Prometheus: Not accessible"
fi

if curl -f http://localhost:9093/-/healthy > /dev/null 2>&1; then
    echo "✅ Alertmanager: Healthy"
else
    echo "❌ Alertmanager: Not accessible"
fi

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Grafana: Healthy"
else
    echo "❌ Grafana: Not accessible"
fi

echo "✅ Hybrid monitoring deployment completed!"
echo ""
echo "📊 Access monitoring:"
echo "  • Prometheus: http://localhost:9090"
echo "  • Alertmanager: http://localhost:9093"
echo "  • Grafana: http://localhost:3000 (admin/gamev1admin)"
echo "  • Node Exporter: http://localhost:9100/metrics"
EOF

    chmod +x "$CONFIG_DIR/deploy-hybrid-monitoring.sh"

    echo -e "${GREEN}✅ Hybrid monitoring configuration created${NC}"
}

# Function to create monitoring dashboards
create_monitoring_dashboards() {
    echo -e "${BLUE}📈 Creating monitoring dashboards...${NC}"

    # Create comprehensive Grafana dashboard for GameV1
    cat > "$CONFIG_DIR/gamev1-comprehensive-dashboard.json" << EOF
{
  "dashboard": {
    "id": null,
    "title": "GameV1 Comprehensive Monitoring",
    "tags": ["gamev1", "gaming", "multiplayer"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Players",
        "type": "stat",
        "targets": [
          {
            "expr": "gamev1_players_active",
            "legendFormat": "Active Players"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 100 },
                { "color": "red", "value": 1000 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(gateway_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(gateway_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(gateway_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response time (seconds)",
            "min": 0,
            "max": 2
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(gateway_requests_total{status=~\"5..\"}[5m]) / rate(gateway_requests_total[5m]) * 100",
            "legendFormat": "Error Rate (%)"
          }
        ],
        "yAxes": [
          {
            "label": "Error Rate (%)",
            "min": 0,
            "max": 10
          }
        ]
      },
      {
        "id": 5,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)",
            "legendFormat": "Memory Usage (%)"
          }
        ],
        "yAxes": [
          {
            "label": "Memory Usage (%)",
            "min": 0,
            "max": 100
          }
        ]
      },
      {
        "id": 6,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}} CPU Usage"
          }
        ],
        "yAxes": [
          {
            "label": "CPU Usage (%)",
            "min": 0,
            "max": 100
          }
        ]
      },
      {
        "id": 7,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "gamev1_db_connections_active",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "gamev1_db_connections_max",
            "legendFormat": "Max Connections"
          }
        ]
      },
      {
        "id": 8,
        "title": "Rate Limited Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(gamev1_rate_limited_requests_total[5m])",
            "legendFormat": "Rate Limited Requests/sec"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s",
    "schemaVersion": 27,
    "version": 1
  },
  "overwrite": true
}
EOF

    # Create datasource configuration for Grafana
    cat > "$CONFIG_DIR/grafana-datasources.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Alertmanager
    type: alertmanager
    access: proxy
    url: http://alertmanager:9093
    editable: true
EOF

    # Create dashboard provisioning
    cat > "$CONFIG_DIR/grafana-dashboards.yml" << EOF
apiVersion: 1

providers:
  - name: 'GameV1 Dashboards'
    orgId: 1
    folder: 'GameV1'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    echo -e "${GREEN}✅ Monitoring dashboards created${NC}"
}

# Main setup based on monitoring type
case $MONITORING_TYPE in
    "lightweight")
        setup_lightweight_monitoring
        ;;
    "full")
        setup_full_monitoring
        create_monitoring_dashboards
        ;;
    "hybrid")
        setup_lightweight_monitoring
        setup_full_monitoring
        create_monitoring_dashboards
        setup_hybrid_monitoring
        ;;
    *)
        echo -e "${RED}❌ Unknown monitoring type: $MONITORING_TYPE${NC}"
        echo "Use: lightweight, full, or hybrid"
        exit 1
        ;;
esac

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}📊 Enhanced Monitoring Setup Complete${NC}"
echo "===================================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
case $MONITORING_TYPE in
    "lightweight")
        echo "  cd $CONFIG_DIR && sudo ./deploy-collectd.sh"
        ;;
    "full"|"hybrid")
        echo "  cd $CONFIG_DIR && docker-compose -f docker-compose.monitoring.yml up -d"
        echo "  cd $CONFIG_DIR && sudo ./deploy-collectd.sh"
        ;;
esac

echo ""
echo -e "${YELLOW}📊 Monitoring Endpoints:${NC}"
echo "  • Collectd metrics: http://localhost:9100/metrics"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3000 (admin/gamev1admin)"
echo "  • Alertmanager: http://localhost:9093"

echo ""
echo -e "${YELLOW}💡 Features:${NC}"
case $MONITORING_TYPE in
    "lightweight")
        echo "  • System metrics collection with collectd"
        echo "  • Prometheus export format"
        echo "  • Low resource overhead (64MB RAM)"
        ;;
    "full")
        echo "  • Complete Prometheus + Grafana + Alertmanager stack"
        echo "  • Comprehensive alerting rules"
        echo "  • Rich dashboards and visualizations"
        ;;
    "hybrid")
        echo "  • Best of both: lightweight system monitoring + full alerting"
        echo "  • Scalable architecture for growing deployments"
        echo "  • Containerized monitoring for easy management"
        ;;
esac

echo ""
echo -e "${GREEN}✅ GameV1 enhanced monitoring setup completed!${NC}"
