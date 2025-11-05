#!/bin/bash

# 🚀 GameV1 Load Balancer Setup Script
# Cấu hình Nginx/HAProxy cho multiple instances scaling

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

LOAD_BALANCER_TYPE=${1:-"nginx"}  # nginx, haproxy
CONFIG_DIR=${2:-"load-balancer-config"}
SERVERS=${3:-"server1 server2 server3"}

echo -e "${BLUE}${BOLD}⚖️  GameV1 Load Balancer Setup${NC}"
echo "=============================="
echo -e "Load balancer: ${YELLOW}$LOAD_BALANCER_TYPE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo -e "Target servers: ${YELLOW}$SERVERS${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to setup Nginx load balancer
setup_nginx() {
    echo -e "${BLUE}🌐 Setting up Nginx load balancer...${NC}"

    # Create Nginx configuration
    cat > "$CONFIG_DIR/nginx.conf" << EOF
# GameV1 Nginx Load Balancer Configuration
# Optimized for game server traffic with WebSocket support

user nginx;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression for API responses
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=100r/s;
    limit_req_zone \$http_authorization zone=auth:10m rate=1000r/s;

    # Connection limiting
    limit_conn_zone \$binary_remote_addr zone=conn_limit_per_ip:10m;

    # Upstream servers for game gateway
    upstream gamev1_gateway {
        # Load balancing method: least connections for game servers
        least_conn;

        # Server instances (replace with actual server IPs/ports)
        server 192.168.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;
        server 192.168.1.11:8080 weight=2 max_fails=3 fail_timeout=30s;
        server 192.168.1.12:8080 weight=1 max_fails=3 fail_timeout=30s;

        # Keep connections alive for better performance
        keepalive 32;
    }

    # Upstream for WebSocket connections (sticky sessions)
    upstream gamev1_websocket {
        ip_hash;  # Sticky sessions based on client IP

        server 192.168.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;
        server 192.168.1.11:8080 weight=2 max_fails=3 fail_timeout=30s;
        server 192.168.1.12:8080 weight=1 max_fails=3 fail_timeout=30s;

        keepalive 32;
    }

    # Upstream for metrics (round robin)
    upstream gamev1_metrics {
        server 192.168.1.10:9090 max_fails=3 fail_timeout=30s;
        server 192.168.1.11:9090 max_fails=3 fail_timeout=30s;
        server 192.168.1.12:9090 max_fails=3 fail_timeout=30s;
    }

    # Main load balancer server
    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Health check endpoint
        location /healthz {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Metrics endpoint (proxy to one of the servers)
        location /metrics {
            proxy_pass http://gamev1_metrics;
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }

        # API endpoints (proxy to gateway upstream)
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_conn conn_limit_per_ip 100;

            proxy_pass http://gamev1_gateway;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;

            # WebSocket support
            proxy_buffering off;
            proxy_cache off;

            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Authentication endpoints
        location /auth/ {
            limit_req zone=auth burst=10 nodelay;

            proxy_pass http://gamev1_gateway;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # WebRTC signaling endpoints
        location /rtc/ {
            proxy_pass http://gamev1_gateway;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_buffering off;
        }

        # WebSocket endpoint (sticky sessions)
        location /ws {
            limit_conn conn_limit_per_ip 10;

            proxy_pass http://gamev1_websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;

            # WebSocket specific settings
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400;  # 24 hours for long-lived connections

            # Ping/pong for connection health
            proxy_send_timeout 60s;
        }

        # Static files and client
        location / {
            # In production, serve static files or proxy to client server
            proxy_pass http://gamev1_gateway;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }

        # Error pages
        error_page 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }

    # HTTPS server (uncomment and configure SSL certificates)
    # server {
    #     listen 443 ssl http2;
    #     server_name api.gamev1.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    #
    #     # Same configuration as HTTP server but with SSL
    #     # ... (copy from above)
    # }

    # Logging
    log_format gamev1_log_format '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                                 '\$status \$body_bytes_sent "\$http_referer" '
                                 '"\$http_user_agent" "\$http_x_forwarded_for" '
                                 'rt=\$request_time uct="\$upstream_connect_time" '
                                 'uht="\$upstream_header_time" urt="\$upstream_response_time"';

    access_log /var/log/nginx/gamev1_access.log gamev1_log_format;
    error_log /var/log/nginx/gamev1_error.log warn;
}
EOF

    # Create systemd service for Nginx
    cat > "$CONFIG_DIR/nginx.service" << EOF
[Unit]
Description=Nginx Load Balancer for GameV1
After=network.target

[Service]
Type=forking
PIDFile=/run/nginx.pid
ExecStartPre=/usr/sbin/nginx -t -q -g 'daemon on; master_process on;'
ExecStart=/usr/sbin/nginx -g 'daemon on; master_process on;'
ExecReload=/usr/sbin/nginx -g 'daemon on; master_process on;' -s reload
ExecStop=/bin/kill -s QUIT \$MAINPID

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/nginx /var/lib/nginx /tmp

# Resource limits
LimitNOFILE=65536
MemoryLimit=256M

[Install]
WantedBy=multi-user.target
EOF

    # Create deployment script
    cat > "$CONFIG_DIR/deploy-nginx.sh" << 'EOF'
#!/bin/bash
# Deploy Nginx load balancer

set -e

echo "🚀 Deploying Nginx load balancer..."

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Create directories
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/lib/nginx

# Copy configuration
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo cp nginx.service /etc/systemd/system/gamev1-loadbalancer.service

# Set permissions
sudo chown -R nginx:nginx /var/log/nginx /var/lib/nginx

# Test configuration
sudo nginx -t

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable gamev1-loadbalancer
sudo systemctl restart gamev1-loadbalancer

# Verify service
if sudo systemctl is-active --quiet gamev1-loadbalancer; then
    echo "✅ Nginx load balancer deployed successfully"
    echo ""
    echo "🌐 Access load balancer at: http://$(hostname -I | awk '{print $1}')"
    echo "📊 Metrics available at: http://$(hostname -I | awk '{print $1}')/metrics"
else
    echo "❌ Failed to start Nginx load balancer"
    exit 1
fi
EOF

    chmod +x "$CONFIG_DIR/deploy-nginx.sh"

    echo -e "${GREEN}✅ Nginx load balancer configuration created${NC}"
}

# Function to setup HAProxy load balancer
setup_haproxy() {
    echo -e "${BLUE}🔄 Setting up HAProxy load balancer...${NC}"

    # Create HAProxy configuration
    cat > "$CONFIG_DIR/haproxy.cfg" << EOF
# GameV1 HAProxy Load Balancer Configuration
# High-performance load balancer with WebSocket support

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Default SSL material locations
    ca-base /etc/ssl/certs
    crt-base /etc/ssl/private

    # Default ciphers to use on SSL-enabled listening sockets
    ssl-default-bind-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
    ssl-default-bind-options no-sslv3

defaults
    log global
    mode http
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor except 127.0.0.0/8
    option redispatch
    retries 3
    timeout http-request 10s
    timeout queue 1m
    timeout connect 10s
    timeout client 1m
    timeout server 1m
    timeout http-keep-alive 10s
    timeout check 10s

# Frontend for HTTP traffic
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/ssl/cert.pem

    # ACLs for routing
    acl is_websocket hdr(upgrade) -i websocket
    acl is_api path_beg /api/
    acl is_auth path_beg /auth/
    acl is_webrtc path_beg /rtc/
    acl is_metrics path_beg /metrics
    acl is_health path /healthz

    # Health check (no rate limiting)
    use_backend health_backend if is_health

    # WebSocket connections (sticky sessions)
    use_backend websocket_backend if is_websocket

    # Authentication (higher rate limit)
    use_backend auth_backend if is_auth

    # WebRTC signaling
    use_backend webrtc_backend if is_webrtc

    # API endpoints (rate limited)
    use_backend api_backend if is_api

    # Metrics (direct to one server)
    use_backend metrics_backend if is_metrics

    # Default backend
    default_backend default_backend

# Backend for health checks
backend health_backend
    mode http
    option httpchk GET /healthz
    http-check expect status 200
    server health1 127.0.0.1:8080 check

# Backend for API endpoints (load balanced)
backend api_backend
    mode http
    balance leastconn
    stick-table type ip size 200k expire 30m
    stick on src

    # Rate limiting
    acl too_fast be_sess_rate(100) ge 100
    tcp-request content reject if too_fast

    server gateway1 192.168.1.10:8080 check maxconn 1000
    server gateway2 192.168.1.11:8080 check maxconn 1000
    server gateway3 192.168.1.12:8080 check maxconn 1000

# Backend for WebSocket connections (sticky)
backend websocket_backend
    mode http
    balance source  # IP-based load balancing
    option httpchk GET /healthz
    option http-keep-alive
    timeout tunnel 1h  # Long timeout for WebSocket

    server ws1 192.168.1.10:8080 check maxconn 500
    server ws2 192.168.1.11:8080 check maxconn 500
    server ws3 192.168.1.12:8080 check maxconn 500

# Backend for authentication (higher capacity)
backend auth_backend
    mode http
    balance leastconn

    # Higher rate limit for auth
    acl auth_rate_limit be_sess_rate(1000) ge 1000
    tcp-request content reject if auth_rate_limit

    server auth1 192.168.1.10:8080 check maxconn 2000
    server auth2 192.168.1.11:8080 check maxconn 2000

# Backend for WebRTC signaling
backend webrtc_backend
    mode http
    balance leastconn
    option http-keep-alive

    server rtc1 192.168.1.10:8080 check maxconn 800
    server rtc2 192.168.1.11:8080 check maxconn 800

# Backend for metrics
backend metrics_backend
    mode http
    server metrics1 192.168.1.10:9090 check

# Default backend
backend default_backend
    mode http
    server default1 192.168.1.10:8080 check

# HAProxy stats interface
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:gamev1
    stats refresh 10s
EOF

    # Create systemd service for HAProxy
    cat > "$CONFIG_DIR/haproxy.service" << EOF
[Unit]
Description=HAProxy Load Balancer for GameV1
After=network.target

[Service]
Type=notify
PIDFile=/run/haproxy.pid
ExecStart=/usr/sbin/haproxy -f /etc/haproxy/haproxy.cfg -p /run/haproxy.pid
ExecReload=/usr/sbin/haproxy -f /etc/haproxy/haproxy.cfg -p /run/haproxy.pid -sf \$(cat /run/haproxy.pid)

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/haproxy /var/log/haproxy /run/haproxy /tmp

# Resource limits
LimitNOFILE=65536
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
EOF

    # Create deployment script
    cat > "$CONFIG_DIR/deploy-haproxy.sh" << 'EOF'
#!/bin/bash
# Deploy HAProxy load balancer

set -e

echo "🚀 Deploying HAProxy load balancer..."

# Install HAProxy if not present
if ! command -v haproxy &> /dev/null; then
    echo "📦 Installing HAProxy..."
    sudo apt-get update
    sudo apt-get install -y haproxy
fi

# Create directories
sudo mkdir -p /var/lib/haproxy
sudo mkdir -p /var/log/haproxy
sudo mkdir -p /run/haproxy

# Copy configuration
sudo cp haproxy.cfg /etc/haproxy/haproxy.cfg
sudo cp haproxy.service /etc/systemd/system/gamev1-loadbalancer.service

# Set permissions
sudo chown -R haproxy:haproxy /var/lib/haproxy /var/log/haproxy /run/haproxy

# Test configuration
sudo haproxy -f /etc/haproxy/haproxy.cfg -c

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable gamev1-loadbalancer
sudo systemctl restart gamev1-loadbalancer

# Verify service
if sudo systemctl is-active --quiet gamev1-loadbalancer; then
    echo "✅ HAProxy load balancer deployed successfully"
    echo ""
    echo "🌐 Access load balancer at: http://$(hostname -I | awk '{print $1}')"
    echo "📊 Stats interface: http://$(hostname -I | awk '{print $1}'):8404/stats (admin/gamev1)"
else
    echo "❌ Failed to start HAProxy load balancer"
    exit 1
fi
EOF

    chmod +x "$CONFIG_DIR/deploy-haproxy.sh"

    echo -e "${GREEN}✅ HAProxy load balancer configuration created${NC}"
}

# Function to create server configuration template
create_server_template() {
    echo -e "${BLUE}🔧 Creating server configuration template...${NC}"

    # Create server configuration template
    cat > "$CONFIG_DIR/server-config-template.yml" << EOF
# GameV1 Server Configuration Template
# Copy and customize for each server instance

server_id: "server1"  # Unique identifier for this server
server_role: "gateway"  # gateway, worker, database

# Network configuration
listen_address: "0.0.0.0"
gateway_port: 8080
metrics_port: 9090
worker_port: 50051

# Load balancer configuration
load_balancer_ip: "192.168.1.100"  # Load balancer IP address

# Database configuration
database_url: "postgresql://gamev1:password@localhost:5432/gamev1"
redis_url: "redis://localhost:6379"

# Monitoring configuration
prometheus_pushgateway: "http://localhost:9091"
grafana_url: "http://localhost:3000"

# Performance tuning
max_connections: 1000
worker_threads: 8
memory_limit: "1GB"

# Logging
log_level: "info"
log_file: "/var/log/gamev1/server.log"
log_rotation: "daily"

# Health check
health_check_interval: "30s"
health_check_timeout: "10s"

# Security
rate_limit_per_minute: 100
enable_cors: true
allowed_origins: ["*"]

# Clustering (for multi-server setup)
cluster_enabled: true
cluster_nodes:
  - "192.168.1.10:8080"
  - "192.168.1.11:8080"
  - "192.168.1.12:8080"

# Backup configuration
backup_enabled: true
backup_schedule: "0 2 * * *"  # Daily at 2 AM
backup_retention_days: 30
EOF

    echo -e "${GREEN}✅ Server configuration template created${NC}"
}

# Function to create monitoring dashboard
create_monitoring_dashboard() {
    echo -e "${BLUE}📊 Creating monitoring dashboard...${NC}"

    # Create Grafana dashboard for load balancer metrics
    cat > "$CONFIG_DIR/load-balancer-dashboard.json" << EOF
{
  "dashboard": {
    "id": null,
    "title": "GameV1 Load Balancer Dashboard",
    "tags": ["gamev1", "load-balancer"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(nginx_http_requests_total[5m])",
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
        "id": 2,
        "title": "Active Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "nginx_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 3,
        "title": "Connection Handled",
        "type": "stat",
        "targets": [
          {
            "expr": "nginx_connections_handled_total"
          }
        ]
      },
      {
        "id": 4,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "nginx_http_request_duration_seconds_avg",
            "legendFormat": "Average Response Time"
          }
        ]
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    echo -e "${GREEN}✅ Monitoring dashboard created${NC}"
}

# Main setup based on load balancer type
case $LOAD_BALANCER_TYPE in
    "nginx")
        setup_nginx
        ;;
    "haproxy")
        setup_haproxy
        ;;
    *)
        echo -e "${RED}❌ Unknown load balancer type: $LOAD_BALANCER_TYPE${NC}"
        echo "Use: nginx or haproxy"
        exit 1
        ;;
