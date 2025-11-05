# Database Connection Pooling Implementation Guide

## Tổng Quan

Database connection pooling là kỹ thuật quản lý kết nối database để tối ưu performance và resource usage trong ứng dụng high-concurrency.

## Yêu Cầu Chính

### 1. Connection Pooling Framework
- **bb8**: Modern, async connection pool cho Rust
- **tokio-postgres**: Async PostgreSQL driver
- **bb8-postgres**: bb8 integration cho PostgreSQL

### 2. Configuration Parameters
```rust
DatabaseConfig {
    database_url: "postgresql://user:pass@host:port/db",
    pool_size: 20,           // Max connections
    min_idle: 5,             // Min idle connections
    connection_timeout: 30,  // Connection timeout (seconds)
    query_timeout: 10,       // Query timeout (seconds)
    enable_metrics: true,    // Enable performance metrics
}
```

### 3. Connection Management

#### Pool Creation
```rust
use bb8::{Pool, PooledConnection};
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::{NoTls, Config};

let config: Config = database_url.parse()?;
let manager = PostgresConnectionManager::new(config, NoTls);

let pool = Pool::builder()
    .max_size(pool_size)
    .min_idle(Some(min_idle))
    .connection_timeout(Duration::from_secs(connection_timeout))
    .build(manager)
    .await?;
```

#### Connection Acquisition
```rust
let conn = pool.get().await?;
```

#### Health Checks
```rust
// Kiểm tra connection health
let conn = pool.get().await?;
conn.execute("SELECT 1", &[]).await?;
```

### 4. Performance Metrics

#### Connection Metrics
- Total connections created/destroyed
- Current active/idle connections
- Connection pool wait time

#### Query Metrics
- Total queries executed
- Query errors
- Average query time
- Read/write query counts

### 5. Error Handling

#### Connection Errors
```rust
match pool.get().await {
    Ok(conn) => {
        // Use connection
    }
    Err(e) => {
        // Handle connection pool exhaustion
        // Implement retry logic or circuit breaker
    }
}
```

#### Query Errors
```rust
match conn.execute("SELECT * FROM users", &[]).await {
    Ok(_) => { /* Success */ }
    Err(e) => {
        // Handle query errors
        // Log error, implement retry logic
    }
}
```

### 6. Best Practices

#### Pool Sizing
- **Min Idle**: 5-10 connections
- **Max Pool**: 20-50 connections tùy thuộc vào workload
- **Timeout**: 30s cho connection, 10s cho query

#### Connection Lifecycle
1. Acquire connection từ pool
2. Execute queries
3. Return connection to pool (automatic với bb8)

#### Monitoring
- Monitor pool utilization
- Alert khi pool gần đầy
- Track connection leaks

### 7. Production Considerations

#### Database URL Format
```
postgresql://[user[:password]@][host][:port][/database][?params]
```

#### SSL/TLS Configuration
```rust
// Sử dụng TLS trong production
let manager = PostgresConnectionManager::new(config, tokio_postgres::tls::MakeTlsConnector::new(tls_connector));
```

#### Read Replicas
```rust
// Support read/write splitting
if query_type == QueryType::Read {
    // Route to read replica
} else {
    // Route to primary
}
```

## Ví Dụ Sử Dụng

```rust
use common_net::database::{DatabasePool, DatabaseConfig};

// Khởi tạo pool
let config = DatabaseConfig {
    database_url: std::env::var("DATABASE_URL")?,
    pool_size: 20,
    min_idle: 5,
    ..Default::default()
};

let pool = DatabasePool::new(config).await?;

// Sử dụng trong handlers
async fn get_user(pool: &DatabasePool, user_id: &str) -> Result<User, Error> {
    let user = pool.get_player(user_id).await?;
    Ok(user)
}

// Health check endpoint
async fn health_check(pool: &DatabasePool) -> impl IntoResponse {
    match pool.health_check().await {
        Ok(true) => "healthy",
        Ok(false) => "unhealthy",
        Err(e) => {
            tracing::error!("Health check failed: {}", e);
            "error"
        }
    }
}
```

## Monitoring & Alerting

### Metrics Collection
- Connection pool stats
- Query performance metrics
- Error rates và patterns

### Alerts
- Pool utilization > 80%
- Connection errors > threshold
- Query timeouts

## Troubleshooting

### Common Issues
1. **Pool Exhaustion**: Tăng max pool size hoặc optimize queries
2. **Connection Leaks**: Đảm bảo connections được return to pool
3. **Slow Queries**: Add query timeout và optimize database
4. **Network Issues**: Implement retry logic và connection health checks

### Debug Mode
```rust
// Enable detailed logging
tracing::debug!("Pool stats: {:?}", pool.state().await);
```

## Performance Tuning

### Query Optimization
- Use prepared statements
- Batch similar queries
- Implement query result caching

### Connection Optimization
- Proper pool sizing based on load testing
- Monitor và adjust timeouts
- Implement connection health checks

## Security Considerations

### Connection Security
- Use SSL/TLS trong production
- Proper credential management
- Network security giữa app và database

### Query Security
- Parameterized queries để prevent SQL injection
- Input validation và sanitization
- Least privilege database users
