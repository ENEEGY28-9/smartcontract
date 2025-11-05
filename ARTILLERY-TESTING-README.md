# 🎯 Artillery Load Testing Suite

Advanced load testing suite for GameV1 Backend using Artillery CLI.

## 📋 Overview

This testing suite provides comprehensive load testing capabilities for the GameV1 backend system, including:

- **HTTP API Testing** - RESTful API endpoints under various load conditions
- **WebSocket Testing** - Real-time connection and gameplay simulation
- **Mixed Workload Testing** - Combined HTTP + WebSocket scenarios
- **Stress Testing** - High-load stress testing to find breaking points
- **Production Simulation** - Realistic user behavior patterns

## 🚀 Quick Start

### Prerequisites

1. **Install Artillery CLI:**
   ```bash
   npm install -g artillery
   ```

2. **Start the GameV1 Backend:**
   ```bash
   # Start all services
   ./start-all.bat

   # Or start services individually
   ./start-game.bat
   ```

3. **Verify services are running:**
   ```bash
   # Check gateway (HTTP API)
   curl http://localhost:8080/health

   # Check WebSocket connection
   # Use browser dev tools or WebSocket client
   ```

### Running Tests

#### Run All Tests
```bash
node run-artillery-tests.js --all
```

#### Run Specific Tests
```bash
# HTTP API only
node run-artillery-tests.js --http

# WebSocket only
node run-artillery-tests.js --websocket

# Stress test only
node run-artillery-tests.js --stress

# Production simulation
node run-artillery-tests.js --production
```

## 📊 Test Scenarios

### 1. HTTP API Load Test (`artillery-http-api.yml`)
- **Duration:** 5 minutes
- **Target:** REST API endpoints
- **Scenarios:**
  - Room creation and management
  - Player join/leave operations
  - Game input submission
  - Chat messaging
  - Status queries

### 2. WebSocket Connection Test (`artillery-websocket.yml`)
- **Duration:** 3 minutes
- **Target:** WebSocket connections
- **Scenarios:**
  - Connection establishment
  - Authentication flow
  - Room joining
  - Real-time gameplay simulation
  - Chat messaging via WebSocket

### 3. Mixed Workload Test (`artillery-mixed-workload.yml`)
- **Duration:** 8 minutes
- **Target:** Combined HTTP + WebSocket
- **Scenarios:**
  - 30% Room Management (HTTP)
  - 40% Gameplay (WebSocket)
  - 20% Social Features (HTTP + WebSocket)
  - 10% System Monitoring (HTTP)

### 4. Stress Test (`artillery-stress-test.yml`)
- **Duration:** 12 minutes
- **Target:** System limits
- **Scenarios:**
  - 60% High-frequency WebSocket connections
  - 30% High-frequency HTTP requests
  - 10% System monitoring under stress

### 5. Production Simulation (`artillery-production-simulation.yml`)
- **Duration:** 25 minutes
- **Target:** Realistic user patterns
- **Scenarios:**
  - 50% Casual Players (short sessions)
  - 30% Competitive Players (intense, long sessions)
  - 15% Social Players (chat-focused)
  - 5% System/API Users (monitoring)

## 📈 Test Results & Reports

### Report Location
All test reports are saved to: `artillery-reports/`

### Report Formats
- **JSON Reports:** Detailed metrics and timing data
- **Summary Reports:** High-level performance overview

### Key Metrics Tracked
- **Response Times:** Min, max, median, 95th/99th percentiles
- **Throughput:** Requests per second (RPS)
- **Error Rates:** Failed requests percentage
- **Connection Stability:** WebSocket connection success/failure rates
- **Resource Usage:** CPU, memory, network utilization

## 🔧 Configuration

### Environment Variables
Create `.env` file for Artillery configuration:

```env
ARTILLERY_TARGET=http://localhost:8080
ARTILLERY_WS_TARGET=ws://localhost:8080/ws
ARTILLERY_AUTH_TOKEN=your-test-token
ARTILLERY_TEST_DURATION=300
ARTILLERY_MAX_CONNECTIONS=1000
```

### Available Test Scenarios

#### 1. HTTP API Load Test (`artillery-http-api.yml`)
- **Duration:** 5 minutes
- **Target:** REST API endpoints
- **Focus:** Room management, chat, player operations
- **Use Case:** Testing basic API functionality under load

#### 2. WebSocket Connection Test (`artillery-websocket.yml`)
- **Duration:** 3 minutes
- **Target:** WebSocket connections
- **Focus:** Real-time gameplay simulation
- **Use Case:** Testing WebSocket stability and performance

#### 3. Mixed Workload Test (`artillery-mixed-workload.yml`)
- **Duration:** 8 minutes
- **Target:** Combined HTTP + WebSocket
- **Focus:** Realistic mixed usage patterns
- **Use Case:** Testing system under typical gaming workloads

#### 4. Gaming Stress Test (`artillery-gaming-stress.yml`)
- **Duration:** 10 minutes
- **Target:** Gaming-specific scenarios
- **Focus:** Realistic gameplay sessions with proper patterns
- **Features:**
  - Realistic session durations (10-30 minutes)
  - Proper pause/AFK simulation
  - Chat and social interactions
  - Error simulation and recovery testing