esac

# Create additional configuration files
create_server_template
create_monitoring_dashboard

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}⚖️  Load Balancer Setup Complete${NC}"
echo "==============================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
echo "  cd $CONFIG_DIR"
case $LOAD_BALANCER_TYPE in
    "nginx")
        echo "  sudo ./deploy-nginx.sh"
        ;;
    "haproxy")
        echo "  sudo ./deploy-haproxy.sh"
        ;;
esac

echo ""
echo -e "${YELLOW}🔧 Configuration:${NC}"
echo "  • Load balancer IP: $(hostname -I | awk '{print $1}')"
echo "  • Backend servers: $SERVERS"
echo "  • Health check: http://$(hostname -I | awk '{print $1}')/healthz"
case $LOAD_BALANCER_TYPE in
    "nginx")
        echo "  • Stats: http://$(hostname -I | awk '{print $1}')/metrics"
        ;;
    "haproxy")
        echo "  • Stats: http://$(hostname -I | awk '{print $1}'):8404/stats"
        ;;
esac

echo ""
echo -e "${YELLOW}💡 Features:${NC}"
echo "  • HTTP/HTTPS load balancing with health checks"
echo "  • WebSocket sticky sessions for real-time gaming"
echo "  • Rate limiting and connection limits"
echo "  • SSL/TLS termination (configurable)"
echo "  • Comprehensive logging and monitoring"
echo "  • Failover and automatic recovery"

echo ""
echo -e "${GREEN}✅ GameV1 load balancer setup completed!${NC}"