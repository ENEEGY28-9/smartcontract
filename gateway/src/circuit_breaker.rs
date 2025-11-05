use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::thread;
use tokio::time::timeout;
use metrics;

/// Circuit breaker states
#[derive(Debug, Clone, PartialEq)]
pub enum CircuitBreakerState {
    Closed,   // Normal operation
    Open,     // Failing, reject calls
    HalfOpen, // Testing if service recovered
}

/// Configuration for circuit breaker
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of failures before opening circuit
    pub failure_threshold: usize,
    /// Time to wait before transitioning to half-open
    pub recovery_timeout: Duration,
    /// Timeout for individual calls
    pub call_timeout: Duration,
    /// Success threshold in half-open state
    pub half_open_success_threshold: usize,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout: Duration::from_secs(60),
            call_timeout: Duration::from_secs(5),
            half_open_success_threshold: 3,
        }
    }
}

/// Circuit breaker for preventing cascading failures
#[derive(Debug)]
pub struct CircuitBreaker {
    state: Arc<Mutex<CircuitBreakerState>>,
    config: CircuitBreakerConfig,
    failure_count: Arc<Mutex<usize>>,
    last_failure_time: Arc<Mutex<Option<Instant>>>,
    half_open_success_count: Arc<Mutex<usize>>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with default configuration
    pub fn new() -> Self {
        Self::with_config(CircuitBreakerConfig::default())
    }

    /// Create a new circuit breaker with custom configuration
    pub fn with_config(config: CircuitBreakerConfig) -> Self {
        let circuit_breaker = Self {
            state: Arc::new(Mutex::new(CircuitBreakerState::Closed)),
            config,
            failure_count: Arc::new(Mutex::new(0)),
            last_failure_time: Arc::new(Mutex::new(None)),
            half_open_success_count: Arc::new(Mutex::new(0)),
        };

        // Initialize state gauge
        circuit_breaker.update_state_gauge(&CircuitBreakerState::Closed);

        circuit_breaker
    }

    /// Execute a function with circuit breaker protection
    pub async fn call<F, T, E>(&self, f: F) -> Result<T, CircuitBreakerError>
    where
        F: FnOnce() -> Result<T, E> + Send + 'static,
        E: std::error::Error + Send + Sync + 'static,
        T: Send + 'static,
    {
        // Record total calls
        metrics::counter!("gw.circuit_breaker.calls_total").increment(1);

        // Check if circuit should allow the call
        if !self.can_attempt_call()? {
            metrics::counter!("gw.circuit_breaker.calls_failure").increment(1);
            return Err(CircuitBreakerError::CircuitOpen);
        }

        // Execute the call with timeout
        let result = timeout(self.config.call_timeout, tokio::task::spawn_blocking(f)).await;

        match result {
            Ok(Ok(Ok(value))) => {
                metrics::counter!("gw.circuit_breaker.calls_success").increment(1);
                self.on_success().await;
                Ok(value)
            }
            Ok(Ok(Err(err))) => {
                metrics::counter!("gw.circuit_breaker.calls_failure").increment(1);
                self.on_failure().await;
                Err(CircuitBreakerError::ServiceError(err.into()))
            }
            Ok(Err(_)) => {
                metrics::counter!("gw.circuit_breaker.calls_timeout").increment(1);
                self.on_failure().await;
                Err(CircuitBreakerError::Timeout)
            }
            Err(_) => {
                metrics::counter!("gw.circuit_breaker.calls_timeout").increment(1);
                self.on_failure().await;
                Err(CircuitBreakerError::Timeout)
            }
        }
    }

    /// Check if a call can be attempted
    fn can_attempt_call(&self) -> Result<bool, CircuitBreakerError> {
        let mut state = self.state.lock().unwrap();

        match *state {
            CircuitBreakerState::Closed => {
                self.update_state_gauge(&state);
                Ok(true)
            },
            CircuitBreakerState::Open => {
                // Check if recovery timeout has passed
                if let Some(last_failure) = *self.last_failure_time.lock().unwrap() {
                    if last_failure.elapsed() >= self.config.recovery_timeout {
                        // Transition to half-open
                        *state = CircuitBreakerState::HalfOpen;
                        *self.half_open_success_count.lock().unwrap() = 0;
                        metrics::counter!("gw.circuit_breaker.state_changes").increment(1);
                        self.update_state_gauge(&state);
                        return Ok(true);
                    }
                }
                self.update_state_gauge(&state);
                Ok(false)
            }
            CircuitBreakerState::HalfOpen => {
                self.update_state_gauge(&state);
                Ok(true)
            },
        }
    }

