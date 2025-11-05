// Comprehensive Logging System for Game Backend
use std::time::{Duration, Instant};
use tracing::{error, info, warn, debug, instrument, Span};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer};
use uuid::Uuid;
use once_cell::sync::Lazy;

// Global logging configuration
pub static LOG_CONFIG: Lazy<LoggingConfig> = Lazy::new(|| {
    LoggingConfig::from_env()
});

#[derive(Debug, Clone)]
pub struct LoggingConfig {
    pub log_level: String,
    pub log_format: LogFormat,
    pub enable_json_logs: bool,
    pub enable_file_logging: bool,
    pub log_file_path: Option<String>,
    pub max_log_files: u32,
    pub max_log_file_size: u64,
    pub enable_request_tracing: bool,
    pub enable_performance_logging: bool,
}

#[derive(Debug, Clone)]
pub enum LogFormat {
    Pretty,
    Json,
    Compact,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            log_level: "info".to_string(),
            log_format: LogFormat::Pretty,
            enable_json_logs: false,
            enable_file_logging: false,
            log_file_path: None,
            max_log_files: 5,
            max_log_file_size: 10 * 1024 * 1024, // 10MB
            enable_request_tracing: true,
            enable_performance_logging: true,
        }
    }
}

impl LoggingConfig {
    pub fn from_env() -> Self {
        Self {
            log_level: std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
            log_format: match std::env::var("LOG_FORMAT").unwrap_or_else(|_| "pretty".to_string()).as_str() {
                "json" => LogFormat::Json,
                "compact" => LogFormat::Compact,
                _ => LogFormat::Pretty,
            },
            enable_json_logs: std::env::var("LOG_JSON").unwrap_or_else(|_| "false".to_string()) == "true",
            enable_file_logging: std::env::var("LOG_FILE").unwrap_or_else(|_| "false".to_string()) == "true",
            log_file_path: std::env::var("LOG_FILE_PATH").ok(),
            max_log_files: std::env::var("LOG_MAX_FILES")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .unwrap_or(5),
            max_log_file_size: std::env::var("LOG_MAX_FILE_SIZE")
                .unwrap_or_else(|_| "10485760".to_string()) // 10MB
                .parse()
                .unwrap_or(10 * 1024 * 1024),
            enable_request_tracing: std::env::var("ENABLE_REQUEST_TRACING").unwrap_or_else(|_| "true".to_string()) == "true",
            enable_performance_logging: std::env::var("ENABLE_PERFORMANCE_LOGGING").unwrap_or_else(|_| "true".to_string()) == "true",
        }
    }
}

// Request tracing context
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub trace_id: String,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub endpoint: Option<String>,
    pub method: Option<String>,
    pub start_time: Instant,
    pub span: Option<Span>,
}

impl RequestContext {
    pub fn new() -> Self {
        let trace_id = Uuid::new_v4().to_string();
        let start_time = Instant::now();

        Self {
            trace_id,
            user_id: None,
            ip_address: None,
            endpoint: None,
            method: None,
            start_time,
            span: None,
        }
    }

    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_ip(mut self, ip: String) -> Self {
        self.ip_address = Some(ip);
        self
    }

    pub fn with_endpoint(mut self, endpoint: String) -> Self {
        self.endpoint = Some(endpoint);
        self
    }

    pub fn with_method(mut self, method: String) -> Self {
        self.method = Some(method);
        self
    }

    pub fn duration(&self) -> Duration {
        self.start_time.elapsed()
    }
}

// Performance metrics for logging
#[derive(Debug)]
pub struct PerformanceMetrics {
    pub operation: String,
    pub duration_ms: f64,
    pub success: bool,
    pub error_message: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

impl PerformanceMetrics {
    pub fn new(operation: String) -> Self {
        Self {
            operation,
            duration_ms: 0.0,
            success: true,
            error_message: None,
            metadata: std::collections::HashMap::new(),
        }
    }

    pub fn with_duration(mut self, duration: Duration) -> Self {
        self.duration_ms = duration.as_secs_f64() * 1000.0;
        self
    }

    pub fn with_error(mut self, error: String) -> Self {
        self.success = false;
        self.error_message = Some(error);
        self
    }

    pub fn with_metadata<K: Into<String>, V: Into<String>>(mut self, key: K, value: V) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }
}

// Logging utilities
pub struct Logger;

impl Logger {
    pub fn init() {
        let config = &*LOG_CONFIG;

        // Create env filter
        let env_filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| {
                EnvFilter::new(&config.log_level)
            });

        // Create formatter layer (using pretty format for now)
        let formatter = tracing_subscriber::fmt::layer()
            .with_target(false)
            .with_thread_ids(false)
            .with_file(false)
            .with_line_number(false);

        // Create registry
        let registry = tracing_subscriber::registry()
            .with(env_filter)
            .with(formatter);

