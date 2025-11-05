use std::{
    collections::HashMap,
    fmt,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::{RwLock, mpsc};
use serde::{Deserialize, Serialize};
use tracing::{error, warn, info};
use thiserror::Error;

/// Comprehensive error handling system for gateway services
pub struct ErrorHandler {
    /// Error statistics and metrics
    pub error_stats: Arc<RwLock<ErrorStatistics>>,
    /// Error reporting channel
    pub error_reporter: mpsc::UnboundedSender<ErrorReport>,
    /// Circuit breaker for failing services
    pub circuit_breakers: Arc<RwLock<HashMap<String, CircuitBreaker>>>,
    /// Error recovery strategies
    pub recovery_strategies: HashMap<String, Box<dyn ErrorRecoveryStrategy>>,
}

/// Error statistics for monitoring and analysis
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ErrorStatistics {
    pub total_errors: u64,
    pub errors_by_type: HashMap<String, u64>,
    pub errors_by_service: HashMap<String, u64>,
    pub errors_by_severity: HashMap<ErrorSeverity, u64>,
    pub error_rate_per_minute: f64,
    #[serde(skip)]
    pub last_error_timestamp: Option<Instant>,
    pub consecutive_errors: u32,
}

/// Circuit breaker for failing services
#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    pub name: String,
    pub state: CircuitBreakerState,
    pub failure_count: u32,
    pub last_failure_time: Instant,
    pub next_retry_time: Instant,
    pub config: CircuitBreakerConfig,
}

/// Circuit breaker states
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CircuitBreakerState {
    Closed,     // Normal operation
    Open,       // Failing, requests rejected
    HalfOpen,   // Testing if service recovered
}

/// Circuit breaker configuration
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    pub failure_threshold: u32,
    pub recovery_timeout_secs: u64,
    pub monitoring_window_secs: u64,
    pub half_open_max_calls: u32,
}

/// Error severity levels
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl fmt::Display for ErrorSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorSeverity::Low => write!(f, "LOW"),
            ErrorSeverity::Medium => write!(f, "MEDIUM"),
            ErrorSeverity::High => write!(f, "HIGH"),
            ErrorSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

/// Comprehensive error types for gateway services
#[derive(Error, Debug, Clone)]
pub enum GatewayError {
    #[error("Authentication error: {message}")]
    Authentication { message: String, severity: ErrorSeverity },

    #[error("Authorization error: {message}")]
    Authorization { message: String, severity: ErrorSeverity },

    #[error("Connection error: {message}")]
    Connection { message: String, severity: ErrorSeverity },

    #[error("Message processing error: {message}")]
    MessageProcessing { message: String, severity: ErrorSeverity },

    #[error("Batch processing error: {message}")]
    BatchProcessing { message: String, severity: ErrorSeverity },

    #[error("Rate limiting error: {message}")]
    RateLimiting { message: String, severity: ErrorSeverity },

    #[error("Database error: {message}")]
    Database { message: String, severity: ErrorSeverity },

    #[error("WebRTC signaling error: {message}")]
    WebRTCSignaling { message: String, severity: ErrorSeverity },

    #[error("Room management error: {message}")]
    RoomManagement { message: String, severity: ErrorSeverity },

    #[error("Validation error: {message}")]
    Validation { message: String, severity: ErrorSeverity },

    #[error("Configuration error: {message}")]
    Configuration { message: String, severity: ErrorSeverity },

    #[error("Resource exhaustion error: {message}")]
    ResourceExhaustion { message: String, severity: ErrorSeverity },

    #[error("Timeout error: {message}")]
    Timeout { message: String, severity: ErrorSeverity },

    #[error("Network error: {message}")]
    Network { message: String, severity: ErrorSeverity },

    #[error("Serialization error: {message}")]
    Serialization { message: String, severity: ErrorSeverity },

    #[error("Internal server error: {message}")]
    Internal { message: String, severity: ErrorSeverity },

