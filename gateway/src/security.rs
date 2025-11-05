use axum::{
    extract::State,
    http::{header::AUTHORIZATION, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use hyper::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration as StdDuration, Instant};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};

use crate::auth::{Claims, AuthService};
use common_net::database::DatabasePool;

/// Security configuration for the gateway
#[derive(Debug, Clone)]
pub struct SecurityConfig {
    /// Enable rate limiting per user
    pub enable_per_user_rate_limiting: bool,
    /// Enable brute force protection
    pub enable_brute_force_protection: bool,
    /// Enable input validation
    pub enable_input_validation: bool,
    /// Enable CORS protection
    pub enable_cors: bool,
    /// Enable security headers
    pub enable_security_headers: bool,
    /// Maximum login attempts before lockout
    pub max_login_attempts: u32,
    /// Lockout duration in minutes
    pub lockout_duration_minutes: u32,
    /// Enable token rotation
    pub enable_token_rotation: bool,
    /// Enable audit logging
    pub enable_audit_logging: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            enable_per_user_rate_limiting: true,
            enable_brute_force_protection: true,
            enable_input_validation: true,
            enable_cors: true,
            enable_security_headers: true,
            max_login_attempts: 5,
            lockout_duration_minutes: 15,
            enable_token_rotation: true,
            enable_audit_logging: true,
        }
    }
}

/// Brute force protection state
#[derive(Debug)]
struct BruteForceState {
    attempts: HashMap<String, Vec<Instant>>,
    lockouts: HashMap<String, Instant>,
}

impl BruteForceState {
    fn new() -> Self {
        Self {
            attempts: HashMap::new(),
            lockouts: HashMap::new(),
        }
    }

    fn record_failed_attempt(&mut self, key: String) {
        let now = Instant::now();
        self.attempts.entry(key).or_insert_with(Vec::new).push(now);

        // Clean up old attempts (older than 1 hour)
        let one_hour_ago = now - StdDuration::from_secs(3600);
        self.attempts.retain(|_, attempts| {
            attempts.retain(|&attempt_time| attempt_time > one_hour_ago);
            !attempts.is_empty()
        });
    }

    fn is_locked_out(&self, key: &str, max_attempts: u32, window: StdDuration) -> bool {
        // Check if currently locked out
        if let Some(&lockout_time) = self.lockouts.get(key) {
            if lockout_time.elapsed() < StdDuration::from_secs(900) { // 15 minutes default
                return true;
            } else {
                // Remove expired lockout
                return false;
            }
        }

        // Check recent attempts
        if let Some(attempts) = self.attempts.get(key) {
            let window_start = Instant::now() - window;
            let recent_attempts = attempts.iter().filter(|&&time| time > window_start).count();
            recent_attempts >= max_attempts as usize
        } else {
            false
        }
    }

    fn lock_out(&mut self, key: String, duration: StdDuration) {
        let lockout_time = Instant::now() + duration;
        self.lockouts.insert(key.clone(), lockout_time);
        info!("Locked out {} for {:?}", key, duration);
    }

    fn clear_attempts(&mut self, key: String) {
        self.attempts.remove(&key);
        self.lockouts.remove(&key);
    }
}

/// Security middleware state
#[derive(Debug, Clone)]
pub struct SecurityState {
    config: SecurityConfig,
    brute_force_state: Arc<RwLock<BruteForceState>>,
    auth_service: AuthService,
}

impl SecurityState {
    pub fn new(config: SecurityConfig) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            config,
            brute_force_state: Arc::new(RwLock::new(BruteForceState::new())),
            auth_service: AuthService::new()?,
        })
    }

    pub fn with_auth_service(mut self, auth_service: AuthService) -> Self {
        self.auth_service = auth_service;
        self
    }
}

/// Enhanced JWT claims with security features
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecureClaims {
    pub sub: String,      // Subject (user ID)
    pub username: String,
    pub email: String,
    pub role: String,
    pub exp: i64,         // Expiration time
    pub iat: i64,         // Issued at
    pub iss: String,      // Issuer
    pub jti: String,      // JWT ID for token blacklisting
    pub session_id: String, // Session tracking
    pub ip_address: Option<String>, // IP address for additional security
    pub user_agent: Option<String>, // User agent tracking
}

impl From<Claims> for SecureClaims {
    fn from(claims: Claims) -> Self {
        Self {
            sub: claims.sub,
            username: claims.username,
            email: claims.email,
            role: claims.role,
            exp: claims.exp,
            iat: claims.iat,
            iss: claims.iss,
            jti: format!("token_{}", claims.iat),
            session_id: format!("session_{}", claims.iat),
            ip_address: None,
            user_agent: None,
        }
    }
}

