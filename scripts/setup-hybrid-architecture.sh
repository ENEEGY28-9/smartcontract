#!/bin/bash

# 🚀 GameV1 Hybrid Architecture Setup
# Chuẩn bị kiến trúc hybrid với native + container deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

HYBRID_CONFIG_DIR=${1:-"hybrid-config"}
DEPLOYMENT_MODE=${2:-"hybrid"}  # native, container, hybrid

echo -e "${BLUE}${BOLD}🏗️  GameV1 Hybrid Architecture Setup${NC}"
echo "==================================="
echo -e "Config directory: ${YELLOW}$HYBRID_CONFIG_DIR${NC}"
echo -e "Deployment mode: ${YELLOW}$DEPLOYMENT_MODE${NC}"
echo ""

# Create configuration directory
mkdir -p "$HYBRID_CONFIG_DIR"

# Function to setup native deployment
setup_native_deployment() {
    echo -e "${BLUE}🔧 Setting up native deployment...${NC}"

    # Create native deployment configuration
    cat > "$HYBRID_CONFIG_DIR/native-deployment.yml" << EOF
# GameV1 Native Deployment Configuration
# Optimized for performance-critical game services

version: "1.0"
deployment:
  mode: "native"
  services:
    gateway:
      binary_path: "/opt/gamev1/bin/gateway"
      config_file: "/opt/gamev1/config/gateway.toml"
      port: 8080
      metrics_port: 9090
      log_level: "info"
      restart_policy: "always"

    worker:
      binary_path: "/opt/gamev1/bin/worker"
      config_file: "/opt/gamev1/config/worker.toml"
      port: 50051
      log_level: "debug"
      restart_policy: "always"

    pocketbase:
      binary_path: "/opt/gamev1/bin/pocketbase"
      config_file: "/opt/gamev1/config/pocketbase.toml"
      port: 8090
      log_level: "info"
      restart_policy: "always"

    room-manager:
      binary_path: "/opt/gamev1/bin/room-manager"
      config_file: "/opt/gamev1/config/room-manager.toml"
      log_level: "info"
      restart_policy: "always"

  dependencies:
    redis:
      host: "localhost"
      port: 6379
      required: true

  monitoring:
    prometheus:
      enabled: true
      port: 9090
      scrape_configs:
        - job_name: "gateway"
          static_configs:
            - targets: ["localhost:8080"]
          scrape_interval: "10s"

        - job_name: "worker"
          static_configs:
            - targets: ["localhost:50051"]
          scrape_interval: "10s"

  security:
    rate_limiting:
      enabled: true
      requests_per_minute: 100
      requests_per_hour: 1000

    cors:
      enabled: true
      allowed_origins: ["*"]
      allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
EOF

    # Create systemd service templates
    cat > "$HYBRID_CONFIG_DIR/gamev1-native.service.template" << 'EOF'
[Unit]
Description=GameV1 {SERVICE_NAME} Service - Native Deployment
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=gamev1
Group=gamev1
WorkingDirectory=/opt/gamev1
ExecStart=/opt/gamev1/bin/{SERVICE_NAME}
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=3

# Security settings for production
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gamev1/logs /tmp

# Resource limits optimized for game server
LimitNOFILE=65536
MemoryLimit={MEMORY_LIMIT}
TimeoutStartSec=30
TimeoutStopSec=30

# Environment variables
Environment=RUST_LOG={LOG_LEVEL},{SERVICE_NAME}=debug
Environment=POCKETBASE_URL=http://127.0.0.1:8090
Environment=REDIS_URL=redis://127.0.0.1:6379

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}✅ Native deployment configuration created${NC}"
}