    #[error("External service error: {service} - {message}")]
    ExternalService { service: String, message: String, severity: ErrorSeverity },

    #[error("Custom error: {error_type} - {message}")]
    Custom { error_type: String, message: String, severity: ErrorSeverity },
}

// Display trait is automatically provided by thiserror::Error

impl GatewayError {
    /// Create a new authentication error
    pub fn auth_error(message: impl Into<String>) -> Self {
        Self::Authentication {
            message: message.into(),
            severity: ErrorSeverity::High,
        }
    }

    /// Create a new connection error
    pub fn connection_error(message: impl Into<String>) -> Self {
        Self::Connection {
            message: message.into(),
            severity: ErrorSeverity::Medium,
        }
    }

    /// Create a new message processing error
    pub fn message_processing_error(message: impl Into<String>) -> Self {
        Self::MessageProcessing {
            message: message.into(),
            severity: ErrorSeverity::Medium,
        }
    }

    /// Create a new database error
    pub fn database_error(message: impl Into<String>) -> Self {
        Self::Database {
            message: message.into(),
            severity: ErrorSeverity::High,
        }
    }

    /// Create a new timeout error
    pub fn timeout_error(message: impl Into<String>) -> Self {
        Self::Timeout {
            message: message.into(),
            severity: ErrorSeverity::Medium,
        }
    }

    /// Create a new critical error
    pub fn critical_error(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
            severity: ErrorSeverity::Critical,
        }
    }

    /// Get error severity
    pub fn severity(&self) -> &ErrorSeverity {
        match self {
            GatewayError::Authentication { severity, .. } => severity,
            GatewayError::Authorization { severity, .. } => severity,
            GatewayError::Connection { severity, .. } => severity,
            GatewayError::MessageProcessing { severity, .. } => severity,
            GatewayError::BatchProcessing { severity, .. } => severity,
            GatewayError::RateLimiting { severity, .. } => severity,
            GatewayError::Database { severity, .. } => severity,
            GatewayError::WebRTCSignaling { severity, .. } => severity,
            GatewayError::RoomManagement { severity, .. } => severity,
            GatewayError::Validation { severity, .. } => severity,
            GatewayError::Configuration { severity, .. } => severity,
            GatewayError::ResourceExhaustion { severity, .. } => severity,
            GatewayError::Timeout { severity, .. } => severity,
            GatewayError::Network { severity, .. } => severity,
            GatewayError::Serialization { severity, .. } => severity,
            GatewayError::Internal { severity, .. } => severity,
            GatewayError::ExternalService { severity, .. } => severity,
            GatewayError::Custom { severity, .. } => severity,
        }
    }

    /// Get error category for grouping
    pub fn category(&self) -> &'static str {
        match self {
            GatewayError::Authentication { .. } => "authentication",
            GatewayError::Authorization { .. } => "authorization",
            GatewayError::Connection { .. } => "connection",
            GatewayError::MessageProcessing { .. } => "message_processing",
            GatewayError::BatchProcessing { .. } => "batch_processing",
            GatewayError::RateLimiting { .. } => "rate_limiting",
            GatewayError::Database { .. } => "database",
            GatewayError::WebRTCSignaling { .. } => "webrtc_signaling",
            GatewayError::RoomManagement { .. } => "room_management",
            GatewayError::Validation { .. } => "validation",
            GatewayError::Configuration { .. } => "configuration",
            GatewayError::ResourceExhaustion { .. } => "resource_exhaustion",
            GatewayError::Timeout { .. } => "timeout",
            GatewayError::Network { .. } => "network",
            GatewayError::Serialization { .. } => "serialization",
            GatewayError::Internal { .. } => "internal",
            GatewayError::ExternalService { .. } => "external_service",
            GatewayError::Custom { .. } => "custom",
        }
    }

    /// Convert to error report for logging and monitoring
    pub fn to_error_report(&self, context: Option<&str>) -> ErrorReport {
        ErrorReport {
            error_type: self.category().to_string(),
            message: self.to_string(),
            severity: self.severity().clone(),
            timestamp: Instant::now(),
            context: context.map(|s| s.to_string()),
            stack_trace: None, // Would be populated in real implementation
            service_name: "gateway".to_string(),
            additional_data: HashMap::new(),
        }
    }
}

