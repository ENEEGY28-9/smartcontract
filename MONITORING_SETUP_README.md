# 🔧 GameV1 Prometheus Monitoring Setup Guide

## 📋 Tổng quan

Hệ thống monitoring GameV1 sử dụng **Prometheus** để thu thập metrics và **Grafana** để visualization. Hệ thống đã được tối ưu cho game development với các metrics chuyên biệt cho:

- ✅ **Gateway Performance**: HTTP requests, WebSocket connections, authentication
- ✅ **Worker Performance**: Frame time, RPC calls, gameplay events, bandwidth
- ✅ **Room Manager**: Room lifecycle, matchmaking queue, player management
- ✅ **Game-specific Metrics**: Latency, prediction accuracy, state sync

## 🚀 Quick Start

### 1. Install Dependencies

#### Linux/macOS:
```bash
# Prometheus
# Ubuntu/Debian
sudo apt install prometheus

# macOS
brew install prometheus

# Grafana (optional)
sudo apt install grafana  # Ubuntu/Debian
brew install grafana       # macOS
```

#### Windows:
```bash
# Download Prometheus from: https://prometheus.io/download/
# Download Grafana from: https://grafana.com/grafana/download
# Add both to your PATH
```

### 2. Start Monitoring Services

#### Linux/macOS:
```bash
# Make script executable
chmod +x scripts/start-monitoring.sh

# Start monitoring stack
./scripts/start-monitoring.sh
```

#### Windows:
```cmd
scripts\start-monitoring.bat
```

### 3. Start Game Services

Start services theo thứ tự:

```bash
# Terminal 1: Gateway
cargo run -p gateway

# Terminal 2: Worker
cargo run -p worker

# Terminal 3: Room Manager
cargo run -p room-manager
```

### 4. Access Monitoring Dashboards

- **Prometheus Web UI**: http://localhost:9090
- **Grafana Web UI**: http://localhost:3000 (default: admin/admin)
- **Gateway Metrics**: http://localhost:8080/metrics
- **Worker Metrics**: http://localhost:3100/metrics
- **Room Manager Metrics**: http://localhost:3200/metrics

## 📊 Available Metrics

### Gateway Metrics (`localhost:8080/metrics`)

| Metric | Description | Labels |
|--------|-------------|---------|
| `gateway_response_time_seconds` | HTTP response time | endpoint, method, status_code |
| `gateway_active_connections` | Active connections | connection_type, status |
| `gateway_auth_success_total` | Authentication successes | auth_method, user_type |
| `gateway_game_messages_total` | Game messages | message_type, room_id, direction |
| `gateway_rate_limited_requests_total` | Rate limit hits | limit_type, client_type |

### Worker Metrics (`localhost:3100/metrics`)

| Metric | Description | Labels |
|--------|-------------|---------|
| `worker_frame_time_seconds` | Frame processing time | frame_type, status |
| `worker_rpc_calls_total` | RPC call count | method, status |
| `worker_gameplay_events_total` | Gameplay events | event_type, room_id, player_id |
| `worker_bandwidth_bytes_total` | Bandwidth usage | direction, room_id, player_id |
| `worker_active_rooms` | Active game rooms | room_id, status |

### Room Manager Metrics (`localhost:3200/metrics`)

| Metric | Description | Labels |
|--------|-------------|---------|
| `room_manager_rooms_created_total` | Rooms created | - |
| `room_manager_active_rooms` | Active rooms | - |
| `room_manager_matchmaking_queue_depth` | Matchmaking queue | - |

## 🔍 Example Prometheus Queries

### Performance Monitoring
```promql
# Gateway response time (95th percentile)
histogram_quantile(0.95, rate(gateway_response_time_seconds_bucket[5m]))

# Worker frame time (99th percentile)
histogram_quantile(0.99, rate(worker_frame_time_seconds_bucket[5m]))

# Active connections
gateway_active_connections{connection_type="websocket"}

# RPC call rate
rate(worker_rpc_calls_total[5m])
```

