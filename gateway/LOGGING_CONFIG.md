# 🚀 Comprehensive Logging Configuration Guide

## 📋 Tổng Quan

Hệ thống logging mới của Gateway bao gồm:

- **Structured Logging**: Sử dụng `tracing` với format JSON hoặc pretty
- **Request Tracing**: Theo dõi requests với unique trace IDs
- **Performance Metrics**: Logging metrics cho tất cả operations
- **Environment-based Configuration**: Dễ dàng điều chỉnh trong production

## 🔧 Environment Variables

### **Core Logging Configuration**

```bash
# Log level (trace, debug, info, warn, error)
LOG_LEVEL=info

# Log format (pretty, json, compact)
LOG_FORMAT=pretty

# Enable JSON logging for structured data
LOG_JSON=false

# Enable file logging
LOG_FILE=false

# Log file path (if file logging enabled)
LOG_FILE_PATH=./logs/gateway.log

# Maximum log files to keep
LOG_MAX_FILES=5

# Maximum size per log file (bytes)
LOG_MAX_FILE_SIZE=10485760  # 10MB
```

### **Advanced Logging Features**

```bash
# Enable request tracing across services
ENABLE_REQUEST_TRACING=true

# Enable performance metrics logging
ENABLE_PERFORMANCE_LOGGING=true
```

### **Rate Limiting Configuration**

```bash
# Room creation limits (IP-based)
RATE_LIMIT_ROOMS_CREATE_IP_BURST=20      # Burst capacity
RATE_LIMIT_ROOMS_CREATE_IP_RATE=5.0      # Tokens per second
RATE_LIMIT_ROOMS_CREATE_IP_MAX=100       # Max per minute

# Room creation limits (User-based)
RATE_LIMIT_ROOMS_CREATE_USER_BURST=10    # Burst capacity
RATE_LIMIT_ROOMS_CREATE_USER_RATE=2.0    # Tokens per second
RATE_LIMIT_ROOMS_CREATE_USER_MAX=200     # Max per 5 minutes

# Real-time game updates (optimized for high-frequency gameplay - 10000 req/min)
RATE_LIMIT_UPDATE_PLAYER_IP_BURST=200     # High burst capacity for real-time gameplay
RATE_LIMIT_UPDATE_PLAYER_IP_RATE=166.67  # ~10000 requests per minute
RATE_LIMIT_UPDATE_PLAYER_IP_MAX=1000      # Per 6 seconds = 10000 per minute
RATE_LIMIT_UPDATE_PLAYER_USER_BURST=150   # User burst capacity
RATE_LIMIT_UPDATE_PLAYER_USER_RATE=125.0 # ~7500 requests per minute per user

# Default limits for unlisted endpoints
RATE_LIMIT_DEFAULT_IP_BURST=5000
RATE_LIMIT_DEFAULT_IP_SUSTAINED=10000
RATE_LIMIT_DEFAULT_USER_BURST=2000
RATE_LIMIT_DEFAULT_USER_SUSTAINED=5000
```

## 📊 Log Categories

### **1. Request Lifecycle**
```json
{
  "timestamp": "2025-01-21T10:30:45.123Z",
  "level": "INFO",
  "event": "request_started",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "client_ip": "192.168.1.100",
  "endpoint": "/api/rooms/create",
  "method": "POST"
}
```

### **2. Performance Metrics**
```json
{
  "timestamp": "2025-01-21T10:30:45.456Z",
  "level": "INFO",
  "event": "performance",
  "operation": "create_room",
  "duration_ms": 245.67,
  "success": true,
  "room_id": "room_abc123",
  "room_name": "My Game Room"
}
```

### **3. Game Events**
```json
{
  "timestamp": "2025-01-21T10:30:45.789Z",
  "level": "INFO",
  "event": "game_event",
  "event_type": "room_created",
  "room_id": "room_abc123",
  "player_id": "user_123",
  "details": {
    "room_name": "My Game Room",
    "host_name": "Player 1"
  }
}
```