/// Error report for centralized error tracking
#[derive(Debug, Clone, Serialize)]
pub struct ErrorReport {
    pub error_type: String,
    pub message: String,
    pub severity: ErrorSeverity,
    #[serde(skip)]
    pub timestamp: Instant,
    pub context: Option<String>,
    pub stack_trace: Option<String>,
    pub service_name: String,
    pub additional_data: HashMap<String, serde_json::Value>,
}

impl ErrorReport {
    /// Add context information to error report
    pub fn with_context(mut self, context: &str) -> Self {
        self.context = Some(context.to_string());
        self
    }

    /// Add additional data to error report
    pub fn with_data(mut self, key: &str, value: serde_json::Value) -> Self {
        self.additional_data.insert(key.to_string(), value);
        self
    }

    /// Add stack trace if available
    pub fn with_stack_trace(mut self, trace: &str) -> Self {
        self.stack_trace = Some(trace.to_string());
        self
    }
}

/// Error recovery strategy trait
pub trait ErrorRecoveryStrategy: Send + Sync {
    fn name(&self) -> &str;
    fn can_recover(&self, error: &GatewayError) -> bool;
    fn recover(&self, error: &GatewayError, context: Option<&str>) -> Result<(), GatewayError>;
    fn get_retry_delay(&self, attempt: u32) -> Duration;
}

/// Retry recovery strategy
pub struct RetryRecoveryStrategy {
    max_retries: u32,
    base_delay_ms: u64,
    max_delay_ms: u64,
}

impl RetryRecoveryStrategy {
    pub fn new(max_retries: u32, base_delay_ms: u64, max_delay_ms: u64) -> Self {
        Self {
            max_retries,
            base_delay_ms,
            max_delay_ms,
        }
    }
}

impl ErrorRecoveryStrategy for RetryRecoveryStrategy {
    fn name(&self) -> &str {
        "retry"
    }

    fn can_recover(&self, error: &GatewayError) -> bool {
        match error {
            GatewayError::Connection { .. } => true,
            GatewayError::Timeout { .. } => true,
            GatewayError::Network { .. } => true,
            GatewayError::ExternalService { .. } => true,
            _ => false,
        }
    }

    fn recover(&self, _error: &GatewayError, _context: Option<&str>) -> Result<(), GatewayError> {
        // Recovery logic would be implemented here
        // For now, just return success
        Ok(())
    }

    fn get_retry_delay(&self, attempt: u32) -> Duration {
        let delay = self.base_delay_ms * 2_u64.pow(attempt.min(10)); // Exponential backoff
        Duration::from_millis(delay.min(self.max_delay_ms))
    }
}

/// Circuit breaker recovery strategy
pub struct CircuitBreakerRecoveryStrategy;

impl ErrorRecoveryStrategy for CircuitBreakerRecoveryStrategy {
    fn name(&self) -> &str {
        "circuit_breaker"
    }

    fn can_recover(&self, _error: &GatewayError) -> bool {
        true // Circuit breakers can handle any error type
    }

    fn recover(&self, _error: &GatewayError, _context: Option<&str>) -> Result<(), GatewayError> {
        Ok(())
    }

    fn get_retry_delay(&self, _attempt: u32) -> Duration {
        Duration::from_secs(30) // Fixed delay for circuit breaker recovery
    }
}

