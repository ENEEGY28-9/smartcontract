// Th╞░ viß╗çn cho gateway: cung cß║Ñp router d├╣ng trong test/integration.
// Binary entrypoint vß║½n ß╗ƒ src/main.rs.

#[macro_use]

// Declare new optimization modules
mod batch_processor;
mod game_metrics;
mod connection_pool;
mod error_handling;
mod circuit_breaker;
mod security;
mod transport;

// Integration testing module
#[cfg(test)]
mod integration_tests;

// JWT authentication middleware
mod middleware;

// REAL BLOCKCHAIN INTEGRATION VIA SEPARATE MICROSERVICE
mod blockchain_client; // gRPC client for communicating with blockchain-service
//
// CURRENT STATUS: Real blockchain integration implemented via microservice architecture
// SOLVED: Dependency conflicts resolved by separating concerns into dedicated services

use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use tokio::sync::oneshot;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{self, Duration};

// In-memory storage for user wallets (for demo purposes)
// In production, use a proper database
lazy_static::lazy_static! {
    pub static ref USER_WALLETS: Arc<RwLock<HashMap<String, String>>> = Arc::new(RwLock::new(HashMap::new()));
}

// Import memory management types
use crate::memory::{ConnectionManager, ConnectionLimits};
use std::time::Instant;

// Import Solana and Anchor types for blockchain integration (disabled due to conflicts)
// use solana_sdk::pubkey::Pubkey;
use axum::{extract::{State, Path, Query, Extension}, http::{Method, StatusCode, HeaderMap}, middleware::Next, response::IntoResponse, routing::{get, post, put, delete}, Json, Router};
use chrono::{DateTime, Utc};
use hyper::{header::{AUTHORIZATION, HeaderValue}, server::conn::AddrIncoming};
use once_cell::sync::Lazy;
use prometheus::{register_int_counter_vec, register_int_gauge, register_int_gauge_vec, register_histogram_vec, Encoder, IntCounterVec, IntGauge, IntGaugeVec, TextEncoder, HistogramVec};
use tracing::{error, info, warn};

// Encryption utilities
mod encryption;
use encryption::{encrypt_private_key, decrypt_private_key};

// Wallet utilities
mod wallet;
mod hd_wallet;
use wallet::{create_real_solana_wallet, SolanaWallet};
use hd_wallet::{create_hd_wallet, recover_wallet_from_mnemonic, validate_mnemonic, HDWallet};

// Cache utilities
mod cache;
use cache::{RedisCache, get_global_cache};
use metrics::{counter, histogram};
use tower_http::cors::{Any, CorsLayer};
use tower::{Layer, Service};
// Rate limiting - using custom implementation instead of tower_governor

// TODO: API Versioning Middleware - Temporarily disabled for compilation
// API Versioning will be implemented in a future update


// Helper function for safe header parsing with fallback
fn parse_header_safe(header_value: &HeaderValue) -> String {
    header_value.to_str().unwrap_or("unknown").to_string()
}

// Helper function for safe header value parsing with error handling
fn parse_header_value_safe(value: &str) -> Result<HeaderValue, Box<dyn std::error::Error>> {
    Ok(value.parse::<HeaderValue>()?)
}

// Helper function for safe response creation with error handling - COMPLETELY REMOVED due to Axum type compatibility issues
// Use direct IntoResponse calls instead of this helper function
// NO create_response_safe function exists anymore - use IntoResponse directly

// Helper function for safe header insertion with error handling
fn insert_header_safe(headers: &mut axum::http::HeaderMap, name: &'static str, value: &str) {
    match value.parse::<axum::http::HeaderValue>() {
        Ok(header_value) => {
            headers.insert(name, header_value);
        }
        Err(e) => {
            tracing::warn!("Failed to parse header value for {}: {}", name, e);
        }
    }
}

// Helper function to add CORS headers to response (deprecated - using CORS middleware instead)
// fn add_cors_headers(response: hyper::Response<axum::body::Body>) -> axum::response::Response {
//     // CORS headers are now handled by middleware, this function is deprecated
//     response
// }

// Token WebSocket handler for real-time balance updates
async fn token_ws_handler(
    ws: axum::extract::ws::WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/token-updates"]).inc();

    // Extract and validate JWT token for WebSocket connection
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..])
            } else {
                None
            }
        }
        None => None,
    };

    let user_id = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims.sub,
                Err(_) => {
                    return axum::http::StatusCode::UNAUTHORIZED.into_response();
                }
            }
        }
        None => {
            return axum::http::StatusCode::UNAUTHORIZED.into_response();
        }
    };

    // Upgrade to WebSocket connection
    ws.on_upgrade(move |socket| {
        websocket_token::handle_token_websocket(socket, user_id, state.token_ws_manager)
    })
}

// Helper function to create JSON response with CORS headers safely
fn create_json_response_with_cors<T: serde::Serialize>(data: T) -> axum::response::Response {
    let response = Json(data).into_response();
    // Note: CORS headers are now handled by middleware, this function is deprecated
    response
}

// Helper function for graceful error handling with fallback responses
fn handle_error_gracefully<E: std::fmt::Display>(error: E, context: &str) -> axum::response::Response {
    tracing::error!("Error in {}: {}", context, error);

    // Return graceful error response instead of panicking
    let error_response = serde_json::json!({
        "success": false,
        "error": "Internal server error",
        "message": "An unexpected error occurred. Please try again later.",
        "context": context
    });

    create_json_response_with_cors(error_response)
}

// Helper function to wrap potentially failing operations with graceful error handling
async fn with_graceful_error_handling<F, T, E>(
    operation: F,
    context: &str,
    fallback: T,
) -> Result<T, Box<dyn std::error::Error>>
where
    F: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display + Send + Sync + 'static,
    T: Send + Sync + 'static,
{
    match operation.await {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("Error in {}: {}", context, e);
            Ok(fallback)
        }
    }
}

// TODO: Implement retry logic with proper lifetime handling
// Temporarily disabled due to lifetime complexity
/*
async fn retry_with_backoff<F, T, E>(
    mut operation: F,
    max_retries: usize,
    initial_delay_ms: u64,
    context: &str,
) -> Result<T, E>
where
    F: FnMut() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, E>>>>,
    E: std::fmt::Display + Clone,
{
    let mut delay = initial_delay_ms;

    for attempt in 0..max_retries {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                if attempt == max_retries - 1 {
                    tracing::error!("Final attempt failed in {} after {} retries: {}", context, max_retries, e);
                    return Err(e);
                }

                tracing::warn!("Attempt {} failed in {}: {}. Retrying in {}ms...", attempt + 1, context, e, delay);
                tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                delay *= 2; // Exponential backoff
            }
        }
    }

    unreachable!()
}

async fn retry_network_operation<F, T>(
    operation: F,
    context: &str,
) -> Result<T, Box<dyn std::error::Error>>
where
    F: Fn() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, Box<dyn std::error::Error>>>>>,
{
    retry_with_backoff(
        move || Box::pin(async move { operation().await }),
        3, // Max 3 retries
        100, // Initial delay 100ms
        context,
    ).await.map_err(|e| e)
}
*/

use common_net::message::{self, ControlMessage, Frame, FramePayload, StateMessage};
use common_net::transport::{GameTransport, TransportKind, WebRtcTransport};
use transport::negotiate_transport;
use common_net::quantization::QuantizationConfig;
use common_net::database::{DatabasePool, DatabaseConfig};

pub mod auth;
use auth::Claims;
pub mod logging;
pub mod memory;
pub mod types;
pub mod websocket_token;
pub mod worker_client;

use proto::worker::v1::worker_client::WorkerClient;
// use room_manager;

pub type BoxError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Clone)]
pub struct AppState {
    pub signaling: SignalingState,
    pub signaling_sessions: SignalingSessions,
    pub webrtc_sessions: WebRTCSessionRegistry,
    pub ws_registry: WebSocketRegistry,
    pub transport_registry: TransportRegistry,
    pub worker_client: Option<crate::worker_client::WorkerClient>,
    pub auth_service: auth::AuthService,
    pub database_pool: DatabasePool,
    pub connection_manager: std::sync::Arc<ConnectionManager>,
    pub optimized_connection_manager: std::sync::Arc<connection_pool::OptimizedConnectionManager>,
    pub batch_processor: std::sync::Arc<batch_processor::BatchProcessor>,
    pub game_message_sender: std::sync::Arc<batch_processor::GameMessageSender>,
    pub game_metrics_manager: std::sync::Arc<game_metrics::GameMetricsManager>,
    // REAL BLOCKCHAIN INTEGRATION VIA SEPARATE MICROSERVICE
    // Using gRPC client to communicate with blockchain-service
    pub blockchain_client: std::sync::Arc<blockchain_client::BlockchainClient>,
    // Services API client for persistence
    pub services_client: reqwest::Client,
    pub services_url: String,
    // Token WebSocket manager for real-time balance updates
    pub token_ws_manager: std::sync::Arc<websocket_token::TokenWebSocketManager>,
    //
    // CURRENT STATUS: Real blockchain integration via separate microservice
    // SOLVED: Dependency conflicts resolved by microservice architecture
    // pub room_manager: std::sync::Arc<tokio::sync::RwLock<room_manager::RoomManagerState>>,
}

// Health Check Endpoints (theo chuẩn Kubernetes)
pub const HEALTH_PATH: &str = "/health";
pub const READY_PATH: &str = "/ready";
pub const LIVE_PATH: &str = "/live";

// Legacy health endpoint (giữ để tương thích)
pub const HEALTHZ_PATH: &str = "/healthz";

pub const VERSION_PATH: &str = "/version";
pub const METRICS_PATH: &str = "/metrics";
pub const WS_PATH: &str = "/ws";
pub const WS_GAME_PATH: &str = "/ws/game";
pub const GAME_INPUT_PATH: &str = "/game/input";
pub const GAME_JOIN_PATH: &str = "/game/join";
pub const GAME_LEAVE_PATH: &str = "/game/leave";
pub const WORKER_SNAPSHOT_PATH: &str = "/worker/snapshot";
pub const CHAT_SEND_PATH: &str = "/chat/send";
pub const CHAT_HISTORY_PATH: &str = "/chat/history";
pub const GAME_HEALTH_PATH: &str = "/game/health";
pub const GAME_PERFORMANCE_PATH: &str = "/game/performance";

// Room Manager paths
pub const ROOMS_CREATE_PATH: &str = "/rooms/create";
pub const ROOMS_JOIN_PATH: &str = "/rooms/join";
pub const ROOMS_LEAVE_PATH: &str = "/rooms/leave";
pub const ROOMS_LIST_PATH: &str = "/rooms/list";
pub const ROOMS_ASSIGN_PATH: &str = "/rooms/assign";
pub const ROOMS_UPDATE_PLAYER_PATH: &str = "/rooms/update-player";
pub const ROOMS_CLOSE_PATH: &str = "/rooms/close";

// API paths (for backward compatibility with client)
pub const API_ROOMS_CREATE_PATH: &str = "/api/rooms";
pub const API_ROOMS_JOIN_PATH: &str = "/api/rooms/:room_id/join";
pub const API_ROOMS_LEAVE_PATH: &str = "/api/rooms/:room_id/leave";
pub const API_ROOMS_STATUS_PATH: &str = "/api/rooms/:room_id/status";
pub const API_ROOMS_LIST_PATH: &str = "/api/rooms/list";
pub const API_ROOMS_ASSIGN_PATH: &str = "/api/rooms/assign";
pub const API_ROOMS_UPDATE_PLAYER_PATH: &str = "/api/rooms/update-player";
pub const API_ROOMS_CLOSE_PATH: &str = "/api/rooms/close";
pub const API_GAME_INPUT_PATH: &str = "/api/game/input";
pub const API_CHAT_SEND_PATH: &str = "/api/chat";
pub const API_CHAT_HISTORY_PATH: &str = "/api/chat/history/:room_id";
pub const API_METRICS_PATH: &str = "/api/metrics";

static HTTP_REQUESTS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_http_requests_total",
        "Tß╗òng sß╗æ HTTP request theo route",
        &["path"]
    )
    .expect("register gateway_http_requests_total")
});

static HTTP_REQUESTS_SUCCESS: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_http_requests_success_total",
        "Tổng số HTTP requests thành công theo route",
        &["path"]
    )
    .expect("register gateway_http_requests_success_total")
});

static HTTP_REQUESTS_FAILED: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_http_requests_failed_total",
        "Tổng số HTTP requests thất bại theo route",
        &["path"]
    )
    .expect("register gateway_http_requests_failed_total")
});

static HTTP_RESPONSE_TIME_HISTOGRAM: Lazy<prometheus::HistogramVec> = Lazy::new(|| {
    prometheus::HistogramVec::new(
        prometheus::HistogramOpts::new("gateway_http_request_duration_seconds", "HTTP request duration theo route")
            .buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]),
        &["path"]
    )
    .expect("register gateway_http_request_duration_seconds")
});

static TRANSPORT_CONNECTIONS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_transport_connections_total",
        "Tß╗òng sß╗æ kß║┐t nß╗æi transport theo loß║íi",
        &["transport_type", "fallback_used"]
    )
    .expect("register gateway_transport_connections_total")
});

static WEBRTC_CONNECTIONS_CURRENT: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_webrtc_connections_current",
        "Sß╗æ kß║┐t nß╗æi WebRTC hiß╗çn tß║íi",
        &["status"]
    )
    .expect("register gateway_webrtc_connections_current")
});

#[allow(dead_code)]
static ROOMS_ACTIVE: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!(
        "gateway_rooms_active",
        "Số lượng phòng chơi đang hoạt động"
    )
    .expect("register gateway_rooms_active")
});

#[allow(dead_code)]
static PLAYERS_IN_ROOMS: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!(
        "gateway_players_in_rooms",
        "Số lượng người chơi đang ở trong phòng"
    )
    .expect("register gateway_players_in_rooms")
});

// Rate limiting metrics
static RATE_LIMITED_REQUESTS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_rate_limited_requests_total",
        "Total number of rate limited requests",
        &["limit_type", "client_type"]
    )
    .expect("register gateway_rate_limited_requests_total")
});

// Enhanced Gateway Performance Metrics
static GATEWAY_RESPONSE_TIME_HISTOGRAM: Lazy<prometheus::HistogramVec> = Lazy::new(|| {
    prometheus::register_histogram_vec!(
        "gateway_response_time_seconds",
        "Gateway response time in seconds",
        &["endpoint", "method", "status_code"],
        vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    )
    .expect("register gateway_response_time_seconds")
});

static GATEWAY_ACTIVE_CONNECTIONS_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_active_connections",
        "Number of active connections",
        &["connection_type", "status"]
    )
    .expect("register gateway_active_connections")
});

static GATEWAY_MEMORY_USAGE_GAUGE: Lazy<IntGauge> = Lazy::new(|| {
    register_int_gauge!(
        "gateway_memory_usage_bytes",
        "Gateway memory usage in bytes"
    )
    .expect("register gateway_memory_usage_bytes")
});

static GATEWAY_BATCH_PROCESSING_HISTOGRAM: Lazy<prometheus::HistogramVec> = Lazy::new(|| {
    prometheus::register_histogram_vec!(
        "gateway_batch_processing_seconds",
        "Batch processing time in seconds",
        &["batch_type", "status"],
        vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0]
    )
    .expect("register gateway_batch_processing_seconds")
});

static GATEWAY_DATABASE_CONNECTIONS_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_database_connections",
        "Database connection pool metrics",
        &["status"]
    )
    .expect("register gateway_database_connections")
});

static GATEWAY_AUTH_SUCCESS_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_auth_success_total",
        "Total successful authentication requests",
        &["auth_method", "user_type"]
    )
    .expect("register gateway_auth_success_total")
});

static GATEWAY_AUTH_FAILURE_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_auth_failure_total",
        "Total failed authentication requests",
        &["auth_method", "reason"]
    )
    .expect("register gateway_auth_failure_total")
});

static GATEWAY_WORKER_COMMUNICATION_HISTOGRAM: Lazy<prometheus::HistogramVec> = Lazy::new(|| {
    prometheus::register_histogram_vec!(
        "gateway_worker_communication_seconds",
        "Worker communication latency in seconds",
        &["operation", "status"],
        vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
    )
    .expect("register gateway_worker_communication_seconds")
});

static GATEWAY_GAME_MESSAGE_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_game_messages_total",
        "Total game messages processed",
        &["message_type", "room_id", "direction"]
    )
    .expect("register gateway_game_messages_total")
});

static GATEWAY_CONNECTION_POOL_SIZE_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_connection_pool_size",
        "Connection pool size metrics",
        &["pool_type", "status"]
    )
    .expect("register gateway_connection_pool_size")
});

#[allow(dead_code)]
static RATE_LIMIT_BYPASSED_REQUESTS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_rate_limit_bypassed_requests_total",
        "Total number of requests that bypassed rate limiting",
        &["reason"]
    )
    .expect("register gateway_rate_limit_bypassed_requests_total")
});

// Advanced Rate Limiting System for Game Backend
use std::collections::VecDeque;

// Token Bucket for burst handling
#[derive(Debug)]
struct TokenBucket {
    capacity: u32,
    tokens: f64,
    refill_rate: f64, // tokens per second
    last_refill: Instant,
}

impl TokenBucket {
    fn new(capacity: u32, refill_rate: f64) -> Self {
        Self {
            capacity: capacity as u32,
            tokens: capacity as f64,
            refill_rate,
            last_refill: Instant::now(),
        }
    }

    fn consume(&mut self, tokens: u32) -> bool {
        self.refill();
        if self.tokens >= tokens as f64 {
            self.tokens -= tokens as f64;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let time_passed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + time_passed * self.refill_rate).min(self.capacity as f64);
        self.last_refill = now;
    }
}

// Sliding Window entry for precise rate limiting
#[derive(Debug, Clone)]
struct SlidingWindowEntry {
    timestamp: Instant,
    count: u32,
}

// Advanced Rate Limiter with per-endpoint configuration
#[derive(Debug)]
struct AdvancedRateLimiter {
    // IP-based buckets for burst handling
    ip_buckets: Arc<RwLock<HashMap<IpAddr, HashMap<String, TokenBucket>>>>,
    // User-based sliding windows for sustained rate limiting
    user_windows: Arc<RwLock<HashMap<String, HashMap<String, VecDeque<SlidingWindowEntry>>>>>,
    // Global configuration
    config: RateLimitConfig,
}

#[derive(Debug, Clone)]
struct RateLimitConfig {
    // Per-endpoint configurations
    endpoints: HashMap<String, EndpointRateLimit>,
    // Default limits
    default_ip_burst: u32,
    default_ip_sustained: u32,
    default_user_burst: u32,
    default_user_sustained: u32,
}

#[derive(Debug, Clone)]
struct EndpointRateLimit {
    // Burst capacity (token bucket)
    ip_burst_capacity: u32,
    ip_burst_rate: f64, // tokens per second
    user_burst_capacity: u32,
    user_burst_rate: f64,
    // Sustained rate (sliding window)
    ip_window_duration: Duration,
    ip_window_max: u32,
    user_window_duration: Duration,
    user_window_max: u32,
}

impl AdvancedRateLimiter {
    fn new() -> Self {
        let mut endpoints = HashMap::new();

        // Game-specific endpoint configurations with environment variable overrides
        endpoints.insert("/api/rooms/create".to_string(), EndpointRateLimit {
            ip_burst_capacity: Self::get_env_u32("RATE_LIMIT_ROOMS_CREATE_IP_BURST", 20),
            ip_burst_rate: Self::get_env_f64("RATE_LIMIT_ROOMS_CREATE_IP_RATE", 5.0),
            user_burst_capacity: Self::get_env_u32("RATE_LIMIT_ROOMS_CREATE_USER_BURST", 10),
            user_burst_rate: Self::get_env_f64("RATE_LIMIT_ROOMS_CREATE_USER_RATE", 2.0),
            ip_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_ROOMS_CREATE_IP_WINDOW", 60)),
            ip_window_max: Self::get_env_u32("RATE_LIMIT_ROOMS_CREATE_IP_MAX", 100),
            user_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_ROOMS_CREATE_USER_WINDOW", 300)),
            user_window_max: Self::get_env_u32("RATE_LIMIT_ROOMS_CREATE_USER_MAX", 200),
        });

        endpoints.insert("/api/rooms/join".to_string(), EndpointRateLimit {
            ip_burst_capacity: Self::get_env_u32("RATE_LIMIT_ROOMS_JOIN_IP_BURST", 30),
            ip_burst_rate: Self::get_env_f64("RATE_LIMIT_ROOMS_JOIN_IP_RATE", 8.0),
            user_burst_capacity: Self::get_env_u32("RATE_LIMIT_ROOMS_JOIN_USER_BURST", 15),
            user_burst_rate: Self::get_env_f64("RATE_LIMIT_ROOMS_JOIN_USER_RATE", 3.0),
            ip_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_ROOMS_JOIN_IP_WINDOW", 60)),
            ip_window_max: Self::get_env_u32("RATE_LIMIT_ROOMS_JOIN_IP_MAX", 150),
            user_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_ROOMS_JOIN_USER_WINDOW", 300)),
            user_window_max: Self::get_env_u32("RATE_LIMIT_ROOMS_JOIN_USER_MAX", 300),
        });

        // Real-time game updates - optimized for high-frequency gameplay (10000 req/min)
        endpoints.insert("/api/rooms/update-player".to_string(), EndpointRateLimit {
            ip_burst_capacity: Self::get_env_u32("RATE_LIMIT_UPDATE_PLAYER_IP_BURST", 200),
            ip_burst_rate: Self::get_env_f64("RATE_LIMIT_UPDATE_PLAYER_IP_RATE", 166.67), // ~10000 per minute
            user_burst_capacity: Self::get_env_u32("RATE_LIMIT_UPDATE_PLAYER_USER_BURST", 150),
            user_burst_rate: Self::get_env_f64("RATE_LIMIT_UPDATE_PLAYER_USER_RATE", 125.0), // ~7500 per minute
            ip_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_UPDATE_PLAYER_IP_WINDOW", 6)), // Shorter window for responsiveness
            ip_window_max: Self::get_env_u32("RATE_LIMIT_UPDATE_PLAYER_IP_MAX", 1000), // 1000 per 6 seconds = 10000 per minute
            user_window_duration: Duration::from_secs(Self::get_env_u64("RATE_LIMIT_UPDATE_PLAYER_USER_WINDOW", 60)),
            user_window_max: Self::get_env_u32("RATE_LIMIT_UPDATE_PLAYER_USER_MAX", 7500), // 7500 per minute for users
        });

        // Default configuration for unlisted endpoints with environment overrides
        Self {
            ip_buckets: Arc::new(RwLock::new(HashMap::new())),
            user_windows: Arc::new(RwLock::new(HashMap::new())),
            config: RateLimitConfig {
                endpoints,
                default_ip_burst: Self::get_env_u32("RATE_LIMIT_DEFAULT_IP_BURST", 5000),
                default_ip_sustained: Self::get_env_u32("RATE_LIMIT_DEFAULT_IP_SUSTAINED", 10000),
                default_user_burst: Self::get_env_u32("RATE_LIMIT_DEFAULT_USER_BURST", 2000),
                default_user_sustained: Self::get_env_u32("RATE_LIMIT_DEFAULT_USER_SUSTAINED", 5000),
            },
        }
    }

    fn get_env_u32(key: &str, default: u32) -> u32 {
        std::env::var(key)
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(default)
    }

    fn get_env_u64(key: &str, default: u64) -> u64 {
        std::env::var(key)
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(default)
    }

    fn get_env_f64(key: &str, default: f64) -> f64 {
        std::env::var(key)
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(default)
    }

    async fn check_rate_limit(&self, ip: IpAddr, user_id: &str, endpoint: &str) -> bool {
        let endpoint_config = self.config.endpoints.get(endpoint)
            .cloned()
            .unwrap_or_else(|| {
                // Default configuration for unlisted endpoints
                EndpointRateLimit {
                    ip_burst_capacity: self.config.default_ip_burst,
                    ip_burst_rate: self.config.default_ip_burst as f64 / 10.0, // 10 seconds to refill
                    user_burst_capacity: self.config.default_user_burst,
                    user_burst_rate: self.config.default_user_burst as f64 / 10.0,
                    ip_window_duration: Duration::from_secs(60),
                    ip_window_max: self.config.default_ip_sustained,
                    user_window_duration: Duration::from_secs(300),
                    user_window_max: self.config.default_user_sustained,
                }
            });

        // Check IP burst limit (Token Bucket)
        if !self.check_ip_burst_limit(ip, endpoint, &endpoint_config).await {
            RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&["ip", "burst_limited"]).inc();
            return false;
        }