### **4. WebSocket Events**
```json
{
  "timestamp": "2025-01-21T10:30:46.012Z",
  "level": "INFO",
  "event": "websocket_event",
  "event_type": "connection_established",
  "connection_id": "ws_12345",
  "room_id": "room_abc123",
  "details": {
    "protocol": "game",
    "user_agent": "GameClient/1.0"
  }
}
```

### **5. WebRTC Events**
```json
{
  "timestamp": "2025-01-21T10:30:46.345Z",
  "level": "INFO",
  "event": "webrtc_event",
  "event_type": "peer_connected",
  "session_id": "webrtc_67890",
  "room_id": "room_abc123",
  "peer_id": "peer_xyz",
  "details": {
    "connection_type": "direct",
    "ice_candidates": 2
  }
}
```

### **6. Rate Limit Events**
```json
{
  "timestamp": "2025-01-21T10:30:46.678Z",
  "level": "WARN",
  "event": "rate_limit_hit",
  "limit_type": "ip",
  "identifier": "192.168.1.100:anonymous",
  "endpoint": "/api/rooms/create"
}
```

### **7. Error Events**
```json
{
  "timestamp": "2025-01-21T10:30:47.012Z",
  "level": "ERROR",
  "event": "operation_failed",
  "operation": "create_room",
  "error": "Database connection timeout",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 5000.0
}
```

## 🎯 Production Deployment

### **Recommended Production Settings**

```bash
# Production logging
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_JSON=true
LOG_FILE=true
LOG_FILE_PATH=/var/log/gateway/gateway.log

# Enable all advanced features
ENABLE_REQUEST_TRACING=true
ENABLE_PERFORMANCE_LOGGING=true

# Optimized rate limits for production (high throughput)
RATE_LIMIT_ROOMS_CREATE_IP_BURST=100
RATE_LIMIT_ROOMS_CREATE_IP_RATE=20.0
RATE_LIMIT_UPDATE_PLAYER_IP_BURST=1000
RATE_LIMIT_UPDATE_PLAYER_IP_RATE=166.67
```

### **Log Rotation**

Với cấu hình trên, hệ thống sẽ tự động:
- Giữ tối đa 5 file log
- Mỗi file tối đa 10MB
- Tự động rotate khi vượt quá giới hạn

### **Monitoring Integration**

Logs được thiết kế để tích hợp với:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki** với Promtail
- **Splunk** hoặc các SIEM tools khác
- **CloudWatch** hoặc các cloud logging services

## 🔍 Debugging với Request Tracing

### **Theo dõi Request Flow**

Mỗi request được gán một unique `trace_id`. Để debug:

```bash
# Tìm tất cả logs cho một trace ID cụ thể
grep "550e8400-e29b-41d4-a716-446655440000" /var/log/gateway/gateway.log

# Theo dõi performance của một operation
grep "create_room" /var/log/gateway/gateway.log | jq '.duration_ms'
```

### **Distributed Tracing**

Trace IDs được truyền qua:
- HTTP headers (`x-trace-id`)
- gRPC metadata
- WebSocket subprotocols

Điều này cho phép theo dõi requests across multiple services.

## 📈 Performance Impact

### **Logging Overhead**

- **JSON format**: ~5-10% overhead so với text
- **Request tracing**: ~2-3% overhead
- **Performance metrics**: Minimal overhead (<1%)

### **Optimization Tips**

1. **Production**: Sử dụng `LOG_LEVEL=warn` để giảm noise
2. **High traffic**: Tắt `ENABLE_PERFORMANCE_LOGGING` nếu không cần thiết
3. **File logging**: Sử dụng SSD storage cho performance tốt nhất

## 🎉 Kết Luận

Hệ thống logging mới cung cấp:

✅ **Comprehensive visibility** vào tất cả operations  
✅ **Structured data** cho dễ phân tích  
✅ **Performance insights** cho optimization  
✅ **Production-ready** với proper configuration  
✅ **Developer-friendly** với detailed debugging info  

Với cấu hình phù hợp, hệ thống sẽ giúp bạn:
- **Debug issues** nhanh chóng với trace IDs
- **Monitor performance** với detailed metrics
- **Scale confidently** với proper rate limiting
- **Maintain reliability** với comprehensive error tracking