### Game-specific Monitoring
```promql
# Game message rate
rate(gateway_game_messages_total[5m])

# Player latency
rate(worker_player_latency_seconds_bucket[5m])

# Room activity
room_manager_active_rooms

# Authentication success rate
rate(gateway_auth_success_total[5m]) / rate(gateway_auth_success_total[5m] + gateway_auth_failure_total[5m])
```

### Error Monitoring
```promql
# Gateway error rate
rate(gateway_http_requests_failed_total[5m]) / rate(gateway_http_requests_total[5m])

# Worker RPC error rate
rate(worker_rpc_calls_total{status="error"}[5m]) / rate(worker_rpc_calls_total[5m])

# Rate limiting activity
rate(gateway_rate_limited_requests_total[5m])
```

## 📈 Grafana Dashboards

### Setup Grafana Datasource

1. Open Grafana: http://localhost:3000
2. Login with admin/admin
3. Go to Configuration → Data Sources
4. Add new data source: Prometheus
5. Set URL: `http://localhost:9090`
6. Save and test

### Import Dashboards

1. Go to Create → Import
2. Upload dashboard JSON from `config/grafana/dashboards/`
3. Or create custom dashboards using the metrics above

### Recommended Dashboard Panels

#### Gateway Performance Dashboard
- Response time histogram
- Active connections gauge
- Error rate graph
- Authentication metrics
- Rate limiting alerts

#### Worker Performance Dashboard
- Frame time histogram
- RPC call rates
- Gameplay events
- Memory usage
- Active rooms

#### Game Overview Dashboard
- Player activity
- Room utilization
- Network latency
- Performance trends

## ⚠️ Alerts Configuration

Alert rules are defined in `config/alerts.yml`:

- **GatewayHighResponseTime**: Response time > 100ms for 2+ minutes
- **WorkerHighFrameTime**: Frame time > 50ms for 2+ minutes
- **HighAuthFailureRate**: Auth failure rate > 50%
- **HighRateLimitHits**: Rate limiting triggered > 10/min

### Enable Alerts

1. Start Alertmanager (optional)
2. Configure notification channels in Grafana
3. Set up email/Slack notifications

## 🔧 Development Configuration

### Environment Variables

```bash
# Gateway
export GATEWAY_METRICS_ADDR=127.0.0.1:8080

# Worker
export WORKER_METRICS_ADDR=127.0.0.1:3100
export WORKER_RPC_ADDR=127.0.0.1:50051

# Room Manager
export ROOM_MANAGER_METRICS_ADDR=127.0.0.1:3200
```

### Custom Metrics

Add custom metrics by:

1. Define metric in service code:
```rust
static CUSTOM_METRIC: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!("custom_metric", "Description", &["label"])
});
```

2. Record in handlers:
```rust
CUSTOM_METRIC.with_label_values(&["value"]).inc();
```

3. Update Prometheus config if needed

## 🛠️ Troubleshooting

### Common Issues

**Prometheus not starting:**
- Check if ports 9090, 3100, 3200 are available
- Verify config file syntax: `promtool check config config/prometheus.yml`

**Metrics not appearing:**
- Check service logs for errors
- Verify services are running on correct ports
- Test metrics endpoints directly: `curl localhost:8080/metrics`

**Grafana connection issues:**
- Ensure Prometheus is accessible from Grafana
- Check firewall settings
- Verify datasource configuration

### Performance Tuning

- **Scrape interval**: Currently 10-15s for development (adjust in `config/prometheus.yml`)
- **Retention**: Prometheus data stored in `data/prometheus/` (default 15 days)
- **Memory**: Monitor Prometheus memory usage, increase if needed

### Logs

- Prometheus: `logs/prometheus.log`
- Grafana: `logs/grafana.log`
- Service logs: Check individual service logs

## 🚀 Production Deployment

For production deployment:

1. Use Docker Compose (see `docker/` directory)
2. Update Prometheus config for production targets
3. Configure persistent storage
4. Set up proper alerting and notifications
5. Monitor resource usage and scale accordingly

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Metrics Types](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)

---

**🎯 Next Steps:**
1. Start monitoring services
2. Run game services
3. Access Prometheus UI and explore metrics
4. Create custom Grafana dashboards
5. Set up alerts for critical metrics

Happy monitoring! 🎮📊