impl ErrorHandler {
    /// Create new error handler
    pub fn new() -> Self {
        let (error_reporter, mut error_receiver) = mpsc::unbounded_channel();

        let mut error_handler = Self {
            error_stats: Arc::new(RwLock::new(ErrorStatistics::default())),
            error_reporter,
            circuit_breakers: Arc::new(RwLock::new(HashMap::new())),
            recovery_strategies: HashMap::new(),
        };

        // Register default recovery strategies
        error_handler.register_recovery_strategy("retry", Box::new(RetryRecoveryStrategy::new(3, 1000, 30000)));
        error_handler.register_recovery_strategy("circuit_breaker", Box::new(CircuitBreakerRecoveryStrategy));

        // Start error processing task
        let stats_clone = error_handler.error_stats.clone();
        let breakers_clone = error_handler.circuit_breakers.clone();

        tokio::spawn(async move {
            while let Some(error_report) = error_receiver.recv().await {
                Self::process_error_report(error_report, &stats_clone, &breakers_clone).await;
            }
        });

        error_handler
    }

    /// Register a recovery strategy for specific error types
    pub fn register_recovery_strategy(&mut self, name: &str, strategy: Box<dyn ErrorRecoveryStrategy>) {
        self.recovery_strategies.insert(name.to_string(), strategy);
    }

    /// Handle an error with automatic recovery
    pub async fn handle_error(&self, error: GatewayError, context: Option<&str>) -> Result<(), GatewayError> {
        let error_report = error.to_error_report(context);

        // Send to error reporter
        if let Err(e) = self.error_reporter.send(error_report.clone()) {
            error!("Failed to send error report: {}", e);
        }

        // Update statistics
        self.update_error_statistics(&error, &error_report).await;

        // Check circuit breaker
        self.check_circuit_breaker(&error, context).await;

        // Attempt recovery
        self.attempt_recovery(&error, context).await
    }

    /// Update error statistics
    async fn update_error_statistics(&self, error: &GatewayError, report: &ErrorReport) {
        let mut stats = self.error_stats.write().await;

        stats.total_errors += 1;
        stats.last_error_timestamp = Some(report.timestamp);

        // Update by type
        *stats.errors_by_type.entry(error.category().to_string()).or_insert(0) += 1;

        // Update by service (context or default to "gateway")
        let service = report.context.as_ref().unwrap_or(&"gateway".to_string()).clone();
        *stats.errors_by_service.entry(service).or_insert(0) += 1;

        // Update by severity
        *stats.errors_by_severity.entry(error.severity().clone()).or_insert(0) += 1;

        // Update consecutive errors
        if let Some(last_error) = stats.last_error_timestamp {
            if last_error.elapsed().as_secs() < 60 {
                stats.consecutive_errors += 1;
            } else {
                stats.consecutive_errors = 1;
            }
        }

        // Update error rate (errors per minute)
        let _window_start = Instant::now() - Duration::from_secs(60);
        // In a real implementation, we'd track errors in a sliding window
        // For this example, we'll use a simple approximation
        stats.error_rate_per_minute = stats.total_errors as f64 / 60.0;
    }

    /// Check and update circuit breaker state
    async fn check_circuit_breaker(&self, error: &GatewayError, context: Option<&str>) {
        let service_name = context.unwrap_or("default").to_string();

        let mut breakers = self.circuit_breakers.write().await;
        let breaker = breakers.entry(service_name.clone()).or_insert_with(|| {
            CircuitBreaker {
                name: service_name.clone(),
                state: CircuitBreakerState::Closed,
                failure_count: 0,
                last_failure_time: Instant::now(),
                next_retry_time: Instant::now(),
                config: CircuitBreakerConfig {
                    failure_threshold: 5,
                    recovery_timeout_secs: 30,
                    monitoring_window_secs: 60,
                    half_open_max_calls: 3,
                },
            }
        });

        // Update failure count for critical errors
        if error.severity() == &ErrorSeverity::Critical {
            breaker.failure_count += 1;
            breaker.last_failure_time = Instant::now();

            // Open circuit if threshold exceeded
            if breaker.failure_count >= breaker.config.failure_threshold {
                breaker.state = CircuitBreakerState::Open;
                breaker.next_retry_time = Instant::now() + Duration::from_secs(breaker.config.recovery_timeout_secs);

                warn!("Circuit breaker opened for service: {}", service_name);
            }
        }
    }

