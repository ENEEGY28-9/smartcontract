# 🚀 GameV1 System Startup Guide

## 📋 Tổng quan

Hướng dẫn chi tiết để khởi động và test hệ thống GameV1 với đầy đủ monitoring và observability.

## 🏁 Quick Start (5 phút)

### **Windows:**
```cmd
# 1. Build và start tất cả services
build-and-start.bat

# 2. Hoặc start từng bước
start-monitoring.bat
```

### **Linux/Mac:**
```bash
# 1. Build và start tất cả services
./build-and-start.sh

# 2. Hoặc start từng bước
./start-monitoring.sh
```

### **Access URLs:**
- 🌐 **Grafana**: http://localhost:3000 (admin/gamev1_admin_2024)
- 📊 **Prometheus**: http://localhost:9090
- 🎮 **Game API**: http://localhost:8080
- 🗄️ **PocketBase**: http://localhost:8090

---

## 📖 Chi tiết từng bước

### **Bước 1: Kiểm tra Prerequisites** ✅

#### **Docker và Docker Compose**
```bash
# Windows
docker --version
docker compose version

# Linux/Mac
docker --version
docker-compose --version
```

#### **Port Availability**
```bash
# Windows PowerShell
netstat -an | findstr "LISTENING" | findstr "8080\|3000\|9090\|3100\|3200"

# Linux/Mac
netstat -tlnp | grep -E ":(8080|3000|9090|3100|3200|3201)"
```

### **Bước 2: Build và Start Services** 🔨

#### **Option A: All-in-One (Khuyến nghị)**
```bash
# Linux/Mac
./build-and-start.sh

# Windows
build-and-start.bat
```

#### **Option B: Manual Step-by-Step**

**2.1 Start Infrastructure:**
```bash
docker compose up -d gamev1-redis gamev1-pocketbase
```

**2.2 Wait for Infrastructure (30s):**
```bash
# Check health
docker compose ps
```

**2.3 Start Application Services:**
```bash
docker compose up -d gamev1-worker gamev1-room-manager gamev1-gateway
```

**2.4 Start Monitoring Stack:**
```bash
docker compose up -d gamev1-prometheus gamev1-grafana
```

**2.5 Verify All Services:**
```bash
docker compose ps
```

Expected output:
```
NAME                  STATUS       PORTS
gamev1-gateway        running      0.0.0.0:8080->8080/tcp
gamev1-worker         running      50051/tcp, 0.0.0.0:3100->3100/tcp
gamev1-room-manager   running      0.0.0.0:3200->3200/tcp, 0.0.0.0:3201->3201/tcp
gamev1-prometheus     running      0.0.0.0:9090->9090/tcp
gamev1-grafana        running      0.0.0.0:3000->3000/tcp
gamev1-pocketbase      running      0.0.0.0:8090->8090/tcp
gamev1-redis           running      0.0.0.0:6379->6379/tcp
```

### **Bước 3: Setup Grafana** 🎨

#### **Automated Setup:**
```bash
# Linux/Mac
./scripts/setup-grafana.sh

# Windows
scripts\setup-grafana.bat
```

#### **Manual Setup:**
```bash
# 1. Access Grafana
open http://localhost:3000

# 2. Login
Username: admin
Password: gamev1_admin_2024

# 3. Configure datasource manually if needed
# - Go to Configuration > Data Sources
# - Add Prometheus: http://localhost:9090
```

### **Bước 4: Verify Setup** ✅

#### **Health Checks:**
```bash
# Test all health endpoints
curl -f http://localhost:8080/healthz    # Gateway
curl -f http://localhost:3100/metrics    # Worker metrics
curl -f http://localhost:3200/healthz    # Room Manager
curl -f http://localhost:9090/-/healthy  # Prometheus
curl -f http://localhost:3000/api/health # Grafana
```

#### **Metrics Verification:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check metrics are being scraped
curl http://localhost:8080/metrics | head -20
curl http://localhost:3100/metrics | head -20
curl http://localhost:3201/metrics | head -20
```

---

## 🧪 Testing Thực tế

### **Test 1: Basic API Tests** 🌐

#### **Gateway Health:**
```bash
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  http://localhost:8080/healthz
```

#### **Authentication Test:**
```bash
# Test auth endpoint
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
```

### **Test 2: WebSocket Connection** 🔌

#### **Using JavaScript (Browser Console):**
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (msg) => console.log('Message:', msg.data);
ws.onclose = () => console.log('Disconnected');

// Send test message
ws.send(JSON.stringify({type: 'ping'}));
```

#### **Using WebSocket Test:**
```bash
# Install websocket client
npm install -g wscat

# Connect to gateway
wscat -c ws://localhost:8080/ws

# Send test message
{"type": "ping", "timestamp": 1234567890}
```

### **Test 3: Game Room Creation** 🎮

#### **Create Room via API:**
```bash
curl -X POST http://localhost:8080/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "gameMode": "classic",
    "maxPlayers": 4,
    "isPrivate": false
  }'
```

#### **Get Active Rooms:**
```bash
curl http://localhost:8080/api/rooms
```

### **Test 4: Load Testing** ⚡

