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

/// Comprehensive error handling system for worker services
pub struct WorkerErrorHandler {
    /// Error statistics and metrics
    pub error_stats: Arc<RwLock<WorkerErrorStatistics>>,
    /// Error reporting channel
    pub error_reporter: mpsc::UnboundedSender<WorkerErrorReport>,
    /// Circuit breaker for failing services
    pub circuit_breakers: Arc<RwLock<HashMap<String, WorkerCircuitBreaker>>>,
    /// Error recovery strategies
    pub recovery_strategies: HashMap<String, Box<dyn WorkerErrorRecoveryStrategy>>,
}

/// Worker-specific error statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkerErrorStatistics {
    pub total_errors: u64,
    pub errors_by_type: HashMap<String, u64>,
    pub errors_by_component: HashMap<String, u64>,
    pub errors_by_severity: HashMap<WorkerErrorSeverity, u64>,
    pub error_rate_per_minute: f64,
    #[serde(skip)]
    pub last_error_timestamp: Option<Instant>,
    pub consecutive_errors: u32,
    pub state_sync_errors: u64,
    pub client_prediction_errors: u64,
    pub performance_monitoring_errors: u64,
}

/// Circuit breaker for worker services
#[derive(Debug, Clone)]
pub struct WorkerCircuitBreaker {
    pub name: String,
    pub state: WorkerCircuitBreakerState,
    pub failure_count: u32,
    pub last_failure_time: Instant,
    pub next_retry_time: Instant,
    pub config: WorkerCircuitBreakerConfig,
}

/// Worker circuit breaker states
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum WorkerCircuitBreakerState {
    Closed,     // Normal operation
    Open,       // Failing, requests rejected
    HalfOpen,   // Testing if service recovered
}

/// Worker circuit breaker configuration
#[derive(Debug, Clone)]
pub struct WorkerCircuitBreakerConfig {
    pub failure_threshold: u32,
    pub recovery_timeout_secs: u64,
    pub monitoring_window_secs: u64,
    pub half_open_max_calls: u32,
}

/// Worker error severity levels
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum WorkerErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl fmt::Display for WorkerErrorSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WorkerErrorSeverity::Low => write!(f, "LOW"),
            WorkerErrorSeverity::Medium => write!(f, "MEDIUM"),
            WorkerErrorSeverity::High => write!(f, "HIGH"),
            WorkerErrorSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

/// Comprehensive error types for worker services
#[derive(Error, Debug, Clone)]
pub enum WorkerError {
    #[error("State synchronization error: {message}")]
    StateSync { message: String, severity: WorkerErrorSeverity },

    #[error("Client prediction error: {message}")]
    ClientPrediction { message: String, severity: WorkerErrorSeverity },

    #[error("Performance monitoring error: {message}")]
    PerformanceMonitoring { message: String, severity: WorkerErrorSeverity },

    #[error("Database operation error: {message}")]
    DatabaseOperation { message: String, severity: WorkerErrorSeverity },

    #[error("Message queue error: {message}")]
    MessageQueue { message: String, severity: WorkerErrorSeverity },

    #[error("Resource allocation error: {message}")]
    ResourceAllocation { message: String, severity: WorkerErrorSeverity },

    #[error("Configuration error: {message}")]
    Configuration { message: String, severity: WorkerErrorSeverity },

    #[error("Computation error: {message}")]
    Computation { message: String, severity: WorkerErrorSeverity },

    #[error("Network communication error: {message}")]
    NetworkCommunication { message: String, severity: WorkerErrorSeverity },

    #[error("Data validation error: {message}")]
    DataValidation { message: String, severity: WorkerErrorSeverity },

    #[error("Timeout error: {message}")]
    Timeout { message: String, severity: WorkerErrorSeverity },

    #[error("Memory management error: {message}")]
    MemoryManagement { message: String, severity: WorkerErrorSeverity },

    #[error("Thread synchronization error: {message}")]
    ThreadSynchronization { message: String, severity: WorkerErrorSeverity },

    #[error("External service error: {service} - {message}")]
    ExternalService { service: String, message: String, severity: WorkerErrorSeverity },

    #[error("Custom error: {error_type} - {message}")]
    Custom { error_type: String, message: String, severity: WorkerErrorSeverity },
}

// Display trait is automatically provided by thiserror::Error

impl WorkerError {
    /// Create a new state sync error
    pub fn state_sync_error(message: impl Into<String>) -> Self {
        Self::StateSync {
            message: message.into(),
            severity: WorkerErrorSeverity::High,
        }
    }

