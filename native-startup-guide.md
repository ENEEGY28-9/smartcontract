# 🚀 GameV1 Native Startup Guide

## 📋 Tổng quan

Vì Docker không có sẵn, bạn có thể chạy GameV1 system trực tiếp với Rust binaries đã được build sẵn!

## 🏁 Quick Start

### **Bước 1: Start Native Services**
```cmd
# Start tất cả services
start-native.bat

# Hoặc start từng service riêng
.\target\release\gateway.exe
.\target\release\worker.exe
.\target\release\room-manager.exe
```

### **Bước 2: Setup Database**
```cmd
# Cần cài đặt PocketBase và Redis riêng
# PocketBase: Download from https://pocketbase.io/
# Redis: Download from https://redis.io/
```

### **Bước 3: Access Services**
- **🎮 Gateway API**: http://localhost:8080
- **📊 Worker Metrics**: http://localhost:3100/metrics
- **🏠 Room Manager**: http://localhost:3200
- **📈 Monitoring**: Cần Docker để có Prometheus/Grafana

---

## 🔧 Setup từng bước

### **1. Database Setup**
```cmd
# PocketBase (cần download và run riêng)
# Download: https://pocketbase.io/
# Run: pocketbase.exe serve

# Redis (cần download và run riêng)
# Download: https://redis.io/
# Run: redis-server.exe
```

### **2. Start Services theo thứ tự**
```cmd
# 1. Start Worker (background service)
start /B .\target\release\worker.exe

# 2. Start Room Manager
start /B .\target\release\room-manager.exe

# 3. Start Gateway (API server)
.\target\release\gateway.exe
```

### **3. Verify Services**
```cmd
# Check if services are listening
netstat -ano | findstr "8080"
netstat -ano | findstr "3100"
netstat -ano | findstr "3200"

# Test health endpoints
curl http://localhost:8080/healthz
curl http://localhost:3100/metrics
```

---

## 🐳 Docker Alternative

Nếu muốn sử dụng Docker (khuyến nghị cho full monitoring):

### **1. Install Docker Desktop**
- Download: https://www.docker.com/products/docker-desktop/
- Install và start Docker Desktop

### **2. Start Full System**
```cmd
# Build và start tất cả services
docker compose up -d

# Hoặc sử dụng script
.\build-and-start.bat
```

### **3. Access Full Monitoring**
- **🌐 Grafana**: http://localhost:3000 (admin/gamev1_admin_2024)
- **📊 Prometheus**: http://localhost:9090
- **🎮 Gateway**: http://localhost:8080
- **🗄️ PocketBase**: http://localhost:8090
- **⚡ Redis**: localhost:6379

---

## 🔍 Troubleshooting Browser Errors

### **localhost:3000 (Grafana) - ERR_CONNECTION_REFUSED**
**Nguyên nhân**: Grafana chưa chạy
**Giải pháp**:
```cmd
# Option 1: Start with Docker
docker compose up -d gamev1-grafana

# Option 2: Use native monitoring
# Grafana native không khả thi, cần Docker
```

### **localhost:9090 (Prometheus) - ERR_CONNECTION_REFUSED**
**Nguyên nhân**: Prometheus chưa chạy
**Giải pháp**:
```cmd
# Start Prometheus with Docker
docker compose up -d gamev1-prometheus

# Hoặc setup Prometheus native (phức tạp)
```

### **localhost:8080 (Gateway) - HTTP ERROR 404**
**Nguyên nhân**: Gateway chạy nhưng không có routes hoặc services chưa ready
**Giải pháp**:
```cmd
# 1. Check if gateway is running
curl http://localhost:8080/healthz

# 2. Check logs
# Gateway cần worker và database để hoạt động

# 3. Start dependencies first
.\target\release\worker.exe
# Wait for worker to start
.\target\release\room-manager.exe
# Then start gateway
.\target\release\gateway.exe
```

### **localhost:8090 (PocketBase) - ERR_CONNECTION_REFUSED**
**Nguyên nhân**: PocketBase chưa chạy
**Giải pháp**:
```cmd
# Option 1: Start with Docker
docker compose up -d gamev1-pocketbase

# Option 2: Download và run PocketBase native
# Download from: https://pocketbase.io/
# Run: pocketbase.exe serve --http="0.0.0.0:8090"
```

---

## 🧪 Testing Native Services

### **Test Gateway API:**
```cmd
# Health check
curl http://localhost:8080/healthz

# API endpoints
curl http://localhost:8080/api/rooms
curl http://localhost:8080/api/players

# Metrics
curl http://localhost:8080/metrics
```

### **Test Worker Service:**
```cmd
# Worker metrics (internal)
curl http://localhost:3100/metrics

# Worker health (internal)
curl http://localhost:50051/healthz
```

### **Test Room Manager:**
```cmd
# Room Manager API
curl http://localhost:3200/healthz

# Room Manager metrics
curl http://localhost:3201/metrics
```

---

## 📊 Monitoring Setup

### **Option 1: Docker Monitoring (Khuyến nghị)**
```cmd
# Start monitoring stack
docker compose up -d gamev1-prometheus gamev1-grafana

# Setup Grafana
scripts\setup-grafana.bat

# Access dashboards
open http://localhost:3000
```

### **Option 2: Native Monitoring**
- **Metrics**: Services expose Prometheus metrics trực tiếp
- **Dashboards**: Sử dụng Prometheus + Grafana với Docker
- **Logs**: Check console output của services

---

## 🔧 Configuration

### **Environment Variables:**
```cmd
# Worker service
set POCKETBASE_URL=http://localhost:8090
set REDIS_URL=redis://localhost:6379
set METRICS_PORT=3100

# Gateway service
set WORKER_ENDPOINT=http://localhost:50051
set POCKETBASE_URL=http://localhost:8090
set REDIS_URL=redis://localhost:6379

# Room Manager
set POCKETBASE_URL=http://localhost:8090
set REDIS_URL=redis://localhost:6379
set METRICS_PORT=3201
```

---

## ✅ Verification

### **Check Services Running:**
```cmd
# Check processes
tasklist | findstr "gateway\|worker\|room-manager"

# Check ports
netstat -ano | findstr "LISTENING" | findstr "8080\|3100\|3200"
```

### **Test Endpoints:**
```cmd
# Gateway
curl http://localhost:8080/healthz

# Worker metrics
curl http://localhost:3100/metrics

# Room Manager
curl http://localhost:3200/healthz
curl http://localhost:3201/metrics
```

---

## 🚨 Common Issues

### **Port already in use:**
```cmd
# Find what's using the port
netstat -ano | findstr "8080"

# Kill process
taskkill /PID <PID> /F
```

### **Service won't start:**
```cmd
# Check for missing dependencies
# 1. Ensure database is running
# 2. Check network connectivity
# 3. Verify configuration files
```

### **No metrics data:**
```cmd
# Check if metrics endpoints are accessible
curl http://localhost:8080/metrics
curl http://localhost:3100/metrics
curl http://localhost:3201/metrics
```

---

## 🎯 Next Steps

1. **Start Native Services**: `start-native.bat`
2. **Setup Database**: Install PocketBase và Redis
3. **Test APIs**: Use curl commands above
4. **Setup Monitoring**: Use Docker cho Grafana/Prometheus
5. **View Dashboards**: http://localhost:3000

**Chúc bạn thành công với GameV1!** 🎉