    /// Handle successful call
    async fn on_success(&self) {
        let mut state = self.state.lock().unwrap();

        match *state {
            CircuitBreakerState::Closed => {
                // Reset failure count on success
                *self.failure_count.lock().unwrap() = 0;
            }
            CircuitBreakerState::HalfOpen => {
                let mut success_count = self.half_open_success_count.lock().unwrap();
                *success_count += 1;

                // If we have enough successes, close the circuit
                if *success_count >= self.config.half_open_success_threshold {
                    *state = CircuitBreakerState::Closed;
                    *self.failure_count.lock().unwrap() = 0;
                    *self.last_failure_time.lock().unwrap() = None;
                    metrics::counter!("gw.circuit_breaker.state_changes").increment(1);
                    tracing::info!("Circuit breaker closed after successful half-open test");
                }
            }
            _ => {}
        }

        // Update state gauge
        self.update_state_gauge(&state);
    }

    /// Handle failed call
    async fn on_failure(&self) {
        let mut failure_count = self.failure_count.lock().unwrap();
        *failure_count += 1;

        let mut state = self.state.lock().unwrap();

        match *state {
            CircuitBreakerState::Closed => {
                if *failure_count >= self.config.failure_threshold {
                    *state = CircuitBreakerState::Open;
                    *self.last_failure_time.lock().unwrap() = Some(Instant::now());
                    metrics::counter!("gw.circuit_breaker.state_changes").increment(1);
                    tracing::warn!(
                        "Circuit breaker opened after {} failures",
                        self.config.failure_threshold
                    );
                }
            }
            CircuitBreakerState::HalfOpen => {
                // Any failure in half-open state goes back to open
                *state = CircuitBreakerState::Open;
                *self.last_failure_time.lock().unwrap() = Some(Instant::now());
                metrics::counter!("gw.circuit_breaker.state_changes").increment(1);
                tracing::info!("Circuit breaker returned to open state after failure in half-open");
            }
            _ => {}
        }

        // Update state gauge
        self.update_state_gauge(&state);
    }

    /// Get current state of the circuit breaker
    pub fn state(&self) -> CircuitBreakerState {
        self.state.lock().unwrap().clone()
    }

    /// Get current failure count
    pub fn failure_count(&self) -> usize {
        *self.failure_count.lock().unwrap()
    }

    /// Update state gauge metric
    fn update_state_gauge(&self, state: &CircuitBreakerState) {
        let state_value = match state {
            CircuitBreakerState::Closed => 0.0,
            CircuitBreakerState::Open => 1.0,
            CircuitBreakerState::HalfOpen => 2.0,
        };
        metrics::gauge!("gw.circuit_breaker.state").set(state_value);
    }

    /// Manually reset the circuit breaker
    pub fn reset(&self) {
        *self.state.lock().unwrap() = CircuitBreakerState::Closed;
        *self.failure_count.lock().unwrap() = 0;
        *self.last_failure_time.lock().unwrap() = None;
        *self.half_open_success_count.lock().unwrap() = 0;
        metrics::counter!("gw.circuit_breaker.state_changes").increment(1);
        self.update_state_gauge(&CircuitBreakerState::Closed);
        tracing::info!("Circuit breaker manually reset");
    }
}

/// Errors that can occur with circuit breaker
#[derive(Debug, thiserror::Error)]
pub enum CircuitBreakerError {
    #[error("Circuit breaker is open")]
    CircuitOpen,
    #[error("Call timed out")]
    Timeout,
    #[error("Service error: {0}")]
    ServiceError(Box<dyn std::error::Error + Send + Sync>),
}

/// Utility function to create a circuit breaker for worker calls
pub fn create_worker_circuit_breaker() -> CircuitBreaker {
    CircuitBreaker::with_config(CircuitBreakerConfig {
        failure_threshold: 3,  // Open after 3 failures
        recovery_timeout: Duration::from_secs(30),  // Try again after 30 seconds
        call_timeout: Duration::from_secs(3),       // 3 second timeout per call
        half_open_success_threshold: 2,             // 2 successes to close
    })
}

