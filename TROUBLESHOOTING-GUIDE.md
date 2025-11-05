# 🔧 GameV1 Troubleshooting Guide

## 📋 Mục lục

- [Quick Fixes](#quick-fixes)
- [Service Issues](#service-issues)
- [Network Issues](#network-issues)
- [Monitoring Issues](#monitoring-issues)
- [Performance Issues](#performance-issues)
- [Database Issues](#database-issues)
- [Common Errors](#common-errors)

---

## 🚀 Quick Fixes

### **System không start được**
```bash
# Kiểm tra Docker
docker --version
docker compose version

# Restart Docker Desktop
# Windows: Restart Docker Desktop
# Linux: sudo systemctl restart docker

# Clean restart
docker compose down -v
docker compose up -d
```

### **Port conflicts**
```bash
# Windows
netstat -ano | findstr "8080"

# Linux/Mac
lsof -i :8080

# Kill conflicting process
# Windows: taskkill /PID <PID> /F
# Linux: kill -9 <PID>
```

### **Permission issues**
```bash
# Fix Docker permissions (Linux)
sudo chown $USER:$USER /var/run/docker.sock

# Reset file permissions
chmod +x scripts/*.sh
```

---

## 🐳 Service Issues

### **Gateway không start**
```bash
# Check logs
docker compose logs gamev1-gateway

# Common issues:
# 1. Port 8080 in use
# 2. Worker service not healthy
# 3. Database connection failed

# Fix: Restart dependencies
docker compose restart gamev1-pocketbase gamev1-redis
docker compose restart gamev1-worker
docker compose restart gamev1-gateway
```

### **Worker service crashes**
```bash
# Check logs for errors
docker compose logs gamev1-worker

# Common issues:
# 1. gRPC connection to gateway failed
# 2. Database connection issues
# 3. Memory limits exceeded

# Fix: Check resource allocation
docker stats gamev1-worker

# Restart with more resources
docker compose down gamev1-worker
docker compose up -d gamev1-worker
```

### **Room Manager không hoạt động**
```bash
# Check logs
docker compose logs gamev1-room-manager

# Common issues:
# 1. Redis connection failed
# 2. Database not accessible
# 3. Port conflicts on 3200/3201

# Fix: Verify Redis
docker compose exec gamev1-redis redis-cli ping

# Check database
curl http://localhost:8090/api/health
```

### **PocketBase database issues**
```bash
# Check database health
curl http://localhost:8090/api/health

# View logs
docker compose logs gamev1-pocketbase

# Common fixes:
# 1. Reset database
docker compose down gamev1-pocketbase
docker volume rm gamev1_pocketbase_data
docker compose up -d gamev1-pocketbase

# 2. Check encryption key
# Edit docker-compose.yml and update PB_ENCRYPTION_KEY
```

---

## 🌐 Network Issues

### **Services không thể connect với nhau**
```bash
# Check network
docker network ls
docker network inspect gamev1-network

# Test connectivity between containers
docker compose exec gamev1-gateway ping gamev1-worker
docker compose exec gamev1-worker curl http://gamev1-pocketbase:8090/api/health

# Fix: Restart network
docker compose down
docker compose up -d
```

### **Port không accessible từ host**
```bash
# Check port binding
docker compose ps

# Verify container ports
docker compose exec gamev1-gateway netstat -tlnp | grep 8080

# Check firewall (Linux)
sudo ufw status
sudo ufw allow 8080

# Windows: Check Windows Firewall settings
```

### **WebSocket connections fail**
```bash
# Test WebSocket upgrade
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  http://localhost:8080/ws

# Check gateway logs for WebSocket errors
docker compose logs gamev1-gateway | grep -i websocket

# Verify proxy settings (if using load balancer)
```

---

## 📊 Monitoring Issues

### **Grafana không load dashboards**
```bash
# Check Grafana logs
docker compose logs gamev1-grafana

# Manual dashboard import
curl -X POST -H "Content-Type: application/json" \
  -d @config/grafana/dashboards/gamev1-overview.json \
  http://admin:gamev1_admin_2024@localhost:3000/api/dashboards/db

# Check datasource connection
curl -u admin:gamev1_admin_2024 \
  http://localhost:3000/api/datasources/1/health
```

### **Prometheus không collect metrics**
```bash
# Check Prometheus logs
docker compose logs gamev1-prometheus

# Verify targets
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:8080/metrics
curl http://localhost:3100/metrics
curl http://localhost:3201/metrics

# Check Prometheus configuration
docker compose exec gamev1-prometheus cat /etc/prometheus/prometheus.yml
```

### **Metrics không xuất hiện trong dashboards**
```bash
# Check if metrics are being scraped
curl "http://localhost:9090/api/v1/query?query=gateway_active_connections"

# Verify metric names match dashboard queries
curl http://localhost:8080/metrics | grep -E "(gateway|worker|room_manager)"

# Check time range in Grafana
# Go to dashboard settings and verify time range
```

### **Alerts không hoạt động**
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Test alert firing manually
# Generate errors to trigger alerts
for i in {1..50}; do
  curl -f http://localhost:8080/nonexistent || true
done

# Check alert status in Grafana
# Go to Alerting > Alert Rules
```

---

## ⚡ Performance Issues

### **High response times**
```bash
# Check system resources
docker stats

# Monitor with Prometheus
curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(gateway_response_time_seconds_bucket[5m]))"

# Check for resource contention
docker compose exec gamev1-gateway top
docker compose exec gamev1-worker top

# Optimize: Scale services
docker compose up -d --scale gamev1-gateway=2
```

### **High memory usage**
```bash
# Check memory consumption
docker stats --format "table {{.Name}}\t{{.MemUsage}}"

# Analyze memory usage
docker compose exec gamev1-gateway ps aux --sort=-%mem

# Fix: Restart services
docker compose restart gamev1-worker
docker compose restart gamev1-gateway
```

### **High CPU usage**
```bash
# Monitor CPU usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}"

# Check for infinite loops or blocking operations
docker compose logs gamev1-worker | tail -50
docker compose logs gamev1-gateway | tail -50

# Profile with Prometheus
curl "http://localhost:9090/api/v1/query?query=rate(process_cpu_seconds_total[5m])"
```

---

## 🗄️ Database Issues

### **PocketBase connection failed**
```bash
# Check database status
curl http://localhost:8090/api/health

# View database logs
docker compose logs gamev1-pocketbase

# Common fixes:
# 1. Wait for database to initialize
sleep 30

# 2. Check database files
docker compose exec gamev1-pocketbase ls -la /opt/pocketbase/pb_data/

# 3. Reset database
docker compose down gamev1-pocketbase
docker volume rm gamev1_pocketbase_data
docker compose up -d gamev1-pocketbase
```

### **Redis connection issues**
```bash
# Test Redis connectivity
docker compose exec gamev1-redis redis-cli ping

# Check Redis logs
docker compose logs gamev1-redis

# Fix: Restart Redis
docker compose restart gamev1-redis

# Check Redis configuration
docker compose exec gamev1-redis redis-cli info
```

---

## 🚨 Common Errors

### **Error: Port already in use**
```bash
# Find what's using the port
# Windows: netstat -ano | findstr "8080"
# Linux: lsof -i :8080

# Stop the conflicting service
# Windows: taskkill /PID <PID> /F
# Linux: kill -9 <PID>

# Or change port in docker-compose.yml
```

### **Error: Connection refused**
```bash
# Check if service is running
docker compose ps

# Check health endpoints
curl http://localhost:8080/healthz

# Check network connectivity
docker compose exec gamev1-gateway curl http://gamev1-worker:50051/healthz

# Fix: Restart dependent services
docker compose restart gamev1-pocketbase gamev1-redis
```

### **Error: No space left on device**
```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk space
# Windows: dir C:\
# Linux: df -h
```

### **Error: Permission denied**
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Fix Docker permissions (Linux)
sudo chown $USER:$USER /var/run/docker.sock

# Windows: Run PowerShell as Administrator
```

### **Error: Service unhealthy**
```bash
# Check service health
docker compose ps

# View detailed logs
docker compose logs [service-name]

# Check health check configuration in docker-compose.yml

# Fix: Restart service
docker compose restart [service-name]
```

---

## 🔍 Debug Tools

### **Log Analysis**
```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f gamev1-gateway

# View last 100 lines
docker compose logs --tail=100 gamev1-worker

# Search for errors
docker compose logs | grep -i error
```

### **Container Inspection**
```bash
# Inspect container details
docker inspect gamev1-gateway

# Check running processes
docker compose exec gamev1-gateway ps aux

# Check environment variables
docker compose exec gamev1-gateway env

# Check network configuration
docker compose exec gamev1-gateway netstat -tlnp
```

### **Resource Monitoring**
```bash
# Real-time resource monitoring
docker stats

# Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up

# System metrics
# Windows: taskmgr
# Linux: htop or top
# Mac: Activity Monitor
```

---

## 🆘 Emergency Recovery

### **Complete System Reset**
```bash
# Stop all services
docker compose down

# Remove all volumes (WARNING: Deletes data)
docker compose down -v

# Remove all containers and images
docker system prune -a --volumes

# Rebuild and restart
docker compose up -d --build
```

### **Database Recovery**
```bash
# Backup current data
docker compose exec gamev1-pocketbase tar czf /tmp/backup.tar.gz /opt/pocketbase/pb_data/

# Reset database
docker compose down gamev1-pocketbase
docker volume rm gamev1_pocketbase_data
docker compose up -d gamev1-pocketbase

# Restore data (if needed)
# docker compose exec gamev1-pocketbase tar xzf /tmp/backup.tar.gz
```

### **Configuration Recovery**
```bash
# Reset Grafana
docker compose down gamev1-grafana
docker volume rm gamev1_grafana_data
docker compose up -d gamev1-grafana

# Re-run setup
./scripts/setup-grafana.sh
```

---

## 📞 Support Commands

### **Get System Status**
```bash
# All services status
docker compose ps

# Service health
curl http://localhost:8080/healthz
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health

# Metrics status
curl http://localhost:9090/api/v1/targets
```

### **View All Logs**
```bash
# All services
docker compose logs -f

# Last 50 lines from each service
docker compose logs --tail=50

# Search for specific errors
docker compose logs | grep -i error
```

### **Resource Usage**
```bash
# Current resource usage
docker stats

# System resources
# Windows: taskmgr
# Linux: htop
# Mac: Activity Monitor
```

---

## 🎯 Quick Reference

### **Most Common Issues:**

1. **Port conflicts** → Check `netstat` and kill processes
2. **Service dependencies** → Restart in order: DB → Redis → Worker → Gateway
3. **Permission issues** → Run as admin or fix Docker permissions
4. **Resource limits** → Check `docker stats` and adjust limits
5. **Network issues** → Verify container networking

### **Quick Health Check:**
```bash
# Run all health tests
./scripts/test-health-endpoints.bat

# Check system metrics
curl http://localhost:9090/api/v1/query?query=up
```

### **Emergency Restart:**
```bash
docker compose down
docker compose up -d
```

**Nếu vẫn gặp vấn đề, kiểm tra logs và chạy test scripts để diagnose!** 🔧