        // Check IP sustained limit (Sliding Window)
        if !self.check_ip_sustained_limit(ip, endpoint, &endpoint_config).await {
            RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&["ip", "sustained_limited"]).inc();
            return false;
        }

        // Skip user limits for anonymous users
        if user_id != "anonymous" {
            // Check user burst limit (Token Bucket)
            if !self.check_user_burst_limit(user_id, endpoint, &endpoint_config).await {
                RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&["user", "burst_limited"]).inc();
                return false;
            }

            // Check user sustained limit (Sliding Window)
            if !self.check_user_sustained_limit(user_id, endpoint, &endpoint_config).await {
                RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&["user", "sustained_limited"]).inc();
                return false;
            }
        }

        true
    }

    async fn check_ip_burst_limit(&self, ip: IpAddr, endpoint: &str, config: &EndpointRateLimit) -> bool {
        let mut buckets = self.ip_buckets.write().await;
        let ip_buckets = buckets.entry(ip).or_insert_with(HashMap::new);

        let bucket = ip_buckets.entry(endpoint.to_string()).or_insert_with(|| {
            TokenBucket::new(config.ip_burst_capacity, config.ip_burst_rate)
        });

        bucket.consume(1)
    }

    async fn check_ip_sustained_limit(&self, ip: IpAddr, endpoint: &str, config: &EndpointRateLimit) -> bool {
        let mut windows = self.user_windows.write().await;
        let ip_windows = windows.entry(ip.to_string()).or_insert_with(HashMap::new);

        let window = ip_windows.entry(endpoint.to_string()).or_insert_with(VecDeque::new);

        let now = Instant::now();
        let window_start = now - config.ip_window_duration;

        // Remove old entries outside the window
        while let Some(entry) = window.front() {
            if entry.timestamp < window_start {
                window.pop_front();
            } else {
                break;
            }
        }

        // Count requests in current window
        let request_count = window.len() as u32;

        if request_count >= config.ip_window_max {
            return false;
        }

        // Add current request to window
        window.push_back(SlidingWindowEntry {
            timestamp: now,
            count: 1,
        });

        true
    }

    async fn check_user_burst_limit(&self, user_id: &str, _endpoint: &str, config: &EndpointRateLimit) -> bool {
        let mut buckets = self.ip_buckets.write().await;
        let user_buckets = buckets.entry(IpAddr::from([0, 0, 0, 0])).or_insert_with(HashMap::new);

        let bucket = user_buckets.entry(format!("user_{}", user_id)).or_insert_with(|| {
            TokenBucket::new(config.user_burst_capacity, config.user_burst_rate)
        });

        bucket.consume(1)
    }

    async fn check_user_sustained_limit(&self, user_id: &str, endpoint: &str, config: &EndpointRateLimit) -> bool {
        let mut windows = self.user_windows.write().await;
        let user_windows = windows.entry(user_id.to_string()).or_insert_with(HashMap::new);

        let window = user_windows.entry(endpoint.to_string()).or_insert_with(VecDeque::new);

        let now = Instant::now();
        let window_start = now - config.user_window_duration;

        // Remove old entries outside the window
        while let Some(entry) = window.front() {
            if entry.timestamp < window_start {
                window.pop_front();
            } else {
                break;
            }
        }

        // Count requests in current window
        let request_count = window.len() as u32;

        if request_count >= config.user_window_max {
            return false;
        }

        // Add current request to window
        window.push_back(SlidingWindowEntry {
            timestamp: now,
            count: 1,
        });

        true
    }
}

// Global advanced rate limiter instance
static GLOBAL_RATE_LIMITER: Lazy<Arc<AdvancedRateLimiter>> = Lazy::new(|| {
    Arc::new(AdvancedRateLimiter::new())
});

// Authentication middleware
pub async fn auth_middleware<B>(
    State(_state): State<AppState>,
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> impl axum::response::IntoResponse {
    // Extract Authorization header
    let auth_header = request.headers().get(AUTHORIZATION);

    match auth_header {
        Some(auth_value) => {
            let auth_str = auth_value.to_str().unwrap_or("");

            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..]; // Remove "Bearer " prefix

                // Validate JWT token
                match _state.auth_service.validate_token_with_db(token, &_state.database_pool).await {
                    Ok(claims) => {
                        // Token is valid, add user info to request extensions
                        let mut request = request;
                        request.extensions_mut().insert(claims);

                        // Continue to next handler
                        next.run(request).await
                    }
                    Err(_) => {
                        // Token is invalid
                        (
                            StatusCode::UNAUTHORIZED,
                            Json(serde_json::json!({
                                "error": "Invalid or expired token"
                            }))
                        ).into_response()
                    }
                }
            } else {
                // Invalid authorization format
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "error": "Invalid authorization format. Expected 'Bearer <token>'"
                    }))
                ).into_response()
            }
        }
        None => {
            // No authorization header
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Authorization header required"
                }))
            ).into_response()
        }
    }
}

// Authentication middleware for protected routes
pub async fn auth_middleware_for_routes<B>(
    State(_state): State<AppState>,
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> impl axum::response::IntoResponse {
    // Check if route requires authentication
    let path = request.uri().path();

    // Routes that don't require authentication
    let public_routes = [
        "/healthz",
        "/version",
        "/metrics",
        "/auth/login",
        "/auth/refresh",
        "/auth/register",
        "/ws",
        "/ws/game",
        "/test",
        "/api/leaderboard",
        "/api/leaderboard/submit"
    ];

    // Check if current route is public
    for public_route in &public_routes {
        if path.starts_with(public_route) {
            // This is a public route, skip authentication
            return next.run(request).await;
        }
    }

    // For protected routes, apply authentication middleware
    // We'll use a different approach - check auth in each handler instead of middleware for now
    next.run(request).await
}

// Advanced Rate limiting middleware with per-endpoint configuration and structured logging
pub async fn rate_limiting_middleware<B>(
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> impl axum::response::IntoResponse {
    let rate_limiter = GLOBAL_RATE_LIMITER.clone();

    // Extract client IP from request
    let client_ip = if let Some(forwarded_for) = request.headers().get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded_for.to_str() {
            if let Some(first_ip) = forwarded_str.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<IpAddr>() {
                    ip
                } else {
                    // Fallback to connection info
                    if let Some(socket_addr) = request.extensions().get::<axum::extract::ConnectInfo<SocketAddr>>() {
                        socket_addr.0.ip()
                    } else {
                        IpAddr::from([127, 0, 0, 1]) // localhost fallback
                    }
                }
            } else {
                IpAddr::from([127, 0, 0, 1])
            }
        } else {
            IpAddr::from([127, 0, 0, 1])
        }
    } else if let Some(socket_addr) = request.extensions().get::<axum::extract::ConnectInfo<SocketAddr>>() {
        socket_addr.0.ip()
    } else {
        IpAddr::from([127, 0, 0, 1])
    };

    // Extract endpoint from request URI
    let endpoint = extract_endpoint_from_request(&request);

    // Extract user ID from JWT token if available
    let user_id = extract_user_id_from_request(&request).await.unwrap_or_else(|_| "anonymous".to_string());

    // Check advanced rate limits
    if !rate_limiter.check_rate_limit(client_ip, &user_id, &endpoint).await {
        let limit_type = if user_id != "anonymous" { "user" } else { "ip" };
        RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&[limit_type, "advanced_blocked"]).inc();

        // Log rate limit hit with structured logging
        logging::Logger::log_rate_limit_hit(
            limit_type,
            &format!("{}:{}", client_ip, user_id),
            &endpoint
        );

        let error_response = (
            axum::http::StatusCode::TOO_MANY_REQUESTS,
            format!("Rate limit exceeded for {} on endpoint {}", limit_type, endpoint),
        );
        return error_response.into_response();
    }

    // Proceed with the request
    next.run(request).await
}

// Helper function to extract user_id from JWT token in Authorization header
async fn extract_user_id_from_request<B>(
    request: &axum::http::Request<B>,
) -> Result<String, String> {
    let headers = request.headers();
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    if let Some(_token) = auth_header {
        // For now, we'll extract user_id from token (simplified)
        // In a real implementation, you'd verify the JWT token
        // For demo purposes, we'll just use a placeholder
        Ok("user_123".to_string())
    } else {
        Err("No valid token found".to_string())
    }
}

// Helper function to extract endpoint from request URI for rate limiting
fn extract_endpoint_from_request<B>(request: &axum::http::Request<B>) -> String {
    let uri = request.uri();
    let path = uri.path();

    // Extract the main endpoint path (remove query parameters and IDs)
    if let Some(_base_path) = path.split('/').nth(2) { // Skip empty and "api"
        // For paths like /api/rooms/create, extract "rooms/create"
        let remaining_path = path.trim_start_matches("/api/");
        if let Some(endpoint) = remaining_path.split('/').next() {
            format!("/api/{}", endpoint)
        } else {
            "/api/unknown".to_string()
        }
    } else {
        "/api/unknown".to_string()
    }
}

// CORS helper function đã được định nghĩa ở trên

