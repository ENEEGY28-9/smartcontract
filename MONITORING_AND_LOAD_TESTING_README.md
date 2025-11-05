# 🎯 Enhanced Monitoring & Load Testing Suite

## 📋 Overview

This document describes the comprehensive monitoring and load testing improvements implemented for the GameV1 backend system. These enhancements provide enterprise-grade observability and performance validation capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ for Artillery load testing
- Docker (optional) for Prometheus/Grafana
- Running GameV1 backend services

### 1. Start Monitoring Stack
```bash
# Start Prometheus
docker run -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus

# Start Grafana
docker run -p 3000:3000 grafana/grafana

# Import dashboard
# 1. Go to http://localhost:3000
# 2. Login with admin/admin
# 3. Create new dashboard from JSON
# 4. Import grafana-dashboard.json
```

### 2. Run Load Tests
```bash
# Install Artillery
npm install -g artillery

# Start backend services
cargo run --bin gateway

# Run comprehensive load tests
node run-load-tests.js

# Run individual tests
artillery run artillery-http-api.yml
artillery run artillery-websocket.yml
artillery run artillery-mixed-workload.yml
```

## 📊 Monitoring Setup

### Prometheus Configuration

**File**: `prometheus.yml`
- **Gateway metrics**: Scrapes `/metrics` endpoint every 10 seconds
- **Worker metrics**: Configured for worker service (when available)
- **System metrics**: Node exporter integration
- **Custom game metrics**: High-frequency game-specific metrics (5s interval)

**Key Metrics Collected**:
- HTTP request rate, latency, and error rates
- WebSocket connection counts and message rates
- Game-specific metrics (latency, prediction accuracy, room activity)
- Memory usage, CPU usage, database connections
- Rate limiting hits and circuit breaker status

### Grafana Dashboards

**File**: `grafana-dashboard.json`
- **Real-time metrics visualization** with 30-second refresh
- **Performance monitoring panels** for all critical metrics
- **Alert thresholds** with color-coded indicators
- **Game-specific dashboards** for player experience metrics

**Dashboard Panels**:
1. **Gateway HTTP Requests** - Request rate and throughput
2. **Error Rate** - 5xx error monitoring with thresholds
3. **Response Time** - 95th percentile latency tracking
4. **Active WebSocket Connections** - Real-time connection monitoring
5. **Game Rooms Activity** - Per-room player distribution
6. **Memory Usage** - System memory consumption
7. **CPU Usage** - System CPU utilization
8. **Rate Limiting** - Request throttling monitoring
9. **Game Player Latency** - Heatmap of player experience
10. **Database Connection Pool** - Connection utilization

### Alerting Rules

**File**: `prometheus-alerts.yml`

#### Critical Alerts (> 5% error rate, > 0.5s latency)
- Gateway service down
- High error rates (> 5%)
- Slow response times (> 0.5s 95th percentile)
- Too many WebSocket connections (> 1000)
- High memory usage (> 2GB)

#### Warning Alerts (Performance degradation indicators)
- Elevated error rates (> 1%)
- Slow response times (> 0.2s)
- Many rate-limited requests (> 20/s)
- High database connection usage (> 20 connections)

#### Game-Specific Alerts
- High game latency (> 0.1s 95th percentile)
- Low client prediction accuracy (< 70%)
- High latency compensation (> 100ms)

## 🧪 Load Testing Suite

### Artillery Configurations

#### 1. HTTP API Load Testing (`artillery-http-api.yml`)
- **Complete player lifecycle** simulation (30% weight)
- **Game management operations** (20% weight)
- **Chat system testing** (20% weight)
- **Social features** (15% weight)
- **High frequency requests** (10% weight)
- **Health monitoring** (5% weight)

**Test Phases**:
- Warmup: 60s @ 10 RPS
- Normal Load: 120s @ 50 RPS
- Peak Load: 180s @ 100 RPS
- Stress Test: 120s @ 150 RPS

#### 2. WebSocket Load Testing (`artillery-websocket.yml`)
- **Complete Player Journey** (40% weight) - Full game session simulation
- **Chat Intensive Session** (25% weight) - High-frequency chat testing
- **Quick Sessions** (20% weight) - Connection spike simulation
- **High Frequency Input** (15% weight) - 60 FPS gameplay simulation

**Realistic Scenarios**:
- 5-minute complete game sessions
- Variable think times (1-5 seconds)
- Realistic chat message patterns
- 60 FPS game input simulation

#### 3. Mixed Workload Testing (`artillery-mixed-workload.yml`)
- **Mixed HTTP + WebSocket** (35% weight) - Most realistic scenario
- **Chat workload** (30% weight) - HTTP chat operations
- **System monitoring** (20% weight) - Health check patterns
- **High frequency mixed** (15% weight) - Stress testing

**Advanced Features**:
- Simultaneous HTTP and WebSocket operations
- Realistic user behavior patterns
- Variable load patterns with cooldown phases
- Comprehensive error scenario testing

### Automated Test Runner

**File**: `run-load-tests.js`

**Features**:
- ✅ **Automatic service health checks** before testing
- ✅ **Sequential test execution** with proper cooldown
- ✅ **Comprehensive result aggregation** and analysis
- ✅ **Performance recommendations** based on metrics
- ✅ **Detailed reporting** with JSON output

**Usage**:
```bash
# Run all tests
node run-load-tests.js

# Test individual scenarios
node run-load-tests.js quick    # 2min @ 10 RPS
node run-load-tests.js normal   # 5min @ 25 RPS
node run-load-tests.js stress   # 10min @ 100 RPS
```

## 🔧 API Enhancements

