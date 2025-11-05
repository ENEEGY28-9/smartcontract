# 🚀 GameV1 Production Deployment Guide

Comprehensive guide for deploying GameV1 backend to production environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Native Deployment](#native-deployment)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Monitoring & Observability](#monitoring--observability)
- [Performance Tuning](#performance-tuning)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

GameV1 is a high-performance multiplayer game backend built with Rust, featuring:

- **Microservices Architecture**: Gateway, Worker, Room Manager, Services, PocketBase
- **Real-time Gaming**: WebSocket and WebRTC support
- **Scalable Design**: Horizontal scaling and load balancing
- **Production Ready**: Optimized binaries and comprehensive monitoring

### Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     Gateway     │    │     Metrics     │
│     (nginx)     │────│   (API Layer)   │────│  (Prometheus)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Database     │    │     Worker      │    │   Dashboards    │
│   (PocketBase)  │────│  (Game Logic)   │────│   (Grafana)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
┌─────────────────┐    ┌─────────────────┐
│ Room Manager    │    │    Services     │
│ (Room Lifecycle)│    │ (API Services)  │
└─────────────────┘    └─────────────────┘
```

## ✅ Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4-core CPU (Intel/AMD x64)
- **RAM**: 8GB RAM
- **Storage**: 20GB SSD storage
- **Network**: 100Mbps network connection
- **OS**: Ubuntu 20.04+, Debian 11+, or Windows Server 2019+

#### Recommended Requirements
- **CPU**: 8-core CPU for high load
- **RAM**: 16GB+ RAM for production
- **Storage**: 100GB+ NVMe SSD
- **Network**: 1Gbps+ network connection

### Software Requirements

#### Required Software
- **Rust**: 1.70+ with 2021 edition
- **Docker**: 20.10+ (for containerized deployment)
- **Git**: Latest version
- **curl/wget**: For health checks

#### Optional Software
- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **nginx**: For load balancing
- **Redis**: For caching (if needed)

## 🚀 Deployment Options

### Option 1: Native Deployment (Recommended)
Direct binary deployment using systemd services.

**Pros:**
- Maximum performance
- Lower resource overhead
- Better system integration
- Easier debugging

**Cons:**
- More complex setup
- Manual dependency management

### Option 2: Docker Deployment
Containerized deployment using Docker Compose.

**Pros:**
- Easy deployment
- Consistent environments
- Built-in scaling
- Easy rollback

**Cons:**
- Slight performance overhead
- Larger resource footprint

## 🏗️ Native Deployment

### 1. System Preparation

#### Ubuntu/Debian Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    curl \
    wget \
    git \
    htop \
    iotop

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Create gamev1 user
sudo useradd --system --shell /bin/false --create-home gamev1
```

#### Directory Structure
```bash
sudo mkdir -p /opt/gamev1/{bin,config,logs,data}
sudo chown -R gamev1:gamev1 /opt/gamev1
```

### 2. Build Production Binaries

#### Using Provided Script
```bash
# Make script executable
chmod +x scripts/build-production-optimized.sh

# Build all services
sudo ./scripts/build-production-optimized.sh
```

#### Manual Build
```bash
# Clean and update
cargo clean && cargo update

# Set optimization flags
export RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"

# Build each service
cargo build --release -p gateway
cargo build --release -p worker
cargo build --release -p room-manager
cargo build --release -p services
cargo build --release -p pocketbase

# Strip binaries
find target/release -type f -executable -exec strip {} \;
```

### 3. Install Systemd Services

```bash
# Copy service files
sudo cp systemd/gamev1-*.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable gamev1-pocketbase
sudo systemctl enable gamev1-worker
sudo systemctl enable gamev1-room-manager
sudo systemctl enable gamev1-services
sudo systemctl enable gamev1-gateway
```

### 4. Configure Services

#### Copy Configuration Files
```bash
sudo cp -r config/* /opt/gamev1/config/
sudo chown -R gamev1:gamev1 /opt/gamev1/config
```

#### Environment Variables
Create `/opt/gamev1/config/production.env`:
```bash
# Database
POCKETBASE_URL=http://localhost:8090

# Worker
WORKER_ENDPOINT=http://localhost:50051

# Security
JWT_SECRET_KEY=your-secret-key-here

# Logging
RUST_LOG=info
LOG_LEVEL=INFO
```

### 5. Start Services

```bash
# Start in dependency order
sudo systemctl start gamev1-pocketbase
sudo systemctl start gamev1-worker
sudo systemctl start gamev1-room-manager
sudo systemctl start gamev1-services
sudo systemctl start gamev1-gateway

# Check status
sudo systemctl status gamev1-*
```

### 6. Verify Deployment

```bash
# Health checks
curl http://localhost:8080/health
curl http://localhost:8090/api/health

# Basic API test
curl http://localhost:8080/api/rooms

# Check logs
sudo journalctl -u gamev1-gateway -f
sudo journalctl -u gamev1-worker -f
```

## 🐳 Docker Deployment

### 1. Build Docker Image

```bash
# Build production image
docker build -f Dockerfile.production -t gamev1-production:latest .

# Verify image
docker images gamev1-production
```

### 2. Configure Environment

Create `.env` file:
```env
# Database
POCKETBASE_ADMIN_EMAIL=admin@yourdomain.com
POCKETBASE_ADMIN_PASSWORD=secure-password-here

# Grafana
GRAFANA_ADMIN_PASSWORD=secure-grafana-password

# Domain (for SSL)
DOMAIN_NAME=yourdomain.com
```

### 3. Deploy with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f gateway
```

### 4. Verify Docker Deployment

```bash
# Health checks
curl http://localhost:8080/health
curl http://localhost:3000/api/health  # Grafana

# Service logs
docker-compose logs gateway
docker-compose logs worker
```

## ⚙️ Configuration

### Production Environment Variables

#### Core Configuration
```env
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Database
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@yourdomain.com
POCKETBASE_ADMIN_PASSWORD=secure-password

# Security
JWT_SECRET_KEY=your-256-bit-secret-key
JWT_EXPIRATION_HOURS=24
BCRYPT_COST=12

# Performance
CONNECTION_POOL_SIZE=50
RATE_LIMIT_DEFAULT_IP_BURST=10000
WEBSOCKET_MAX_CONNECTIONS=10000
```

#### Gaming-Specific Configuration
```env
# Game Settings
DEFAULT_GAME_MODE=classic
DEFAULT_MAX_PLAYERS=8
DEFAULT_TIME_LIMIT=600

# WebRTC (if enabled)
WEBRTC_ICE_SERVERS=stun:stun.l.google.com:19302
WEBRTC_MAX_CONNECTIONS=5000

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

### Configuration Files

#### PocketBase Collections
Run the setup script to create required collections:
```bash
# PowerShell (Windows)
.\scripts\setup-pocketbase-production.ps1

# Bash (Linux)
./scripts/setup-pocketbase.sh
```

#### Prometheus Configuration
Configure metrics collection in `config/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gamev1-gateway'
    static_configs:
      - targets: ['gateway:9090']
    scrape_interval: 15s

  - job_name: 'gamev1-worker'
    static_configs:
      - targets: ['worker:50051']
    scrape_interval: 15s
```

## 📊 Monitoring & Observability

### Health Checks

#### Endpoint Monitoring
- **Gateway Health**: `http://localhost:8080/health`
- **Database Health**: `http://localhost:8090/api/health`
- **Metrics**: `http://localhost:8080/api/metrics`

#### Service Monitoring
```bash
# Native deployment
sudo systemctl status gamev1-*

# Docker deployment
docker-compose ps
```

### Metrics Collection

#### Prometheus Metrics
The system exports comprehensive metrics:
- Request rates and response times
- Error rates and types
- Connection counts and WebSocket stats
- Database performance metrics
- Resource utilization

#### Grafana Dashboards
Pre-configured dashboards available at `http://localhost:3000`:
- **Gateway Performance Dashboard**
- **Game Metrics Dashboard**
- **System Health Dashboard**

### Logging

#### Log Locations
- **Native**: `/opt/gamev1/logs/` and systemd journal
- **Docker**: Docker container logs and volume mounts

#### Log Rotation
Configure log rotation for production:
```bash
# Native deployment
sudo logrotate -f /etc/logrotate.d/gamev1

# Docker deployment
# Configure in docker-compose.yml volumes
```

## ⚡ Performance Tuning

### System Optimization

#### Kernel Tuning (Linux)
```bash
# Increase file descriptor limits
echo 'fs.file-max = 2097152' | sudo tee -a /etc/sysctl.conf

# Increase TCP connection limits
echo 'net.core.somaxconn = 65536' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65536' | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

#### Service Tuning
```bash
# Increase service limits
sudo systemctl edit gamev1-gateway
# Add: [Service]
#      LimitNOFILE=65536
#      MemoryLimit=2G

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart gamev1-gateway
```

### Database Optimization

#### PocketBase Tuning
```bash
# Connection pool settings
export POCKETBASE_MAX_CONNECTIONS=200
export POCKETBASE_CONNECTION_TIMEOUT=30

# Cache settings
export POCKETBASE_CACHE_SIZE=256MB
```

#### Query Optimization
- Ensure proper indexes on frequently queried fields
- Monitor slow queries and optimize
- Use connection pooling effectively

### Load Balancing

#### nginx Configuration
```nginx
upstream gamev1_backend {
    server gateway1:8080;
    server gateway2:8080;
    server gateway3:8080;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://gamev1_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://gamev1_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

## 🔒 Security

### Network Security

#### Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw --force enable

# Check status
sudo ufw status
```

#### SSL/TLS Configuration
```bash
# Generate SSL certificate (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com

# Or use self-signed for testing
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/gamev1.key \
    -out /etc/ssl/certs/gamev1.crt
```

### Application Security

#### Secret Management
```bash
# Generate secure secrets
openssl rand -base64 32  # JWT secret
openssl rand -base64 16  # Database password

# Store in secure location
sudo mkdir -p /opt/gamev1/secrets
sudo chown gamev1:gamev1 /opt/gamev1/secrets
```

#### Rate Limiting
Production rate limits are configured in `config/production.env`:
```env
# IP-based limits
RATE_LIMIT_DEFAULT_IP_BURST=10000
RATE_LIMIT_DEFAULT_IP_SUSTAINED=20000

# User-based limits
RATE_LIMIT_DEFAULT_USER_BURST=5000
RATE_LIMIT_DEFAULT_USER_SUSTAINED=10000
```

### Access Control

#### Service User
```bash
# Verify gamev1 user
id gamev1

# Check permissions
ls -la /opt/gamev1/

# Service file permissions
sudo systemctl status gamev1-gateway
```

## 💾 Backup & Recovery

### Database Backup

#### PocketBase Backup
```bash
# Create backup directory
sudo mkdir -p /opt/gamev1/backups

# Backup script
cat > /opt/gamev1/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/gamev1/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
curl -X POST "http://localhost:8090/api/backups" \
     -H "Authorization: Bearer $POCKETBASE_TOKEN" \
     -o "$BACKUP_DIR/pocketbase_backup_$DATE.zip"

# Keep only last 7 days
find $BACKUP_DIR -name "pocketbase_backup_*.zip" -mtime +7 -delete

echo "Backup created: pocketbase_backup_$DATE.zip"
EOF

chmod +x /opt/gamev1/scripts/backup-db.sh
```

#### Automated Backups
```bash
# Add to cron (as root)
echo "0 2 * * * /opt/gamev1/scripts/backup-db.sh" | sudo tee -a /etc/crontab
```

### Configuration Backup

```bash
# Backup configuration
sudo tar -czf /opt/gamev1/backups/config_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    -C /opt/gamev1 config/

# Backup scripts
sudo tar -czf /opt/gamev1/backups/scripts_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    -C /opt/gamev1 scripts/
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop services
sudo systemctl stop gamev1-*

# Restore latest backup
LATEST_BACKUP=$(ls -t /opt/gamev1/backups/pocketbase_backup_*.zip | head -1)
curl -X POST "http://localhost:8090/api/backups/restore" \
     -H "Authorization: Bearer $POCKETBASE_TOKEN" \
     -F "file=@$LATEST_BACKUP"

# Start services
sudo systemctl start gamev1-*
```

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status gamev1-gateway

# Check logs
sudo journalctl -u gamev1-gateway -f

# Check configuration
sudo cat /opt/gamev1/config/production.env
```

#### High Memory Usage
```bash
# Check memory usage
htop

# Check for memory leaks
sudo journalctl -u gamev1-worker --since "1 hour ago" | grep -i "memory\|leak"

# Adjust memory limits in service files
sudo systemctl edit gamev1-worker
# Add: MemoryLimit=2G
```

#### Database Connection Issues
```bash
# Check database status
curl http://localhost:8090/api/health

# Check database logs
sudo journalctl -u gamev1-pocketbase -f

# Verify connection pool settings
sudo cat /opt/gamev1/config/production.env | grep -i "connection\|pool"
```

#### WebSocket Connection Issues
```bash
# Test WebSocket connection
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
     http://localhost:8080/ws

# Check WebSocket logs
sudo journalctl -u gamev1-gateway | grep -i "websocket\|ws"
```

### Performance Issues

#### High Response Times
```bash
# Check system resources
htop
iostat -x 1

# Check database performance
curl http://localhost:8080/api/metrics | grep -E "(database|query|connection)"

# Check for connection pool exhaustion
sudo journalctl -u gamev1-gateway | grep -i "pool\|connection"
```

#### High Error Rates
```bash
# Check error logs
sudo journalctl -u gamev1-gateway --since "1 hour ago" | grep -i "error\|fail"

# Check rate limiting
sudo journalctl -u gamev1-gateway | grep -i "rate.limit\|429"

# Verify configuration
sudo cat /opt/gamev1/config/production.env
```

### Emergency Procedures

#### Stop All Services
```bash
# Native deployment
sudo systemctl stop gamev1-*

# Docker deployment
docker-compose -f docker-compose.production.yml down
```

#### Restart Services
```bash
# Native deployment
sudo systemctl restart gamev1-gateway
sudo systemctl restart gamev1-worker

# Docker deployment
docker-compose -f docker-compose.production.yml restart gateway worker
```

#### Rollback Deployment
```bash
# Use the rollback script
sudo ./deploy-production.sh rollback

# Or manual rollback
sudo systemctl stop gamev1-*
sudo cp /opt/gamev1/backup/bin/* /opt/gamev1/bin/
sudo systemctl start gamev1-*
```

## 📞 Support & Monitoring

### Health Monitoring
- **Gateway Health**: `http://yourdomain.com/health`
- **Database Health**: `http://yourdomain.com:8090/api/health`
- **Grafana Dashboard**: `http://yourdomain.com:3000` (admin/admin)

### Log Monitoring
```bash
# Real-time logs (native)
sudo journalctl -f -u gamev1-gateway -u gamev1-worker

# Docker logs
docker-compose logs -f gateway worker

# Application logs
sudo tail -f /opt/gamev1/logs/*.log
```

### Metrics & Alerts
- **Prometheus**: `http://yourdomain.com:9091`
- **Alert Manager**: Configure alerts for critical metrics
- **Grafana**: Create custom dashboards and alerts

### Emergency Contacts
- **System Alerts**: Configure email/Slack notifications
- **On-call Rotation**: Set up escalation procedures
- **Incident Response**: Document response procedures

## 🎯 Production Checklist

### Pre-Deployment
- [ ] System meets minimum requirements
- [ ] Rust toolchain installed and configured
- [ ] Production configuration prepared
- [ ] SSL certificates configured
- [ ] Firewall rules set up
- [ ] Backup procedures tested

### During Deployment
- [ ] Services start successfully
- [ ] Health checks pass
- [ ] API endpoints respond
- [ ] Database connections work
- [ ] WebSocket connections establish
- [ ] Metrics collection active

### Post-Deployment
- [ ] Load testing completed
- [ ] Performance benchmarks met
- [ ] Monitoring dashboards configured
- [ ] Backup procedures verified
- [ ] Security audit completed
- [ ] Documentation updated

### Ongoing Operations
- [ ] Regular backup verification
- [ ] Performance monitoring
- [ ] Security updates
- [ ] Log rotation
- [ ] Service updates
- [ ] Incident response drills

---

## 🎉 Success Metrics

Your GameV1 deployment is successful when:

✅ **Performance**: < 50ms P95 response times
✅ **Reliability**: 99.9% uptime
✅ **Scalability**: 1000+ concurrent users
✅ **Security**: No security incidents
✅ **Monitoring**: Full observability
✅ **Maintenance**: Smooth operations

**Congratulations on your successful GameV1 production deployment! 🚀**