- **Use Case:** Testing gaming-specific performance requirements

#### 5. Database Stress Test (`artillery-database-stress.yml`)
- **Duration:** 8 minutes
- **Target:** Database performance
- **Focus:** Connection pooling, query optimization, transaction handling
- **Features:**
  - High-frequency database writes (room creation, chat messages)
  - Complex queries (leaderboards, player statistics)
  - Transaction testing (game sessions)
  - Connection pool monitoring
- **Use Case:** Identifying database bottlenecks

#### 6. WebRTC Stress Test (`artillery-webrtc-stress.yml`)
- **Duration:** 7 minutes
- **Target:** WebRTC signaling and P2P connections
- **Focus:** Real-time communication performance
- **Features:**
  - WebRTC offer/answer exchange simulation
  - ICE candidate handling
  - Network condition simulation
  - Peer-to-peer gaming scenarios
- **Use Case:** Testing real-time communication features

#### 7. Production Simulation (`artillery-production-simulation.yml`)
- **Duration:** 25 minutes
- **Target:** Production-like behavior
- **Focus:** Realistic 24/7 user patterns
- **Features:**
  - Day/night cycle simulation
  - Different player types (casual, competitive, social)
  - Realistic session patterns
  - System monitoring integration
- **Use Case:** Long-term stability and performance validation

### Custom Test Scenarios
1. Copy existing scenario file
2. Modify phases, arrival rates, or scenarios
3. Add new scenario to `run-artillery-tests.js`
4. Run with `--all` or specific name

## 🏗️ Test Architecture

### Phase-Based Testing
Tests use phases to simulate realistic load patterns:
- **Ramp-up:** Gradually increase load
- **Sustained:** Maintain target load
- **Spike:** Sudden load increases
- **Ramp-down:** Gradual decrease

### Realistic User Simulation
- **Casual Players:** Short sessions, low activity
- **Competitive Players:** Long sessions, high activity
- **Social Players:** Chat-focused interactions
- **System Users:** API monitoring and management

## 📊 Performance Benchmarks

### Target Metrics
- **Response Time (P95):** < 100ms for HTTP APIs
- **Response Time (P95):** < 50ms for WebSocket messages
- **Error Rate:** < 1% under normal load
- **Error Rate:** < 5% under stress conditions
- **Throughput:** 1000+ concurrent connections
- **Connection Success Rate:** > 99%

### Load Levels
- **Light Load:** 10-50 concurrent users
- **Normal Load:** 50-200 concurrent users
- **Heavy Load:** 200-500 concurrent users
- **Stress Load:** 500+ concurrent users

## 🛠️ Troubleshooting

### Common Issues

#### High Error Rates
```bash
# Check service logs
./monitor-logs.bat

# Verify service health
curl http://localhost:8080/health

# Check system resources
# Use Windows Task Manager or Resource Monitor
```

#### Connection Failures
```bash
# Verify WebSocket endpoint
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8080/ws

# Check firewall settings
netstat -an | findstr :8080
```

#### Performance Issues
```bash
# Monitor system resources during tests
# Use Performance Monitor (perfmon.msc)

# Check database performance
# Monitor PocketBase logs

# Profile memory usage
# Use Windows Performance Analyzer
```

### Debug Mode
Run tests with debug output:
```bash
DEBUG=artillery:* node run-artillery-tests.js --http
```

## 🚀 Advanced Usage

### Custom Load Patterns
Modify `phases` in YAML files:
```yaml
phases:
  - duration: 60    # seconds
    arrivalRate: 10  # users per second
    rampTo: 50       # ramp to 50 users/sec
    name: 'Custom Phase'
```

### Multiple Target Environments
```bash
# Test against staging
ARTILLERY_TARGET=http://staging.gamev1.com node run-artillery-tests.js

# Test against production
ARTILLERY_TARGET=https://api.gamev1.com node run-artillery-tests.js
```

### Integration with CI/CD
```bash
# Example GitHub Actions
- name: Load Testing
  run: |
    npm install -g artillery
    node run-artillery-tests.js --stress
    # Parse reports and set exit codes based on thresholds
```

## 📚 Resources

- [Artillery Official Documentation](https://artillery.io/docs/)
- [WebSocket Testing Guide](https://artillery.io/docs/guides/websocket-testing/)
- [Load Testing Best Practices](https://artillery.io/docs/guides/load-testing-best-practices/)
- [Performance Monitoring Guide](./MONITORING_SETUP_README.md)

## 🤝 Contributing

1. Add new test scenarios in YAML format
2. Update `run-artillery-tests.js` to include new scenarios
3. Add documentation for new scenarios
4. Test scenarios locally before committing
5. Update performance benchmarks as needed

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Artillery documentation
3. Check service logs for errors
4. Monitor system resources during tests
5. Create detailed issue reports with test outputs

---

**Happy Load Testing! 🚀**