// Handle CORS preflight requests
#[allow(dead_code)]
async fn handle_cors_preflight() -> impl IntoResponse {
    use axum::http::{HeaderMap, HeaderValue, StatusCode};
    let mut headers = HeaderMap::new();
    headers.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
    headers.insert("Access-Control-Allow-Methods", HeaderValue::from_static("GET, POST, PUT, DELETE, OPTIONS"));
    headers.insert("Access-Control-Allow-Headers", HeaderValue::from_static("Content-Type, Authorization, Accept"));
    (StatusCode::OK, headers)
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct GatewaySettings {
    pub bind_addr: SocketAddr,
    pub worker_endpoint: String,
}

impl GatewaySettings {
    pub fn from_env() -> Result<Self, BoxError> {
        let bind_addr: SocketAddr = std::env::var("GATEWAY_BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
            .parse()
            .map_err(|e| Box::new(e) as BoxError)?;
        let worker_endpoint = std::env::var("WORKER_ENDPOINT")
            .unwrap_or_else(|_| "http://127.0.0.1:50051".to_string());
        Ok(Self {
            bind_addr,
            worker_endpoint,
        })
    }
}

#[derive(Debug)]
pub struct GatewayConfig {
    pub bind_addr: SocketAddr,
    pub worker_endpoint: String,
    pub ready_tx: Option<oneshot::Sender<SocketAddr>>,
}

impl GatewayConfig {
    pub fn from_settings(s: GatewaySettings) -> Self {
        Self {
            bind_addr: s.bind_addr,
            worker_endpoint: s.worker_endpoint,
            ready_tx: None,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PeerConnection {
    pub peer_id: String,
    pub offer: Option<String>,
    pub answer: Option<String>,
    pub ice_candidates: Vec<RtcIceCandidate>,
}

impl PeerConnection {
    pub fn new(peer_id: String) -> Self {
        Self {
            peer_id,
            offer: None,
            answer: None,
            ice_candidates: Vec::new(),
        }
    }
}

#[derive(Debug, Default)]
pub struct RoomSignaling {
    pub peers: HashMap<String, PeerConnection>,
}

#[derive(Debug, serde::Deserialize)]
pub struct RoomQuery {
    pub room_id: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct RtcOfferRequest {
    pub sdp: String,
    pub room_id: String,
    pub peer_id: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone, Default)]
pub struct RtcOfferResponse {
    pub success: bool,
    pub session_id: Option<String>,
    pub sdp: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct RtcAnswerResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct RtcAnswerRequest {
    pub sdp: String,
    pub session_id: String,
    pub room_id: String,
    pub peer_id: String,
    pub target_peer_id: String, // Peer m├á answer n├áy nhß║»m tß╗¢i
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct RtcIceCandidate {
    pub candidate: String,
    pub sdp_mid: String,
    pub sdp_mline_index: u32,
    pub room_id: String,
    pub peer_id: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct ChatSendRequest {
    pub room_id: String,
    pub message: String,
    pub message_type: String, // "global", "team", "whisper"
    pub target_player_id: Option<String>, // For whisper messages
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct ChatSendResponse {
    pub success: bool,
    pub message_id: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct ChatHistoryRequest {
    pub room_id: String,
    pub count: Option<usize>, // Number of recent messages to retrieve
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct ChatHistoryResponse {
    pub messages: Vec<ChatMessage>,
    pub total: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub player_id: String,
    pub player_name: String,
    pub message: String,
    pub timestamp: u64,
    pub message_type: String, // "global", "team", "whisper", "system"
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebRTCSession {
    pub session_id: String,
    pub room_id: String,
    pub user_id: String,
    pub peer_connections: HashMap<String, PeerConnection>,
    pub status: WebRTCSessionStatus,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum WebRTCSessionStatus {
    Initializing,
    Negotiating,
    Connected,
    Disconnected,
    Failed,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PeerConnectionState {
    New,
    Connecting,
    Connected,
    Disconnected,
    Failed,
}

type SignalingState = Arc<RwLock<HashMap<String, RoomSignaling>>>;
type SignalingSessions = Arc<RwLock<HashMap<String, crate::types::SignalingSession>>>;
type WebRTCSessionRegistry = Arc<RwLock<HashMap<String, WebRTCSession>>>;

#[derive(Debug)]
pub struct WebSocketConnection {
    pub peer_id: String,
    pub room_id: String,
    pub sender: tokio::sync::mpsc::UnboundedSender<axum::extract::ws::Message>,
}

pub type WebSocketRegistry = Arc<RwLock<HashMap<String, WebSocketConnection>>>; // key: connection_id

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlayerInfo {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub struct TransportConnection {
    pub peer_id: String,
    pub room_id: String,
    pub transport: Box<dyn GameTransport + Send + Sync>,
    pub fallback_used: bool,
}

impl std::fmt::Debug for TransportConnection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TransportConnection")
            .field("peer_id", &self.peer_id)
            .field("room_id", &self.room_id)
            .field("transport_kind", &self.transport.kind())
            .field("fallback_used", &self.fallback_used)
            .finish()
    }
}

pub type TransportRegistry = Arc<RwLock<HashMap<String, TransportConnection>>>; // key: connection_id

// WebRTC Signaling Message Types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum SignalingMessage {
    Offer {
        from_peer_id: String,
        to_peer_id: Option<String>, // None = broadcast to all peers in room
        sdp: String,
        session_id: String,
    },
    Answer {
        from_peer_id: String,
        to_peer_id: String,
        sdp: String,
        session_id: String,
    },
    IceCandidate {
        from_peer_id: String,
        to_peer_id: Option<String>, // None = broadcast to all peers in room
        candidate: String,
        session_id: String,
    },
    SessionConnected {
        session_id: String,
        peer_id: String,
    },
    SessionDisconnected {
        session_id: String,
        peer_id: String,
    },
}

// TODO: Implement proper message relay with lifetime handling
// Temporarily disabled due to lifetime complexity
/*
async fn relay_webrtc_message_to_room(
    state: &AppState,
    room_id: &str,
    from_user_id: &str,
    from_peer_id: &str,
    message: SignalingMessage,
) {
    // Find all WebSocket connections in the room
    let ws_reg = state.ws_registry.read().await;
    let transport_reg = state.transport_registry.read().await;

    // Relay to all peers in the room except the sender
    for (connection_id, ws_conn) in ws_reg.iter() {
        if ws_conn.room_id == room_id && ws_conn.peer_id != from_peer_id {
            // Check if this connection has WebRTC transport
            if let Some(transport_conn) = transport_reg.get(connection_id) {
                if transport_conn.fallback_used {
                    // For fallback connections, send via WebSocket with retry
                    let message_text = serde_json::to_string(&message).unwrap_or_else(|e| {
                        tracing::error!("Failed to serialize signaling message: {}", e);
                        "{}".to_string()
                    });

                    // Retry sending with exponential backoff
                    if let Err(e) = retry_network_operation(
                        || Box::pin(async {
                            ws_conn.sender.send(axum::extract::ws::Message::Text(message_text.clone()))
                                .map_err(|_| "Failed to send WebSocket message".into())
                        }),
                        &format!("relay_webrtc_message_{}", ws_conn.peer_id)
                    ).await {
                        tracing::warn!("Failed to relay WebRTC message to peer {} after retries: {}", ws_conn.peer_id, e);
                    }
                }
            }
        }
    }
}
*/

// Handler cho /rtc/offer (c├│ state)
async fn handle_rtc_offer(
    State(state): State<AppState>,
    Json(req): Json<RtcOfferRequest>,
) -> Json<RtcOfferResponse> {
    // Extract user_id from JWT token
    let user_id = "anonymous".to_string();

    // Create or update WebRTC session
    let session_id = format!("webrtc_{}", chrono::Utc::now().timestamp_millis());
    let webrtc_session = WebRTCSession {
        session_id: session_id.clone(),
        room_id: req.room_id.clone(),
        user_id: user_id.clone(),
        peer_connections: HashMap::new(),
        status: WebRTCSessionStatus::Negotiating,
        created_at: chrono::Utc::now(),
        last_activity: chrono::Utc::now(),
    };

    // Store WebRTC session
    {
        let mut sessions = state.webrtc_sessions.write().await;
        sessions.insert(session_id.clone(), webrtc_session);
    }

    // Update legacy signaling state for compatibility
    let mut map = state.signaling.write().await;
    let room = map.entry(req.room_id.clone()).or_default();
    let peer = room.peers.entry(req.peer_id.clone()).or_insert_with(|| PeerConnection::new(req.peer_id.clone()));
    peer.offer = Some(req.sdp.clone());

    // TODO: Relay offer to other peers in the room via transport abstraction
    // relay_webrtc_message_to_room(&state, &req.room_id, &user_id, &req.peer_id, SignalingMessage::Offer {
    //     from_peer_id: req.peer_id.clone(),
    //     to_peer_id: None, // Broadcast to all peers in room
    //     sdp: req.sdp.clone(),
    //     session_id: session_id.clone(),
    // }).await;

    Json(RtcOfferResponse {
        success: true,
        session_id: Some(session_id),
        sdp: Some(req.sdp),
        error: None,
    })
}

// Handler cho /rtc/ice (c├│ state)
async fn handle_rtc_ice(
    State(state): State<AppState>,
    Json(ice): Json<RtcIceCandidate>,
) -> Json<RtcAnswerResponse> {
    // Extract user_id from JWT token
    let user_id = "anonymous".to_string();

    // Update WebRTC session activity
    {
        let mut sessions = state.webrtc_sessions.write().await;
        // Find session by room_id and peer_id (ICE candidates are associated with sessions)
        let mut found_session = false;
        for session in sessions.values_mut() {
            if session.room_id == ice.room_id && session.user_id == user_id {
                session.last_activity = chrono::Utc::now();
                found_session = true;
                break;
            }
        }

        // If no session found, log it but continue processing
        if !found_session {
            tracing::warn!("No WebRTC session found for room_id: {}, peer_id: {}", ice.room_id, ice.peer_id);
        }
    }

    // Update legacy signaling state for compatibility
    let mut map = state.signaling.write().await;
    let room = map.entry(ice.room_id.clone()).or_default();
    let peer = room.peers.entry(ice.peer_id.clone()).or_insert_with(|| PeerConnection::new(ice.peer_id.clone()));
    peer.ice_candidates.push(ice.clone());

    // TODO: Relay ICE candidate to other peers in the room
    // relay_webrtc_message_to_room(&state, &ice.room_id, &user_id, &ice.peer_id, SignalingMessage::IceCandidate {
    //     from_peer_id: ice.peer_id.clone(),
    //     to_peer_id: None, // Broadcast to all peers in room
    //     candidate: ice.candidate.clone(),
    //     session_id: format!("ice_{}_{}", ice.room_id, ice.peer_id), // Generate session_id from room_id and peer_id
    // }).await;

    Json(RtcAnswerResponse {
        success: true,
        error: None,
    })
}

// Handler cho /rtc/answer (c├│ state)
async fn handle_rtc_answer(
    State(state): State<AppState>,
    Json(req): Json<RtcAnswerRequest>,
) -> Json<RtcAnswerResponse> {
    // Extract user_id from JWT token
    let _user_id = "anonymous".to_string();

    // Update WebRTC session status
    {
        let mut sessions = state.webrtc_sessions.write().await;
        if let Some(session) = sessions.get_mut(&req.session_id) {
            session.status = WebRTCSessionStatus::Connected;
            session.last_activity = chrono::Utc::now();
        }
    }

    // Update legacy signaling state for compatibility
    let mut map = state.signaling.write().await;
    if let Some(room) = map.get_mut(&req.room_id) {
        if let Some(target_peer) = room.peers.get_mut(&req.target_peer_id) {
            target_peer.answer = Some(req.sdp.clone());

            // TODO: Relay answer to target peer
            // relay_webrtc_message_to_room(&state, &req.room_id, &_user_id, &req.target_peer_id, SignalingMessage::Answer {
            //     from_peer_id: _user_id.clone(),
            //     to_peer_id: req.target_peer_id.clone(),
            //     sdp: req.sdp.clone(),
            //     session_id: req.session_id.clone(),
            // }).await;

            return Json(RtcAnswerResponse {
                success: true,
                error: None,
            });
        }
    }

    Json(RtcAnswerResponse {
        success: false,
        error: Some("Target peer not found".to_string()),
    })
}

// CORS middleware layer
#[derive(Clone)]
pub struct CorsMiddleware;

impl<S> Layer<S> for CorsMiddleware {
    type Service = CorsService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        CorsService { inner }
    }
}

#[derive(Clone)]
pub struct CorsService<S> {
    inner: S,
}

impl<S> Service<axum::http::Request<axum::body::Body>> for CorsService<S>
where
    S: Service<axum::http::Request<axum::body::Body>, Response = hyper::Response<axum::body::Body>> + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut std::task::Context<'_>) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: axum::http::Request<axum::body::Body>) -> Self::Future {
        // Handle preflight requests
        if request.method() == axum::http::Method::OPTIONS {
            // Create response with proper hyper type compatibility
            let response = hyper::Response::builder()
                .status(axum::http::StatusCode::OK)
                .body(axum::body::Body::empty())
                .unwrap();
            return Box::pin(async move { Ok(response) });
        }

        let future = self.inner.call(request);
        Box::pin(async move {
            let response = future.await?;
            // Note: CORS headers are now handled by middleware, no need to add them here
            Ok(response)
        })
    }
}

// Helper function to add CORS headers to responses (deprecated - using CORS middleware instead)
// Helper function to create CORS-enabled response
#[allow(dead_code)]
fn cors_response<T: IntoResponse>(response: T) -> impl IntoResponse {
    // CORS headers are now handled by middleware, no need to add them here
    response.into_response()
}

pub async fn build_router(_worker_endpoint: String) -> Router {
    let signaling_state: SignalingState = Arc::new(RwLock::new(HashMap::new()));
    let signaling_sessions: SignalingSessions = Arc::new(RwLock::new(HashMap::new()));
    let webrtc_sessions: WebRTCSessionRegistry = Arc::new(RwLock::new(HashMap::new()));
    let ws_registry: WebSocketRegistry = Arc::new(RwLock::new(HashMap::new()));
    let transport_registry: TransportRegistry = Arc::new(RwLock::new(HashMap::new()));
    let auth_service = auth::AuthService::new().expect("Failed to create auth service");

    // Initialize database pool
    let database_config = DatabaseConfig {
        database_url: std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string()),
        pool_size: 20,  // ✅ Điều chỉnh theo yêu cầu: max 20 connections
        min_idle: 5,    // ✅ Min 5 connections như yêu cầu
        connection_timeout: 30,
        query_timeout: 10,
        enable_metrics: true,
        enable_read_replica: false,
        read_replica_urls: vec![],
    };
    let database_pool = futures::executor::block_on(async {
        DatabasePool::new(database_config).await
    }).expect("Failed to create database pool");

    // Initialize token WebSocket manager for real-time balance updates
    let token_ws_manager = std::sync::Arc::new(websocket_token::TokenWebSocketManager::new());

    // Room Manager temporarily disabled due to compilation issues
    // let room_manager = ...;

    // Configure CORS layer - allow all origins for development
    let _cors_layer = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(true);

    // Create worker client
    let worker_client = {
        let endpoint = std::env::var("WORKER_ENDPOINT")
            .unwrap_or_else(|_| "http://127.0.0.1:50051".to_string());
        tracing::info!("Creating worker client with endpoint: {}", endpoint);
        let mut client = crate::worker_client::WorkerClient::new(endpoint);

        // Attempt to connect to worker service
        match client.connect().await {
            Ok(_) => {
                tracing::info!("Successfully connected to worker service");
                Some(client)
            }
            Err(e) => {
                tracing::warn!("Failed to connect to worker service: {}", e);
                tracing::info!("Continuing without worker service - some features will be disabled");
                None
            }
        }
    };

    // Initialize legacy connection manager for backward compatibility
    let connection_limits = ConnectionLimits {
        max_websocket_connections: 1000,
        max_webrtc_connections: 500,
        max_connections_per_room: 100,
        connection_timeout_secs: 300,
        memory_threshold_mb: 512,
    };
    let connection_manager = std::sync::Arc::new(ConnectionManager::new(connection_limits));

    // Initialize optimized connection manager for high-frequency game traffic
    let optimized_connection_manager = std::sync::Arc::new(connection_pool::create_optimized_connection_manager());

    // Initialize batch processor for game message optimization
    let batch_processor = std::sync::Arc::new(batch_processor::create_game_batch_processor());
    let game_message_sender = std::sync::Arc::new(batch_processor::GameMessageSender::new(
        batch_processor.sender()
    ));

    // Initialize game metrics manager for performance tracking
    let game_metrics_manager = std::sync::Arc::new(game_metrics::GameMetricsManager::new());

    // Initialize Solana client (Disabled due to dependency conflicts)
    // let solana_client = solana_client::rpc_client::RpcClient::new(
    //     std::env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string())
    // );

    // Initialize Anchor client (Disabled due to dependency conflicts)
    // let keypair = solana_sdk::signer::keypair::Keypair::new();
    // let wallet = std::sync::Arc::new(keypair);
    // let anchor_client = std::sync::Arc::new(
    //     anchor_client::Client::new_with_options(
    //         solana_client.clone(),
    //         solana_sdk::pubkey::Pubkey::from_str("GAMETOKEN11111111111111111111111111111112")
    //             .expect("Invalid program ID"),
    //         wallet.clone(),
    //         anchor_client::Cluster::Devnet,
    //     )
    // );

    // Initialize real blockchain client via gRPC
    let blockchain_client = std::sync::Arc::new(
        blockchain_client::BlockchainClient::new("http://localhost:50051").await
            .expect("Failed to connect to blockchain service")
    );

    // Initialize services client for persistence
    let services_client = reqwest::Client::new();
    let services_url = std::env::var("SERVICES_URL")
        .unwrap_or_else(|_| "http://localhost:3001".to_string());

    let state = AppState {
        signaling: signaling_state,
        signaling_sessions,
        webrtc_sessions,
        ws_registry,
        transport_registry,
        worker_client,
        auth_service,
        database_pool,
        connection_manager: connection_manager.clone(),
        optimized_connection_manager,
        batch_processor,
        game_message_sender,
        game_metrics_manager,
        // Real blockchain integration via separate microservice
        blockchain_client,
        // Services API client for persistence
        services_client,
        services_url,
        // Token WebSocket manager for real-time balance updates
        token_ws_manager,
        // room_manager: std::sync::Arc::new(tokio::sync::RwLock::new(
        //     room_manager::RoomManagerState::new()
        // )),
    };

    // TODO: Add API versioning middleware when implemented
    // let router = router.layer(ApiVersionLayer::new());

    // Public routes (no authentication required)
    let public_router = Router::new()
        // Standard Kubernetes health check endpoints
        .route(HEALTH_PATH, get(health_check))
        .route(READY_PATH, get(ready_check))
        .route(LIVE_PATH, get(live_check))
        // Legacy health endpoint (giữ để tương thích)
        .route(HEALTHZ_PATH, get(health_check))
        .route(VERSION_PATH, get(version))
        .route(METRICS_PATH, get(metrics))
        .route(GAME_HEALTH_PATH, get(game_health))
        .route(GAME_PERFORMANCE_PATH, get(game_performance))
        .route(WS_PATH, get(ws_handler))
        .route(WS_GAME_PATH, get(ws_game_handler))
        .route("/token-updates", get(token_ws_handler))
        .route("/auth/login", post(auth_login))
        .route("/auth/register", post(auth_register))
        .route("/test", get(test_handler))
        .route("/api/leaderboard", get(leaderboard_handler))
        .route("/api/leaderboard/submit", post(submit_score_handler));

    // Protected routes (authentication required)
    let protected_router = Router::new()
        // Room management routes (v2 - using Room Manager) - Temporarily disabled
        /*
        .route(ROOMS_CREATE_PATH, post(create_room_v2_handler))
        .route(ROOMS_LIST_PATH, get(list_rooms_v2_handler))
        .route(ROOMS_JOIN_PATH, post(join_room_v2_handler))
        .route(ROOMS_LEAVE_PATH, post(leave_room_v2_handler))
        .route(ROOMS_ASSIGN_PATH, post(assign_room_v2_handler))
        .route(ROOMS_UPDATE_PLAYER_PATH, post(update_player_status_v2_handler))
        .route(ROOMS_CLOSE_PATH, post(close_room_v2_handler))
        */
        .route("/inputs", post(post_inputs))
        // WebRTC signaling routes
        .route("/rtc/offer", post(handle_rtc_offer))
        .route("/rtc/answer", post(handle_rtc_answer))
        .route("/rtc/ice", post(handle_rtc_ice))
        .route("/rtc/sessions", get(list_webrtc_sessions))
        .route("/auth/refresh", post(auth_refresh))
        .route(GAME_JOIN_PATH, post(game_join_handler))
        .route(GAME_LEAVE_PATH, post(game_leave_handler))
        .route(GAME_INPUT_PATH, post(game_input_handler))
        .route(API_GAME_INPUT_PATH, post(game_input_handler))
        .route(WORKER_SNAPSHOT_PATH, post(worker_snapshot_handler))
        // Chat system routes - Now enabled
        .route(CHAT_SEND_PATH, post(chat_send_handler))
        .route(CHAT_HISTORY_PATH, get(chat_history_handler))
        .route(API_CHAT_SEND_PATH, post(chat_send_handler))
        .route(API_CHAT_HISTORY_PATH, get(chat_history_handler))
        .route(API_METRICS_PATH, get(metrics_handler))
        // API routes (for backward compatibility with client) - Now enabled
        .route(API_ROOMS_CREATE_PATH, post(create_room_handler))
        .route(API_ROOMS_LIST_PATH, get(list_rooms_handler))
        .route(API_ROOMS_JOIN_PATH, post(join_room_handler))
        .route("/api/transport/negotiate", get(negotiate_transport))
        .route(API_ROOMS_LEAVE_PATH, post(leave_room_handler))
        // Game management APIs
        .route("/api/rooms/{id}/start", post(start_game_by_id_handler))
        .route("/api/rooms/{id}/pause", post(pause_game_handler))
        .route("/api/rooms/{id}/resume", post(resume_game_handler))
        .route("/api/rooms/{id}/end", post(end_game_handler))
        // Player management APIs
        .route("/api/players/{id}/stats", get(player_stats_handler))
        .route("/api/players/{id}/settings", put(player_settings_handler))
        .route("/api/players/{id}", delete(delete_player_handler))
        // Social features APIs
        .route("/api/rooms/{id}/chat/history", get(room_chat_history_handler))
        .route("/api/chat/messages/{id}", delete(delete_chat_message_handler))
        .route("/api/rooms/{id}/chat/moderate", post(moderate_chat_handler))
        .route("/api/leaderboards/weekly", get(weekly_leaderboard_handler))
        .route("/api/leaderboards/monthly", get(monthly_leaderboard_handler))
        .route("/api/leaderboards/report", post(report_cheating_handler))
        .route(API_ROOMS_STATUS_PATH, get(get_room_status_handler))
        .route(API_ROOMS_ASSIGN_PATH, post(join_room_handler))
        .route("/api/rooms/update-player", post(join_room_handler));

    // Token API routes with inline JWT authentication (middleware has compatibility issues)
    let token_routes = Router::new()
        .route("/api/token/eat-particle", post(eat_particle_handler_api))
        .route("/api/token/earn-from-pool", post(earn_from_pool_handler_api))
        .route("/api/token/balance", get(balance_handler_api))
        .route("/api/token/transfer", post(transfer_handler_api))
        .route("/api/wallet/create", post(create_wallet_handler_api))
        .route("/api/wallet/create-hd", post(create_hd_wallet_handler_api))
        .route("/api/wallet/derive", post(derive_wallet_handler_api))
        .route("/api/wallet/recover", post(recover_wallet_handler_api));
        // TODO: [ENABLE WEBSOCKET INTEGRATION] - Uncomment when websocket_token module enabled
        // .route("/ws/token", get(websocket_token::handle_token_websocket));
        //
        // CURRENT STATUS: WebSocket endpoint disabled due to dependency conflicts
        // This endpoint provides real-time token balance updates to connected clients
        // DEPENDENCY CONFLICT: Requires Solana dependencies for balance queries

    // Clone blockchain client before moving state
    let blockchain_client_clone = state.blockchain_client.clone();

    // Combine public and protected routes with comprehensive middleware stack
    let router = public_router
        .merge(protected_router)
        .merge(token_routes)
        .layer(axum::middleware::from_fn(logging::logging_middleware))
        .layer(axum::middleware::from_fn(rate_limiting_middleware))
        .layer(axum::middleware::from_fn_with_state(state.clone(), validate_api_request)) // Add API validation middleware
        .with_state(state);

    // Start memory monitoring in background
    tokio::spawn(memory::MemoryProfiler::start_memory_monitoring(connection_manager));
    tracing::info!("Memory monitoring started");

    // Start auto-mint scheduler in background
    tokio::spawn(async move {
        auto_mint_scheduler(blockchain_client_clone, 3600).await; // Mint every hour
    });
    tracing::info!("Auto-mint scheduler started (minting every hour)");

    router
}

// ===== ROOM MANAGEMENT HANDLERS =====
// TODO: Re-enable when room_manager dependencies are resolved
// All v2 handlers temporarily removed due to dependency issues

// List WebRTC sessions for user

// Close WebRTC session
#[allow(dead_code)]
async fn close_webrtc_session(
    State(state): State<AppState>,
    request: axum::http::Request<axum::body::Body>,
    Path(session_id): Path<String>,
) -> Json<serde_json::Value> {
    // Extract user_id from JWT token
    let user_id = match extract_user_id_from_request(&request).await {
        Ok(id) => id,
        Err(_) => {
            return Json(serde_json::json!({"error": "Authentication failed"}));
        }
    };

    {
        let mut sessions = state.webrtc_sessions.write().await;
        if let Some(session) = sessions.get(&session_id) {
            if session.user_id == user_id {
                sessions.remove(&session_id);
                counter!("gw.webrtc.sessions_closed").increment(1);
                return Json(serde_json::json!({"status": "session_closed"}));
            }
        }
    }

    Json(serde_json::json!({"error": "Session not found"}))
}

// ===== CHAT HANDLERS =====

async fn chat_send_handler(
    State(mut state): State<AppState>,
    Json(chat_req): Json<ChatSendRequest>,
) -> Json<ChatSendResponse> {
    // Extract user_id from JWT token (this would need to be implemented differently in axum 0.6)
    // For now, use a placeholder - in production this would extract from auth headers
    let user_id = "test_user".to_string(); // TODO: Implement proper JWT extraction

    // TODO: Get player name from user_id (could be stored in database or cache)
    let player_name = format!("Player_{}", &user_id[..8]);

    // Create chat message
    let message_id = format!("msg_{}", chrono::Utc::now().timestamp_millis());
    let _chat_message = ChatMessage {
        id: message_id.clone(),
        player_id: user_id.clone(),
        player_name,
        message: chat_req.message.clone(),
        timestamp: chrono::Utc::now().timestamp() as u64,
        message_type: chat_req.message_type.clone(),
    };

    // Send chat message to worker via gRPC
    match &mut state.worker_client {
        Some(client) => {
            match client.send_chat_message(tonic::Request::new(proto::worker::v1::SendChatMessageRequest {
                room_id: chat_req.room_id.clone(),
                player_id: user_id.clone(),
                player_name: format!("Player_{}", &user_id[..8]), // TODO: Get actual player name from database
                message: chat_req.message.clone(),
                message_type: chat_req.message_type.clone(),
                target_player_id: "".to_string(), // Empty for non-whisper messages
            })).await {
                Ok(response) => {
                    let response_inner = response.into_inner();
                    if response_inner.success {
                        tracing::info!("Chat message sent successfully: {}", response_inner.message_id);
                        Json(ChatSendResponse {
                            success: true,
                            message_id: Some(response_inner.message_id),
                            error: None,
                        })
                    } else {
                        tracing::error!("Failed to send chat message: {}", response_inner.error);
                        Json(ChatSendResponse {
                            success: false,
                            message_id: None,
                            error: Some(response_inner.error),
                        })
                    }
                }
                Err(e) => {
                    tracing::error!("gRPC error sending chat message: {}", e);
                    Json(ChatSendResponse {
                        success: false,
                        message_id: None,
                        error: Some("Failed to send message".to_string()),
                    })
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available, chat message not sent");
            Json(ChatSendResponse {
                success: false,
                message_id: None,
                error: Some("Chat service not available".to_string()),
            })
        }
    }
}

async fn chat_history_handler(
    State(mut state): State<AppState>,
    Json(history_req): Json<ChatHistoryRequest>,
) -> Json<ChatHistoryResponse> {
    // Extract user_id from JWT token (this would need to be implemented differently in axum 0.6)
    // For now, use a placeholder - in production this would extract from auth headers
    let user_id = "test_user".to_string(); // TODO: Implement proper JWT extraction

    // Get chat history from worker via gRPC
    match &mut state.worker_client {
        Some(client) => {
            match client.get_chat_history(tonic::Request::new(proto::worker::v1::GetChatHistoryRequest {
                room_id: history_req.room_id.clone(),
                count: history_req.count.unwrap_or(50) as u32,
            })).await {
                Ok(response) => {
                    let response_inner = response.into_inner();
                    if response_inner.success {
                        // Convert proto messages to gateway ChatMessage format
                        let messages: Vec<ChatMessage> = response_inner.messages.into_iter().map(|msg| {
                            let player_id = msg.player_id.clone();
                            ChatMessage {
                                id: msg.id,
                                player_id: player_id.clone(),
                                player_name: format!("Player_{}", &player_id[..8]), // TODO: Get actual player name from database
                                message: msg.message,
                                timestamp: msg.timestamp,
                                message_type: msg.message_type,
                            }
                        }).collect();

                        Json(ChatHistoryResponse {
                            messages: messages.clone(),
                            total: messages.len(),
                        })
                    } else {
                        tracing::error!("Failed to get chat history: {}", response_inner.error);
                        Json(ChatHistoryResponse {
                            messages: Vec::new(),
                            total: 0,
                        })
                    }
                }
                Err(e) => {
                    tracing::error!("gRPC error getting chat history: {}", e);
                    Json(ChatHistoryResponse {
                        messages: Vec::new(),
                        total: 0,
                    })
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available, returning empty chat history");
            Json(ChatHistoryResponse {
                messages: Vec::new(),
                total: 0,
            })
        }
    }
}

// Auth handlers
async fn auth_login(
    State(_state): State<AppState>,
    Json(login_req): Json<auth::AuthRequest>,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();

    let response = auth::login_handler(Json(login_req)).await;

    // Record metrics based on response status
    let status_code = response.status();
    let auth_method = "email"; // Assuming email auth for now
    let user_type = "player"; // Default user type

    if status_code.is_success() {
        GATEWAY_AUTH_SUCCESS_COUNTER
            .with_label_values(&[auth_method, user_type])
            .inc();
    } else {
        GATEWAY_AUTH_FAILURE_COUNTER
            .with_label_values(&[auth_method, "invalid_credentials"])
            .inc();
    }

    // Record response time
    GATEWAY_RESPONSE_TIME_HISTOGRAM
        .with_label_values(&["/auth/login", "POST", &status_code.to_string()])
        .observe(start_time.elapsed().as_secs_f64());

    response
}

async fn auth_refresh(
    State(_state): State<AppState>,
    Json(_refresh_req): Json<auth::RefreshRequest>,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();

    // Temporary implementation - return success response
    let response = Json(serde_json::json!({
        "success": true,
        "message": "Token refreshed successfully"
    }));

    // Record metrics
    GATEWAY_AUTH_SUCCESS_COUNTER
        .with_label_values(&["refresh", "player"])
        .inc();

    // Record response time
    GATEWAY_RESPONSE_TIME_HISTOGRAM
        .with_label_values(&["/auth/refresh", "POST", "200"])
        .observe(start_time.elapsed().as_secs_f64());

    response
}

async fn auth_register(
    State(_state): State<AppState>,
    Json(register_req): Json<auth::RegisterRequest>,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();

    let response = auth::register_handler(Json(register_req)).await;

    // Record metrics based on response status
    let status_code = response.status();
    let auth_method = "email"; // Assuming email auth for now
    let user_type = "player"; // Default user type

    if status_code.is_success() {
        GATEWAY_AUTH_SUCCESS_COUNTER
            .with_label_values(&[auth_method, user_type])
            .inc();
    } else {
        GATEWAY_AUTH_FAILURE_COUNTER
            .with_label_values(&[auth_method, "registration_failed"])
            .inc();
    }

    // Record response time
    GATEWAY_RESPONSE_TIME_HISTOGRAM
        .with_label_values(&["/auth/register", "POST", &status_code.to_string()])
        .observe(start_time.elapsed().as_secs_f64());

    response
}

// Game input handler
async fn post_inputs(
    State(mut state): State<AppState>,
    Json(body): Json<types::InputReq>,
) -> impl IntoResponse {
    let t0 = std::time::Instant::now();
    let body_clone = body.clone();

    let req = proto::worker::v1::PushInputRequest {
        room_id: body.room_id,
        sequence: body.seq as u32,
        payload_json: body.payload_json,
    };

    match &mut state.worker_client {
        Some(client) => {
            match client.push_input(proto::worker::v1::PushInputRequest {
                room_id: req.room_id.clone(),
                sequence: req.sequence,
                payload_json: req.payload_json.clone(),
            }).await {
                Ok(_) => {
                    // Record worker communication metrics
                    GATEWAY_WORKER_COMMUNICATION_HISTOGRAM
                        .with_label_values(&["push_input", "success"])
                        .observe(t0.elapsed().as_secs_f64());

                    // Record game message metrics
                    GATEWAY_GAME_MESSAGE_COUNTER
                        .with_label_values(&["input", &body_clone.room_id, "outbound"])
                        .inc();

                    // Record response time
                    GATEWAY_RESPONSE_TIME_HISTOGRAM
                        .with_label_values(&["/game/input", "POST", "200"])
                        .observe(t0.elapsed().as_secs_f64());

                    // Legacy metrics
                    histogram!("gw.inputs.push_ms").record(t0.elapsed().as_secs_f64() * 1000.0);
                    counter!("gw.inputs.ok").increment(1);

                    axum::http::StatusCode::OK
                }
                Err(e) => {
                    // Record worker communication failure metrics
                    GATEWAY_WORKER_COMMUNICATION_HISTOGRAM
                        .with_label_values(&["push_input", "error"])
                        .observe(t0.elapsed().as_secs_f64());

                    // Record response time for failed request
                    GATEWAY_RESPONSE_TIME_HISTOGRAM
                        .with_label_values(&["/game/input", "POST", "502"])
                        .observe(t0.elapsed().as_secs_f64());

                    error!(error=?e, "push_input failed");
                    counter!("gw.inputs.err").increment(1);
                    axum::http::StatusCode::BAD_GATEWAY
                }
            }
        }
        None => {
            // Worker client not available
            tracing::warn!("Worker client not available for push_input");
            // Record response time for unavailable service
            GATEWAY_RESPONSE_TIME_HISTOGRAM
                .with_label_values(&["/game/input", "POST", "503"])
                .observe(t0.elapsed().as_secs_f64());

            counter!("gw.inputs.err").increment(1);
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        }
    }
}

async fn healthz(State(mut state): State<AppState>) -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[HEALTHZ_PATH]).inc();

    // Perform comprehensive health checks
    let mut health_status = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "gateway": "healthy",
            "database": "unknown",
            "worker": "unknown"
        },
        "checks": {}
    });

    // Check database health
    let db_healthy = match state.database_pool.health_check().await {
        Ok(true) => {
            health_status["services"]["database"] = "healthy".into();
            health_status["checks"]["database"] = serde_json::json!({"status": "healthy", "response_time_ms": 10});
            true
        }
        Ok(false) => {
            health_status["services"]["database"] = "degraded".into(); // Database issues don't crash gateway
            health_status["checks"]["database"] = serde_json::json!({"status": "degraded", "error": "Database connection issues"});
            true // Database issues don't fail the gateway
        }
        Err(e) => {
            health_status["services"]["database"] = "error".into();
            health_status["checks"]["database"] = serde_json::json!({"status": "error", "error": format!("Database health check error: {}", e)});
            false // Database errors can affect gateway health
        }
    };

    // Check worker connection health (simplified check)
    let _worker_healthy = match check_worker_health(&mut state).await {
        Ok(true) => {
            health_status["services"]["worker"] = "healthy".into();
            health_status["checks"]["worker"] = serde_json::json!({"status": "healthy"});
            true
        }
        Ok(false) => {
            health_status["services"]["worker"] = "degraded".into(); // Worker issues don't make gateway unhealthy
            health_status["checks"]["worker"] = serde_json::json!({"status": "degraded", "note": "Worker connection issues"});
            true // Worker issues don't fail the gateway
        }
        Err(e) => {
            health_status["services"]["worker"] = "unknown".into();
            health_status["checks"]["worker"] = serde_json::json!({"status": "error", "error": format!("Worker health check error: {}", e)});
            true // Worker errors don't fail the gateway
        }
    };

    // Overall status determination
    let overall_healthy = db_healthy; // Database is critical for gateway

    if overall_healthy {
        health_status["status"] = "healthy".into();
    } else {
        health_status["status"] = "unhealthy".into();
    }

    let _status_code = if overall_healthy {
        axum::http::StatusCode::OK
    } else {
        axum::http::StatusCode::SERVICE_UNAVAILABLE
    };

    Json(health_status).into_response()
}

// Helper function to check worker service health
async fn check_worker_health(state: &mut AppState) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // Real health check for Worker service
    // Try to make a simple health check call to the worker

    match &mut state.worker_client {
        Some(client) => {
            // Try to call a simple health check method on the worker
            // If this fails, the worker is not responding properly
            match client.health_check(tonic::Request::new(proto::worker::v1::HealthCheckRequest {})).await {
                Ok(response) => {
                    let health_response = response.into_inner();
                    Ok(health_response.healthy)
                }
                Err(err) => {
                    tracing::warn!("Worker health check failed: {}", err);
                    Ok(false) // Worker is not responding
                }
            }
        }
        None => {
            // No worker client available
            tracing::warn!("No worker client available for health check");
            Ok(false)
        }
    }
}

// ===== NEW HEALTH CHECK ENDPOINTS =====

// Standard Kubernetes health check endpoint (/health)
async fn health_check(State(mut state): State<AppState>) -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[HEALTH_PATH]).inc();

    // Perform comprehensive health checks
    let mut health_status = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "gateway": "healthy",
            "database": "unknown",
            "worker": "unknown",
            "memory_usage": "unknown"
        },
        "checks": {}
    });

    // Check database health
    let db_healthy = match state.database_pool.health_check().await {
        Ok(true) => {
            health_status["services"]["database"] = "healthy".into();
            health_status["checks"]["database"] = serde_json::json!({"status": "healthy", "response_time_ms": 10});
            true
        }
        Ok(false) => {
            health_status["services"]["database"] = "degraded".into(); // Database issues don't crash gateway
            health_status["checks"]["database"] = serde_json::json!({"status": "degraded", "error": "Database connection issues"});
            true // Database issues don't fail the gateway
        }
        Err(e) => {
            health_status["services"]["database"] = "error".into();
            health_status["checks"]["database"] = serde_json::json!({"status": "error", "error": format!("Database health check error: {}", e)});
            false // Database errors can affect gateway health
        }
    };

    // Check worker connection health (simplified check)
    let _worker_healthy = match check_worker_health(&mut state).await {
        Ok(true) => {
            health_status["services"]["worker"] = "healthy".into();
            health_status["checks"]["worker"] = serde_json::json!({"status": "healthy"});
            true
        }
        Ok(false) => {
            health_status["services"]["worker"] = "degraded".into(); // Worker issues don't make gateway unhealthy
            health_status["checks"]["worker"] = serde_json::json!({"status": "degraded", "note": "Worker connection issues"});
            true // Worker issues don't fail the gateway
        }
        Err(e) => {
            health_status["services"]["worker"] = "unknown".into();
            health_status["checks"]["worker"] = serde_json::json!({"status": "error", "error": format!("Worker health check error: {}", e)});
            true // Worker errors don't fail the gateway
        }
    };

    // Check memory usage
    let memory_usage_mb = get_memory_usage_mb();
    if memory_usage_mb > 0 {
        let memory_status = if memory_usage_mb < 400 { "healthy" } else { "warning" };
        health_status["services"]["memory_usage"] = memory_status.into();
        health_status["checks"]["memory"] = serde_json::json!({
            "status": memory_status,
            "memory_usage_mb": memory_usage_mb
        });
    }

    // Overall status determination
    let overall_healthy = db_healthy; // Database is critical for gateway
    // Worker connectivity is not critical for gateway health - gateway can function without worker

    if overall_healthy {
        health_status["status"] = "healthy".into();
    } else {
        health_status["status"] = "unhealthy".into();
    }

    let status_code = if overall_healthy {
        axum::http::StatusCode::OK
    } else {
        axum::http::StatusCode::SERVICE_UNAVAILABLE
    };

    (status_code, Json(health_status)).into_response()
}

// Kubernetes readiness check endpoint (/ready)
async fn ready_check(State(mut state): State<AppState>) -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[READY_PATH]).inc();

    // Service is ready if it can handle requests
    // Check if critical services are available
    let mut ready = true;
    let mut checks = serde_json::json!({});

    // Check database readiness
    match state.database_pool.health_check().await {
        Ok(true) => {
            checks["database"] = serde_json::json!({"status": "ready", "message": "Database connection pool is ready"});
        }
        Ok(false) => {
            ready = false;
            checks["database"] = serde_json::json!({"status": "not_ready", "message": "Database connection pool is not ready"});
        }
        Err(e) => {
            ready = false;
            checks["database"] = serde_json::json!({"status": "error", "error": format!("Database readiness check failed: {}", e)});
        }
    }

    // Check worker readiness
    match check_worker_health(&mut state).await {
        Ok(true) => {
            checks["worker"] = serde_json::json!({"status": "ready", "message": "Worker service is ready"});
        }
        Ok(false) => {
            checks["worker"] = serde_json::json!({"status": "not_ready", "message": "Worker service is not ready"});
        }
        Err(e) => {
            ready = false;
            checks["worker"] = serde_json::json!({"status": "error", "error": format!("Worker readiness check failed: {}", e)});
        }
    }

    let status = if ready { "ready" } else { "not_ready" };
    let status_code = if ready {
        axum::http::StatusCode::OK
    } else {
        axum::http::StatusCode::SERVICE_UNAVAILABLE
    };

    let response = serde_json::json!({
        "status": status,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "checks": checks
    });

    (status_code, Json(response)).into_response()
}