    /// Attempt error recovery using registered strategies
    async fn attempt_recovery(&self, error: &GatewayError, context: Option<&str>) -> Result<(), GatewayError> {
        for (strategy_name, strategy) in &self.recovery_strategies {
            if strategy.can_recover(error) {
                info!("Attempting recovery using strategy: {}", strategy_name);

                match strategy.recover(error, context) {
                    Ok(_) => {
                        info!("Successfully recovered from error using strategy: {}", strategy_name);
                        return Ok(());
                    }
                    Err(recovery_error) => {
                        warn!("Recovery strategy {} failed: {}", strategy_name, recovery_error);
                    }
                }
            }
        }

        // If no recovery strategy worked, return the original error
        Err(error.clone())
    }

    /// Process error report (background task)
    async fn process_error_report(
        report: ErrorReport,
        _stats: &Arc<RwLock<ErrorStatistics>>,
        breakers: &Arc<RwLock<HashMap<String, CircuitBreaker>>>,
    ) {
        // Log error based on severity
        match report.severity {
            ErrorSeverity::Critical => {
                error!("CRITICAL ERROR [{}]: {}", report.service_name, report.message);
            }
            ErrorSeverity::High => {
                error!("HIGH ERROR [{}]: {}", report.service_name, report.message);
            }
            ErrorSeverity::Medium => {
                warn!("MEDIUM ERROR [{}]: {}", report.service_name, report.message);
            }
            ErrorSeverity::Low => {
                info!("LOW ERROR [{}]: {}", report.service_name, report.message);
            }
        }

        // Additional processing could include:
        // - Sending alerts for critical errors
        // - Updating external monitoring systems
        // - Triggering automated recovery procedures

        // Update circuit breakers
        let mut cb_map = breakers.write().await;
        if let Some(breaker) = cb_map.get_mut(&report.service_name) {
            // Check if we should transition from HalfOpen to Closed
            if breaker.state == CircuitBreakerState::HalfOpen {
                if report.severity == ErrorSeverity::Low || report.severity == ErrorSeverity::Medium {
                    breaker.state = CircuitBreakerState::Closed;
                    breaker.failure_count = 0;
                    info!("Circuit breaker closed for service: {}", breaker.name);
                }
            }
        }
    }

    /// Get current error statistics
    pub async fn get_error_statistics(&self) -> ErrorStatistics {
        self.error_stats.read().await.clone()
    }

    /// Get circuit breaker status
    pub async fn get_circuit_breaker_status(&self) -> HashMap<String, CircuitBreakerState> {
        let breakers = self.circuit_breakers.read().await;
        breakers.iter()
            .map(|(name, breaker)| (name.clone(), breaker.state.clone()))
            .collect()
    }

    /// Check if a service is available (not circuit broken)
    pub async fn is_service_available(&self, service_name: &str) -> bool {
        let breakers = self.circuit_breakers.read().await;

        if let Some(breaker) = breakers.get(service_name) {
            match breaker.state {
                CircuitBreakerState::Closed => true,
                CircuitBreakerState::HalfOpen => {
                    // Allow limited requests in half-open state
                    breaker.failure_count < breaker.config.half_open_max_calls
                }
                CircuitBreakerState::Open => {
                    // Check if recovery timeout has passed
                    Instant::now() >= breaker.next_retry_time
                }
            }
        } else {
            true // No circuit breaker means service is available
        }
    }

    /// Generate error handling report
    pub async fn generate_report(&self) -> ErrorHandlingReport {
        let stats = self.error_stats.read().await;
        let circuit_breakers = self.circuit_breakers.read().await;

        let mut open_circuits = Vec::new();
        let mut failing_services = Vec::new();

        for (name, breaker) in circuit_breakers.iter() {
            if breaker.state == CircuitBreakerState::Open {
                open_circuits.push(name.clone());
            }

            if breaker.failure_count > 0 {
                failing_services.push(ServiceStatus {
                    service_name: name.clone(),
                    state: breaker.state.clone(),
                    failure_count: breaker.failure_count,
                    last_failure: breaker.last_failure_time,
                });
            }
        }

        ErrorHandlingReport {
            generated_at: Instant::now(),
            error_statistics: stats.clone(),
            open_circuit_breakers: open_circuits,
            failing_services,
            recovery_strategies: self.recovery_strategies.keys().cloned().collect(),
        }
    }
}

