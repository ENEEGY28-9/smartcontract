# Backend Optimization Suite - Hướng Dẫn Sử dụng

## Tổng quan

Hệ thống tối ưu backend toàn diện với các thành phần:

1. **Integration Testing Framework** - Test tích hợp toàn diện
2. **Real Game Client Testing** - Test với client game thực tế
3. **Gameplay Data Collection** - Thu thập và phân tích dữ liệu gameplay
4. **Comprehensive Error Handling** - Xử lý lỗi toàn diện
5. **Performance Benchmarking** - Benchmark hiệu suất với tình huống thực tế
6. **Adaptive Optimization** - Tối ưu thích ứng dựa trên dữ liệu
7. **Stress Testing** - Test tải nặng với nhiều client đồng thời

## Cài đặt và Chuẩn bị

### Yêu cầu hệ thống
- Node.js 16+
- Rust 1.70+
- MongoDB hoặc PocketBase
- Redis (tùy chọn cho caching)

### Cài đặt Dependencies

```bash
# Cài đặt Node.js dependencies
npm install ws wrtc

# Build Rust components
cargo build --release

# Khởi động các services cần thiết
./start-services.sh
```

## Cách sử dụng

### 1. Chạy toàn bộ Optimization Suite

```bash
# Chạy tất cả các test tối ưu
node run-optimization-suite.js --server ws://localhost:8080/ws --output ./results

# Chạy nhanh với các test cơ bản
node run-optimization-suite.js --quick --output ./quick-results

# Chỉ chạy integration tests
node run-optimization-suite.js --integration true --output ./integration-results
```

### 2. Chạy Integration Tests riêng lẻ

```bash
# Build và chạy Rust integration tests
cargo test --package gateway integration_tests

# Chạy với output chi tiết
cargo test --package gateway integration_tests -- --nocapture
```

### 3. Performance Benchmarking

```bash
# Chạy performance benchmark với 100 clients, 5 phút
node performance-benchmarking.js --clients 100 --duration 300 --server ws://localhost:8080/ws

# Benchmark với các scenario tùy chỉnh
node performance-benchmarking.js --scenarios player_spawn_stress,combat_simulation --output benchmark-results.json
```

### 4. Stress Testing

```bash
# Stress test với 500 clients, 15 phút
node stress-testing.js --clients 500 --duration 900 --messages 5000 --server ws://localhost:8080/ws

# Stress test với các scenario cụ thể
node stress-testing.js --scenarios connection_flood,memory_exhaustion --output stress-results.json
```

### 5. Real Game Client Testing

```bash
# Test với 50 clients thực tế
node test-real-clients.js --clients 50 --duration 120 --server ws://localhost:8080/ws

# Test với WebRTC enabled
node test-real-clients.js --clients 20 --webrtc true --latency true --server ws://localhost:8080/ws
```

## Kết quả và Báo cáo

### Định dạng Output

Tất cả các test sẽ tạo ra các file kết quả dạng JSON:

```
optimization-results/
├── comprehensive-optimization-report.json    # Báo cáo tổng hợp
├── performance-benchmark.json               # Kết quả benchmark
├── stress-test-results.json                 # Kết quả stress test
└── integration-test-results.json            # Kết quả integration test
```

### Đọc kết quả

#### Báo cáo tổng hợp
```json
{
  "suiteName": "Backend Optimization Suite",
  "executionTime": "2024-01-01T00:00:00.000Z",
  "totalDuration": 1800.5,
  "testResults": [...],
  "recommendations": [...],
  "performanceInsights": [...],
  "optimizationOpportunities": [...]
}
```

#### Kết quả Performance Benchmark
```json
{
  "summary": {
    "averageLatency": 45.2,
    "throughput": 1250.5,
    "errorRate": 0.02,
    "totalMessages": 375150
  },
  "scenarios": [...],
  "regressionAnalysis": {
    "hasRegression": false,
    "regressions": []
  }
}
```

## Các thành phần chi tiết

### Integration Testing Framework

**Vị trí**: `gateway/src/integration_tests.rs`

Các test scenarios:
- **Basic Functionality**: Test các chức năng cơ bản
- **Load Test**: Test với nhiều clients (50 clients, 30s)
- **Stress Test**: Test tải cao (1000 msg/sec, 60s)
- **Gameplay Simulation**: Mô phỏng gameplay thực tế (20 players, 2 phút)
- **Error Recovery**: Test khả năng phục hồi lỗi
- **Memory Leak Detection**: Phát hiện memory leak

### Gameplay Analytics System

**Vị trí**: `worker/src/gameplay_analytics.rs`