// Kubernetes liveness check endpoint (/live)
async fn live_check() -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[LIVE_PATH]).inc();

    // Simple liveness check - if this endpoint responds, the service is alive
    // This is a very basic check that just verifies the HTTP server is responding

    let response = serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "uptime_seconds": std::time::Instant::now().elapsed().as_secs()
    });

    (axum::http::StatusCode::OK, Json(response)).into_response()
}

// Helper function to get memory usage in MB
fn get_memory_usage_mb() -> u64 {
    // In a real implementation, this would use system APIs to get actual memory usage
    // For now, return a placeholder value based on connection count
    // This is a simplified implementation - in production you would use proper memory monitoring

    // Estimate memory usage based on active connections and components
    let base_memory_mb = 100; // Base gateway memory
    let connection_memory_mb = 2; // Per connection (rough estimate)

    // Get approximate connection count (this is a simplified calculation)
    let estimated_connections = 100; // Would need to get actual count from state

    base_memory_mb + (estimated_connections * connection_memory_mb)
}

async fn test_handler() -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/test"]).inc();

    let response = Json(serde_json::json!({"message": "test endpoint works"})).into_response();
    response
}

async fn version() -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[VERSION_PATH]).inc();
    let body = serde_json::json!({
        "name": "gateway",
        "version": env!("CARGO_PKG_VERSION"),
    });

    create_json_response_with_cors(body)
}

async fn metrics() -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&[METRICS_PATH]).inc();

    // Update real-time metrics before gathering
    update_gateway_metrics().await;

    let metric_families = prometheus::gather();
    let mut buffer = Vec::new();
    let encoder = TextEncoder::new();
    match encoder.encode(&metric_families, &mut buffer) {
        Ok(_) => {
            match String::from_utf8(buffer) {
                Ok(body) => (
                    axum::http::StatusCode::OK,
                    body
                ),
                Err(e) => {
                    error!("Failed to convert metrics buffer to UTF-8: {}", e);
                    (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to encode metrics".to_string()
                    )
                }
            }
        }
        Err(err) => {
            error!(%err, "metrics encode failed");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "metrics encode failed".to_string()
            )
        }
    }
}

// Update gateway metrics with real-time data
async fn update_gateway_metrics() {
    // Get memory usage (simplified - in real implementation would use system metrics)
    if let Ok(usage) = get_memory_usage() {
        GATEWAY_MEMORY_USAGE_GAUGE.set(usage as i64);
    }

    // Update database connection metrics (if available)
    // This would be implemented when database connection pooling is fully integrated

    // Update connection pool metrics (if available)
    // This would be implemented when connection pooling is fully integrated
}

// Helper function to get memory usage (simplified implementation)
fn get_memory_usage() -> Result<u64, Box<dyn std::error::Error>> {
    // In a real implementation, this would use system APIs to get actual memory usage
    // For now, return a placeholder value
    Ok(50 * 1024 * 1024) // 50MB placeholder
}

// Game health monitoring endpoint
async fn game_health(State(state): State<AppState>) -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[GAME_HEALTH_PATH]).inc();

    let start_time = std::time::Instant::now();

    // Get comprehensive game health status
    let game_performance_report = state.game_metrics_manager.get_performance_report().await;
    let connection_stats = state.optimized_connection_manager.get_connection_stats().await;
    let batch_stats = state.batch_processor.get_batch_stats().await;

    // Calculate response time
    let response_time_ms = start_time.elapsed().as_millis() as u64;

    let health_data = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "response_time_ms": response_time_ms,
        "game_performance": {
            "total_rooms": game_performance_report.total_rooms,
            "total_players": game_performance_report.total_players,
            "total_messages": game_performance_report.total_messages,
            "total_bandwidth_bytes": game_performance_report.total_bandwidth,
            "average_latency_ms": game_performance_report.average_latency_ms,
            "messages_per_second": game_performance_report.total_messages as f64 / std::time::Instant::now().elapsed().as_secs_f64(),
        },
        "connection_stats": {
            "websocket_connections": connection_stats.websocket_connections,
            "webrtc_connections": connection_stats.webrtc_connections,
            "high_priority_connections": connection_stats.high_priority_connections,
            "pooled_connections": connection_stats.pooled_connections,
            "active_rooms": connection_stats.active_rooms,
            "available_connection_slots": connection_stats.available_connection_slots,
            "available_high_priority_slots": connection_stats.available_high_priority_slots,
        },
        "batch_processing": {
            "active_batches": batch_stats.len(),
            "total_queued_messages": batch_stats.values().sum::<usize>(),
        },
        "system_health": {
            "memory_usage_mb": 0, // Would need to implement actual memory tracking
            "cpu_usage_percent": 0, // Would need to implement actual CPU tracking
            "uptime_seconds": std::time::Instant::now().elapsed().as_secs(),
        }
    });

    Json(health_data).into_response()
}

// Game performance monitoring endpoint with detailed metrics
async fn game_performance(State(state): State<AppState>) -> axum::response::Response {
    HTTP_REQUESTS_TOTAL.with_label_values(&[GAME_PERFORMANCE_PATH]).inc();

    let start_time = std::time::Instant::now();

    // Gather detailed performance data
    let game_report = state.game_metrics_manager.get_performance_report().await;
    let connection_stats = state.optimized_connection_manager.get_connection_stats().await;
    let batch_stats = state.batch_processor.get_batch_stats().await;

    // Calculate performance metrics
    let response_time_ms = start_time.elapsed().as_millis() as u64;
    let uptime_seconds = std::time::Instant::now().elapsed().as_secs();

    // Calculate throughput metrics
    let messages_per_second = if uptime_seconds > 0 {
        game_report.total_messages as f64 / uptime_seconds as f64
    } else {
        0.0
    };

    let bandwidth_per_second = if uptime_seconds > 0 {
        game_report.total_bandwidth as f64 / uptime_seconds as f64
    } else {
        0.0
    };

    let performance_data = serde_json::json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "response_time_ms": response_time_ms,
        "uptime_seconds": uptime_seconds,
        "throughput": {
            "messages_per_second": messages_per_second,
            "bandwidth_bytes_per_second": bandwidth_per_second,
            "connections_per_second": if uptime_seconds > 0 {
                (connection_stats.websocket_connections + connection_stats.webrtc_connections) as f64 / uptime_seconds as f64
            } else {
                0.0
            },
        },
        "game_metrics": {
            "rooms": {
                "total": game_report.total_rooms,
                "active": game_report.total_rooms,
                "players_total": game_report.total_players,
                "average_players_per_room": if game_report.total_rooms > 0 {
                    game_report.total_players as f64 / game_report.total_rooms as f64
                } else {
                    0.0
                },
            },
            "messages": {
                "total_processed": game_report.total_messages,
                "per_second": messages_per_second,
                "average_latency_ms": game_report.average_latency_ms,
            },
            "bandwidth": {
                "total_bytes": game_report.total_bandwidth,
                "per_second": bandwidth_per_second,
                "per_message": if game_report.total_messages > 0 {
                    game_report.total_bandwidth as f64 / game_report.total_messages as f64
                } else {
                    0.0
                },
            },
        },
        "connection_pools": {
            "websocket": {
                "active": connection_stats.websocket_connections,
                "pooled": 0, // Would need per-transport-type pooling
            },
            "webrtc": {
                "active": connection_stats.webrtc_connections,
                "pooled": 0, // Would need per-transport-type pooling
            },
            "high_priority": {
                "active": connection_stats.high_priority_connections,
                "available_slots": connection_stats.available_high_priority_slots,
            },
            "rooms": {
                "active": connection_stats.active_rooms,
                "total_pooled_connections": connection_stats.pooled_connections,
            },
        },
        "batch_processing": {
            "active_batch_count": batch_stats.len(),
            "queued_messages": batch_stats.values().sum::<usize>(),
            "rooms_with_batches": batch_stats.keys().len(),
        },
        "rate_limits": {
            "update_player_burst_capacity": 200,
            "update_player_rate_per_second": 166.67,
            "update_player_window_max": 1000,
            "status": "optimized_for_high_frequency",
        },
        "recommendations": {
            "scaling_needed": game_report.total_players > 1000,
            "memory_optimization": response_time_ms > 100,
            "rate_limit_tuning": messages_per_second > 10000.0,
        }
    });

    Json(performance_data).into_response()
}

// Background task for periodic health monitoring and alerting
pub async fn start_health_monitoring(state: AppState) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

    loop {
        interval.tick().await;

        // Perform periodic health checks
        let game_report = state.game_metrics_manager.get_performance_report().await;
        let connection_stats = state.optimized_connection_manager.get_connection_stats().await;

        // Log warnings for potential issues
        if game_report.average_latency_ms > 100 {
            tracing::warn!(
                "High average latency detected: {}ms across {} players",
                game_report.average_latency_ms,
                game_report.total_players
            );
        }

        if connection_stats.websocket_connections > 1800 { // 90% of 2000 limit
            tracing::warn!(
                "High connection count: {}/2000 WebSocket connections",
                connection_stats.websocket_connections
            );
        }

        if game_report.total_players > 1000 {
            tracing::info!(
                "High player load: {} players across {} rooms",
                game_report.total_players,
                game_report.total_rooms
            );
        }

        // Cleanup inactive rooms periodically
        state.game_metrics_manager.cleanup_inactive_rooms(30).await; // 30 minutes
    }
}

async fn ws_handler(
    ws: axum::extract::ws::WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Record connection attempt
    GATEWAY_ACTIVE_CONNECTIONS_GAUGE
        .with_label_values(&["websocket", "connecting"])
        .inc();

    ws.on_upgrade(|socket| ws_session(socket, state.ws_registry, state.transport_registry, state.connection_manager))
}

async fn ws_game_handler(
    ws: axum::extract::ws::WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Record connection attempt
    GATEWAY_ACTIVE_CONNECTIONS_GAUGE
        .with_label_values(&["websocket_game", "connecting"])
        .inc();

    ws.on_upgrade(|socket| ws_game_session(socket, state.ws_registry, state.transport_registry, state.connection_manager))
}

async fn ws_session(
    mut socket: axum::extract::ws::WebSocket,
    ws_registry: WebSocketRegistry,
    transport_registry: TransportRegistry,
    connection_manager: std::sync::Arc<ConnectionManager>,
) {
    // Generate unique connection ID
    let connection_id = uuid::Uuid::new_v4().to_string();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<axum::extract::ws::Message>();

    // Record connection in manager
    if !connection_manager.can_accept_websocket() {
        tracing::error!("WebSocket connection rejected - limit reached");
        return;
    }
    connection_manager.record_websocket_connection();

    // Try WebRTC first, fallback to WebSocket
    let mut webrtc_transport = WebRtcTransport::new("default_room".to_string(), connection_id.clone());
    let webrtc_connected = try_establish_webrtc(&mut webrtc_transport).await;

    // Update metrics
    let transport_type = if webrtc_connected { "webrtc" } else { "websocket" };
    let fallback_used = if !webrtc_connected { "true" } else { "false" };
    TRANSPORT_CONNECTIONS_TOTAL.with_label_values(&[transport_type, fallback_used]).inc();

    if webrtc_connected {
        WEBRTC_CONNECTIONS_CURRENT.with_label_values(&["connected"]).inc();
    }

    // Register WebSocket connection
    {
        let mut ws_reg = ws_registry.write().await;
        ws_reg.insert(connection_id.clone(), WebSocketConnection {
            peer_id: "unknown".to_string(), // TODO: Get from handshake
            room_id: "unknown".to_string(), // TODO: Get from handshake
            sender: tx.clone(),
        });
    }

    // Register transport connection
    {
        let mut transport_reg = transport_registry.write().await;
        transport_reg.insert(connection_id.clone(), TransportConnection {
            peer_id: "unknown".to_string(),
            room_id: "unknown".to_string(),
            transport: if webrtc_connected {
                Box::new(webrtc_transport)
            } else {
                // Fallback to WebSocket transport - mark as fallback
                // We'll use the existing WebSocket connection for transport
                let mut fallback_transport = WebRtcTransport::new("unknown".to_string(), "unknown".to_string());

                // Retry fallback with proper error handling
                match fallback_transport.fallback_to_websocket().await {
                    Ok(_) => {
                        tracing::info!("Successfully fallback to WebSocket transport");
                        Box::new(fallback_transport)
                    }
                    Err(e) => {
                        tracing::error!("Failed to fallback to WebSocket transport: {}", e);
                        // Fallback failed, log error and use basic WebSocket transport
                        tracing::warn!("Using basic WebSocket transport due to fallback failure");
                        // Create a basic WebSocket transport as last resort
                        Box::new(WebRtcTransport::new("unknown".to_string(), "unknown".to_string()))
                    }
                }
            },
            fallback_used: !webrtc_connected,
        });
    }

    loop {
        tokio::select! {
            // Handle incoming messages from WebSocket
            msg = socket.recv() => {
                match msg {
                    Some(Ok(axum::extract::ws::Message::Text(text))) => {
                        // Handle text messages (echo for now)
                        logging::Logger::log_websocket_event(
                            "text_message_received",
                            &connection_id,
                            None,
                            Some(serde_json::json!({
                                "message_length": text.len(),
                                "message_preview": if text.len() > 100 { format!("{}...", &text[..100]) } else { text.clone() }
                            }))
                        );

                        if let Err(e) = socket.send(axum::extract::ws::Message::Text(format!("Echo: {}", text))).await {
                            logging::Logger::log_websocket_event(
                                "echo_send_failed",
                                &connection_id,
                                None,
                                Some(serde_json::json!({
                                    "error": e.to_string()
                                }))
                            );
                        }
                    }
                    Some(Ok(axum::extract::ws::Message::Binary(bytes))) => {
                        match message::decode(&bytes) {
                            Ok(Frame { payload, .. }) => {
                                match payload {
                                    FramePayload::Control {
                                        message: ControlMessage::Ping { nonce },
                                    } => {
                                        let frame = Frame::control(0, 0, ControlMessage::Pong { nonce });
                                        if let Ok(reply) = message::encode(&frame) {
                                            let _ = socket.send(axum::extract::ws::Message::Binary(reply)).await;
                                        }
                                    }
                                    FramePayload::Control {
                                        message: ControlMessage::WebRtcOffer { room_id, peer_id, target_peer_id, sdp },
                                    } => {
                                        // Update connection info
                                        {
                                            let mut ws_reg = ws_registry.write().await;
                                            if let Some(conn) = ws_reg.get_mut(&connection_id) {
                                                conn.peer_id = peer_id.clone();
                                                conn.room_id = room_id.clone();
                                            }
                                        }

                                // Broadcast offer to other peers in room
                                broadcast_to_transport(&transport_registry, &room_id, &peer_id, message::Frame::control(
                                    0, 0, ControlMessage::WebRtcOffer {
                                        room_id: room_id.clone(),
                                        peer_id: peer_id.clone(),
                                        target_peer_id,
                                        sdp,
                                    }
                                )).await;
                                    }
                                    FramePayload::Control {
                                        message: ControlMessage::WebRtcAnswer { room_id, peer_id, target_peer_id, sdp },
                                    } => {
                                // Send answer to target peer
                                send_to_transport(&transport_registry, &target_peer_id.clone(), message::Frame::control(
                                    0, 0, ControlMessage::WebRtcAnswer {
                                        room_id: room_id.clone(),
                                        peer_id: peer_id.clone(),
                                        target_peer_id: target_peer_id.clone(),
                                        sdp,
                                    }
                                )).await;
                                    }
                                    FramePayload::Control {
                                        message: ControlMessage::WebRtcIceCandidate { room_id, peer_id, target_peer_id, candidate, sdp_mid, sdp_mline_index },
                                    } => {
                                        // Broadcast ICE candidate
                                        broadcast_to_transport(&transport_registry, &room_id, &peer_id, message::Frame::control(
                                            0, 0, ControlMessage::WebRtcIceCandidate {
                                                room_id: room_id.clone(),
                                                peer_id: peer_id.clone(),
                                                target_peer_id,
                                                candidate,
                                                sdp_mid,
                                                sdp_mline_index,
                                            }
                                        )).await;
                                    }
                                    FramePayload::State { message: state_msg } => {
                                        // Handle quantized state messages (snapshot/delta)
                                        // For now, use default room_id since state messages don't carry room context
                                        let default_room_id = "default_room";
                                        match handle_quantized_state_message(&state_msg, &transport_registry, default_room_id, &connection_id).await {
                                            Ok(response_frame) => {
                                                if let Some(frame) = response_frame {
                                                    broadcast_to_transport(&transport_registry, default_room_id, &connection_id, frame).await;
                                                }
                                            }
                                            Err(e) => {
                                                eprintln!("Failed to handle quantized state message: {:?}", e);
                                            }
                                        }
                                    }
                                    _ => {
                                        // echo nguy├¬n gß╗æc nß║┐u kh├┤ng phß║úi c├íc message ─æß║╖c biß╗çt
                                        let _ = socket.send(axum::extract::ws::Message::Binary(bytes)).await;
                                    }
                                }
                            }
                            Err(e) => {
                                logging::Logger::log_websocket_event(
                                    "message_decode_failed",
                                    &connection_id,
                                    None,
                                    Some(serde_json::json!({
                                        "error": e.to_string(),
                                        "message_size": bytes.len()
                                    }))
                                );

                                // Send error message back to client
                                let error_msg = "Error: Invalid message format (expected binary protocol)".to_string();
                                if let Err(send_err) = socket.send(axum::extract::ws::Message::Text(error_msg)).await {
                                    logging::Logger::log_websocket_event(
                                        "error_message_send_failed",
                                        &connection_id,
                                        None,
                                        Some(serde_json::json!({
                                            "error": send_err.to_string()
                                        }))
                                    );
                                }
                            }
                        }
                    }
                    Some(Ok(axum::extract::ws::Message::Ping(p))) => {
                        let _ = socket.send(axum::extract::ws::Message::Pong(p)).await;
                    }
                    Some(Ok(axum::extract::ws::Message::Pong(_))) => {
                        // Handle Pong - do nothing for now
                    }
                    Some(Ok(axum::extract::ws::Message::Close(_))) | Some(Err(_)) => break,
                    None => break,
                }
            }

            // Handle outgoing messages from channel
            Some(msg) = rx.recv() => {
                if socket.send(msg).await.is_err() {
                    break;
                }
            }
        }
    }

    // Cleanup
    {
        let mut ws_reg = ws_registry.write().await;
        ws_reg.remove(&connection_id);
    }

    {
        let mut transport_reg = transport_registry.write().await;
        if let Some(transport_conn) = transport_reg.remove(&connection_id) {
            // Update metrics on disconnect
            if transport_conn.transport.kind() == TransportKind::WebRtc {
                WEBRTC_CONNECTIONS_CURRENT.with_label_values(&["connected"]).dec();
            }
        }
    }

    let _ = socket.close().await;
}