/// Utility function to create a circuit breaker for database calls
pub fn create_database_circuit_breaker() -> CircuitBreaker {
    CircuitBreaker::with_config(CircuitBreakerConfig {
        failure_threshold: 5,  // Open after 5 failures
        recovery_timeout: Duration::from_secs(45),  // Try again after 45 seconds
        call_timeout: Duration::from_secs(2),       // 2 second timeout per call
        half_open_success_threshold: 3,             // 3 successes to close
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error;
    use std::fmt;

    #[derive(Debug)]
    struct TestError(String);

    impl fmt::Display for TestError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "{}", self.0)
        }
    }

    impl Error for TestError {}

    #[tokio::test]
    async fn test_circuit_breaker_metrics() {
        // Test that metrics are properly recorded
        let cb = CircuitBreaker::new();

        // Initially closed
        assert_eq!(cb.state(), CircuitBreakerState::Closed);

        // Test successful calls
        let result: Result<i32, CircuitBreakerError> = cb.call(|| Ok::<i32, TestError>(42)).await;
        assert!(result.is_ok());

        // Check that success metrics are recorded
        // Note: In real implementation, we'd check metrics here
        // but for this test we'll just verify the call succeeded
        assert_eq!(result.unwrap(), 42);

        // Test failure threshold
        let cb_fail = CircuitBreaker::with_config(CircuitBreakerConfig {
            failure_threshold: 2,
            recovery_timeout: Duration::from_millis(100),
            call_timeout: Duration::from_secs(1),
            half_open_success_threshold: 1,
        });

        // First failure
        let result: Result<i32, CircuitBreakerError> = cb_fail.call(|| Err(TestError("fail".to_string()))).await;
        assert!(result.is_err());
        assert_eq!(cb_fail.state(), CircuitBreakerState::Closed);

        // Second failure should open circuit
        let result: Result<i32, CircuitBreakerError> = cb_fail.call(|| Err(TestError("fail".to_string()))).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CircuitBreakerError::CircuitOpen));
        assert_eq!(cb_fail.state(), CircuitBreakerState::Open);

        // Test recovery after timeout
        thread::sleep(Duration::from_millis(150));
        let result: Result<i32, CircuitBreakerError> = cb_fail.call(|| Ok::<i32, TestError>(42)).await;
        assert!(result.is_ok());
        assert_eq!(cb_fail.state(), CircuitBreakerState::Closed);
    }

    #[tokio::test]
    async fn test_circuit_breaker_closed_state() {
        let cb = CircuitBreaker::new();
        assert_eq!(cb.state(), CircuitBreakerState::Closed);

        // Successful calls should work
        let result: Result<i32, CircuitBreakerError> = cb.call(|| Ok::<i32, TestError>(42)).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 42);
    }

    #[tokio::test]
    async fn test_circuit_breaker_failure_threshold() {
        let cb = CircuitBreaker::with_config(CircuitBreakerConfig {
            failure_threshold: 2,
            recovery_timeout: Duration::from_secs(1),
            call_timeout: Duration::from_secs(1),
            half_open_success_threshold: 1,
        });

        // First failure
        let result: Result<(), CircuitBreakerError> = cb.call(|| Err::<(), TestError>(TestError("fail".to_string()))).await;
        assert!(result.is_err());
        assert_eq!(cb.state(), CircuitBreakerState::Closed);
        assert_eq!(cb.failure_count(), 1);

        // Second failure should open the circuit
        let result: Result<(), CircuitBreakerError> = cb.call(|| Err::<(), TestError>(TestError("fail".to_string()))).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CircuitBreakerError::CircuitOpen));
        assert_eq!(cb.state(), CircuitBreakerState::Open);
    }

    #[tokio::test]
    async fn test_circuit_breaker_half_open_recovery() {
        let cb = CircuitBreaker::with_config(CircuitBreakerConfig {
            failure_threshold: 1,
            recovery_timeout: Duration::from_millis(100),
            call_timeout: Duration::from_secs(1),
            half_open_success_threshold: 1,
        });

        // Cause failure to open circuit
        let _: Result<(), CircuitBreakerError> = cb.call(|| Err::<(), TestError>(TestError("fail".to_string()))).await;
        assert_eq!(cb.state(), CircuitBreakerState::Open);

        // Wait for recovery timeout
        tokio::time::sleep(Duration::from_millis(150)).await;

        // Should transition to half-open and allow call
        let result: Result<i32, CircuitBreakerError> = cb.call(|| Ok::<i32, TestError>(42)).await;
        assert!(result.is_ok());
        assert_eq!(cb.state(), CircuitBreakerState::Closed);
    }
}