impl Default for ErrorHandler {
    fn default() -> Self {
        Self::new()
    }
}

/// Error handling report for monitoring and debugging
#[derive(Debug, Clone, Serialize)]
pub struct ErrorHandlingReport {
    #[serde(skip)]
    pub generated_at: Instant,
    pub error_statistics: ErrorStatistics,
    pub open_circuit_breakers: Vec<String>,
    pub failing_services: Vec<ServiceStatus>,
    pub recovery_strategies: Vec<String>,
}

/// Service status for monitoring
#[derive(Debug, Clone, Serialize)]
pub struct ServiceStatus {
    pub service_name: String,
    pub state: CircuitBreakerState,
    pub failure_count: u32,
    #[serde(skip)]
    pub last_failure: Instant,
}

/// Helper macro for easy error handling
#[macro_export]
macro_rules! handle_error {
    ($error_handler:expr, $error:expr) => {
        $error_handler.handle_error($error, None).await
    };

    ($error_handler:expr, $error:expr, $context:expr) => {
        $error_handler.handle_error($error, Some($context)).await
    };
}

/// Helper macro for creating typed errors
#[macro_export]
macro_rules! gateway_error {
    (auth: $msg:expr) => {
        $crate::error_handling::GatewayError::auth_error($msg)
    };

    (connection: $msg:expr) => {
        $crate::error_handling::GatewayError::connection_error($msg)
    };

    (processing: $msg:expr) => {
        $crate::error_handling::GatewayError::message_processing_error($msg)
    };

    (database: $msg:expr) => {
        $crate::error_handling::GatewayError::database_error($msg)
    };

    (timeout: $msg:expr) => {
        $crate::error_handling::GatewayError::timeout_error($msg)
    };

    (critical: $msg:expr) => {
        $crate::error_handling::GatewayError::critical_error($msg)
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_error_handler_creation() {
        let handler = ErrorHandler::new();
        assert!(handler.recovery_strategies.contains_key("retry"));
        assert!(handler.recovery_strategies.contains_key("circuit_breaker"));
    }

    #[tokio::test]
    async fn test_error_handling() {
        let handler = ErrorHandler::new();

        let error = GatewayError::connection_error("Test connection error");
        let result = handler.handle_error(error, Some("test_context")).await;

        // Should not return error for recoverable connection errors
        assert!(result.is_ok());

        let stats = handler.get_error_statistics().await;
        assert_eq!(stats.total_errors, 1);
        assert!(stats.errors_by_type.contains_key("connection"));
    }

    #[tokio::test]
    async fn test_circuit_breaker() {
        let handler = ErrorHandler::new();

        // Send multiple critical errors to trigger circuit breaker
        for _ in 0..6 {
            let error = GatewayError::critical_error("Critical test error");
            handler.handle_error(error, Some("test_service")).await.unwrap();
        }

        let circuit_status = handler.get_circuit_breaker_status().await;
        assert!(circuit_status.contains_key("test_service"));

        let stats = handler.get_error_statistics().await;
        assert_eq!(stats.total_errors, 6);
    }

    #[tokio::test]
    async fn test_error_macros() {
        let error1 = gateway_error!(auth: "Authentication failed");
        assert!(matches!(error1, GatewayError::Authentication { .. }));

        let error2 = gateway_error!(connection: "Connection lost");
        assert!(matches!(error2, GatewayError::Connection { .. }));

        let error3 = gateway_error!(critical: "System failure");
        assert!(matches!(error3, GatewayError::Internal { .. }));
    }
}