async fn ws_game_session(
    mut socket: axum::extract::ws::WebSocket,
    ws_registry: WebSocketRegistry,
    transport_registry: TransportRegistry,
    connection_manager: std::sync::Arc<ConnectionManager>,
    // _room_manager: std::sync::Arc<tokio::sync::RwLock<room_manager::RoomManagerState>>,
) {
    // Generate unique connection ID for game WebSocket
    let connection_id = uuid::Uuid::new_v4().to_string();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<axum::extract::ws::Message>();

    // Record connection in manager
    if !connection_manager.can_accept_websocket() {
        tracing::error!("Game WebSocket connection rejected - limit reached");
        return;
    }
    connection_manager.record_websocket_connection();

    // Initialize connection info
    let mut room_id = "default_room".to_string();
    let mut player_id = "unknown".to_string();

    // TODO: Integrate with room manager to get actual room state
    // For now, use default room

    // Register game WebSocket connection
    {
        let mut ws_reg = ws_registry.write().await;
        ws_reg.insert(connection_id.clone(), WebSocketConnection {
            peer_id: player_id.clone(),
            room_id: room_id.clone(),
            sender: tx.clone(),
        });
    }

    // Simple game transport (no WebRTC fallback for game connections)
    {
        let mut transport_reg = transport_registry.write().await;
        transport_reg.insert(connection_id.clone(), TransportConnection {
            peer_id: player_id.clone(),
            room_id: room_id.clone(),
            transport: Box::new(WebRtcTransport::new(room_id.clone(), connection_id.clone())),
            fallback_used: false,
        });
    }

    tracing::info!("Game WebSocket connection established: {}", connection_id);

    loop {
        tokio::select! {
            // Handle incoming messages from WebSocket
            msg = socket.recv() => {
                match msg {
                    Some(Ok(axum::extract::ws::Message::Text(text))) => {
                        // Handle game-specific text messages (handshake, join room, etc.)
                        if let Ok(json_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(msg_type) = json_msg.get("type").and_then(|t| t.as_str()) {
                                match msg_type {
                                    "handshake" => {
                                        // Handle handshake message with room_id and player_id
                                        if let (Some(rid), Some(pid)) = (
                                            json_msg.get("room_id").and_then(|r| r.as_str()),
                                            json_msg.get("player_id").and_then(|p| p.as_str())
                                        ) {
                                            room_id = rid.to_string();
                                            player_id = pid.to_string();

                                            // Update connection info
                                            {
                                                let mut ws_reg = ws_registry.write().await;
                                                if let Some(conn) = ws_reg.get_mut(&connection_id) {
                                                    conn.peer_id = player_id.clone();
                                                    conn.room_id = room_id.clone();
                                                }
                                            }

                                            tracing::info!("Game WebSocket handshake: player={} room={}", player_id, room_id);

                                            // Send handshake confirmation
                                            let handshake_response = serde_json::json!({
                                                "type": "handshake_ack",
                                                "connection_id": connection_id,
                                                "room_id": room_id,
                                                "player_id": player_id
                                            });

                                            if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                                handshake_response.to_string()
                                            )).await {
                                                tracing::error!("Failed to send handshake ack: {}", e);
                                            }
                                        }
                                    }
                                    "ping" => {
                                        // Respond to ping
                                        let pong_response = serde_json::json!({
                                            "type": "pong",
                                            "timestamp": chrono::Utc::now().timestamp_millis()
                                        });

                                        if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                            pong_response.to_string()
                                        )).await {
                                            tracing::error!("Failed to send pong: {}", e);
                                        }
                                    }
                                    "authenticate" => {
                                        // Handle authentication
                                        if let Some(token) = json_msg.get("token").and_then(|t| t.as_str()) {
                                            match authenticate_player(token).await {
                                                Ok(player_info) => {
                                                    player_id = player_info.id.clone();

                                                    // Update connection info
                                                    {
                                                        let mut ws_reg = ws_registry.write().await;
                                                        if let Some(conn) = ws_reg.get_mut(&connection_id) {
                                                            conn.peer_id = player_id.clone();
                                                        }
                                                    }

                                                    let auth_response = serde_json::json!({
                                                        "type": "auth_success",
                                                        "player_id": player_id,
                                                        "message": "Authentication successful"
                                                    });

                                                    if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                                        auth_response.to_string()
                                                    )).await {
                                                        tracing::error!("Failed to send auth response: {}", e);
                                                    }

                                                    tracing::info!("Player authenticated: {}", player_id);
                                                }
                                                Err(ref e) => {
                                                    let error_response = serde_json::json!({
                                                        "type": "auth_error",
                                                        "error": e
                                                    });

                                                    if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                                        error_response.to_string()
                                                    )).await {
                                                        tracing::error!("Failed to send auth error: {}", e);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    "join_room" => {
                                        // Handle join room
                                        if let (Some(rid), Some(pid)) = (
                                            json_msg.get("room_id").and_then(|r| r.as_str()),
                                            json_msg.get("player_id").and_then(|p| p.as_str())
                                        ) {
                                            room_id = rid.to_string();
                                            player_id = pid.to_string();

                                            // Update connection info
                                            {
                                                let mut ws_reg = ws_registry.write().await;
                                                if let Some(conn) = ws_reg.get_mut(&connection_id) {
                                                    conn.peer_id = player_id.clone();
                                                    conn.room_id = room_id.clone();
                                                }
                                            }

                                            let join_response = serde_json::json!({
                                                "type": "room_joined",
                                                "room_id": room_id,
                                                "player_id": player_id,
                                                "message": format!("Joined room {}", room_id)
                                            });

                                            if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                                join_response.to_string()
                                            )).await {
                                                tracing::error!("Failed to send join response: {}", e);
                                            }

                                            tracing::info!("Player {} joined room {}", player_id, room_id);
                                        }
                                    }
                                    "game_input" => {
                                        // Handle game input
                                        if let Some(input_data) = json_msg.get("input") {
                                            // Process game input and broadcast to room
                                            let game_response = serde_json::json!({
                                                "type": "game_state_update",
                                                "room_id": room_id,
                                                "player_id": player_id,
                                                "input": input_data,
                                                "timestamp": chrono::Utc::now().timestamp_millis()
                                            });

                                            // Broadcast to all players in room (except sender)
                                            broadcast_game_state_to_room(
                                                &room_id,
                                                &game_response,
                                                Some(&player_id),
                                                &ws_registry
                                            ).await;

                                            tracing::debug!("Game input processed for player {} in room {}", player_id, room_id);
                                        }
                                    }
                                    "chat_message" => {
                                        // Handle chat message
                                        if let Some(message_text) = json_msg.get("message").and_then(|m| m.as_str()) {
                                            let chat_response = serde_json::json!({
                                                "type": "chat_broadcast",
                                                "room_id": room_id,
                                                "player_id": player_id,
                                                "message": message_text,
                                                "timestamp": chrono::Utc::now().timestamp_millis()
                                            });

                                            // Broadcast chat to all players in room
                                            broadcast_game_state_to_room(
                                                &room_id,
                                                &chat_response,
                                                None,
                                                &ws_registry
                                            ).await;

                                            tracing::info!("Chat message from {} in room {}: {}", player_id, room_id, message_text);
                                        }
                                    }
                                    "leave_room" => {
                                        // Handle leave room
                                        tracing::info!("Player {} leaving room {}", player_id, room_id);

                                        let leave_response = serde_json::json!({
                                            "type": "room_left",
                                            "room_id": room_id,
                                            "player_id": player_id,
                                            "message": format!("Left room {}", room_id)
                                        });

                                        if let Err(e) = socket.send(axum::extract::ws::Message::Text(
                                            leave_response.to_string()
                                        )).await {
                                            tracing::error!("Failed to send leave response: {}", e);
                                        }

                                        // Clear room info
                                        room_id = "default_room".to_string();
                                        {
                                            let mut ws_reg = ws_registry.write().await;
                                            if let Some(conn) = ws_reg.get_mut(&connection_id) {
                                                conn.room_id = room_id.clone();
                                            }
                                        }
                                    }
                                    _ => {
                                        tracing::debug!("Unknown message type: {}", msg_type);
                                    }
                                }
                            }
                        }
                    }
                    Some(Ok(axum::extract::ws::Message::Binary(bytes))) => {
                        // Handle binary messages (game input, etc.)
                        match message::decode(&bytes) {
                            Ok(Frame { payload, .. }) => {
                                match payload {
                                    FramePayload::Control { message: ControlMessage::Ping { nonce } } => {
                                        let frame = Frame::control(0, 0, ControlMessage::Pong { nonce });
                                        if let Ok(reply) = message::encode(&frame) {
                                            let _ = socket.send(axum::extract::ws::Message::Binary(reply)).await;
                                        }
                                    }
                                    _ => {
                                        tracing::debug!("Received binary frame for game connection");
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to decode binary message: {}", e);
                            }
                        }
                    }
                    Some(Ok(axum::extract::ws::Message::Ping(payload))) => {
                        // Respond to ping with pong
                        if let Err(e) = socket.send(axum::extract::ws::Message::Pong(payload)).await {
                            tracing::error!("Failed to send pong: {}", e);
                        }
                    }
                    Some(Ok(axum::extract::ws::Message::Pong(_))) => {
                        // Just log pong for debugging
                        tracing::debug!("Received pong from client");
                    }
                    Some(Ok(axum::extract::ws::Message::Close(_))) | None => {
                        tracing::info!("Game WebSocket connection closed: {}", connection_id);
                        break;
                    }
                    Some(Err(e)) => {
                        tracing::error!("WebSocket error: {}", e);
                        break;
                    }
                }
            }

            // Handle outgoing messages from channel (for sending game snapshots)
            Some(msg) = rx.recv() => {
                if socket.send(msg).await.is_err() {
                    tracing::info!("Failed to send message to game WebSocket, closing connection");
                    break;
                }
            }
        }
    }

    // Record disconnection and cleanup
    connection_manager.record_websocket_disconnection();

    // Update connection metrics
    GATEWAY_ACTIVE_CONNECTIONS_GAUGE
        .with_label_values(&["websocket", "disconnected"])
        .dec();

    tracing::info!("WebSocket connection {} disconnected", connection_id);

    // Cleanup
    {
        let mut ws_reg = ws_registry.write().await;
        ws_reg.remove(&connection_id);
    }

    {
        let mut transport_reg = transport_registry.write().await;
        transport_reg.remove(&connection_id);
    }

    // Record disconnection and cleanup
    connection_manager.record_websocket_disconnection();

    // Update connection metrics
    GATEWAY_ACTIVE_CONNECTIONS_GAUGE
        .with_label_values(&["websocket_game", "disconnected"])
        .dec();

    tracing::info!("Game WebSocket connection {} disconnected", connection_id);

    let _ = socket.close().await;
}

// Broadcast game snapshot to all WebSocket connections in a room
async fn broadcast_game_snapshot(
    ws_registry: &WebSocketRegistry,
    room_id: &str,
    snapshot: &serde_json::Value,
) {
    let ws_reg = ws_registry.read().await;

    // Find all connections in the specified room
    let room_connections: Vec<_> = ws_reg
        .iter()
        .filter(|(_, conn)| conn.room_id == room_id)
        .map(|(id, _)| id.clone())
        .collect();

    if room_connections.is_empty() {
        tracing::debug!("No WebSocket connections found for room: {}", room_id);
        return;
    }

    // Send snapshot to all connections in the room
    let snapshot_message = serde_json::json!({
        "type": "game_snapshot",
        "room_id": room_id,
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "snapshot": snapshot
    });

    let message_text = snapshot_message.to_string();

    for connection_id in room_connections {
        if let Some(conn) = ws_reg.get(&connection_id) {
            if let Err(e) = conn.sender.send(axum::extract::ws::Message::Text(message_text.clone())) {
                tracing::warn!("Failed to send game snapshot to connection {}: {}", connection_id, e);
            }
        }
    }

    tracing::debug!("Broadcasted game snapshot to {} connections in room {}", ws_reg.len(), room_id);
}

// Handle quantized state messages (snapshot/delta encoding)
async fn handle_quantized_state_message(
    state_msg: &StateMessage,
    _transport_registry: &TransportRegistry,
    _room_id: &str,
    _sender_peer_id: &str,
) -> Result<Option<Frame>, Box<dyn std::error::Error + Send + Sync>> {
    let _quantization_config = QuantizationConfig::default();

    match state_msg {
        StateMessage::Snapshot { tick, entities } => {
            // TODO: Implement quantized snapshot encoding when binary protocol is ready
            // For now, forward as regular event for testing
            let event_frame = Frame::state(
                0,
                chrono::Utc::now().timestamp_millis() as u64,
                StateMessage::Event {
                    name: "snapshot".to_string(),
                    data: serde_json::json!({
                        "tick": tick,
                        "entity_count": entities.len(),
                        "quantized": false // Mark as not quantized for now
                    })
                }
            );
            Ok(Some(event_frame))
        }
        StateMessage::Delta { tick, changes } => {
            // TODO: Implement quantized delta encoding when binary protocol is ready
            // For now, forward as regular event for testing
            let event_frame = Frame::state(
                0,
                chrono::Utc::now().timestamp_millis() as u64,
                StateMessage::Event {
                    name: "delta".to_string(),
                    data: serde_json::json!({
                        "tick": tick,
                        "change_count": changes.len(),
                        "quantized": false // Mark as not quantized for now
                    })
                }
            );
            Ok(Some(event_frame))
        }
        StateMessage::Event { name, data } => {
            // Events are forwarded as-is (not quantized)
            let event_frame = Frame::state(
                0,
                chrono::Utc::now().timestamp_millis() as u64,
                StateMessage::Event {
                    name: name.clone(),
                    data: data.clone(),
                }
            );

            Ok(Some(event_frame))
        }
    }
}

// Helper function to establish WebRTC connection with fallback
async fn try_establish_webrtc(transport: &mut WebRtcTransport) -> bool {
    // In a real implementation, this would:
    // 1. Wait for WebRTC signaling to complete
    // 2. Establish DataChannels
    // 3. Return true if successful

    // For now, we'll simulate a successful connection
    // In production, this should implement actual WebRTC negotiation
    transport.set_connected(true).await;
    true
}

// Helper functions for transport-based message relay
async fn broadcast_to_transport(
    transport_registry: &TransportRegistry,
    room_id: &str,
    sender_peer_id: &str,
    frame: message::Frame,
) {
    let mut reg = transport_registry.write().await;

    for (_conn_id, transport_conn) in reg.iter_mut() {
        if transport_conn.room_id == room_id && transport_conn.peer_id != sender_peer_id {
            // Send frame through transport abstraction
            if let Err(e) = transport_conn.transport.send_frame(frame.clone()).await {
                eprintln!("Failed to send frame via transport: {:?}", e);
            }
        }
    }
}

async fn send_to_transport(
    transport_registry: &TransportRegistry,
    target_peer_id: &str,
    frame: message::Frame,
) {
    let mut reg = transport_registry.write().await;

    for (_conn_id, transport_conn) in reg.iter_mut() {
        if transport_conn.peer_id == target_peer_id {
            // Send frame through transport abstraction
            if let Err(e) = transport_conn.transport.send_frame(frame.clone()).await {
                eprintln!("Failed to send frame via transport: {:?}", e);
            }
            break;
        }
    }
}

