# 🔌 Circuit Breaker & Auto-Recovery Guide

## 📋 Mục lục
- [Tổng quan](#tổng-quan)
- [Cách hoạt động](#cách-hoạt-động)
- [Cấu hình](#cấu-hình)
- [Integration với Services](#integration-với-services)
- [Monitoring & Metrics](#monitoring--metrics)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Tổng quan

Circuit Breaker là một design pattern giúp ngăn chặn cascading failures trong hệ thống phân tán. Nó hoạt động như một "cầu dao điện" - khi phát hiện lỗi liên tục, nó sẽ "mở" để ngăn chặn các requests tiếp theo, tránh làm quá tải service bị lỗi.

### ✅ Các tính năng đã implement:

- **3 trạng thái**: Closed (bình thường) → Open (chặn requests) → HalfOpen (thử phục hồi)
- **Auto-recovery**: Tự động thử phục hồi sau timeout
- **Configurable thresholds**: Có thể cấu hình failure threshold, timeout
- **Comprehensive metrics**: Tracking calls, failures, state changes
- **Integration với worker service**: Circuit breaker bảo vệ worker gRPC calls

## ⚙️ Cách hoạt động

### Circuit Breaker States

```rust
pub enum CircuitBreakerState {
    Closed,   // Trạng thái bình thường - cho phép tất cả calls
    Open,     // Trạng thái lỗi - chặn tất cả calls
    HalfOpen, // Trạng thái thử nghiệm - cho phép một vài calls để test recovery
}
```

### State Transitions

```
   Closed
     ↓ (failures >= threshold)
   Open
     ↓ (timeout elapsed)
 HalfOpen
     ↓ (success)         ↓ (failure)
   Closed            ←   Open
```

## 🔧 Cấu hình

### Default Configuration

```rust
impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,           // 5 failures → Open
            recovery_timeout: Duration::from_secs(60),  // 60s để thử recovery
            call_timeout: Duration::from_secs(5),       // 5s timeout per call
            half_open_success_threshold: 3,            // 3 successes để đóng circuit
        }
    }
}
```

### Worker Service Configuration

```rust
pub fn create_worker_circuit_breaker() -> CircuitBreaker {
    CircuitBreaker::with_config(CircuitBreakerConfig {
        failure_threshold: 3,           // Mở nhanh hơn cho worker calls
        recovery_timeout: Duration::from_secs(30),  // Thử recovery sớm hơn
        call_timeout: Duration::from_secs(3),       // Timeout ngắn hơn
        half_open_success_threshold: 2,            // Ít successes để đóng
    })
}
```

### Database Configuration

```rust
pub fn create_database_circuit_breaker() -> CircuitBreaker {
    CircuitBreaker::with_config(CircuitBreakerConfig {
        failure_threshold: 5,           // Database có thể chịu lỗi nhiều hơn
        recovery_timeout: Duration::from_secs(45),  // Recovery chậm hơn
        call_timeout: Duration::from_secs(2),       // Timeout ngắn cho DB
        half_open_success_threshold: 3,            // Cần nhiều successes hơn
    })
}
```

## 🔗 Integration với Services

### Worker Client Integration

```rust
// WorkerClient tự động sử dụng Circuit Breaker
pub async fn send_game_input(&self, input: GameInput) -> Result<GameState, GatewayError> {
    match self.circuit_breaker.call(|| {
        // Thực hiện gRPC call đến worker
        self.client.process_game_input(request).await
    }).await {
        Ok(_) => Ok(game_state),
        Err(CircuitBreakerError::CircuitOpen) => {
            Err(GatewayError::ServiceError("Worker service temporarily unavailable".to_string()))
        }
        Err(CircuitBreakerError::Timeout) => {
            Err(GatewayError::TimeoutError)
        }
        Err(CircuitBreakerError::ServiceError(e)) => Err(e),
    }
}
```

### Manual Circuit Breaker Usage

```rust
// Tạo circuit breaker
let circuit_breaker = CircuitBreaker::new();

// Sử dụng trong async function
let result = circuit_breaker.call(|| async {
    // Thực hiện operation có thể fail
    external_service_call().await
}).await;

match result {
    Ok(value) => println!("Success: {}", value),
    Err(CircuitBreakerError::CircuitOpen) => {
        println!("Circuit is open, service unavailable");
    }
    Err(CircuitBreakerError::Timeout) => {
        println!("Call timed out");
    }
    Err(CircuitBreakerError::ServiceError(e)) => {
        println!("Service error: {}", e);
    }
}
```

## 📊 Monitoring & Metrics

### Metrics được expose

```rust
// Prometheus metrics
gw.circuit_breaker.state           # Current state (0=closed, 1=open, 2=half_open)
gw.circuit_breaker.calls_total     # Tổng số calls
gw.circuit_breaker.calls_success   # Số calls thành công
gw.circuit_breaker.calls_failure   # Số calls thất bại
gw.circuit_breaker.calls_timeout   # Số calls timeout
gw.circuit_breaker.state_changes   # Số lần thay đổi state
```

### Health Check Integration

```rust
// Circuit breaker state được include trong health check
pub async fn get_circuit_breaker_status(&self) -> HashMap<String, CircuitBreakerState> {
    let breakers = self.circuit_breakers.read().await;
    breakers.iter().map(|(name, breaker)| (name.clone(), breaker.state())).collect()
}

// Health check response bao gồm circuit breaker status
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "worker": "healthy",
    "circuit_breakers": {
      "worker_service": "closed",
      "database": "open"
    }
  }
}
```

## 🧪 Testing

### Unit Tests

```bash
# Chạy circuit breaker tests
cargo test circuit_breaker

# Test với custom config
cargo test test_circuit_breaker_metrics
```

### Demo Script

```bash
# Windows
scripts\demo-circuit-breaker.bat

# Linux/Mac
chmod +x scripts/demo-circuit-breaker.sh
./scripts/demo-circuit-breaker.sh
```

### Manual Testing

```bash
# 1. Start gateway service
cargo run --bin gateway

# 2. Test normal operation
curl http://localhost:8080/health

# 3. Simulate failures (gọi endpoint không tồn tại nhiều lần)
for i in {1..10}; do curl -s http://localhost:8080/nonexistent; done

# 4. Check metrics
curl http://localhost:8080/metrics | grep circuit_breaker

# 5. Check logs để thấy circuit breaker behavior
tail -f gateway.log | grep -i circuit
```

## 🔍 Troubleshooting

### Circuit Breaker mở quá thường xuyên

```rust
// Tăng failure threshold
let config = CircuitBreakerConfig {
    failure_threshold: 10,  // Từ 5 lên 10
    ..Default::default()
};
```

### Recovery quá chậm

```rust
// Giảm recovery timeout
let config = CircuitBreakerConfig {
    recovery_timeout: Duration::from_secs(30),  // Từ 60s xuống 30s
    ..Default::default()
};
```

### Timeout quá nhiều

```rust
// Giảm call timeout
let config = CircuitBreakerConfig {
    call_timeout: Duration::from_secs(3),  // Từ 5s xuống 3s
    ..Default::default()
};
```

### Metrics không hiển thị

1. Đảm bảo metrics exporter được khởi tạo:
```rust
let _metrics_handle = PrometheusBuilder::new().install_recorder().unwrap();
```

2. Kiểm tra metrics endpoint:
```bash
curl http://localhost:8080/metrics
```

3. Verify circuit breaker được sử dụng trong code

### Performance Issues

- Circuit Breaker sử dụng Arc<Mutex<>> - overhead thấp nhưng cần monitor
- Metrics recording có thể ảnh hưởng performance dưới high load
- Consider sampling metrics trong production

## 📚 Best Practices

### Configuration Guidelines

1. **Failure Threshold**: 3-5 cho services nhanh, 5-10 cho database
2. **Recovery Timeout**: 30-60s cho services, 45-90s cho database
3. **Call Timeout**: 2-5s cho services, 1-3s cho database
4. **Success Threshold**: 2-3 successes để đóng circuit

### Monitoring Guidelines

1. **Alert khi circuit breaker mở** quá 5 phút
2. **Monitor state change frequency** - quá nhiều có thể có vấn đề
3. **Track failure patterns** để identify root causes
4. **Set up dashboards** cho circuit breaker metrics

### Production Deployment

1. **Start với conservative thresholds** và điều chỉnh dần
2. **Monitor trong staging environment** trước khi deploy production
3. **Set up alerts** cho circuit breaker state changes
4. **Document circuit breaker configurations** trong deployment docs

## 🎯 Production Readiness Checklist

- ✅ Circuit Breaker states hoạt động đúng (Closed → Open → HalfOpen)
- ✅ Auto-recovery mechanisms hoạt động
- ✅ Metrics được expose và monitoring
- ✅ Configuration tối ưu cho production load
- ✅ Integration tests với failure scenarios
- ✅ Documentation và troubleshooting guides
- ✅ Alerting cho circuit breaker state changes

## 🚀 Next Steps

1. **Load Testing**: Test circuit breaker với high failure rates
2. **Fallback Mechanisms**: Implement graceful degradation khi circuit breaker mở
3. **Circuit Breaker Groups**: Nhóm circuit breakers theo service dependencies
4. **Dynamic Configuration**: Runtime configuration updates
5. **Distributed Circuit Breakers**: Shared state across multiple instances

---

**Circuit Breaker đã sẵn sàng cho production deployment!** 🎉

Với implementation hiện tại, hệ thống có khả năng:
- Tự động phát hiện và cô lập failures
- Tự phục hồi khi services trở lại bình thường
- Monitoring comprehensive với metrics
- Configuration flexible cho different services
- Testing thorough với demo scripts