#### **Simple Load Test:**
```bash
# Install siege for load testing
# Ubuntu/Debian: sudo apt install siege
# Mac: brew install siege

# Test gateway with 100 concurrent users for 1 minute
siege -c 100 -t 1M http://localhost:8080/healthz

# Test with multiple URLs
siege -c 50 -t 30s \
  "http://localhost:8080/healthz" \
  "http://localhost:8080/api/rooms" \
  "http://localhost:8080/metrics"
```

#### **WebSocket Load Test:**
```javascript
// Create multiple WebSocket connections
const connections = [];
for (let i = 0; i < 50; i++) {
  const ws = new WebSocket('ws://localhost:8080/ws');
  connections.push(ws);

  ws.onopen = () => {
    console.log(`Connection ${i} opened`);
    // Send periodic messages
    setInterval(() => {
      ws.send(JSON.stringify({
        type: 'game_input',
        playerId: `player_${i}`,
        action: 'move',
        data: {x: Math.random(), y: Math.random()}
      }));
    }, 1000);
  };
}
```

### **Test 5: Monitoring Verification** 📊

#### **Check Metrics in Prometheus:**
```bash
# Query active connections
curl "http://localhost:9090/api/v1/query?query=gateway_active_connections"

# Query response times
curl "http://localhost:9090/api/v1/query?query=rate(gateway_response_time_seconds_bucket[5m])"

# Query error rates
curl "http://localhost:9090/api/v1/query?query=rate(gateway_http_requests_failed_total[5m])"
```

#### **Verify Grafana Dashboards:**
1. Open http://localhost:3000
2. Check **GameV1 Overview** dashboard
3. Verify **Gateway Performance** dashboard
4. Monitor **Game Metrics** dashboard
5. Review **System Health** dashboard

#### **Test Alerting:**
```bash
# Generate high error rate to trigger alerts
for i in {1..100}; do
  curl -f http://localhost:8080/nonexistent || true
done

# Check if alerts fire in Grafana Alert Overview dashboard
```

---

## 🔍 Troubleshooting

### **Service không start được:**
```bash
# Check logs
docker compose logs gamev1-gateway
docker compose logs gamev1-worker

# Check resource usage
docker stats

# Restart specific service
docker compose restart gamev1-gateway
```

### **Port conflicts:**
```bash
# Find what's using the port
netstat -ano | findstr "8080"

# Kill process if needed
taskkill /PID <PID> /F
```

### **Grafana không load dashboards:**
```bash
# Check Grafana logs
docker compose logs gamev1-grafana

# Manual import dashboards
curl -X POST -H "Content-Type: application/json" \
  -d @config/grafana/dashboards/gamev1-overview.json \
  http://admin:gamev1_admin_2024@localhost:3000/api/dashboards/db
```

### **Metrics không xuất hiện:**
```bash
# Check if services are exposing metrics
curl http://localhost:8080/metrics
curl http://localhost:3100/metrics
curl http://localhost:3201/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

---

## 📈 Performance Testing

### **Stress Test với 1000 concurrent connections:**
```bash
# Install hey for HTTP load testing
# go install github.com/rakyll/hey@latest

# Test API endpoints
hey -n 10000 -c 100 http://localhost:8080/healthz

# Test WebSocket connections (custom script needed)
```

### **Memory và CPU monitoring:**
```bash
# Monitor Docker stats
docker stats

# Check system resources
# Windows: taskmgr
# Linux: htop or top
# Mac: Activity Monitor
```

---

## 🎯 Monitoring Dashboards

### **Key Dashboards để theo dõi:**

1. **GameV1 Overview** - Tổng quan real-time
2. **Gateway Performance** - API performance metrics
3. **Game Metrics** - Gameplay và player statistics
4. **System Health** - Infrastructure monitoring
5. **Alert Overview** - Alert status và history

### **Important Metrics:**
- Response Time < 50ms (95th percentile)
- Error Rate < 1%
- Active Connections > 1000
- Memory Usage < 80%
- CPU Usage < 70%

---

## 🚨 Emergency Commands

### **Stop all services:**
```bash
docker compose down
```

### **Stop và xóa volumes:**
```bash
docker compose down -v
```

### **View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gamev1-gateway

# Last 100 lines
docker compose logs --tail=100 gamev1-worker
```

### **Restart services:**
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart gamev1-grafana
```

---

## ✅ Verification Checklist

- [ ] All services are running (`docker compose ps`)
- [ ] Health endpoints respond 200 (`curl -f http://localhost:8080/healthz`)
- [ ] Metrics are accessible (`curl http://localhost:8080/metrics`)
- [ ] Grafana is accessible (http://localhost:3000)
- [ ] Dashboards are loaded and showing data
- [ ] Prometheus targets are healthy
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] No error logs in services

---

## 🎉 Success!

Khi tất cả tests pass, hệ thống GameV1 đã sẵn sàng:

✅ **Production Ready** - All services healthy và monitored
✅ **Observable** - Comprehensive monitoring với Grafana
✅ **Scalable** - Load balanced và containerized
✅ **Tested** - Verified với real traffic

**Chúc bạn thành công với GameV1!** 🚀