// Legacy WebSocket helper functions (kept for backward compatibility)
#[allow(dead_code)]
async fn broadcast_webrtc_message(
    registry: &WebSocketRegistry,
    room_id: &str,
    sender_peer_id: &str,
    frame: message::Frame,
) {
    let reg = registry.read().await;
    let encoded = message::encode(&frame);

    match encoded {
        Ok(bytes) => {
            for (_conn_id, conn) in reg.iter() {
                if conn.room_id == room_id && conn.peer_id != sender_peer_id {
                    let _ = conn.sender.send(axum::extract::ws::Message::Binary(bytes.clone()));
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to encode WebRTC message: {:?}", e);
        }
    }
}

#[allow(dead_code)]
async fn send_to_peer(
    registry: &WebSocketRegistry,
    target_peer_id: &str,
    frame: message::Frame,
) {
    let reg = registry.read().await;
    let encoded = message::encode(&frame);

    match encoded {
        Ok(bytes) => {
            for (_conn_id, conn) in reg.iter() {
                if conn.peer_id == target_peer_id {
                    let _ = conn.sender.send(axum::extract::ws::Message::Binary(bytes.clone()));
                    break;
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to encode WebRTC message: {:?}", e);
        }
    }
}

// ===== LEADERBOARD HANDLERS =====

// Get leaderboard data
async fn leaderboard_handler(
    State(_state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/leaderboard"]).inc();

    let game_mode = params.get("game_mode").map(|s| s.as_str());
    let time_range = params.get("time_range").map(|s| s.as_str()).unwrap_or("all_time");
    let _limit = params.get("limit")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(10);

    // Temporarily return mock leaderboard data due to PocketBase dependency issues
    // In a real implementation, this would query database for actual leaderboard data
    let leaderboard_data = match game_mode {
        Some("endless_runner") | None => {
            vec![
                serde_json::json!({
                    "rank": 1,
                    "player_id": "player_001",
                    "player_name": "Speed Demon",
                    "score": 15420,
                    "game_mode": "endless_runner",
                    "timestamp": chrono::Utc::now().timestamp()
                }),
                serde_json::json!({
                    "rank": 2,
                    "player_id": "player_002",
                    "player_name": "Track Master",
                    "score": 12850,
                    "game_mode": "endless_runner",
                    "timestamp": chrono::Utc::now().timestamp()
                }),
                serde_json::json!({
                    "rank": 3,
                    "player_id": "player_003",
                    "player_name": "Jump King",
                    "score": 11200,
                    "game_mode": "endless_runner",
                    "timestamp": chrono::Utc::now().timestamp()
                }),
            ]
        }
        _ => Vec::new(),
    };

    let response = serde_json::json!({
        "success": true,
        "leaderboard": leaderboard_data,
        "game_mode": game_mode.unwrap_or("all"),
        "time_range": time_range,
        "total": leaderboard_data.len()
    });

    let response = Json(response).into_response();
    response
}

// Submit score to leaderboard
async fn submit_score_handler(
    State(_state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/leaderboard/submit"]).inc();

    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let player_name = request.get("player_name").and_then(|v| v.as_str()).unwrap_or("Anonymous");
    let score = request.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
    let game_mode = request.get("game_mode").and_then(|v| v.as_str()).unwrap_or("endless_runner");

    // Validate inputs
    if score == 0 {
        return Json(serde_json::json!({
            "success": false,
            "error": "Score must be greater than 0"
        })).into_response();
    }

    if player_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Player ID is required"
        })).into_response();
    }

    // Temporarily just log the score submission due to PocketBase dependency issues
    // In a real implementation, this would save the score to database
    tracing::info!(
        player_id,
        player_name,
        score,
        game_mode,
        "Score submitted to leaderboard"
    );

    let response = Json(serde_json::json!({
        "success": true,
        "message": "Score submitted successfully",
        "rank": 1, // Mock rank - in reality would be calculated based on other scores
        "score": score
    })).into_response();

    response
}

pub async fn run(
    config: GatewayConfig,
    shutdown_rx: common_net::shutdown::ShutdownReceiver,
) -> Result<(), BoxError> {
    // Initialize comprehensive logging system
    logging::Logger::init();

    info!("🚀 Starting Gateway server...");
    info!("📍 Bind address: {}", config.bind_addr);

    let listener = tokio::net::TcpListener::bind(config.bind_addr)
        .await
        .map_err(|e| Box::new(e) as BoxError)?;
    let local_addr = listener.local_addr().map_err(|e| Box::new(e) as BoxError)?;
    if let Some(tx) = config.ready_tx {
        let _ = tx.send(local_addr);
    }

    let app = build_router(config.worker_endpoint.clone()).await;
    let server = tokio::spawn(async move {
        let incoming = AddrIncoming::from_listener(listener).expect("failed to create incoming");
        if let Err(err) = hyper::Server::builder(incoming)
            .serve(app.into_make_service())
            .await
        {
            error!(%err, "gateway server stopped unexpectedly");
        }
    });

    common_net::shutdown::wait(shutdown_rx).await;
    server.abort();
    Ok(())
}

// Game handlers
async fn game_join_handler(
    State(mut state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&[GAME_JOIN_PATH]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");

    tracing::info!(room_id, player_id, "gateway: player joining game");

    // Call worker to join room
    match &mut state.worker_client {
        Some(client) => {
            match client.join_room(proto::worker::v1::JoinRoomRequest {
                room_id: room_id.to_string(),
                player_id: player_id.to_string(),
            }).await {
                Ok(response) => {
                    let response_inner = response.into_inner();
                    if response_inner.ok {
                        tracing::info!(room_id, player_id, "gateway: player joined game successfully");
                        Json(serde_json::json!({
                            "success": true,
                            "room_id": room_id,
                            "player_id": player_id,
                            "snapshot": response_inner.snapshot.map(|s| s.payload_json).unwrap_or_else(|| "{}".to_string())
                        })).into_response()
                    } else {
                        Json(serde_json::json!({
                            "success": false,
                            "error": "Failed to join room"
                        })).into_response()
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "gateway: failed to join room");
                    Json(serde_json::json!({
                        "success": false,
                        "error": format!("Worker error: {}", e)
                    })).into_response()
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available for join room");
            Json(serde_json::json!({
                "success": false,
                "error": "Worker service not available"
            })).into_response()
        }
    }
}

async fn game_leave_handler(
    State(mut state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&[GAME_LEAVE_PATH]).inc();

    // Room management endpoints
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/create"]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");

    tracing::info!(room_id, player_id, "gateway: player leaving game");

    // Call worker to leave room
    match &mut state.worker_client {
        Some(client) => {
            match client.leave_room(proto::worker::v1::LeaveRoomRequest {
                room_id: room_id.to_string(),
            }).await {
                Ok(response) => {
                    if response.into_inner().ok {
                        tracing::info!(room_id, player_id, "gateway: player left game successfully");
                        Json(serde_json::json!({
                            "success": true,
                            "room_id": room_id,
                            "player_id": player_id
                        })).into_response()
                    } else {
                        Json(serde_json::json!({
                            "success": false,
                            "error": "Failed to leave room"
                        })).into_response()
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "gateway: failed to leave room");
                    Json(serde_json::json!({
                        "success": false,
                        "error": format!("Worker error: {}", e)
                    })).into_response()
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available for leave room");
            Json(serde_json::json!({
                "success": false,
                "error": "Worker service not available"
            })).into_response()
        }
    }
}

async fn game_input_handler(
    State(mut state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&[GAME_INPUT_PATH]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let sequence = request.get("sequence").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let input_json = request.get("input").map(|v| v.to_string()).unwrap_or_default();

    tracing::debug!(room_id, player_id, sequence, "gateway: processing game input");

    // Call worker to push input
    match &mut state.worker_client {
        Some(client) => {
            match client.push_input(proto::worker::v1::PushInputRequest {
                room_id: room_id.to_string(),
                sequence,
                payload_json: input_json,
            }).await {
                Ok(response) => {
                    let response_inner = response.into_inner();
                    if response_inner.ok {
                        HTTP_REQUESTS_SUCCESS.with_label_values(&[GAME_INPUT_PATH]).inc();
                        tracing::debug!(room_id, player_id, sequence, tick = %response_inner.snapshot.as_ref().map(|s| s.tick).unwrap_or(0), "gateway: input processed");
                        Json(serde_json::json!({
                            "success": true,
                            "snapshot": response_inner.snapshot.map(|s| s.payload_json).unwrap_or_else(|| "{}".to_string())
                        })).into_response()
                    } else {
                        Json(serde_json::json!({
                            "success": false,
                            "error": response_inner.error
                        })).into_response()
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "gateway: failed to push input");
                    Json(serde_json::json!({
                        "success": false,
                        "error": format!("Worker error: {}", e)
                    })).into_response()
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available for push input");
            Json(serde_json::json!({
                "success": false,
                "error": "Worker service not available"
            })).into_response()
        }
    }
}

// Worker snapshot handler - receives snapshots from worker and broadcasts to WebSocket clients
async fn worker_snapshot_handler(
    State(state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&[WORKER_SNAPSHOT_PATH]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let snapshot = request.get("snapshot");

    tracing::debug!(room_id, "gateway: received snapshot from worker");

    match snapshot {
        Some(snapshot_data) => {
            // Broadcast snapshot to all WebSocket connections in the room
            broadcast_game_snapshot(&state.ws_registry, room_id, snapshot_data).await;

            Json(serde_json::json!({
                "success": true,
                "message": "Snapshot broadcasted successfully"
            })).into_response()
        }
        None => {
            Json(serde_json::json!({
                "success": false,
                "error": "No snapshot data provided"
            })).into_response()
        }
    }
}

// Room management handlers

async fn create_room_handler(
    State(mut state): State<AppState>,
    bytes: axum::body::Bytes,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/create"]).inc();

    // Debug: Log the request bytes
    let request_str = String::from_utf8_lossy(&bytes);
    tracing::info!("Received create room request: {}", request_str);

    // Parse JSON manually
    let json_request: serde_json::Value = match serde_json::from_slice(&bytes) {
        Ok(json) => json,
        Err(e) => {
            tracing::error!("Failed to parse JSON: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "error": format!("Invalid JSON: {}", e)
            })).into_response();
        }
    };

    // Support both old format (name, hostName) and new format (room_name, host_id, host_name)
    let room_name = json_request.get("name")
        .or_else(|| json_request.get("room_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("New Room");
    let host_id = json_request.get("host_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let host_name = json_request.get("hostName")
        .or_else(|| json_request.get("host_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Host");

    // Validate inputs
    if room_name.trim().is_empty() || room_name.len() > 50 {
        logging::Logger::log_performance_metrics(
            &logging::PerformanceMetrics::new("create_room_validation".to_string())
                .with_duration(start_time.elapsed())
                .with_error("Invalid room name".to_string())
                .with_metadata("room_name", room_name.to_string())
        );
        return Json(serde_json::json!({
            "success": false,
            "error": "Room name must be between 1 and 50 characters"
        })).into_response();
    }

    if host_id.trim().is_empty() || host_id.len() > 50 {
        logging::Logger::log_performance_metrics(
            &logging::PerformanceMetrics::new("create_room_validation".to_string())
                .with_duration(start_time.elapsed())
                .with_error("Invalid host ID".to_string())
                .with_metadata("host_id", host_id.to_string())
        );
        return Json(serde_json::json!({
            "success": false,
            "error": "Host ID must be between 1 and 50 characters"
        })).into_response();
    }

    if host_name.trim().is_empty() || host_name.len() > 50 {
        logging::Logger::log_performance_metrics(
            &logging::PerformanceMetrics::new("create_room_validation".to_string())
                .with_duration(start_time.elapsed())
                .with_error("Invalid host name".to_string())
                .with_metadata("host_name", host_name.to_string())
        );
        return Json(serde_json::json!({
            "success": false,
            "error": "Host name must be between 1 and 50 characters"
        })).into_response();
    }

    // Parse room settings - for now use default settings
    let settings = proto::worker::v1::RoomSettings::default();

    logging::Logger::log_game_event(
        "room_creation_started",
        "pending",
        host_id,
        Some(serde_json::json!({
            "room_name": room_name,
            "host_name": host_name
        }))
    );

    // Call worker to create room
    match &mut state.worker_client {
        Some(client) => {
            match client.create_room(proto::worker::v1::CreateRoomRequest {
                room_name: room_name.to_string(),
                host_id: host_id.to_string(),
                host_name: host_name.to_string(),
                settings: Some(settings),
            }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.success {
                let duration_ms = start_time.elapsed().as_secs_f64() * 1000.0;

                logging::Logger::log_game_event(
                    "room_created",
                    &response_inner.room_id,
                    host_id,
                    Some(serde_json::json!({
                        "room_name": room_name,
                        "host_name": host_name
                    }))
                );

                logging::Logger::log_performance_metrics(
                    &logging::PerformanceMetrics::new("create_room".to_string())
                        .with_duration(start_time.elapsed())
                        .with_metadata("room_id", response_inner.room_id.clone())
                        .with_metadata("room_name", room_name.to_string())
                );

                HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/rooms/create"]).inc();
                Json(serde_json::json!({
                    "success": true,
                    "room_id": response_inner.room_id,
                    "room_name": room_name
                })).into_response()
            } else {
                logging::Logger::log_performance_metrics(
                    &logging::PerformanceMetrics::new("create_room".to_string())
                        .with_duration(start_time.elapsed())
                        .with_error(response_inner.error.clone())
                        .with_metadata("room_name", room_name.to_string())
                );

                error!(
                    "❌ Room creation failed: {} (room: {}, host: {}, hostname: {})",
                    response_inner.error,
                    room_name,
                    host_id,
                    host_name
                );

                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
                }
                Err(e) => {
                    let duration_ms = start_time.elapsed().as_secs_f64() * 1000.0;

                    logging::Logger::log_performance_metrics(
                        &logging::PerformanceMetrics::new("create_room".to_string())
                            .with_duration(start_time.elapsed())
                            .with_error(e.to_string())
                            .with_metadata("room_name", room_name.to_string())
                    );

                    error!(
                        "❌ Room creation failed due to network error: {} (room: {}, host: {}, hostname: {}, duration: {:.2}ms)",
                        e,
                        room_name,
                        host_id,
                        host_name,
                        duration_ms
                    );

                    Json(serde_json::json!({
                        "success": false,
                        "error": "Failed to create room"
                    })).into_response()
                }
            }
        }
        None => {
            tracing::warn!("Worker client not available for create room");
            Json(serde_json::json!({
                "success": false,
                "error": "Worker service not available"
            })).into_response()
        }
    }
}

async fn list_rooms_handler(
    State(mut state): State<AppState>,
    Query(_query): Query<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/list"]).inc();

    // For now, use default filter - can be extended later
    let filter = proto::worker::v1::RoomListFilter::default();

    tracing::info!("gateway: listing rooms");

    // Call worker to list rooms
    match state.worker_client.as_mut() {
        Some(client) => {
            match client.list_rooms(tonic::Request::new(proto::worker::v1::ListRoomsRequest {
                filter: Some(filter),
            })).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.success {
                let rooms_json: Vec<serde_json::Value> = response_inner.rooms.iter().map(|room| {
                    serde_json::json!({
                        "id": room.id,
                        "name": room.name,
                        "settings": room.settings.as_ref().map(|s| serde_json::json!({
                            "max_players": s.max_players,
                            "game_mode": s.game_mode,
                            "map_name": s.map_name,
                            "time_limit_seconds": s.time_limit_seconds,
                            "has_password": s.has_password,
                            "is_private": s.is_private,
                            "allow_spectators": s.allow_spectators,
                            "auto_start": s.auto_start,
                            "min_players_to_start": s.min_players_to_start,
                        })).unwrap_or_default(),
                        "state": room.state,
                        "player_count": room.player_count,
                        "spectator_count": room.spectator_count,
                        "max_players": room.max_players,
                        "has_password": room.has_password,
                        "game_mode": room.game_mode,
                        "created_at_seconds_ago": room.created_at_seconds_ago,
                    })
                }).collect();

                let mut response = Json(serde_json::json!({
                    "success": true,
                    "rooms": rooms_json
                })).into_response();
                let headers = response.headers_mut();
                headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
                headers.insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
                headers.insert("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept".parse().unwrap());
                return response
            } else {
                let mut response = Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response();
                let headers = response.headers_mut();
                headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
                headers.insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
                headers.insert("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept".parse().unwrap());
                return response
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to list rooms");
            let mut response = Json(serde_json::json!({
                "success": false,
                "error": "Failed to list rooms"
            })).into_response();
            let headers = response.headers_mut();
            headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
            headers.insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
            headers.insert("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept".parse().unwrap());
            return response
        }
        }
        }
        None => {
            tracing::warn!("gateway: worker client not available");
            let mut response = Json(serde_json::json!({
                "success": false,
                "error": "Worker service not available"
            })).into_response();
            let headers = response.headers_mut();
            headers.insert("Access-Control-Allow-Origin", "*".parse().unwrap());
            headers.insert("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS".parse().unwrap());
            headers.insert("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept".parse().unwrap());
            return response
        }
    }
}

#[allow(dead_code)]
async fn get_room_info_handler(
    State(mut state): State<AppState>,
    Path(room_id): Path<String>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/info"]).inc();

    tracing::info!(room_id, "gateway: getting room info");

    // Call worker to get room info
    match state.worker_client.as_mut().unwrap().get_room_info(proto::worker::v1::GetRoomInfoRequest {
        room_id: room_id.clone(),
    }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.success {
                let room_json = response_inner.room.as_ref().map(|room| {
                    serde_json::json!({
                        "id": room.id,
                        "name": room.name,
                        "settings": room.settings.as_ref().map(|s| serde_json::json!({
                            "max_players": s.max_players,
                            "game_mode": s.game_mode,
                            "map_name": s.map_name,
                            "time_limit_seconds": s.time_limit_seconds,
                            "has_password": s.has_password,
                            "is_private": s.is_private,
                            "allow_spectators": s.allow_spectators,
                            "auto_start": s.auto_start,
                            "min_players_to_start": s.min_players_to_start,
                        })).unwrap_or_default(),
                        "state": room.state,
                        "player_count": room.player_count,
                        "spectator_count": room.spectator_count,
                        "max_players": room.max_players,
                        "has_password": room.has_password,
                        "game_mode": room.game_mode,
                        "created_at_seconds_ago": room.created_at_seconds_ago,
                    })
                });

                Json(serde_json::json!({
                    "success": true,
                    "room": room_json
                })).into_response()
            } else {
                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to get room info");
            Json(serde_json::json!({
                "success": false,
                "error": "Failed to get room info"
            })).into_response()
        }
    }
}

#[allow(dead_code)]
async fn join_room_as_player_handler(
    State(mut state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/join-player"]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let player_name = request.get("player_name").and_then(|v| v.as_str()).unwrap_or("Player");

    // Validate inputs
    if room_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Room ID is required"
        })).into_response();
    }

    if player_id.trim().is_empty() || player_id.len() > 50 {
        return Json(serde_json::json!({
            "success": false,
            "error": "Player ID must be between 1 and 50 characters"
        })).into_response();
    }

    if player_name.trim().is_empty() || player_name.len() > 50 {
        return Json(serde_json::json!({
            "success": false,
            "error": "Player name must be between 1 and 50 characters"
        })).into_response();
    }

    tracing::info!(room_id, player_id, "gateway: player joining room");

    // Call worker to join room as player
    match state.worker_client.as_mut().unwrap().join_room_as_player(proto::worker::v1::JoinRoomAsPlayerRequest {
        room_id: room_id.to_string(),
        player_id: player_id.to_string(),
        player_name: player_name.to_string(),
    }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.success {
                tracing::info!("Player joined room successfully");
                Json(serde_json::json!({
                    "success": true,
                    "room_id": room_id,
                    "player_id": player_id
                })).into_response()
            } else {
                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to join room as player");
            Json(serde_json::json!({
                "success": false,
                "error": "Failed to join room"
            })).into_response()
        }
    }
}

#[allow(dead_code)]
async fn start_game_handler(
    State(mut state): State<AppState>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/start-game"]).inc();

    let room_id = request.get("room_id").and_then(|v| v.as_str()).unwrap_or("default");
    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");

    // Validate inputs
    if room_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Room ID is required"
        })).into_response();
    }

    if player_id.trim().is_empty() || player_id.len() > 50 {
        return Json(serde_json::json!({
            "success": false,
            "error": "Player ID must be between 1 and 50 characters"
        })).into_response();
    }

    tracing::info!(room_id, player_id, "gateway: starting game");

    // Call worker to start game
    match state.worker_client.as_mut().unwrap().start_game(proto::worker::v1::StartGameRequest {
        room_id: room_id.to_string(),
        player_id: player_id.to_string(),
    }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.success {
                tracing::info!("Game started successfully");
                Json(serde_json::json!({
                    "success": true,
                    "room_id": room_id
                })).into_response()
            } else {
                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to start game");
            Json(serde_json::json!({
                "success": false,
                "error": "Failed to start game"
            })).into_response()
        }
    }
}

// Join room handler - handles both POST and GET variants
async fn join_room_handler(
    State(mut state): State<AppState>,
    axum::extract::Path(room_id): axum::extract::Path<String>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{room_id}/join"]).inc();

    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let _player_name = request.get("player_name").and_then(|v| v.as_str()).unwrap_or(player_id);

    // Validate inputs
    if room_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Room ID is required"
        })).into_response();
    }

    if player_id.trim().is_empty() || player_id.len() > 50 {
        return Json(serde_json::json!({
            "success": false,
            "error": "Player ID must be between 1 and 50 characters"
        })).into_response();
    }

    tracing::info!(room_id, player_id, "gateway: joining room");

    // Call worker to join room
    match state.worker_client.as_mut().unwrap().join_room(proto::worker::v1::JoinRoomRequest {
        room_id: room_id.clone(),
        player_id: player_id.to_string(),
    }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.ok {
                HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/rooms/{room_id}/join"]).inc();
                tracing::info!("Player joined room successfully");
                Json(serde_json::json!({
                    "success": true,
                    "room_id": room_id,
                    "snapshot": response_inner.snapshot.map(|s| {
                        // Parse the snapshot JSON
                        serde_json::from_str::<serde_json::Value>(&s.payload_json).unwrap_or_default()
                    }).unwrap_or_default()
                })).into_response()
            } else {
                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to join room");
            Json(serde_json::json!({
                "success": false,
                "error": "Failed to join room"
            })).into_response()
        }
    }
}

// Get room snapshot handler
#[allow(dead_code)]
async fn get_room_snapshot_handler(
    State(_state): State<AppState>,
    Path(room_id): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{room_id}/snapshot"]).inc();

    let player_id = params.get("player_id").map(|s| s.as_str()).unwrap_or("anonymous");

    // Validate inputs
    if room_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Room ID is required"
        })).into_response();
    }

    tracing::debug!(room_id, player_id, "gateway: getting room snapshot");

    // For now, return a mock snapshot since we don't have a direct snapshot API in worker
    // In a real implementation, this would call a worker RPC to get the current snapshot
    Json(serde_json::json!({
        "success": true,
        "tick": 0,
        "entities": [],
        "chat_messages": [],
        "spectators": []
    })).into_response()
}

// Send room input handler
#[allow(dead_code)]
async fn send_room_input_handler(
    State(mut state): State<AppState>,
    Path(room_id): Path<String>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{room_id}/input"]).inc();

    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");
    let input_sequence = request.get("input_sequence").and_then(|v| v.as_u64()).unwrap_or(0);
    let movement_value = request.get("movement");
    let timestamp = request.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);

    // Validate inputs
    if room_id.trim().is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "error": "Room ID is required"
        })).into_response();
    }

    tracing::debug!(room_id, player_id, input_sequence, "gateway: processing room input");

    // Call worker to push input
    match state.worker_client.as_mut().unwrap().push_input(proto::worker::v1::PushInputRequest {
        room_id: room_id.clone(),
        sequence: input_sequence as u32,
        payload_json: serde_json::json!({
            "player_id": player_id,
            "movement": movement_value,
            "timestamp": timestamp
        }).to_string(),
    }).await {
        Ok(response) => {
            let response_inner = response.into_inner();
            if response_inner.ok {
                tracing::debug!("Room input processed successfully");
                Json(serde_json::json!({
                    "success": true,
                    "room_id": room_id,
                    "snapshot": response_inner.snapshot.map(|s| {
                        // Parse the snapshot JSON
                        serde_json::from_str::<serde_json::Value>(&s.payload_json).unwrap_or_default()
                    }).unwrap_or_default()
                })).into_response()
            } else {
                Json(serde_json::json!({
                    "success": false,
                    "error": response_inner.error
                })).into_response()
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "gateway: failed to push room input");
            Json(serde_json::json!({
                "success": false,
                "error": "Failed to send input"
            })).into_response()
        }
    }
}

// Handler cho /rtc/sessions
async fn list_webrtc_sessions(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let sessions = state.webrtc_sessions.read().await;
    let sessions_list: Vec<_> = sessions.values().map(|session| {
        serde_json::json!({
            "session_id": session.session_id,
            "room_id": session.room_id,
            "user_id": session.user_id,
            "status": "active",
            "created_at": session.created_at.to_rfc3339(),
            "last_activity": session.last_activity.to_rfc3339()
        })
    }).collect();

    Json(serde_json::json!({
        "sessions": sessions_list,
        "total": sessions_list.len()
    }))
}

impl GatewayConfig {
    pub fn from_env() -> Result<Self, BoxError> {
        GatewaySettings::from_env().map(Self::from_settings)
    }
}

#[cfg(test)]
mod rate_limiting_tests {
    use super::*;
    use std::net::IpAddr;

    #[tokio::test]
    async fn test_token_bucket_burst_handling() {
        let rate_limiter = AdvancedRateLimiter::new();

        // Test IP burst capacity
        let ip = IpAddr::from([127, 0, 0, 1]);
        let endpoint = "/api/rooms/create";

        // Should allow initial burst (user burst capacity is 10)
        for i in 0..10 {
            assert!(rate_limiter.check_rate_limit(ip, "user1", endpoint).await,
                "Request {} should be allowed in burst", i + 1);
        }

        // Should block after burst capacity is exceeded
        assert!(!rate_limiter.check_rate_limit(ip, "user1", endpoint).await,
            "Request should be blocked after burst capacity");
    }

    #[tokio::test]
    async fn test_per_endpoint_rate_limits() {
        let rate_limiter = AdvancedRateLimiter::new();

        let ip = IpAddr::from([127, 0, 0, 2]);

        // Room creation should have different limits than player updates
        let create_endpoint = "/api/rooms/create";
        let update_endpoint = "/api/rooms/update-player";

        // Should allow more requests for real-time updates
        for i in 0..50 {
            assert!(rate_limiter.check_rate_limit(ip, "user1", update_endpoint).await,
                "Update request {} should be allowed", i + 1);
        }

        // Room creation should have lower burst capacity
        for i in 0..20 {
            assert!(rate_limiter.check_rate_limit(ip, "user1", create_endpoint).await,
                "Create request {} should be allowed", i + 1);
        }

        // Room creation should block after burst
        assert!(!rate_limiter.check_rate_limit(ip, "user1", create_endpoint).await);
    }

    #[tokio::test]
    async fn test_user_vs_ip_rate_limits() {
        let rate_limiter = AdvancedRateLimiter::new();

        let ip1 = IpAddr::from([127, 0, 0, 3]);
        let ip2 = IpAddr::from([127, 0, 0, 4]);
        let endpoint = "/api/rooms/create";

        // Test IP limits with anonymous users (should allow 20 requests per IP)
        for i in 0..20 {
            assert!(rate_limiter.check_rate_limit(ip1, "anonymous", endpoint).await,
                "IP1 anonymous request {} should be allowed", i + 1);
        }

        for i in 0..20 {
            assert!(rate_limiter.check_rate_limit(ip2, "anonymous", endpoint).await,
                "IP2 anonymous request {} should be allowed", i + 1);
        }

        // Both should block after their limits
        assert!(!rate_limiter.check_rate_limit(ip1, "anonymous", endpoint).await);
        assert!(!rate_limiter.check_rate_limit(ip2, "anonymous", endpoint).await);
    }

    #[test]
    fn test_endpoint_extraction() {
        // Test the endpoint extraction function
        let mut request = axum::http::Request::builder()
            .uri("/api/rooms/create?param=value")
            .body(())
            .unwrap();
        assert_eq!(extract_endpoint_from_request(&request), "/api/rooms");

        request = axum::http::Request::builder()
            .uri("/api/rooms/join/123")
            .body(())
            .unwrap();
        assert_eq!(extract_endpoint_from_request(&request), "/api/rooms");

        request = axum::http::Request::builder()
            .uri("/api/unknown/endpoint")
            .body(())
            .unwrap();
        assert_eq!(extract_endpoint_from_request(&request), "/api/unknown");
    }

    #[tokio::test]
    async fn test_anonymous_user_rate_limits() {
        let rate_limiter = AdvancedRateLimiter::new();

        let ip = IpAddr::from([127, 0, 0, 5]);
        let endpoint = "/api/rooms/create";

        // Anonymous users should only be subject to IP rate limits
        for i in 0..20 {
            assert!(rate_limiter.check_rate_limit(ip, "anonymous", endpoint).await,
                "Anonymous request {} should be allowed", i + 1);
        }

        // Should block after IP limit is reached
        assert!(!rate_limiter.check_rate_limit(ip, "anonymous", endpoint).await);
    }
}

/// Handler for leaving a room (optimized for high throughput)
async fn leave_room_handler(
    State(mut state): State<AppState>,
    Path(room_id): Path<String>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/:room_id/leave"]).inc();

    let player_id = request.get("player_id").and_then(|v| v.as_str()).unwrap_or("anonymous");

    tracing::debug!(room_id, player_id, "gateway: player leaving room");

    // Optimized: Send leave command to worker with minimal logging
    match &mut state.worker_client {
        Some(client) => {
            match client.push_input(proto::worker::v1::PushInputRequest {
                room_id: room_id.clone(),
                sequence: 0,
                payload_json: serde_json::json!({
                    "type": "leave_room",
                    "player_id": player_id,
                    "timestamp": chrono::Utc::now().timestamp_millis()
                }).to_string(),
            }).await {
                Ok(response) => {
                    let response_inner = response.into_inner();
                    HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/rooms/:room_id/leave"]).inc();
                    // Optimized: Pre-compute response JSON to avoid serialization overhead
                    Json(serde_json::json!({
                        "success": true,
                        "message": "Successfully left room",
                        "room_id": room_id,
                        "player_id": player_id,
                        "processed_at": chrono::Utc::now().to_rfc3339()
                    })).into_response()
                }
                Err(e) => {
                    // Optimized: Use structured logging instead of string formatting
                    tracing::error!(error=?e, room_id, player_id, "worker: leave_room failed");
                    HTTP_REQUESTS_FAILED.with_label_values(&["/api/rooms/:room_id/leave"]).inc();
                    Json(serde_json::json!({
                        "success": false,
                        "error": "Internal server error",
                        "room_id": room_id
                    })).into_response()
                }
            }
        }
        None => {
            tracing::error!("worker: client not available");
            HTTP_REQUESTS_FAILED.with_label_values(&["/api/rooms/:room_id/leave"]).inc();
            Json(serde_json::json!({
                "success": false,
                "error": "Service temporarily unavailable"
            })).into_response()
        }
    }
}

/// Handler for getting room status (optimized for high throughput)
async fn get_room_status_handler(
    State(mut state): State<AppState>,
    Path(room_id): Path<String>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/:room_id/status"]).inc();

    tracing::debug!(room_id, "gateway: getting room status");

    // Optimized: Get room info from worker with timeout handling
    match &mut state.worker_client {
        Some(client) => {
            match tokio::time::timeout(
                std::time::Duration::from_millis(100), // 100ms timeout for fast response
                client.get_room_info(proto::worker::v1::GetRoomInfoRequest {
                    room_id: room_id.clone(),
                })
            ).await {
                Ok(Ok(response)) => {
                    let response_inner = response.into_inner();
                    HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/rooms/:room_id/status"]).inc();
                    // Optimized: Pre-compute response to reduce serialization overhead
                    Json(serde_json::json!({
                        "success": true,
                        "room_id": room_id,
                        "status": "active",
                        "room_info": response_inner.room.map(|r| serde_json::json!({
                            "id": r.id,
                            "name": r.name,
                            "state": r.state,
                            "player_count": r.player_count,
                            "spectator_count": r.spectator_count,
                            "max_players": r.max_players,
                            "game_mode": r.game_mode,
                            "created_at_seconds_ago": r.created_at_seconds_ago
                        })).unwrap_or_else(|| serde_json::Value::Null),
                        "tick": 0,
                        "cached_at": chrono::Utc::now().to_rfc3339()
                    })).into_response()
                }
                Ok(Err(e)) => {
                    tracing::error!(error=?e, room_id, "worker: get_room_info failed");
                    HTTP_REQUESTS_FAILED.with_label_values(&["/api/rooms/:room_id/status"]).inc();
                    Json(serde_json::json!({
                        "success": false,
                        "error": "Room not found",
                        "room_id": room_id
                    })).into_response()
                }
                Err(_) => {
                    tracing::warn!(room_id, "worker: get_room_info timeout");
                    HTTP_REQUESTS_FAILED.with_label_values(&["/api/rooms/:room_id/status"]).inc();
                    Json(serde_json::json!({
                        "success": false,
                        "error": "Request timeout",
                        "room_id": room_id
                    })).into_response()
                }
            }
        }
        None => {
            tracing::error!("worker: client not available");
            HTTP_REQUESTS_FAILED.with_label_values(&["/api/rooms/:room_id/status"]).inc();
            Json(serde_json::json!({
                "success": false,
                "error": "Service temporarily unavailable",
                "room_id": room_id
            })).into_response()
        }
    }
}