/// Input validation middleware
pub async fn validate_input_middleware<B>(
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> Response
where
    B: Send + 'static,
{
    // Extract and validate request body for POST/PUT requests
    if request.method().as_str() == "POST" || request.method().as_str() == "PUT" {
        // For now, we'll implement basic validation
        // In production, you'd want to use a proper validation library
        // like validator crate or serde_valid

        // Check content length
        if let Some(content_length) = request.headers().get("content-length") {
            if let Ok(length) = content_length.to_str().unwrap_or("0").parse::<usize>() {
                if length > 1024 * 1024 { // 1MB limit
                    return (
                        StatusCode::PAYLOAD_TOO_LARGE,
                        Json(json!({
                            "error": "Request payload too large"
                        }))
                    ).into_response();
                }
            }
        }

        // Check for suspicious patterns in headers
        for (name, value) in request.headers().iter() {
            let name_str = name.as_str().to_lowercase();
            let value_str = value.to_str().unwrap_or("");

            // Check for SQL injection patterns
            if contains_suspicious_pattern(value_str) {
                warn!("Suspicious request pattern detected in header {}: {}", name_str, value_str);
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": "Invalid request format"
                    }))
                ).into_response();
            }
        }
    }

    next.run(request).await
}

/// Brute force protection middleware
pub async fn brute_force_middleware<B>(
    State(state): State<SecurityState>,
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> Response
where
    B: Send + 'static,
{
    if !state.config.enable_brute_force_protection {
        return next.run(request).await;
    }

    // Extract client IP for tracking
    let client_ip = extract_client_ip(&request.headers());
    let key = format!("ip_{}", client_ip);

    // Check if client is locked out
    if state.brute_force_state.read().unwrap().is_locked_out(
        &key,
        state.config.max_login_attempts,
        StdDuration::from_secs(300), // 5 minutes window
    ) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Too many failed attempts. Please try again later.",
                "retry_after": 900 // 15 minutes
            }))
        ).into_response();
    }

    // Check request path to determine if this is a login attempt
    let path = request.uri().path();
    let is_login_attempt = path.contains("/auth/login") || path.contains("/auth/register");

    if is_login_attempt {
        // For login attempts, we'll record the attempt in the response
        // This allows us to track failures after authentication
        let mut request = request;
        request.extensions_mut().insert(BruteForceTracking { client_key: key });
        return next.run(request).await;
    }

    next.run(request).await
}

/// Extract client IP address from request headers
fn extract_client_ip(headers: &HeaderMap) -> String {
    // Check X-Forwarded-For first (for proxies/load balancers)
    if let Some(xff) = headers.get("x-forwarded-for") {
        if let Ok(xff_str) = xff.to_str() {
            if let Some(first_ip) = xff_str.split(',').next() {
                return first_ip.trim().to_string();
            }
        }
    }

    // Check X-Real-IP (nginx)
    if let Some(xri) = headers.get("x-real-ip") {
        if let Ok(xri_str) = xri.to_str() {
            return xri_str.to_string();
        }
    }

    // Fallback to remote address (this would need to be extracted from connection info)
    "unknown".to_string()
}

/// Check for suspicious patterns in input
fn contains_suspicious_pattern(input: &str) -> bool {
    let suspicious_patterns = [
        "';",
        "'; --",
        "/*",
        "*/",
        "xp_",
        "sp_",
        "UNION SELECT",
        "DROP TABLE",
        "ALTER TABLE",
        "<script",
        "javascript:",
        "vbscript:",
        "onload=",
        "onerror=",
    ];

    let input_upper = input.to_uppercase();
    suspicious_patterns.iter().any(|pattern| input_upper.contains(&pattern.to_uppercase()))
}

/// Enhanced authentication middleware with security features
pub async fn secure_auth_middleware<B>(
    State(state): State<SecurityState>,
    State(db_pool): State<DatabasePool>,
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> Response
where
    B: Send + 'static,
{
    // Extract Authorization header
    let auth_header = request.headers().get(AUTHORIZATION);

    match auth_header {
        Some(auth_value) => {
            let auth_str = match auth_value.to_str() {
                Ok(s) => s,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": "Invalid authorization header format"
                        }))
                    ).into_response();
                }
            };

            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..]; // Remove "Bearer " prefix

                // Validate JWT token with enhanced security checks
                match state.auth_service.validate_token_with_db(token, &db_pool).await {
                    Ok(claims) => {
                        // Additional security validations
                        if let Err(e) = perform_additional_security_checks(&claims, &request.headers()).await {
                            warn!("Additional security check failed: {}", e);
                            return (
                                StatusCode::UNAUTHORIZED,
                                Json(json!({
                                    "error": "Security validation failed"
                                }))
                            ).into_response();
                        }

                        // Token is valid, add enhanced claims to request extensions
                        let mut request = request;
                        let secure_claims = SecureClaims::from(claims);
                        request.extensions_mut().insert(secure_claims.clone());

                        // Log successful authentication for audit
                        if state.config.enable_audit_logging {
                            info!("Successful authentication for user: {}", secure_claims.username);
                        }

                        next.run(request).await
                    }
                    Err(e) => {
                        // Record failed authentication attempt for brute force protection
                        if let Some(tracking) = request.extensions().get::<BruteForceTracking>() {
                            let mut brute_force = state.brute_force_state.write().unwrap();
                            brute_force.record_failed_attempt(tracking.client_key.clone());

                            // Check if we should lock out this client
                            if brute_force.is_locked_out(
                                &tracking.client_key,
                                state.config.max_login_attempts,
                                StdDuration::from_secs(300),
                            ) {
                                brute_force.lock_out(
                                    tracking.client_key.clone(),
                                    StdDuration::from_secs(state.config.lockout_duration_minutes as u64 * 60),
                                );
                            }
                        }

                        let error_message = if e.to_string().contains("revoked") {
                            "Token has been revoked"
                        } else if e.to_string().contains("expired") {
                            "Token has expired"
                        } else {
                            "Invalid token"
                        };

                        (
                            StatusCode::UNAUTHORIZED,
                            Json(json!({
                                "error": error_message
                            }))
                        ).into_response()
                    }
                }
            } else {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": "Invalid authorization format. Expected 'Bearer <token>'"
                    }))
                ).into_response()
            }
        }
        None => {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Authorization header required"
                }))
            ).into_response()
        }
    }
}