    /// Create a new client prediction error
    pub fn client_prediction_error(message: impl Into<String>) -> Self {
        Self::ClientPrediction {
            message: message.into(),
            severity: WorkerErrorSeverity::Medium,
        }
    }

    /// Create a new performance monitoring error
    pub fn performance_monitoring_error(message: impl Into<String>) -> Self {
        Self::PerformanceMonitoring {
            message: message.into(),
            severity: WorkerErrorSeverity::Medium,
        }
    }

    /// Create a new database operation error
    pub fn database_operation_error(message: impl Into<String>) -> Self {
        Self::DatabaseOperation {
            message: message.into(),
            severity: WorkerErrorSeverity::High,
        }
    }

    /// Create a new timeout error
    pub fn timeout_error(message: impl Into<String>) -> Self {
        Self::Timeout {
            message: message.into(),
            severity: WorkerErrorSeverity::Medium,
        }
    }

    /// Create a new critical error
    pub fn critical_error(message: impl Into<String>) -> Self {
        Self::Computation {
            message: message.into(),
            severity: WorkerErrorSeverity::Critical,
        }
    }

    /// Get error severity
    pub fn severity(&self) -> &WorkerErrorSeverity {
        match self {
            WorkerError::StateSync { severity, .. } => severity,
            WorkerError::ClientPrediction { severity, .. } => severity,
            WorkerError::PerformanceMonitoring { severity, .. } => severity,
            WorkerError::DatabaseOperation { severity, .. } => severity,
            WorkerError::MessageQueue { severity, .. } => severity,
            WorkerError::ResourceAllocation { severity, .. } => severity,
            WorkerError::Configuration { severity, .. } => severity,
            WorkerError::Computation { severity, .. } => severity,
            WorkerError::NetworkCommunication { severity, .. } => severity,
            WorkerError::DataValidation { severity, .. } => severity,
            WorkerError::Timeout { severity, .. } => severity,
            WorkerError::MemoryManagement { severity, .. } => severity,
            WorkerError::ThreadSynchronization { severity, .. } => severity,
            WorkerError::ExternalService { severity, .. } => severity,
            WorkerError::Custom { severity, .. } => severity,
        }
    }

    /// Get error category for grouping
    pub fn category(&self) -> &'static str {
        match self {
            WorkerError::StateSync { .. } => "state_sync",
            WorkerError::ClientPrediction { .. } => "client_prediction",
            WorkerError::PerformanceMonitoring { .. } => "performance_monitoring",
            WorkerError::DatabaseOperation { .. } => "database_operation",
            WorkerError::MessageQueue { .. } => "message_queue",
            WorkerError::ResourceAllocation { .. } => "resource_allocation",
            WorkerError::Configuration { .. } => "configuration",
            WorkerError::Computation { .. } => "computation",
            WorkerError::NetworkCommunication { .. } => "network_communication",
            WorkerError::DataValidation { .. } => "data_validation",
            WorkerError::Timeout { .. } => "timeout",
            WorkerError::MemoryManagement { .. } => "memory_management",
            WorkerError::ThreadSynchronization { .. } => "thread_synchronization",
            WorkerError::ExternalService { .. } => "external_service",
            WorkerError::Custom { .. } => "custom",
        }
    }

    /// Convert to error report for logging and monitoring
    pub fn to_error_report(&self, context: Option<&str>) -> WorkerErrorReport {
        WorkerErrorReport {
            error_type: self.category().to_string(),
            message: self.to_string(),
            severity: self.severity().clone(),
            timestamp: Instant::now(),
            context: context.map(|s| s.to_string()),
            stack_trace: None,
            service_name: "worker".to_string(),
            additional_data: HashMap::new(),
        }
    }
}

/// Worker error report for centralized error tracking
#[derive(Debug, Clone, Serialize)]
pub struct WorkerErrorReport {
    pub error_type: String,
    pub message: String,
    pub severity: WorkerErrorSeverity,
    #[serde(skip)]
    pub timestamp: Instant,
    pub context: Option<String>,
    pub stack_trace: Option<String>,
    pub service_name: String,
    pub additional_data: HashMap<String, serde_json::Value>,
}

impl WorkerErrorReport {
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

/// Worker error recovery strategy trait
pub trait WorkerErrorRecoveryStrategy: Send + Sync {
    fn name(&self) -> &str;
    fn can_recover(&self, error: &WorkerError) -> bool;
    fn recover(&self, error: &WorkerError, context: Option<&str>) -> Result<(), WorkerError>;
    fn get_retry_delay(&self, attempt: u32) -> Duration;
}

/// State sync recovery strategy
pub struct StateSyncRecoveryStrategy;

impl WorkerErrorRecoveryStrategy for StateSyncRecoveryStrategy {
    fn name(&self) -> &str {
        "state_sync_recovery"
    }