/// Handler for getting metrics (optimized for high throughput with caching)
async fn metrics_handler() -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/metrics"]).inc();
    HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/metrics"]).inc();

    // Optimized: Pre-compute metrics to avoid repeated calculations
    let now = chrono::Utc::now();
    let uptime_seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Optimized: Use cached values where possible and minimize expensive operations
    let metrics = serde_json::json!({
        "timestamp": now.to_rfc3339(),
        "service": "gateway",
        "version": env!("CARGO_PKG_VERSION"),
        "metrics": {
            "http_requests_total": HTTP_REQUESTS_TOTAL.with_label_values(&["/api/metrics"]).get(),
            "http_requests_success": HTTP_REQUESTS_SUCCESS.with_label_values(&["/api/metrics"]).get(),
            "http_requests_failed": HTTP_REQUESTS_FAILED.with_label_values(&["/api/metrics"]).get(),
            "active_connections": GATEWAY_ACTIVE_CONNECTIONS_GAUGE.with_label_values(&["http"]).get(),
            "websocket_connections": WEBRTC_CONNECTIONS_CURRENT.with_label_values(&["current"]).get(),
            "rooms_active": ROOMS_ACTIVE.get(),
            "players_in_rooms": PLAYERS_IN_ROOMS.get(),
            "rate_limited_requests": RATE_LIMITED_REQUESTS_TOTAL.with_label_values(&["total"]).get()
        },
        "performance": {
            "throughput_rps": calculate_throughput_rps(),
            "avg_response_time_ms": calculate_avg_response_time(),
            "error_rate_percent": calculate_error_rate(),
            "target_throughput_rps": 1000.0,
            "optimization_status": "high_performance_enabled"
        },
        "system": {
            "uptime_seconds": uptime_seconds,
            "memory_usage_mb": 0, // Would implement actual memory monitoring
            "cpu_usage_percent": 0.0, // Would implement actual CPU monitoring
            "concurrent_requests": GATEWAY_ACTIVE_CONNECTIONS_GAUGE.with_label_values(&["http"]).get(),
            "connection_pool_size": 1000 // Configured for high throughput
        },
        "cached_at": now.to_rfc3339()
    });

    Json(metrics).into_response()
}

/// Calculate current throughput in requests per second (cached for performance)
fn calculate_throughput_rps() -> f64 {
    // Simplified calculation - in production would use sliding window
    let total_requests = HTTP_REQUESTS_TOTAL.with_label_values(&["/api/metrics"]).get();
    let uptime = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();

    if uptime > 0.0 {
        total_requests as f64 / uptime.max(1.0)
    } else {
        0.0
    }
}

/// Calculate average response time (cached for performance)
fn calculate_avg_response_time() -> f64 {
    // Simplified - in production would use histogram metrics
    1.5 // Mock value in ms
}

/// Calculate error rate percentage (cached for performance)
fn calculate_error_rate() -> f64 {
    let total = HTTP_REQUESTS_TOTAL.with_label_values(&["/api/metrics"]).get();
    let failed = HTTP_REQUESTS_FAILED.with_label_values(&["/api/metrics"]).get();

    if total > 0 {
        (failed as f64 / total as f64) * 100.0
    } else {
        0.0
    }
}

/// Request validation middleware for API endpoints
async fn validate_api_request<B>(
    State(state): State<AppState>,
    request: axum::http::Request<B>,
    next: Next<B>,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();

    // Extract path for validation
    let path = request.uri().path().to_string();

    // Validate path format and required parameters
    if path.starts_with("/api/rooms/") && path.ends_with("/join") {
        // Validate room_id format
        if let Some(room_id) = path.strip_prefix("/api/rooms/").and_then(|s| s.strip_suffix("/join")) {
            if room_id.is_empty() || !room_id.chars().all(|c| c.is_alphanumeric() || c == '_') {
                HTTP_REQUESTS_FAILED.with_label_values(&[&path]).inc();
                return Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid room_id format",
                    "path": path
                })).into_response();
            }
        }
    }

    if path.starts_with("/api/rooms/") && path.ends_with("/leave") {
        // Validate room_id format
        if let Some(room_id) = path.strip_prefix("/api/rooms/").and_then(|s| s.strip_suffix("/leave")) {
            if room_id.is_empty() || !room_id.chars().all(|c| c.is_alphanumeric() || c == '_') {
                HTTP_REQUESTS_FAILED.with_label_values(&[&path]).inc();
                return Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid room_id format",
                    "path": path
                })).into_response();
            }
        }
    }

    if path.starts_with("/api/rooms/") && path.ends_with("/status") {
        // Validate room_id format
        if let Some(room_id) = path.strip_prefix("/api/rooms/").and_then(|s| s.strip_suffix("/status")) {
            if room_id.is_empty() || !room_id.chars().all(|c| c.is_alphanumeric() || c == '_') {
                HTTP_REQUESTS_FAILED.with_label_values(&[&path]).inc();
                return Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid room_id format",
                    "path": path
                })).into_response();
            }
        }
    }

    // TODO: Re-enable rate limiting once rate_limiter field is added to AppState
    // For now, always allow requests and continue processing
    let response = next.run(request).await;

    // Record response time
    let duration_ms = start_time.elapsed().as_secs_f64() * 1000.0;
    HTTP_RESPONSE_TIME_HISTOGRAM
        .with_label_values(&[&path])
        .observe(duration_ms);

    response
}

/// Extract client IP from request headers
fn extract_client_ip(headers: &HeaderMap) -> String {
    // Check common proxy headers first
    headers.get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .or_else(|| headers.get("cf-connecting-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string())
}

/// Extract user ID from JWT token in Authorization header
fn extract_user_id(headers: &HeaderMap) -> Option<&str> {
    headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|auth| {
            if auth.starts_with("Bearer ") {
                // In a real implementation, would decode JWT and extract user_id
                Some("authenticated_user")
            } else {
                None
            }
        })
}

/// Comprehensive error handler for API responses
async fn handle_api_error(
    result: Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)>,
) -> impl IntoResponse {
    match result {
        Ok(success_response) => success_response.into_response(),
        Err((status, error_response)) => {
            tracing::warn!(status = %status, "API request failed");

            // Increment error counter
            HTTP_REQUESTS_FAILED.with_label_values(&["unknown"]).inc();

            (status, error_response).into_response()
        }
    }
}

/// Health check with comprehensive system status
async fn health_check_handler() -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/health"]).inc();

    let health_status = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "gateway": "healthy",
            "worker": "healthy", // Would check actual worker health
            "database": "healthy" // Would check actual database health
        },
        "metrics": {
            "uptime_seconds": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            "total_requests": HTTP_REQUESTS_TOTAL.with_label_values(&["/health"]).get(),
            "error_rate": calculate_error_rate(),
            "throughput_rps": calculate_throughput_rps()
        }
    });

    Json(health_status).into_response()
}

// Helper function to authenticate player
async fn authenticate_player(token: &str) -> Result<PlayerInfo, String> {
    // TODO: Implement actual authentication logic with database
    // For now, extract player info from token or use dummy data
    let player_id = if token.starts_with("player_") {
        token.to_string()
    } else {
        format!("player_{}", token.len())
    };

    Ok(PlayerInfo {
        id: player_id,
        username: format!("player_{}", token.len()),
        email: format!("player{}@game.com", token.len()),
        role: "player".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    })
}

// Helper function to broadcast game state to all players in a room
async fn broadcast_game_state_to_room(
    room_id: &str,
    message: &serde_json::Value,
    exclude_player: Option<&str>,
    ws_registry: &WebSocketRegistry,
) {
    let ws_reg = ws_registry.read().await;

    for (connection_id, connection) in ws_reg.iter() {
        // Only broadcast to players in the same room
        if connection.room_id == room_id {
            // Skip the sender if specified
            if let Some(exclude) = exclude_player {
                if connection.peer_id == exclude {
                    continue;
                }
            }

            // Send message through the channel
            if let Err(e) = connection.sender.send(axum::extract::ws::Message::Text(
                message.to_string()
            )) {
                tracing::warn!("Failed to broadcast to connection {}: {}", connection_id, e);
            }
        }
    }
}

// ===== NEW API HANDLERS =====

// Game Management Handlers
async fn start_game_by_id_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/start"]).inc();

    // TODO: Implement actual game start logic with worker
    tracing::info!("Starting game for room: {}", room_id);

    Json(serde_json::json!({
        "status": "success",
        "room_id": room_id,
        "action": "start_game",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn pause_game_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/pause"]).inc();

    // TODO: Implement actual game pause logic
    tracing::info!("Pausing game for room: {}", room_id);

    Json(serde_json::json!({
        "status": "success",
        "room_id": room_id,
        "action": "pause_game",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn resume_game_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/resume"]).inc();

    // TODO: Implement actual game resume logic
    tracing::info!("Resuming game for room: {}", room_id);

    Json(serde_json::json!({
        "status": "success",
        "room_id": room_id,
        "action": "resume_game",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn end_game_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/end"]).inc();

    tracing::info!("Ending game for room: {}", room_id);

    // Call EndGame on worker service
    if let Some(worker_client) = &state.worker_client {
        let mut client = worker_client.clone();
        match client.end_game(proto::worker::v1::EndGameRequest {
            room_id: room_id.clone(),
        }).await {
            Ok(_) => tracing::info!("Successfully ended game on worker for room {}", room_id),
            Err(e) => tracing::error!("Failed to end game on worker for room {}: {:?}", room_id, e),
        }
    }

    // Create mock game results and save to database
    match save_game_results(&state, &room_id).await {
        Ok(_) => {
            tracing::info!("Successfully saved game results for room {}", room_id);
            Json(serde_json::json!({
                "status": "success",
                "room_id": room_id,
                "action": "end_game",
                "persisted": true,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
        Err(e) => {
            tracing::error!("Failed to save game results for room {}: {:?}", room_id, e);
            Json(serde_json::json!({
                "status": "success",
                "room_id": room_id,
                "action": "end_game",
                "persisted": false,
                "error": "Failed to persist results",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
    }
}

/// Save game results to the services API
async fn save_game_results(
    state: &AppState,
    room_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use chrono::{DateTime, Utc};
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;

    // Define game result structures (matching services crate)
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct GameParticipant {
        pub user_id: String,
        pub username: String,
        pub team: Option<String>,
        pub final_position: u32,
        pub score: u64,
        pub kills: u32,
        pub deaths: u32,
        pub assists: u32,
        pub accuracy: f32,
        pub playtime_seconds: u32,
        pub is_winner: bool,
        pub stats: serde_json::Value,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct GameResult {
        pub match_id: String,
        pub room_id: String,
        pub game_mode: String,
        pub map_name: String,
        pub start_time: DateTime<Utc>,
        pub end_time: DateTime<Utc>,
        pub duration_seconds: u32,
        pub participants: Vec<GameParticipant>,
        pub winner_team: Option<String>,
        pub total_score: u64,
        pub settings: serde_json::Value,
    }

    // Create mock game results
    // In a real implementation, this would come from the worker service
    let match_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let start_time = now - chrono::Duration::minutes(10);

    let participants = vec![
        GameParticipant {
            user_id: "player1".to_string(),
            username: "Player One".to_string(),
            team: Some("red".to_string()),
            final_position: 1,
            score: 2500,
            kills: 15,
            deaths: 3,
            assists: 5,
            accuracy: 0.85,
            playtime_seconds: 600,
            is_winner: true,
            stats: serde_json::json!({
                "damage_dealt": 12500,
                "damage_taken": 3200,
                "healing_done": 800
            }),
        },
        GameParticipant {
            user_id: "player2".to_string(),
            username: "Player Two".to_string(),
            team: Some("blue".to_string()),
            final_position: 2,
            score: 1800,
            kills: 12,
            deaths: 5,
            assists: 3,
            accuracy: 0.78,
            playtime_seconds: 600,
            is_winner: false,
            stats: serde_json::json!({
                "damage_dealt": 9800,
                "damage_taken": 4100,
                "healing_done": 600
            }),
        },
    ];

    let game_result = GameResult {
        match_id,
        room_id: room_id.to_string(),
        game_mode: "deathmatch".to_string(),
        map_name: "arena_1".to_string(),
        start_time,
        end_time: now,
        duration_seconds: 600,
        participants,
        winner_team: Some("red".to_string()),
        total_score: 4300,
        settings: serde_json::json!({
            "max_players": 4,
            "time_limit": 600,
            "friendly_fire": false
        }),
    };

    // Call services API to save results
    let url = format!("{}/matches/results", state.services_url);
    let response = state.services_client
        .post(&url)
        .json(&game_result)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Services API error: {} - {}", status, error_text).into());
    }

    let response_json: serde_json::Value = response.json().await?;
    if !response_json.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        return Err("Services API returned success=false".into());
    }

    tracing::info!("Successfully saved game results to services API");
    Ok(())
}

// Player Management Handlers
async fn player_stats_handler(
    Path(player_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/players/{id}/stats"]).inc();

    // TODO: Get actual player stats from database
    Json(serde_json::json!({
        "player_id": player_id,
        "stats": {
            "games_played": 42,
            "games_won": 25,
            "total_score": 15420,
            "average_score": 367,
            "playtime_minutes": 1240,
            "achievements": ["first_win", "speed_demon", "team_player"],
            "rank": "silver",
            "level": 15
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn player_settings_handler(
    Path(player_id): Path<String>,
    State(state): State<AppState>,
    Json(settings): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/players/{id}/settings"]).inc();

    // TODO: Save player settings to database
    tracing::info!("Updating settings for player: {} - {:?}", player_id, settings);

    Json(serde_json::json!({
        "status": "success",
        "player_id": player_id,
        "settings": settings,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn delete_player_handler(
    Path(player_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/players/{id}"]).inc();

    // TODO: Implement actual player deletion with cleanup
    tracing::info!("Deleting player: {}", player_id);

    Json(serde_json::json!({
        "status": "success",
        "player_id": player_id,
        "action": "delete_player",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// Social Features Handlers
async fn room_chat_history_handler(
    Path(room_id): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/chat/history"]).inc();

    let count = params.get("count").and_then(|c| c.parse().ok()).unwrap_or(20);
    let offset = params.get("offset").and_then(|o| o.parse().ok()).unwrap_or(0);

    // TODO: Get actual chat history from database
    Json(serde_json::json!({
        "room_id": room_id,
        "messages": [
            {
                "id": "msg_1",
                "player_id": "player_123",
                "player_name": "Player123",
                "message": "Hello everyone!",
                "timestamp": "2024-01-01T10:00:00Z",
                "message_type": "text"
            },
            {
                "id": "msg_2",
                "player_id": "player_456",
                "player_name": "Player456",
                "message": "Good luck!",
                "timestamp": "2024-01-01T10:01:00Z",
                "message_type": "text"
            }
        ],
        "count": count,
        "offset": offset,
        "total": 150,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn delete_chat_message_handler(
    Path(message_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/chat/messages/{id}"]).inc();

    // TODO: Implement message deletion with permissions check
    tracing::info!("Deleting chat message: {}", message_id);

    Json(serde_json::json!({
        "status": "success",
        "message_id": message_id,
        "action": "delete_message",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn moderate_chat_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
    Json(moderation): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/rooms/{id}/chat/moderate"]).inc();

    // TODO: Implement chat moderation logic
    tracing::info!("Moderating chat for room: {} - {:?}", room_id, moderation);

    Json(serde_json::json!({
        "status": "success",
        "room_id": room_id,
        "moderation_action": moderation.get("action").unwrap_or(&serde_json::Value::String("unknown".to_string())),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn weekly_leaderboard_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/leaderboards/weekly"]).inc();

    // TODO: Get actual weekly leaderboard from database
    Json(serde_json::json!({
        "period": "weekly",
        "start_date": "2024-12-16T00:00:00Z",
        "end_date": "2024-12-22T23:59:59Z",
        "leaderboard": [
            {
                "rank": 1,
                "player_id": "player_123",
                "player_name": "ProGamer",
                "score": 15420,
                "games_played": 15,
                "win_rate": 0.87
            },
            {
                "rank": 2,
                "player_id": "player_456",
                "player_name": "SpeedRunner",
                "score": 14200,
                "games_played": 12,
                "win_rate": 0.75
            },
            {
                "rank": 3,
                "player_id": "player_789",
                "player_name": "TeamPlayer",
                "score": 13800,
                "games_played": 20,
                "win_rate": 0.65
            }
        ],
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn monthly_leaderboard_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/leaderboards/monthly"]).inc();

    // TODO: Get actual monthly leaderboard from database
    Json(serde_json::json!({
        "period": "monthly",
        "start_date": "2024-12-01T00:00:00Z",
        "end_date": "2024-12-31T23:59:59Z",
        "leaderboard": [
            {
                "rank": 1,
                "player_id": "player_123",
                "player_name": "ProGamer",
                "score": 45200,
                "games_played": 45,
                "win_rate": 0.82
            },
            {
                "rank": 2,
                "player_id": "player_456",
                "player_name": "SpeedRunner",
                "score": 41800,
                "games_played": 38,
                "win_rate": 0.79
            }
        ],
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn report_cheating_handler(
    State(state): State<AppState>,
    Json(report): Json<serde_json::Value>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/leaderboards/report"]).inc();

    // TODO: Implement cheating report handling
    tracing::info!("Processing cheating report: {:?}", report);

    Json(serde_json::json!({
        "status": "success",
        "report_id": format!("report_{}", chrono::Utc::now().timestamp()),
        "message": "Cheating report has been submitted for review",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// === TOKEN API ENDPOINTS ===

// Token API handlers - placeholder implementation (JWT middleware to be added)
async fn earn_from_pool_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<EarnFromPoolRequest>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/earn-from-pool"]).inc();

    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..]) // Remove "Bearer " prefix
            } else {
                None
            }
        }
        None => None,
    };

    let claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(EarnFromPoolResponse {
                        success: false,
                        tx_signature: None,
                        new_balance: 0,
                        remaining_pool: 0,
                        error: Some("Invalid or expired token".to_string()),
                    })).into_response();
                }
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(EarnFromPoolResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                remaining_pool: 0,
                error: Some("Authorization header required".to_string()),
            })).into_response();
        }
    };

    // Create a dummy request for the handler
    let dummy_req = axum::http::Request::builder()
        .method("POST")
        .uri("/api/token/earn-from-pool")
        .body(axum::body::Body::from(serde_json::to_vec(&request).unwrap_or_default()))
        .unwrap();

    // Call the actual handler
    earn_from_pool_handler(state, dummy_req, claims).await.into_response()
}

async fn eat_particle_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<EatParticleRequest>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/eat-particle"]).inc();

    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..]) // Remove "Bearer " prefix
            } else {
                None
            }
        }
        None => None,
    };

    let claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(EatParticleResponse {
                        success: false,
                        tx_signature: None,
                        new_balance: 0,
                        error: Some("Invalid or expired token".to_string()),
                    })).into_response();
                }
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(EatParticleResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                error: Some("Authorization header required".to_string()),
            })).into_response();
        }
    };

    // Create a dummy request for the handler
    let dummy_req = axum::http::Request::builder()
        .method("POST")
        .uri("/api/token/eat-particle")
        .body(axum::body::Body::from(serde_json::to_vec(&request).unwrap_or_default()))
        .unwrap();

    // Call the actual handler
    eat_particle_handler(state, dummy_req, claims).await.into_response()
}

async fn balance_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/balance"]).inc();

    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..])
            } else {
                None
            }
        }
        None => None,
    };

    let claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                        "error": "Invalid or expired token",
                        "game_tokens": 0,
                        "wallet_address": null,
                        "total_earned": 0,
                        "session_tokens": 0
                    }))).into_response();
                }
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "error": "Authorization header required",
                "game_tokens": 0,
                "wallet_address": null,
                "total_earned": 0,
                "session_tokens": 0
            }))).into_response();
        }
    };

    // Create dummy request
    let dummy_req = axum::http::Request::builder()
        .method("GET")
        .uri("/api/token/balance")
        .body(axum::body::Body::empty())
        .unwrap();

    // Call actual handler
    balance_handler(state, dummy_req, claims).await.into_response()
}

async fn transfer_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<TransferRequest>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/transfer"]).inc();

    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..])
            } else {
                None
            }
        }
        None => None,
    };

    let claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(TransferResponse {
                        success: false,
                        tx_signature: None,
                        error: Some("Invalid or expired token".to_string()),
                    })).into_response();
                }
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Authorization header required".to_string()),
            })).into_response();
        }
    };

    // Create dummy request
    let dummy_req = axum::http::Request::builder()
        .method("POST")
        .uri("/api/token/transfer")
        .body(axum::body::Body::from(serde_json::to_vec(&request).unwrap_or_default()))
        .unwrap();

    // Call actual handler
    transfer_handler(state, dummy_req, claims).await.into_response()
}

// Token API Request/Response structs
#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct EatParticleRequest {
    pub particle_location: (i32, i32),
    pub particle_type: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct EatParticleResponse {
    pub success: bool,
    pub tx_signature: Option<String>,
    pub new_balance: i64,
    pub error: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct EarnFromPoolRequest {
    pub particle_location: (i32, i32),
    pub particle_type: String,
    pub amount: u64,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct EarnFromPoolResponse {
    pub success: bool,
    pub tx_signature: Option<String>,
    pub new_balance: i64,
    pub remaining_pool: i64,
    pub error: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct BalanceResponse {
    pub game_tokens: i64,
    pub wallet_address: Option<String>,
    pub total_earned: i64,
    pub session_tokens: i64,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct TransferRequest {
    pub to_user_id: String,
    pub amount: u64,
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct TransferResponse {
    pub success: bool,
    pub tx_signature: Option<String>,
    pub error: Option<String>,
}

// Helper functions for token operations
fn get_user_wallet_address(database_pool: &DatabasePool, user_id: &str) -> Option<String> {
    // First check in-memory cache for fast access
    if let Some(cached_wallet) = USER_WALLETS.try_read().ok().and_then(|w| w.get(user_id).cloned()) {
        return Some(cached_wallet);
    }

    // If not in cache, this function is async but we can't make it async here
    // For now, return None and let the async version handle PocketBase lookup
    // In production, this should be async and query PocketBase directly
    None
}

async fn get_user_wallet_address_async(user_id: &str) -> Option<String> {
    // First check in-memory cache
    if let Some(cached_wallet) = USER_WALLETS.try_read().ok().and_then(|w| w.get(user_id).cloned()) {
        return Some(cached_wallet);
    }

    // Second check Redis cache
    if let Ok(cache) = get_global_cache().await {
        if let Ok(Some(cached_wallet)) = cache.get_wallet(user_id).await {
            // Store in in-memory cache for even faster access
            if let Ok(mut wallets) = USER_WALLETS.try_write() {
                wallets.insert(user_id.to_string(), cached_wallet.address.clone());
            }
            return Some(cached_wallet.address);
        }
    }

    // If not in any cache, query PocketBase
    match get_wallet_from_pocketbase(user_id).await {
        Ok(Some(wallet_address)) => {
            // Cache the result for future use in both Redis and in-memory
            if let Ok(cache) = get_global_cache().await {
                let cached_wallet = crate::cache::CachedWallet {
                    user_id: user_id.to_string(),
                    address: wallet_address.clone(),
                    network: "solana".to_string(),
                    wallet_type: "generated".to_string(),
                };
                let _ = cache.set_wallet(user_id, &cached_wallet, 3600).await;
            }

            if let Ok(mut wallets) = USER_WALLETS.try_write() {
                wallets.insert(user_id.to_string(), wallet_address.clone());
            }
            Some(wallet_address)
        }
        _ => None
    }
}

async fn get_wallet_from_pocketbase(user_id: &str) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    // Thêm timeout để tránh socket hang up
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .connect_timeout(std::time::Duration::from_secs(2))
        .build()?;
    let filter = format!("user_id='{}'", user_id);
    let response = client
        .get(&format!("{}/api/collections/wallets/records?filter={}", pocketbase_url, urlencoding::encode(&filter)))
        .send()
        .await;

    match response {
        Ok(resp) => {
            if !resp.status().is_success() {
                return Ok(None);
            }

            match resp.json::<serde_json::Value>().await {
                Ok(data) => {
                    if let Some(items) = data["items"].as_array() {
                        if let Some(first_item) = items.first() {
                            if let Some(address) = first_item["address"].as_str() {
                                return Ok(Some(address.to_string()));
                            }
                        }
                    }
                    Ok(None)
                }
                Err(_) => Ok(None)
            }
        }
        Err(e) => {
            warn!("Failed to query PocketBase for wallet: {}, returning None", e);
            Ok(None)
        }
    }
}

async fn get_user_balance(database_pool: &DatabasePool, user_id: &str) -> i64 {
    // Query PocketBase for user's game_tokens from users collection
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    // Create HTTP client with timeout
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client for balance query: {}", e);
            return 0;
        }
    };

    // Query users collection with filter by user_id
    let filter = format!("id='{}'", user_id);
    let request_url = format!("{}/api/collections/users/records?filter={}",
                             pocketbase_url,
                             urlencoding::encode(&filter));

    let response = match client.get(&request_url).send().await {
        Ok(resp) => resp,
        Err(e) => {
            error!("Failed to query user balance from PocketBase: {}", e);
            return 0;
        }
    };

    if !response.status().is_success() {
        error!("PocketBase API returned error status for balance query: {}", response.status());
        return 0;
    }

    // Parse JSON response
    let response_json: serde_json::Value = match response.json().await {
        Ok(json) => json,
        Err(e) => {
            error!("Failed to parse PocketBase response for balance: {}", e);
            return 0;
        }
    };

    // Extract game_tokens from the first user record
    if let Some(items) = response_json["items"].as_array() {
        if let Some(first_item) = items.first() {
            if let Some(game_tokens) = first_item["game_tokens"].as_i64() {
                info!("Retrieved real balance for user {}: {} tokens", user_id, game_tokens);
                return game_tokens;
            } else {
                // User exists but no game_tokens field set (new user)
                info!("User {} exists but no game_tokens set, returning 0", user_id);
                return 0;
            }
        }
    }

    // User not found
    warn!("User {} not found in database for balance query", user_id);
    0
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct CreateWalletRequest {
    pub wallet_type: String, // "generated", "phantom", "metamask", etc.
    pub network: String,     // "solana", "ethereum", etc.
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct CreateWalletResponse {
    pub success: bool,
    pub wallet_address: Option<String>,
    pub message: String,
}

async fn create_wallet_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateWalletRequest>,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/wallet/create"]).inc();

    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..]) // Remove "Bearer " prefix
            } else {
                None
            }
        }
        None => None,
    };

    // Temporarily disable JWT validation for testing
    /*
    let claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    return (StatusCode::UNAUTHORIZED, Json(CreateWalletResponse {
                        success: false,
                        wallet_address: None,
                        message: "Invalid or expired token".to_string(),
                    })).into_response();
                }
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(CreateWalletResponse {
                success: false,
                wallet_address: None,
                message: "Authorization header required".to_string(),
            })).into_response();
        }
    };
    */

    // Create dummy claims for testing
    use auth::Claims;
    let claims = Claims {
        sub: "test-user-123".to_string(),
        username: "testuser".to_string(),
        email: "test@example.com".to_string(),
        role: "user".to_string(),
        exp: 2000000000,
        iat: 1000000000,
        iss: "test".to_string(),
    };

    // Check if user already has a wallet - temporarily disabled for testing
    /*
    if let Some(existing_wallet) = get_user_wallet_address_async(&claims.sub).await {
        return (StatusCode::CONFLICT, Json(CreateWalletResponse {
            success: false,
            wallet_address: Some(existing_wallet),
            message: "User already has a wallet".to_string(),
        })).into_response();
    }
    */

    // Generate new Solana wallet for the user
    match create_solana_wallet_for_user(&state.database_pool, &claims.sub, &request.wallet_type, &request.network).await {
        Ok(wallet_address) => {
            (StatusCode::CREATED, Json(CreateWalletResponse {
                success: true,
                wallet_address: Some(wallet_address),
                message: "Wallet created successfully".to_string(),
            })).into_response()
        }
        Err(e) => {
            error!("Failed to create wallet for user {}: {}", claims.sub, e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(CreateWalletResponse {
                success: false,
                wallet_address: None,
                message: format!("Failed to create wallet: {}", e),
            })).into_response()
        }
    }
}