/// Additional security checks for authenticated requests
async fn perform_additional_security_checks(
    claims: &Claims,
    headers: &HeaderMap,
) -> Result<(), String> {
    // Check token age (shouldn't be too old)
    let now = Utc::now().timestamp();
    let token_age_hours = (now - claims.iat) / 3600;

    if token_age_hours > 24 {
        return Err("Token is too old".to_string());
    }

    // Check for suspicious user agent changes
    if let Some(user_agent) = headers.get("user-agent") {
        if let Ok(ua_str) = user_agent.to_str() {
            // This is a basic check - in production you'd want more sophisticated analysis
            if ua_str.len() < 10 || ua_str.contains("bot") || ua_str.contains("crawler") {
                return Err("Suspicious user agent".to_string());
            }
        }
    }

    Ok(())
}

/// CORS configuration for security
pub fn create_cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any) // In production, specify exact origins
        .allow_methods(Any)
        .allow_headers(Any)
        .max_age(StdDuration::from_secs(3600))
}

/// Security headers middleware
pub async fn security_headers_middleware<B>(
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> Response
where
    B: Send + 'static,
{
    let mut response = next.run(request).await;

    // Add security headers
    let headers = response.headers_mut();

    // Prevent clickjacking
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());

    // Prevent MIME type sniffing
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());

    // XSS protection
    headers.insert("X-XSS-Protection", "1; mode=block".parse().unwrap());

    // Referrer policy
    headers.insert("Referrer-Policy", "strict-origin-when-cross-origin".parse().unwrap());

    // Content Security Policy (basic)
    headers.insert(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'".parse().unwrap(),
    );

    // Strict Transport Security (only for HTTPS)
    // headers.insert("Strict-Transport-Security", "max-age=31536000; includeSubDomains".parse().unwrap());

    response
}

/// Brute force tracking for request extensions
#[derive(Debug, Clone)]
pub struct BruteForceTracking {
    pub client_key: String,
}

/// Utility function to check if request should be rate limited per user
pub async fn should_rate_limit_user(
    _user_id: &str,
    _endpoint: &str,
    state: &SecurityState,
) -> bool {
    if !state.config.enable_per_user_rate_limiting {
        return false;
    }

    // This is a simplified implementation
    // In production, you'd want to use Redis or another distributed store
    // to track per-user rate limits across multiple server instances

    // For now, we'll use a simple in-memory approach
    // In a real implementation, you'd check Redis counters here

    false // Placeholder - implement actual rate limiting logic
}

// Note: Using AuthService from auth module instead of duplicating functionality

/// Request validation middleware using validator crate
pub async fn validate_request_middleware<B>(
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> Response
where
    B: Send + 'static,
{
    // Extract request body for validation
    // This is a simplified implementation
    // In production, you'd want to deserialize the body and validate it

    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_suspicious_pattern_detection() {
        assert!(contains_suspicious_pattern("'; DROP TABLE users; --"));
        assert!(contains_suspicious_pattern("UNION SELECT * FROM passwords"));
        assert!(contains_suspicious_pattern("<script>alert('xss')</script>"));
        assert!(!contains_suspicious_pattern("normal input"));
    }

    #[test]
    fn test_brute_force_state() {
        let mut state = BruteForceState::new();

        // Record some failed attempts
        state.record_failed_attempt("test_ip".to_string());
        state.record_failed_attempt("test_ip".to_string());

        // Should not be locked out yet
        assert!(!state.is_locked_out("test_ip", 3, StdDuration::from_secs(60)));

        // Third attempt should trigger lockout
        state.record_failed_attempt("test_ip".to_string());
        assert!(state.is_locked_out("test_ip", 3, StdDuration::from_secs(60)));
    }

    #[tokio::test]
    async fn test_security_claims_conversion() {
        let claims = Claims {
            sub: "user123".to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            role: "user".to_string(),
            exp: 1234567890,
            iat: 1234567890,
            iss: "test".to_string(),
        };

        let secure_claims = SecureClaims::from(claims);
        assert_eq!(secure_claims.sub, "user123");
        assert_eq!(secure_claims.username, "testuser");
        assert!(secure_claims.jti.starts_with("token_"));
        assert!(secure_claims.session_id.starts_with("session_"));
    }
}