Chức năng:
- Thu thập session data của players
- Phân tích latency và bandwidth
- Phát hiện performance issues
- Tạo optimization recommendations
- Data retention và cleanup

### Error Handling System

**Gateway**: `gateway/src/error_handling.rs`
**Worker**: `worker/src/error_handling.rs`

Tính năng:
- Comprehensive error types
- Circuit breaker pattern
- Automatic error recovery
- Error statistics và monitoring
- Graceful degradation

### Adaptive Optimization

**Vị trí**: `adaptive-optimization.rs`

Chức năng:
- Tự động điều chỉnh batch size
- Điều chỉnh connection pool
- Tối ưu compression settings
- Adaptive rate limiting
- Performance-based optimization

## Monitoring và Metrics

### Metrics thu thập
- Latency (average, p95, p99)
- Throughput (messages/sec)
- Error rates
- Memory usage
- CPU utilization
- Connection counts

### Real-time Monitoring

Các hệ thống tích hợp sẵn monitoring:
- Prometheus metrics export
- JSON performance reports
- Real-time dashboard data
- Alert thresholds và notifications

## Troubleshooting

### Các vấn đề thường gặp

#### High Latency
```bash
# Kiểm tra batch processing settings
# Giảm batch size nếu latency cao
node run-optimization-suite.js --performance true --output ./latency-analysis
```

#### Memory Leaks
```bash
# Chạy memory stress test
node stress-testing.js --scenarios memory_exhaustion --clients 100 --duration 600
```

#### Connection Issues
```bash
# Test connection stability
node test-real-clients.js --clients 10 --duration 60 --server ws://localhost:8080/ws
```

#### Performance Regression
```bash
# So sánh với baseline
node performance-benchmarking.js --output current-results.json
# Compare current-results.json với baseline
```

## Best Practices

### Trước khi Deploy Production

1. **Chạy Full Test Suite**
   ```bash
   node run-optimization-suite.js --output ./pre-production-results
   ```

2. **Verify Performance Benchmarks**
   - Latency < 100ms average
   - Throughput > 1000 messages/sec
   - Error rate < 1%

3. **Stress Test với Production-like Load**
   ```bash
   node stress-testing.js --clients 1000 --duration 1800 --messages 10000
   ```

4. **Monitor Resource Usage**
   - Memory usage < 80%
   - CPU usage < 70%
   - No memory leaks detected

### Continuous Monitoring

1. **Set up Automated Testing**
   - Daily performance benchmarks
   - Weekly stress tests
   - Continuous integration tests

2. **Monitor Key Metrics**
   - Average latency
   - Error rates
   - Resource utilization
   - Performance trends

3. **Alert Configuration**
   - Critical: Error rate > 5%
   - Warning: Latency > 150ms
   - Info: Performance degradation > 20%

## Advanced Configuration

### Custom Test Scenarios

Tạo file `custom-scenarios.json`:

```json
{
  "scenarios": [
    {
      "name": "custom_game_mode",
      "description": "Test custom game mode",
      "duration": 300,
      "clientCount": 50,
      "actions": [
        {
          "type": "custom_action",
          "frequency": "continuous",
          "rate": 20,
          "data": { "mode": "battle_royale" }
        }
      ]
    }
  ]
}
```

### Adaptive Optimization Tuning

Điều chỉnh các thresholds trong code:

```rust
let triggers = OptimizationTriggers {
    latency_threshold_ms: 100.0,      // Điều chỉnh theo nhu cầu
    error_rate_threshold: 0.05,       // 5% error rate
    bandwidth_threshold_kbps: 50.0,   // 50 KB/s per player
    // ...
};
```

## Support và Maintenance

### Logs và Debugging

- Gateway logs: `./gateway.log`
- Worker logs: `./worker.log`
- Test logs: `./test-output/`

### Performance Tuning

1. **Database Optimization**
   - Index optimization
   - Query performance
   - Connection pooling

2. **Network Optimization**
   - WebSocket compression
   - Message batching
   - Connection limits

3. **Memory Management**
   - Object pooling
   - Garbage collection tuning
   - Memory leak detection

## Kết luận

Hệ thống tối ưu backend này cung cấp:

✅ **Comprehensive Testing** - Test toàn diện mọi khía cạnh
✅ **Real Gameplay Simulation** - Mô phỏng gameplay thực tế
✅ **Data-Driven Optimization** - Tối ưu dựa trên dữ liệu thực
✅ **Automatic Error Recovery** - Phục hồi lỗi tự động
✅ **Performance Monitoring** - Giám sát hiệu suất liên tục
✅ **Adaptive Configuration** - Điều chỉnh tham số động

Sử dụng hệ thống này để đảm bảo backend của bạn hoạt động tối ưu trong mọi điều kiện!