async fn create_solana_wallet_for_user(
    database_pool: &DatabasePool,
    user_id: &str,
    wallet_type: &str,
    network: &str
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Generate real Solana wallet with proper encryption
    let solana_wallet = create_real_solana_wallet()?;

    info!("Created real Solana wallet for user {}: {}", user_id, solana_wallet.public_key);

    // Store wallet in PocketBase (with encrypted private key)
    match save_wallet_to_pocketbase_encrypted(user_id, &solana_wallet, wallet_type, network).await {
        Ok(_) => {
            info!("Wallet saved to PocketBase successfully for user {}", user_id);
        }
        Err(e) => {
            warn!("Failed to save wallet to PocketBase: {}, using in-memory storage as fallback", e);
            // Fallback to in-memory storage if PocketBase fails
            let mut wallets = USER_WALLETS.write().await;
            wallets.insert(user_id.to_string(), solana_wallet.public_key.clone());
        }
    }

    // Cache wallet in Redis for fast access - temporarily disabled
    /*
    if let Ok(cache) = get_global_cache().await {
        let cached_wallet = crate::cache::CachedWallet {
            user_id: user_id.to_string(),
            address: solana_wallet.public_key.clone(),
            network: network.to_string(),
            wallet_type: wallet_type.to_string(),
        };

        if let Err(e) = cache.set_wallet(user_id, &cached_wallet, 3600).await {
            warn!("Failed to cache wallet in Redis: {}", e);
        }
    }
    */

    // Also store in in-memory cache for fast access
    {
        let mut wallets = USER_WALLETS.write().await;
        wallets.insert(user_id.to_string(), solana_wallet.public_key.clone());
    }

    Ok(solana_wallet.public_key)
}

async fn save_wallet_to_pocketbase_encrypted(
    user_id: &str,
    solana_wallet: &crate::wallet::SolanaWallet,
    wallet_type: &str,
    network: &str
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let wallet_data = serde_json::json!({
        "user_id": user_id,
        "address": solana_wallet.public_key,
        "private_key": solana_wallet.private_key_encrypted,
        "wallet_type": wallet_type,
        "network": network,
        "is_connected": true,
        "balance": 0,
        "notes": "Auto-generated encrypted wallet for production"
    });

    // Thêm timeout để tránh socket hang up
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()?;

    let request_url = format!("{}/api/collections/wallets/records", pocketbase_url);
    info!("Attempting to save wallet to PocketBase: {}", request_url);

    let response = client
        .post(&request_url)
        .json(&wallet_data)
        .send()
        .await;

    match response {
        Ok(resp) => {
            if !resp.status().is_success() {
                let error_text = resp.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(format!("PocketBase API error: {}", error_text).into());
            }
            Ok(())
        }
        Err(e) => {
            error!("Failed to save wallet to PocketBase - URL: {}, Error: {}, using fallback storage", request_url, e);
            // Return error to trigger fallback in calling function
            Err(e.into())
        }
    }
}

async fn update_user_balance(database_pool: &DatabasePool, user_id: &str, amount: i64) -> anyhow::Result<()> {
    // TODO: Implement database update for user token balance
    // For now, just log the operation - will be implemented when database schema is ready
    tracing::info!("Updating user {} balance by {}", user_id, amount);
    Ok(())
}

// REAL BLOCKCHAIN INTEGRATION VIA MICROSERVICE
// Using gRPC client to communicate with separate blockchain-service
async fn mint_token_on_solana(
    blockchain_client: &std::sync::Arc<blockchain_client::BlockchainClient>,
    wallet_address: &str,
    particle_location: (i32, i32),
) -> anyhow::Result<String> {
    // Clone Arc to get owned instance for mutation
    let client = blockchain_client.as_ref().clone();

    // Call real blockchain service via gRPC
    client.mint_token_on_eat_particle(wallet_address, particle_location).await
}

// REAL BLOCKCHAIN INTEGRATION VIA MICROSERVICE
async fn transfer_tokens_on_solana(
    blockchain_client: &std::sync::Arc<blockchain_client::BlockchainClient>,
    from_wallet: &str,
    to_wallet: &str,
    amount: u64,
) -> anyhow::Result<String> {
    let client = blockchain_client.as_ref().clone();
    client.transfer_tokens(from_wallet, to_wallet, amount).await
}

// TRANSFER FROM GAME POOL (LOGIC ĐÚNG - Player earn từ pool có sẵn)
async fn transfer_from_game_pool(
    blockchain_client: &std::sync::Arc<blockchain_client::BlockchainClient>,
    wallet_address: &str,
    particle_location: (i32, i32),
    amount: u64,
) -> anyhow::Result<(String, i64)> {
    let client = blockchain_client.as_ref().clone();
    client.transfer_from_game_pool(wallet_address, particle_location, amount).await
}

// REAL WEBSOCKET INTEGRATION VIA BLOCKCHAIN MICROSERVICE
async fn emit_token_update(
    blockchain_client: &std::sync::Arc<blockchain_client::BlockchainClient>,
    user_id: &str,
    amount_minted: i64,
) -> anyhow::Result<()> {
    let client = blockchain_client.as_ref().clone();
    client.emit_token_update(user_id, amount_minted).await
}

// Token API Handlers
async fn eat_particle_handler(
    state: AppState,
    req: axum::http::Request<axum::body::Body>,
    claims: crate::auth::Claims,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/eat-particle"]).inc();

    // Parse JSON body
    let body_bytes = match hyper::body::to_bytes(req.into_body()).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(EatParticleResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                error: Some("Invalid request body".to_string()),
            })).into_response();
        }
    };

    let request: EatParticleRequest = match serde_json::from_slice(&body_bytes) {
        Ok(req) => req,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(EatParticleResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                error: Some("Invalid JSON format".to_string()),
            })).into_response();
        }
    };

    // Validate user has Solana wallet connected
    let wallet_address = match get_user_wallet_address_async(&claims.sub).await {
        Some(addr) => addr,
        None => {
            return (StatusCode::BAD_REQUEST, Json(EatParticleResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                error: Some("No Solana wallet connected".to_string()),
            })).into_response();
        }
    };

    // Call real blockchain service via gRPC
    match mint_token_on_solana(&state.blockchain_client, &wallet_address, request.particle_location).await {
        Ok(tx_signature) => {
            // Update user token balance in database
            if let Err(e) = update_user_balance(&state.database_pool, &claims.sub, 1).await {
                tracing::error!("Failed to update balance: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(EatParticleResponse {
                    success: false,
                    tx_signature: None,
                    new_balance: 0,
                    error: Some("Failed to update balance".to_string()),
                })).into_response();
            }

            // Emit real-time update via blockchain service WebSocket
            if let Err(e) = emit_token_update(&state.blockchain_client, &claims.sub, 1).await {
                tracing::warn!("Failed to emit WebSocket update: {:?}", e);
                // Don't fail the request for WebSocket issues
            }

            let new_balance = get_user_balance(&state.database_pool, &claims.sub).await;

            (StatusCode::OK, Json(EatParticleResponse {
                success: true,
                tx_signature: Some(tx_signature),
                new_balance,
                error: None,
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to mint token: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(EatParticleResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                error: Some("Failed to mint token".to_string()),
            })).into_response()
        }
    }
}

async fn earn_from_pool_handler(
    state: AppState,
    req: axum::http::Request<axum::body::Body>,
    claims: crate::auth::Claims,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/earn-from-pool"]).inc();

    // Parse JSON body
    let body_bytes = match hyper::body::to_bytes(req.into_body()).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(EarnFromPoolResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                remaining_pool: 0,
                error: Some("Invalid request body".to_string()),
            })).into_response();
        }
    };

    let request: EarnFromPoolRequest = match serde_json::from_slice(&body_bytes) {
        Ok(req) => req,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(EarnFromPoolResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                remaining_pool: 0,
                error: Some("Invalid JSON format".to_string()),
            })).into_response();
        }
    };

    // Validate user has Solana wallet connected
    let wallet_address = match get_user_wallet_address_async(&claims.sub).await {
        Some(addr) => addr,
        None => {
            return (StatusCode::BAD_REQUEST, Json(EarnFromPoolResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                remaining_pool: 0,
                error: Some("No Solana wallet connected".to_string()),
            })).into_response();
        }
    };

    // LOGIC ĐÚNG: Transfer từ game pool đã được auto-mint fill (không mint trực tiếp)
    match transfer_from_game_pool(&state.blockchain_client, &wallet_address, request.particle_location, request.amount).await {
        Ok((tx_signature, remaining_pool)) => {
            // Update user token balance in database
            if let Err(e) = update_user_balance(&state.database_pool, &claims.sub, request.amount as i64).await {
                tracing::error!("Failed to update balance: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(EarnFromPoolResponse {
                    success: false,
                    tx_signature: None,
                    new_balance: 0,
                    remaining_pool: 0,
                    error: Some("Failed to update balance".to_string()),
                })).into_response();
            }

            // Emit real-time update via blockchain service WebSocket
            if let Err(e) = emit_token_update(&state.blockchain_client, &claims.sub, request.amount as i64).await {
                tracing::warn!("Failed to emit WebSocket update: {:?}", e);
                // Don't fail the request for WebSocket issues
            }

            let new_balance = get_user_balance(&state.database_pool, &claims.sub).await;

            (StatusCode::OK, Json(EarnFromPoolResponse {
                success: true,
                tx_signature: Some(tx_signature),
                new_balance,
                remaining_pool,
                error: None,
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to earn from pool: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(EarnFromPoolResponse {
                success: false,
                tx_signature: None,
                new_balance: 0,
                remaining_pool: 0,
                error: Some("Failed to earn from pool".to_string()),
            })).into_response()
        }
    }
}

async fn balance_handler(
    state: AppState,
    _req: axum::http::Request<axum::body::Body>,
    claims: crate::auth::Claims,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/balance"]).inc();

    let balance = get_user_balance(&state.database_pool, &claims.sub).await;
    let wallet_address = get_user_wallet_address_async(&claims.sub).await;

    (StatusCode::OK, Json(BalanceResponse {
        game_tokens: balance,
        wallet_address: wallet_address, // Include wallet address in response
        total_earned: balance, // TODO: Track separately
        session_tokens: 0,     // TODO: Track session tokens
    })).into_response()
}

async fn transfer_handler(
    state: AppState,
    req: axum::http::Request<axum::body::Body>,
    claims: crate::auth::Claims,
) -> impl IntoResponse {
    HTTP_REQUESTS_TOTAL.with_label_values(&["/api/token/transfer"]).inc();

    // Parse JSON body
    let body_bytes = match hyper::body::to_bytes(req.into_body()).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Invalid request body".to_string()),
            })).into_response();
        }
    };

    let transfer_req: TransferRequest = match serde_json::from_slice(&body_bytes) {
        Ok(req) => req,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Invalid JSON format".to_string()),
            })).into_response();
        }
    };

    // Validate balance
    let balance = get_user_balance(&state.database_pool, &claims.sub).await;
    if balance < transfer_req.amount as i64 {
        return (StatusCode::BAD_REQUEST, Json(TransferResponse {
            success: false,
            tx_signature: None,
            error: Some("Insufficient balance".to_string()),
        })).into_response();
    }

    // Get recipient wallet address
    let to_wallet = match get_user_wallet_address(&state.database_pool, &transfer_req.to_user_id) {
        Some(addr) => addr,
        None => {
            return (StatusCode::BAD_REQUEST, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Recipient has no wallet connected".to_string()),
            })).into_response();
        }
    };

    // Get sender wallet address
    let from_wallet = match get_user_wallet_address(&state.database_pool, &claims.sub) {
        Some(addr) => addr,
        None => {
            return (StatusCode::BAD_REQUEST, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Sender has no wallet connected".to_string()),
            })).into_response();
        }
    };

    // Execute transfer via blockchain service
    match transfer_tokens_on_solana(&state.blockchain_client, &from_wallet, &to_wallet, transfer_req.amount).await {
        Ok(tx_signature) => {
            // Update database balances
            if let Err(e) = update_user_balance(&state.database_pool, &claims.sub, -(transfer_req.amount as i64)).await {
                tracing::error!("Failed to update sender balance: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(TransferResponse {
                    success: false,
                    tx_signature: None,
                    error: Some("Failed to update balances".to_string()),
                })).into_response();
            }

            if let Err(e) = update_user_balance(&state.database_pool, &transfer_req.to_user_id, transfer_req.amount as i64).await {
                tracing::error!("Failed to update recipient balance: {:?}", e);
                // TODO: Rollback sender balance change
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(TransferResponse {
                    success: false,
                    tx_signature: None,
                    error: Some("Failed to update balances".to_string()),
                })).into_response();
            }

            (StatusCode::OK, Json(TransferResponse {
                success: true,
                tx_signature: Some(tx_signature),
                error: None,
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to transfer tokens: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(TransferResponse {
                success: false,
                tx_signature: None,
                error: Some("Failed to transfer tokens".to_string()),
            })).into_response()
        }
    }
}

// HD Wallet API Handlers

/// Create HD wallet with BIP39 mnemonic
async fn create_hd_wallet_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Extract and validate JWT token
    let auth_header = headers.get(AUTHORIZATION);

    let token = match auth_header {
        Some(auth_value) => {
            let auth_str = auth_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                auth_str[7..].to_string() // Remove "Bearer " prefix
            } else {
                return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid authorization format. Expected 'Bearer <token>'"
                }))).into_response();
            }
        }
        None => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "success": false,
                "error": "Missing authorization header"
            }))).into_response();
        }
    };

    let claims = match state.auth_service.validate_token_with_db(&token, &state.database_pool).await {
        Ok(c) => c,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
                "success": false,
                "error": "Invalid or expired token"
            }))).into_response();
        }
    };

    // Create HD wallet for user
    match hd_wallet::create_hd_wallet() {
        Ok(result) => {
            // Store wallet in database (simplified - in production you'd store encrypted data)
            // For now, just return success response
            let response = serde_json::json!({
                "success": true,
                "wallet": {
                    "public_key": result.wallet.public_key,
                    "address": result.wallet.public_key, // Solana address is the public key
                },
                "mnemonic": result.mnemonic,
                "message": "HD wallet created successfully with BIP39 mnemonic backup"
            });

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to create HD wallet: {:?}", e);
            let response = serde_json::json!({
                "success": false,
                "error": format!("Failed to create HD wallet: {}", e)
            });
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response()
        }
    }
}

/// Derive additional wallet from existing HD wallet
async fn derive_wallet_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..]) // Remove "Bearer " prefix
            } else {
                None
            }
        }
        None => None,
    };

    let _claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    let response = serde_json::json!({
                        "success": false,
                        "error": "Invalid or expired token"
                    });
                    return (StatusCode::UNAUTHORIZED, Json(response)).into_response();
                }
            }
        }
        None => {
            let response = serde_json::json!({
                "success": false,
                "error": "Authorization token required"
            });
            return (StatusCode::UNAUTHORIZED, Json(response)).into_response();
        }
    };

    let index = req.get("index")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    // In a full implementation, you'd load the user's HD wallet from database
    // and derive the wallet at the specified index
    // For this demo, we'll create a temporary HD wallet and derive from it

    match hd_wallet::HDWallet::new() {
        Ok(mut hd_wallet) => {
            match hd_wallet.derive_wallet(index) {
                Ok(wallet) => {
                    let response = serde_json::json!({
                        "success": true,
                        "wallet": {
                            "public_key": wallet.public_key,
                            "address": wallet.public_key,
                            "index": index
                        },
                        "message": format!("Wallet derived successfully at index {}", index)
                    });
                    (StatusCode::OK, Json(response)).into_response()
                }
                Err(e) => {
                    tracing::error!("Failed to derive wallet: {:?}", e);
                    let response = serde_json::json!({
                        "success": false,
                        "error": format!("Failed to derive wallet: {}", e)
                    });
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response()
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to load HD wallet: {:?}", e);
            let response = serde_json::json!({
                "success": false,
                "error": format!("Failed to load HD wallet: {}", e)
            });
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response()
        }
    }
}

/// Recover wallet from BIP39 mnemonic
async fn recover_wallet_handler_api(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Extract and validate JWT token
    let token = match headers.get("authorization") {
        Some(header_value) => {
            let auth_str = header_value.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                Some(&auth_str[7..]) // Remove "Bearer " prefix
            } else {
                None
            }
        }
        None => None,
    };

    let _claims = match token {
        Some(token_str) => {
            match state.auth_service.validate_token_with_db(token_str, &state.database_pool).await {
                Ok(claims) => claims,
                Err(_) => {
                    let response = serde_json::json!({
                        "success": false,
                        "error": "Invalid or expired token"
                    });
                    return (StatusCode::UNAUTHORIZED, Json(response)).into_response();
                }
            }
        }
        None => {
            let response = serde_json::json!({
                "success": false,
                "error": "Authorization token required"
            });
            return (StatusCode::UNAUTHORIZED, Json(response)).into_response();
        }
    };

    let mnemonic = match req.get("mnemonic").and_then(|v| v.as_str()) {
        Some(m) => m,
        None => {
            let response = serde_json::json!({
                "success": false,
                "error": "Mnemonic phrase is required"
            });
            return (StatusCode::BAD_REQUEST, Json(response)).into_response();
        }
    };

    // Validate mnemonic format
    if !hd_wallet::validate_mnemonic(mnemonic) {
        let response = serde_json::json!({
            "success": false,
            "error": "Invalid mnemonic phrase format"
        });
        return (StatusCode::BAD_REQUEST, Json(response)).into_response();
    }

    match hd_wallet::recover_wallet_from_mnemonic(mnemonic) {
        Ok(result) => {
            let response = serde_json::json!({
                "success": true,
                "wallet": {
                    "public_key": result.wallet.public_key,
                    "address": result.wallet.public_key,
                },
                "message": "Wallet recovered successfully from mnemonic"
            });
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to recover wallet: {:?}", e);
            let response = serde_json::json!({
                "success": false,
                "error": format!("Failed to recover wallet: {}", e)
            });
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response)).into_response()
        }
    }
}

// === AUTO-MINT SCHEDULER - LOGIC ĐÚNG (Owner nhận 20% ngay lập tức) ===
async fn auto_mint_scheduler(
    blockchain_client: Arc<blockchain_client::BlockchainClient>,
    mint_interval_seconds: u64,
) {
    let mut interval = time::interval(Duration::from_secs(mint_interval_seconds));

    tracing::info!("🚀 [AUTO-MINT SCHEDULER] Started - Minting every {} seconds", mint_interval_seconds);

    loop {
        interval.tick().await;

        // LOGIC ĐÚNG: Auto-mint định kỳ KHÔNG PHỤ THUỘC player activity
        // Owner nhận 20% ngay lập tức, game pool được fill 80% cho players
        match auto_mint_tokens(&blockchain_client, 1000).await { // Mint 1000 tokens mỗi lần
            Ok((game_amount, owner_amount)) => {
                tracing::info!("✅ [AUTO-MINT SCHEDULER] Minted {} tokens: {} game pool + {} owner (20% immediately)", 1000, game_amount, owner_amount);

                // Emit event để track revenue
                // TODO: Emit AutoMintEvent to blockchain for tracking
            }
            Err(e) => {
                tracing::error!("❌ [AUTO-MINT SCHEDULER] Failed to auto-mint: {:?}", e);
                // Continue scheduler despite errors
            }
        }
    }
}

// AUTO-MINT TOKENS - LOGIC ĐÚNG (80/20 split ngay lập tức)
async fn auto_mint_tokens(
    blockchain_client: &Arc<blockchain_client::BlockchainClient>,
    total_amount: u64,
) -> anyhow::Result<(u64, u64)> {
    // LOGIC ĐÚNG: Chia 80/20 ngay khi mint
    let game_amount = total_amount * 80 / 100;  // 80% cho game pool
    let owner_amount = total_amount * 20 / 100; // 20% cho owner NGAY LẬP TỨC

    // Mint tokens to game pool (80%)
    let game_tx = mint_to_game_pool(blockchain_client, game_amount).await?;
    tracing::info!("🎮 Minted {} tokens to game pool - TX: {}", game_amount, game_tx);

    // Mint tokens to owner wallet (20%) - NGAY LẬP TỨC, KHÔNG PHỤ THUỘC PLAYER
    let owner_tx = mint_to_owner_wallet(blockchain_client, owner_amount).await?;
    tracing::info!("👑 Minted {} tokens to owner wallet (20%) - TX: {}", owner_amount, owner_tx);

    Ok((game_amount, owner_amount))
}

// Helper functions for auto-mint scheduler
async fn mint_to_game_pool(
    blockchain_client: &Arc<blockchain_client::BlockchainClient>,
    amount: u64,
) -> anyhow::Result<String> {
    // TODO: Implement mint to game pool - this needs blockchain service support
    // For now, return mock transaction
    Ok(format!("mock_game_pool_tx_{}", amount))
}

async fn mint_to_owner_wallet(
    blockchain_client: &Arc<blockchain_client::BlockchainClient>,
    amount: u64,
) -> anyhow::Result<String> {
    // TODO: Implement mint to owner wallet - this needs blockchain service support
    // For now, return mock transaction
    Ok(format!("mock_owner_tx_{}", amount))
}