# Function to setup container deployment
setup_container_deployment() {
    echo -e "${BLUE}🐳 Setting up container deployment...${NC}"

    # Create enhanced docker-compose for hybrid architecture
    cat > "$HYBRID_CONFIG_DIR/docker-compose.hybrid.yml" << EOF
version: '3.8'

services:
  # Gateway - API và WebRTC signaling (Native optimized)
  gateway:
    build:
      context: .
      dockerfile: docker/gateway.Dockerfile
    ports:
      - "8080:8080"
      - "9090:9090"  # Metrics port
    environment:
      - RUST_LOG=info,gateway=debug
      - WORKER_ENDPOINT=http://worker:50051
      - POCKETBASE_URL=http://pocketbase:8090
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./config:/opt/gamev1/config:ro
      - ./logs:/opt/gamev1/logs
    depends_on:
      - worker
      - redis
      - pocketbase
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - gamev1-network

  # Worker - Game logic và simulation (Native optimized)
  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    ports:
      - "50051:50051"
    environment:
      - RUST_LOG=debug,worker=debug
      - POCKETBASE_URL=http://pocketbase:8090
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./config:/opt/gamev1/config:ro
      - ./logs:/opt/gamev1/logs
    depends_on:
      - pocketbase
      - redis
    restart: unless-stopped
    networks:
      - gamev1-network

  # PocketBase - Database (Containerized for flexibility)
  pocketbase:
    build:
      context: .
      dockerfile: docker/pocketbase.Dockerfile
    ports:
      - "8090:8090"
    volumes:
      - pocketbase_data:/pb_data
      - ./pb_migrations:/pb_migrations:ro
    environment:
      - PB_ENCRYPTION_KEY=your-encryption-key-here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - gamev1-network

  # Redis - Cache (Containerized for scalability)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - gamev1-network

  # Prometheus - Monitoring (Containerized)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - gamev1-network

  # Grafana - Visualization (Containerized)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./docker/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped
    depends_on:
      - prometheus
    networks:
      - gamev1-network

  # Load Balancer (Optional - for multi-instance scaling)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/ssl:/etc/nginx/ssl:ro
    restart: unless-stopped
    depends_on:
      - gateway
    networks:
      - gamev1-network

networks:
  gamev1-network:
    driver: bridge

volumes:
  pocketbase_data:
  redis_data:
  prometheus_data:
  grafana_data:
EOF

    # Create container-specific configurations
    cat > "$HYBRID_CONFIG_DIR/container-deployment.yml" << EOF
# GameV1 Container Deployment Configuration
# For supporting services that benefit from containerization

version: "1.0"
deployment:
  mode: "container"
  orchestration: "docker-compose"

  services:
    pocketbase:
      image: "gamev1/pocketbase:latest"
      container_name: "gamev1-pocketbase"
      restart: "unless-stopped"
      ports:
        - "8090:8090"
      volumes:
        - "pocketbase_data:/pb_data"
      environment:
        - "PB_ENCRYPTION_KEY=\${PB_ENCRYPTION_KEY}"
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
        interval: "30s"
        timeout: "10s"
        retries: 3

    redis:
      image: "redis:7-alpine"
      container_name: "gamev1-redis"
      restart: "unless-stopped"
      ports:
        - "6379:6379"
      volumes:
        - "redis_data:/data"
      command: "redis-server --appendonly yes"
      healthcheck:
        test: ["CMD", "redis-cli", "ping"]
        interval: "10s"
        timeout: "3s"
        retries: 3

    prometheus:
      image: "prom/prometheus:latest"
      container_name: "gamev1-prometheus"
      restart: "unless-stopped"
      ports:
        - "9090:9090"
      volumes:
        - "./docker/prometheus.yml:/etc/prometheus/prometheus.yml:ro"
        - "prometheus_data:/prometheus"
      command:
        - "--config.file=/etc/prometheus/prometheus.yml"
        - "--web.enable-lifecycle"

    grafana:
      image: "grafana/grafana:latest"
      container_name: "gamev1-grafana"
      restart: "unless-stopped"
      ports:
        - "3000:3000"
      volumes:
        - "grafana_data:/var/lib/grafana"
        - "./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro"
      environment:
        - "GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin}"
EOF

    echo -e "${GREEN}✅ Container deployment configuration created${NC}"
}