### Health Check Endpoints
- `GET /health` - Comprehensive health status
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /metrics` - Prometheus metrics export

### Game Management APIs
- `POST /api/rooms/{id}/start` - Start game session
- `POST /api/rooms/{id}/pause` - Pause gameplay
- `POST /api/rooms/{id}/resume` - Resume gameplay
- `POST /api/rooms/{id}/end` - End game session

### Player Management APIs
- `GET /api/players/{id}/stats` - Player statistics and achievements
- `PUT /api/players/{id}/settings` - Update player preferences
- `DELETE /api/players/{id}` - Delete player account

### Social Features APIs
- `GET /api/rooms/{id}/chat/history` - Chat message history with pagination
- `DELETE /api/chat/messages/{id}` - Delete specific messages
- `POST /api/rooms/{id}/chat/moderate` - Chat moderation tools
- `GET /api/leaderboards/weekly` - Weekly rankings
- `GET /api/leaderboards/monthly` - Monthly rankings
- `POST /api/leaderboards/report` - Report cheating/suspicious behavior

## 📈 Performance Targets

### Load Testing Goals
- **Response Time**: < 50ms 95th percentile
- **Error Rate**: < 1% under normal load
- **Throughput**: 1000+ RPS sustained
- **Concurrent Users**: 1000+ simultaneous connections
- **Memory Usage**: < 2GB under peak load

### Monitoring Objectives
- **95% system visibility** through comprehensive metrics
- **< 5 minute MTTR** with alerting and dashboards
- **Automated performance regression detection**
- **Real-time player experience monitoring**

## 🚨 Alerting & Notifications

### Alert Channels (Configurable)
```yaml
# Email alerts
- to: 'ops@gamev1.com'
  from: 'alerts@gamev1.com'

# Slack notifications
- webhook_url: 'https://hooks.slack.com/services/...'

# PagerDuty integration
- service_key: 'your-pagerduty-service-key'
```

### Escalation Policies
- **Critical alerts**: Immediate notification + escalation after 5 minutes
- **Warning alerts**: Notification only, no escalation
- **Info alerts**: Dashboard only, no notifications

## 📋 Testing Checklist

### Before Load Testing
- [ ] Backend services are running and healthy
- [ ] Database is populated with test data
- [ ] WebSocket connections are working
- [ ] All health endpoints respond correctly

### During Load Testing
- [ ] Monitor system resources (CPU, Memory, Disk I/O)
- [ ] Watch for error rate spikes
- [ ] Check WebSocket connection stability
- [ ] Verify database connection pool usage

### After Load Testing
- [ ] Review performance metrics and identify bottlenecks
- [ ] Check system logs for errors or warnings
- [ ] Validate data consistency
- [ ] Generate performance report

## 🔍 Troubleshooting

### Common Issues

#### High Error Rates
```bash
# Check service logs
tail -f gateway.log | grep ERROR

# Verify database connectivity
curl http://localhost:8080/health

# Check rate limiting
curl -H "Authorization: Bearer test" http://localhost:8080/api/rooms
```

#### WebSocket Connection Failures
```bash
# Test WebSocket connectivity
node test-simple-websocket.js

# Check WebSocket logs
tail -f gateway.log | grep websocket
```

#### Memory Issues
```bash
# Monitor memory usage
curl http://localhost:8080/metrics | grep memory

# Check for memory leaks
node --expose-gc test-memory-usage.js
```

### Performance Tuning

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX CONCURRENTLY idx_chat_messages_room_timestamp ON chat_messages(room_id, created_at);

-- Connection pool tuning
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
```

#### Gateway Optimization
```rust
// Rate limiting tuning
RATE_LIMIT_DEFAULT_IP_BURST=5000
RATE_LIMIT_DEFAULT_IP_SUSTAINED=10000

// Connection pool settings
DATABASE_POOL_MIN = 5
DATABASE_POOL_MAX = 20
```

## 📊 Results Analysis

### Key Metrics to Monitor
1. **Response Time Distribution** - Track P50, P95, P99 latencies
2. **Error Rate Trends** - Monitor 5xx errors over time
3. **Throughput Patterns** - RPS and concurrent connection counts
4. **Resource Utilization** - CPU, memory, database connections
5. **Player Experience** - Game latency and prediction accuracy

### Performance Benchmarks
- **Baseline**: 100 RPS @ < 50ms average response time
- **Normal Load**: 500 RPS @ < 100ms 95th percentile
- **Peak Load**: 1000+ RPS @ < 200ms 95th percentile
- **Stress Test**: 1500+ RPS with < 1% error rate

## 🔄 Continuous Monitoring

### Automated Testing Pipeline
```yaml
# GitHub Actions workflow
name: Load Testing
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install -g artillery
      - run: cargo build --release
      - run: ./target/release/gateway &
      - run: sleep 30
      - run: node run-load-tests.js
      - uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: load-test-results/
```

### Monitoring as Code
All monitoring configurations are stored as code:
- Prometheus configuration in `prometheus.yml`
- Grafana dashboards in `grafana-dashboard.json`
- Alerting rules in `prometheus-alerts.yml`
- Load test configurations in Artillery YAML files

This ensures consistent monitoring across all environments and enables version control of monitoring setup.

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Artillery Documentation](https://artillery.io/docs/)
- [GameV1 Architecture Guide](./ARCHITECTURE.md)

## 🤝 Contributing

When adding new features:
1. Add corresponding metrics collection
2. Update load test scenarios
3. Add alerting rules for new metrics
4. Update dashboard panels
5. Document performance requirements

---

**Last Updated**: October 23, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