    fn can_recover(&self, error: &WorkerError) -> bool {
        matches!(error, WorkerError::StateSync { .. })
    }

    fn recover(&self, error: &WorkerError, _context: Option<&str>) -> Result<(), WorkerError> {
        // Recovery logic for state sync errors
        // Could include: resetting client state, resyncing with authoritative state, etc.
        info!("Attempting state sync recovery for error: {}", error);
        Ok(())
    }

    fn get_retry_delay(&self, attempt: u32) -> Duration {
        Duration::from_millis(100 * 2_u64.pow(attempt.min(5)))
    }
}

/// Performance monitoring recovery strategy
pub struct PerformanceRecoveryStrategy;

impl WorkerErrorRecoveryStrategy for PerformanceRecoveryStrategy {
    fn name(&self) -> &str {
        "performance_recovery"
    }

    fn can_recover(&self, error: &WorkerError) -> bool {
        matches!(error, WorkerError::PerformanceMonitoring { .. })
    }

    fn recover(&self, error: &WorkerError, _context: Option<&str>) -> Result<(), WorkerError> {
        // Recovery logic for performance monitoring errors
        info!("Attempting performance monitoring recovery for error: {}", error);
        Ok(())
    }

    fn get_retry_delay(&self, _attempt: u32) -> Duration {
        Duration::from_secs(5)
    }
}

impl WorkerErrorHandler {
    /// Create new worker error handler
    pub fn new() -> Self {
        let (error_reporter, mut error_receiver) = mpsc::unbounded_channel();

        let mut error_handler = Self {
            error_stats: Arc::new(RwLock::new(WorkerErrorStatistics::default())),
            error_reporter,
            circuit_breakers: Arc::new(RwLock::new(HashMap::new())),
            recovery_strategies: HashMap::new(),
        };

        // Register default recovery strategies
        error_handler.register_recovery_strategy("state_sync", Box::new(StateSyncRecoveryStrategy));
        error_handler.register_recovery_strategy("performance", Box::new(PerformanceRecoveryStrategy));

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
    pub fn register_recovery_strategy(&mut self, name: &str, strategy: Box<dyn WorkerErrorRecoveryStrategy>) {
        self.recovery_strategies.insert(name.to_string(), strategy);
    }

    /// Handle an error with automatic recovery
    pub async fn handle_error(&self, error: WorkerError, context: Option<&str>) -> Result<(), WorkerError> {
        let error_report = error.to_error_report(context);

        // Send to error reporter
        if let Err(e) = self.error_reporter.send(error_report.clone()) {
            error!("Failed to send worker error report: {}", e);
        }

        // Update statistics
        self.update_error_statistics(&error, &error_report).await;

        // Check circuit breaker
        self.check_circuit_breaker(&error, context).await;

        // Attempt recovery
        self.attempt_recovery(&error, context).await
    }

    /// Update error statistics
    async fn update_error_statistics(&self, error: &WorkerError, report: &WorkerErrorReport) {
        let mut stats = self.error_stats.write().await;

        stats.total_errors += 1;
        stats.last_error_timestamp = Some(report.timestamp);

        // Update by type
        *stats.errors_by_type.entry(error.category().to_string()).or_insert(0) += 1;

        // Update by component (context or default to "worker")
        let component = report.context.as_ref().unwrap_or(&"worker".to_string()).clone();
        *stats.errors_by_component.entry(component).or_insert(0) += 1;

        // Update by severity
        *stats.errors_by_severity.entry(error.severity().clone()).or_insert(0) += 1;

        // Update specific error counters
        match error {
            WorkerError::StateSync { .. } => stats.state_sync_errors += 1,
            WorkerError::ClientPrediction { .. } => stats.client_prediction_errors += 1,
            WorkerError::PerformanceMonitoring { .. } => stats.performance_monitoring_errors += 1,
            _ => {}
        }

        // Update consecutive errors
        if let Some(last_error) = stats.last_error_timestamp {
            if last_error.elapsed().as_secs() < 60 {
                stats.consecutive_errors += 1;
            } else {
                stats.consecutive_errors = 1;
            }
        }

        // Update error rate
        stats.error_rate_per_minute = stats.total_errors as f64 / 60.0;
    }

    /// Check and update circuit breaker state
    async fn check_circuit_breaker(&self, error: &WorkerError, context: Option<&str>) {
        let component_name = context.unwrap_or("default").to_string();

        let mut breakers = self.circuit_breakers.write().await;
        let breaker = breakers.entry(component_name.clone()).or_insert_with(|| {
            WorkerCircuitBreaker {
                name: component_name.clone(),
                state: WorkerCircuitBreakerState::Closed,
                failure_count: 0,
                last_failure_time: Instant::now(),
                next_retry_time: Instant::now(),
                config: WorkerCircuitBreakerConfig {
                    failure_threshold: 5,
                    recovery_timeout_secs: 30,
                    monitoring_window_secs: 60,
                    half_open_max_calls: 3,
                },
            }
        });

        // Update failure count for critical errors
        if error.severity() == &WorkerErrorSeverity::Critical {
            breaker.failure_count += 1;
            breaker.last_failure_time = Instant::now();

            // Open circuit if threshold exceeded
            if breaker.failure_count >= breaker.config.failure_threshold {
                breaker.state = WorkerCircuitBreakerState::Open;
                breaker.next_retry_time = Instant::now() + Duration::from_secs(breaker.config.recovery_timeout_secs);

                warn!("Worker circuit breaker opened for component: {}", component_name);
            }
        }
    }

    /// Attempt error recovery using registered strategies
    async fn attempt_recovery(&self, error: &WorkerError, context: Option<&str>) -> Result<(), WorkerError> {
        for (strategy_name, strategy) in &self.recovery_strategies {
            if strategy.can_recover(error) {
                info!("Attempting worker recovery using strategy: {}", strategy_name);

                match strategy.recover(error, context) {
                    Ok(_) => {
                        info!("Successfully recovered from worker error using strategy: {}", strategy_name);
                        return Ok(());
                    }
                    Err(recovery_error) => {
                        warn!("Worker recovery strategy {} failed: {}", strategy_name, recovery_error);
                    }
                }
            }
        }

        // If no recovery strategy worked, return the original error
        Err(error.clone())
    }

    /// Process error report (background task)
    async fn process_error_report(
        report: WorkerErrorReport,
        _stats: &Arc<RwLock<WorkerErrorStatistics>>,
        breakers: &Arc<RwLock<HashMap<String, WorkerCircuitBreaker>>>,
    ) {
        // Log error based on severity
        match report.severity {
            WorkerErrorSeverity::Critical => {
                error!("CRITICAL WORKER ERROR [{}]: {}", report.service_name, report.message);
            }
            WorkerErrorSeverity::High => {
                error!("HIGH WORKER ERROR [{}]: {}", report.service_name, report.message);
            }
            WorkerErrorSeverity::Medium => {
                warn!("MEDIUM WORKER ERROR [{}]: {}", report.service_name, report.message);
            }
            WorkerErrorSeverity::Low => {
                info!("LOW WORKER ERROR [{}]: {}", report.service_name, report.message);
            }
        }

        // Additional processing for worker-specific errors
        // Update circuit breakers
        let mut cb_map = breakers.write().await;
        if let Some(breaker) = cb_map.get_mut(&report.service_name) {
            // Check if we should transition from HalfOpen to Closed
            if breaker.state == WorkerCircuitBreakerState::HalfOpen {
                if report.severity == WorkerErrorSeverity::Low || report.severity == WorkerErrorSeverity::Medium {
                    breaker.state = WorkerCircuitBreakerState::Closed;
                    breaker.failure_count = 0;
                    info!("Worker circuit breaker closed for component: {}", breaker.name);
                }
            }
        }
    }

    /// Get current error statistics
    pub async fn get_error_statistics(&self) -> WorkerErrorStatistics {
        self.error_stats.read().await.clone()
    }

    /// Get circuit breaker status
    pub async fn get_circuit_breaker_status(&self) -> HashMap<String, WorkerCircuitBreakerState> {
        let breakers = self.circuit_breakers.read().await;
        breakers.iter()
            .map(|(name, breaker)| (name.clone(), breaker.state.clone()))
            .collect()
    }

    /// Check if a component is available
    pub async fn is_component_available(&self, component_name: &str) -> bool {
        let breakers = self.circuit_breakers.read().await;

        if let Some(breaker) = breakers.get(component_name) {
            match breaker.state {
                WorkerCircuitBreakerState::Closed => true,
                WorkerCircuitBreakerState::HalfOpen => {
                    breaker.failure_count < breaker.config.half_open_max_calls
                }
                WorkerCircuitBreakerState::Open => {
                    Instant::now() >= breaker.next_retry_time
                }
            }
        } else {
            true
        }
    }

    /// Generate error handling report
    pub async fn generate_report(&self) -> WorkerErrorHandlingReport {
        let stats = self.error_stats.read().await;
        let circuit_breakers = self.circuit_breakers.read().await;

        let mut open_circuits = Vec::new();
        let mut failing_components = Vec::new();

        for (name, breaker) in circuit_breakers.iter() {
            if breaker.state == WorkerCircuitBreakerState::Open {
                open_circuits.push(name.clone());
            }

            if breaker.failure_count > 0 {
                failing_components.push(WorkerServiceStatus {
                    component_name: name.clone(),
                    state: breaker.state.clone(),
                    failure_count: breaker.failure_count,
                    last_failure: breaker.last_failure_time,
                });
            }
        }

        WorkerErrorHandlingReport {
            generated_at: Instant::now(),
            error_statistics: stats.clone(),
            open_circuit_breakers: open_circuits,
            failing_components,
            recovery_strategies: self.recovery_strategies.keys().cloned().collect(),
        }
    }
}

impl Default for WorkerErrorHandler {
    fn default() -> Self {
        Self::new()
    }
}

/// Worker error handling report
#[derive(Debug, Clone, Serialize)]
pub struct WorkerErrorHandlingReport {
    #[serde(skip)]
    pub generated_at: Instant,
    pub error_statistics: WorkerErrorStatistics,
    pub open_circuit_breakers: Vec<String>,
    pub failing_components: Vec<WorkerServiceStatus>,
    pub recovery_strategies: Vec<String>,
}

/// Worker service status for monitoring
#[derive(Debug, Clone, Serialize)]
pub struct WorkerServiceStatus {
    pub component_name: String,
    pub state: WorkerCircuitBreakerState,
    pub failure_count: u32,
    #[serde(skip)]
    pub last_failure: Instant,
}

/// Helper macros for worker error handling
#[macro_export]
macro_rules! worker_handle_error {
    ($error_handler:expr, $error:expr) => {
        $error_handler.handle_error($error, None).await
    };

    ($error_handler:expr, $error:expr, $context:expr) => {
        $error_handler.handle_error($error, Some($context)).await
    };
}

/// Helper macro for creating typed worker errors
#[macro_export]
macro_rules! worker_error {
    (state_sync: $msg:expr) => {
        $crate::error_handling::WorkerError::state_sync_error($msg)
    };

    (client_prediction: $msg:expr) => {
        $crate::error_handling::WorkerError::client_prediction_error($msg)
    };

    (performance: $msg:expr) => {
        $crate::error_handling::WorkerError::performance_monitoring_error($msg)
    };

    (database: $msg:expr) => {
        $crate::error_handling::WorkerError::database_operation_error($msg)
    };

    (timeout: $msg:expr) => {
        $crate::error_handling::WorkerError::timeout_error($msg)
    };

    (critical: $msg:expr) => {
        $crate::error_handling::WorkerError::critical_error($msg)
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_error_handler_creation() {
        let handler = WorkerErrorHandler::new();
        assert!(handler.recovery_strategies.contains_key("state_sync"));
        assert!(handler.recovery_strategies.contains_key("performance"));
    }

    #[tokio::test]
    async fn test_worker_error_handling() {
        let handler = WorkerErrorHandler::new();

        let error = WorkerError::state_sync_error("Test state sync error");
        let result = handler.handle_error(error, Some("test_component")).await;

        assert!(result.is_ok());

        let stats = handler.get_error_statistics().await;
        assert_eq!(stats.total_errors, 1);
        assert_eq!(stats.state_sync_errors, 1);
        assert!(stats.errors_by_type.contains_key("state_sync"));
    }

    #[tokio::test]
    async fn test_worker_circuit_breaker() {
        let handler = WorkerErrorHandler::new();

        // Send multiple critical errors to trigger circuit breaker
        for _ in 0..6 {
            let error = WorkerError::critical_error("Critical worker error");
            // Expect recovery to fail since no recovery strategy handles critical errors
            let result = handler.handle_error(error, Some("test_component")).await;
            assert!(result.is_err()); // Should fail since no recovery strategy handles critical errors
        }

        let circuit_status = handler.get_circuit_breaker_status().await;
        assert!(circuit_status.contains_key("test_component"));

        let stats = handler.get_error_statistics().await;
        assert_eq!(stats.total_errors, 6);
    }

    #[tokio::test]
    async fn test_worker_error_macros() {
        let error1 = worker_error!(state_sync: "State sync failed");
        assert!(matches!(error1, WorkerError::StateSync { .. }));

        let error2 = worker_error!(client_prediction: "Prediction error");
        assert!(matches!(error2, WorkerError::ClientPrediction { .. }));

        let error3 = worker_error!(critical: "System failure");
        assert!(matches!(error3, WorkerError::Computation { .. }));
    }
}