# Function to setup hybrid deployment
setup_hybrid_deployment() {
    echo -e "${BLUE}🔀 Setting up hybrid deployment...${NC}"

    # Create hybrid deployment strategy
    cat > "$HYBRID_CONFIG_DIR/hybrid-deployment-strategy.md" << 'EOF'
# GameV1 Hybrid Architecture Strategy

## Overview
Hybrid architecture combines the best of native and container deployments:
- **Performance-critical services** (gateway, worker) → Native deployment
- **Supporting services** (database, monitoring) → Container deployment

## Architecture Decision Matrix

| Service | Deployment | Reason |
|---------|------------|---------|
| **Gateway** | Native | Performance-critical, handles WebSocket, WebRTC |
| **Worker** | Native | Game logic simulation, performance-critical |
| **PocketBase** | Container | Database flexibility, easy backup/restore |
| **Redis** | Container | Cache scalability, clustering support |
| **Prometheus** | Container | Monitoring stack, resource management |
| **Grafana** | Container | Visualization, dashboard management |

## Performance Benefits

### Native Deployment (Gateway/Worker)
- **Zero overhead** from container runtime
- **Direct hardware access** for optimal performance
- **Lower memory footprint** (no container layer)
- **Faster startup time** (sub-second)

### Container Deployment (Supporting Services)
- **Easy scaling** with docker-compose/Kubernetes
- **Consistent environments** across deployments
- **Simplified backup/restore** operations
- **Resource isolation** and limits

## Deployment Workflow

### Phase 1: Native Services (Performance Critical)
```bash
# Build optimized binaries
./scripts/build-production-optimized.sh

# Deploy with systemd
sudo ./scripts/deploy-production-systemd.sh

# Start critical services
sudo systemctl start gamev1-gateway gamev1-worker
```

### Phase 2: Container Services (Supporting)
```bash
# Start supporting services
docker-compose -f docker-compose.hybrid.yml up -d pocketbase redis prometheus grafana

# Verify connectivity
./scripts/check-services.sh
```

### Phase 3: Load Balancer (Optional)
```bash
# Deploy nginx load balancer
docker-compose -f docker-compose.hybrid.yml up -d nginx
```

## Monitoring Strategy

### Native Services
- Direct Prometheus metrics scraping
- Systemd journal logging
- Native profiling tools (perf, valgrind)

### Container Services
- Container metrics via cAdvisor
- Structured logging with labels
- Resource usage monitoring

## Scaling Strategy

### Horizontal Scaling
- **Gateway/Worker**: Multiple native instances behind load balancer
- **PocketBase/Redis**: Database clustering and replication
- **Monitoring**: Prometheus federation for multi-region

### Vertical Scaling
- **Native services**: CPU/memory tuning via systemd
- **Container services**: Resource limits via docker-compose

## Backup Strategy

### Native Services
- Binary backups via systemd timers
- Configuration management with Ansible
- Log rotation with logrotate

### Container Services
- Volume backups with docker volume plugins
- Database dumps via cron jobs
- Configuration backups with docker-compose

## Migration Strategy

### From Native to Hybrid
1. Deploy container services alongside native
2. Migrate data to containerized databases
3. Update service discovery configuration
4. Switch traffic gradually

### From Hybrid to Full Container
1. Containerize gateway and worker services
2. Update deployment pipelines for containers
3. Migrate to Kubernetes for orchestration
4. Update monitoring and logging stack
EOF

    # Create migration scripts
    cat > "$HYBRID_CONFIG_DIR/migrate-to-hybrid.sh" << 'EOF'
#!/bin/bash
# Migrate from native-only to hybrid deployment

set -e

echo "🚀 Migrating GameV1 to hybrid architecture..."

# 1. Backup current native deployment
echo "📦 Creating backup of current deployment..."
./scripts/cleanup-profiling-data.sh profiling-results profiling-backup

# 2. Start containerized supporting services
echo "🐳 Starting containerized services..."
docker-compose -f docker-compose.hybrid.yml up -d pocketbase redis prometheus grafana

# 3. Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 30

# 4. Verify connectivity
echo "🔍 Verifying service connectivity..."
./scripts/check-services.sh

# 5. Update native services configuration
echo "⚙️  Updating native services configuration..."
# Update environment variables to point to containerized services
sudo sed -i 's|POCKETBASE_URL=.*|POCKETBASE_URL=http://localhost:8090|g' /etc/systemd/system/gamev1-*.service
sudo sed -i 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379|g' /etc/systemd/system/gamev1-*.service

# 6. Restart native services
echo "🔄 Restarting native services..."
sudo systemctl daemon-reload
sudo systemctl restart gamev1-gateway gamev1-worker

# 7. Final verification
echo "✅ Running final verification..."
./scripts/run-comprehensive-tests.sh test-results integration

echo "🎉 Migration to hybrid architecture completed!"
echo ""
echo "📋 Next steps:"
echo "  • Monitor performance with hybrid setup"
echo "  • Update deployment scripts for hybrid mode"
echo "  • Consider load balancer for scaling"
echo "  • Set up backup strategies for both native and container services"
EOF

    chmod +x "$HYBRID_CONFIG_DIR/migrate-to-hybrid.sh"

    echo -e "${GREEN}✅ Hybrid deployment strategy created${NC}"
}

# Main setup based on deployment mode
case $DEPLOYMENT_MODE in
    "native")
        setup_native_deployment
        ;;
    "container")
        setup_container_deployment
        ;;
    "hybrid")
        setup_native_deployment
        setup_container_deployment
        setup_hybrid_deployment
        ;;
    *)
        echo -e "${RED}❌ Unknown deployment mode: $DEPLOYMENT_MODE${NC}"
        echo "Use: native, container, or hybrid"
        exit 1
        ;;
esac

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}📋 Hybrid Architecture Setup Complete${NC}"
echo "===================================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$HYBRID_CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}💡 Architecture Overview:${NC}"
case $DEPLOYMENT_MODE in
    "native")
        echo "  • All services deployed natively for maximum performance"
        echo "  • Optimized for single-server deployment"
        echo "  • Best for development and small-scale production"
        ;;
    "container")
        echo "  • All services containerized for scalability"
        echo "  • Easy horizontal scaling and load balancing"
        echo "  • Best for cloud-native deployments"
        ;;
    "hybrid")
        echo "  • Performance-critical services (gateway, worker) → Native"
        echo "  • Supporting services (database, monitoring) → Container"
        echo "  • Optimal balance of performance and scalability"
        ;;
esac

echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "  • Review generated configuration files"
echo "  • Customize settings for your environment"
echo "  • Test deployment in staging environment"
echo "  • Monitor performance and adjust as needed"

echo ""
echo -e "${GREEN}✅ GameV1 hybrid architecture setup completed!${NC}"

# Usage examples
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  $0                           # Setup hybrid architecture (default)"
echo "  $0 hybrid-config native      # Setup native-only deployment"
echo "  $0 hybrid-config container   # Setup container-only deployment"
echo ""
echo -e "${YELLOW}🔧 Migration:${NC}"
echo "  cd hybrid-config && ./migrate-to-hybrid.sh"