        // Initialize subscriber
        if let Err(e) = registry.try_init() {
            eprintln!("Failed to initialize logging: {}", e);
        } else {
            info!("✅ Logging system initialized with level: {}", config.log_level);
        }
    }

    #[instrument(skip_all)]
    pub fn log_request_start(ctx: &RequestContext) {
        let config = &*LOG_CONFIG;

        if !config.enable_request_tracing {
            return;
        }

        info!(
            trace_id = %ctx.trace_id,
            user_id = ?ctx.user_id,
            client_ip = ?ctx.ip_address,
            endpoint = ?ctx.endpoint,
            method = ?ctx.method,
            "🚀 Request started"
        );
    }

    #[instrument(skip_all)]
    pub fn log_request_end(ctx: &RequestContext, status: u16, response_size: Option<usize>) {
        let config = &*LOG_CONFIG;

        if !config.enable_request_tracing {
            return;
        }

        let duration_ms = ctx.duration().as_secs_f64() * 1000.0;

        info!(
            trace_id = %ctx.trace_id,
            user_id = ?ctx.user_id,
            client_ip = ?ctx.ip_address,
            endpoint = ?ctx.endpoint,
            method = ?ctx.method,
            status = status,
            duration_ms = duration_ms,
            response_size = ?response_size,
            "✅ Request completed"
        );
    }

    #[instrument(skip_all)]
    pub fn log_performance_metrics(metrics: &PerformanceMetrics) {
        let config = &*LOG_CONFIG;

        if !config.enable_performance_logging {
            return;
        }

        if metrics.success {
            info!(
                operation = metrics.operation,
                duration_ms = metrics.duration_ms,
                success = metrics.success,
                "⚡ Performance: {} completed",
                metrics.operation
            );
        } else {
            error!(
                operation = metrics.operation,
                duration_ms = metrics.duration_ms,
                success = metrics.success,
                error = ?metrics.error_message,
                "❌ Performance: {} failed",
                metrics.operation
            );
        }

        // Log additional metadata
        for (key, value) in &metrics.metadata {
            debug!(
                operation = metrics.operation,
                key = key,
                value = value,
                "📊 Performance metadata"
            );
        }
    }

    #[instrument(skip_all)]
    pub fn log_game_event(event_type: &str, room_id: &str, player_id: &str, details: Option<serde_json::Value>) {
        info!(
            event_type = event_type,
            room_id = room_id,
            player_id = player_id,
            details = ?details,
            "🎮 Game event"
        );
    }

    #[instrument(skip_all)]
    pub fn log_websocket_event(event_type: &str, connection_id: &str, room_id: Option<&str>, details: Option<serde_json::Value>) {
        info!(
            event_type = event_type,
            connection_id = connection_id,
            room_id = ?room_id,
            details = ?details,
            "🔗 WebSocket event"
        );
    }

    #[instrument(skip_all)]
    pub fn log_webrtc_event(event_type: &str, session_id: &str, room_id: &str, peer_id: &str, details: Option<serde_json::Value>) {
        info!(
            event_type = event_type,
            session_id = session_id,
            room_id = room_id,
            peer_id = peer_id,
            details = ?details,
            "📡 WebRTC event"
        );
    }

    #[instrument(skip_all)]
    pub fn log_database_operation(operation: &str, table: &str, duration_ms: f64, success: bool, error: Option<&str>) {
        if success {
            debug!(
                operation = operation,
                table = table,
                duration_ms = duration_ms,
                success = success,
                "🗄️ Database operation"
            );
        } else {
            warn!(
                operation = operation,
                table = table,
                duration_ms = duration_ms,
                success = success,
                error = ?error,
                "🗄️ Database operation failed"
            );
        }
    }

    #[instrument(skip_all)]
    pub fn log_worker_communication(operation: &str, room_id: &str, duration_ms: f64, success: bool, error: Option<&str>) {
        if success {
            debug!(
                operation = operation,
                room_id = room_id,
                duration_ms = duration_ms,
                success = success,
                "🔄 Worker communication"
            );
        } else {
            error!(
                operation = operation,
                room_id = room_id,
                duration_ms = duration_ms,
                success = success,
                error = ?error,
                "🔄 Worker communication failed"
            );
        }
    }

    #[instrument(skip_all)]
    pub fn log_rate_limit_hit(limit_type: &str, identifier: &str, endpoint: &str) {
        warn!(
            limit_type = limit_type,
            identifier = identifier,
            endpoint = endpoint,
            "🚦 Rate limit hit"
        );
    }

    #[instrument(skip_all)]
    pub fn log_auth_event(event_type: &str, user_id: &str, success: bool, details: Option<serde_json::Value>) {
        if success {
            info!(
                event_type = event_type,
                user_id = user_id,
                success = success,
                details = ?details,
                "🔐 Authentication event"
            );
        } else {
            warn!(
                event_type = event_type,
                user_id = user_id,
                success = success,
                details = ?details,
                "🔐 Authentication failed"
            );
        }
    }
}

// Request context extension for axum
pub struct RequestContextExtractor;

impl RequestContextExtractor {
    pub fn from_request<B>(request: &axum::http::Request<B>) -> RequestContext {
        let mut ctx = RequestContext::new();

        // Extract trace ID from headers if present
        if let Some(trace_header) = request.headers().get("x-trace-id") {
            if let Ok(trace_id) = trace_header.to_str() {
                ctx.trace_id = trace_id.to_string();
            }
        }

        // Extract user ID from JWT claims in extensions
        if let Some(claims) = request.extensions().get::<jsonwebtoken::TokenData<serde_json::Value>>() {
            if let Some(sub) = claims.claims.get("sub") {
                if let Some(user_id) = sub.as_str() {
                    ctx.user_id = Some(user_id.to_string());
                }
            }
        }

        // Extract client IP
        if let Some(forwarded_for) = request.headers().get("x-forwarded-for") {
            if let Ok(forwarded_str) = forwarded_for.to_str() {
                if let Some(first_ip) = forwarded_str.split(',').next() {
                    ctx.ip_address = Some(first_ip.trim().to_string());
                }
            }
        }

        // Extract endpoint and method
        ctx.endpoint = Some(request.uri().path().to_string());
        ctx.method = Some(request.method().to_string());

        ctx
    }
}

// Middleware for adding request context
pub async fn logging_middleware<B>(
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> impl axum::response::IntoResponse {
    let ctx = RequestContextExtractor::from_request(&request);

    // Add trace ID to response headers
    let mut response = next.run(request).await;

    if LOG_CONFIG.enable_request_tracing {
        response.headers_mut().insert(
            "x-trace-id",
            ctx.trace_id.parse().unwrap(),
        );
    }

    response
}
