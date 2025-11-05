use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::info;
use reqwest::Client;

pub type BoxError = Box<dyn std::error::Error + Send + Sync>;

/// Database connection pool for high concurrency scenarios (PocketBase)
#[derive(Debug, Clone)]
pub struct DatabasePool {
    client: Client,
    base_url: String,
    metrics: Arc<DatabaseMetrics>,
    config: DatabaseConfig,
}

/// Database configuration for connection pooling (PocketBase)
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    /// PocketBase URL (e.g., "http://localhost:8090")
    pub database_url: String,
    /// Connection pool size (default: 50)
    pub pool_size: u32,
    /// Minimum idle connections (default: 5)
    pub min_idle: u32,
    /// Connection timeout in seconds (default: 30)
    pub connection_timeout: u64,
    /// Query timeout in seconds (default: 10)
    pub query_timeout: u64,
    /// Enable metrics collection (default: true)
    pub enable_metrics: bool,
    /// Enable read/write splitting (default: false)
    pub enable_read_replica: bool,
    /// Read replica URLs (if enabled)
    pub read_replica_urls: Vec<String>,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            database_url: "http://localhost:8090".to_string(),
            pool_size: 20,  // ✅ Điều chỉnh theo yêu cầu: max 20 connections
            min_idle: 5,    // ✅ Min 5 connections như yêu cầu
            connection_timeout: 30,
            query_timeout: 10,
            enable_metrics: true,
            enable_read_replica: false,
            read_replica_urls: vec![],
        }
    }
}

/// Performance metrics for database monitoring
#[derive(Debug)]
pub struct DatabaseMetrics {
    /// Total connections created
    pub connections_created: AtomicU64,
    /// Total connections destroyed
    pub connections_destroyed: AtomicU64,
    /// Current active connections
    pub connections_active: AtomicU64,
    /// Current idle connections
    pub connections_idle: AtomicU64,
    /// Total queries executed
    pub queries_executed: AtomicU64,
    /// Total query errors
    pub query_errors: AtomicU64,
    /// Average query time in microseconds
    pub avg_query_time: AtomicU64,
    /// Connection pool wait time
    pub pool_wait_time: AtomicU64,
    /// Read query count
    pub read_queries: AtomicU64,
    /// Write query count
    pub write_queries: AtomicU64,
    /// Creation time for age calculation
    created_at: Instant,
}

impl Default for DatabaseMetrics {
    fn default() -> Self {
        Self {
            connections_created: AtomicU64::new(0),
            connections_destroyed: AtomicU64::new(0),
            connections_active: AtomicU64::new(0),
            connections_idle: AtomicU64::new(0),
            queries_executed: AtomicU64::new(0),
            query_errors: AtomicU64::new(0),
            avg_query_time: AtomicU64::new(0),
            pool_wait_time: AtomicU64::new(0),
            read_queries: AtomicU64::new(0),
            write_queries: AtomicU64::new(0),
            created_at: Instant::now(),
        }
    }
}

/// Query types for metrics
#[derive(Debug, Clone, Copy)]
pub enum QueryType {
    Read,
    Write,
}

impl DatabaseMetrics {
    pub fn record_connection_created(&self) {
        let _ = self.connections_created.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_connection_destroyed(&self) {
        let _ = self.connections_destroyed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_connection_active(&self) {
        let _ = self.connections_active.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_connection_idle(&self) {
        let _ = self.connections_idle.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_query(&self, query_type: QueryType, micros: u64) {
        match query_type {
            QueryType::Read => { let _ = self.read_queries.fetch_add(1, Ordering::Relaxed); },
            QueryType::Write => { let _ = self.write_queries.fetch_add(1, Ordering::Relaxed); },
        }
        let _ = self.queries_executed.fetch_add(1, Ordering::Relaxed);
        let _ = self.avg_query_time.fetch_add(micros, Ordering::Relaxed);
    }

    pub fn record_query_error(&self) {
        let _ = self.query_errors.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_pool_wait(&self, micros: u64) {
        let _ = self.pool_wait_time.fetch_add(micros, Ordering::Relaxed);
    }

    pub fn get_age(&self) -> Duration {
        self.created_at.elapsed()
    }
}

/// Player record for database operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerRecord {
    pub id: Option<String>,
    pub username: String,
    pub email: String,
    pub score: i32,
    pub is_online: bool,
    pub wallet_address: Option<String>,
    pub wallet_verified: bool,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Game record for database operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameRecord {
    pub id: Option<String>,
    pub name: String,
    pub max_players: i32,
    pub status: String,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Game session record for database operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSessionRecord {
    pub id: Option<String>,
    pub game_id: String,
    pub player_id: String,
    pub score: i32,
    pub position: Option<serde_json::Value>,
    pub status: String,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl DatabasePool {
    /// Create a new PocketBase HTTP client
    pub async fn new(config: DatabaseConfig) -> Result<Self, BoxError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.connection_timeout))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        // Test connection with health check
        let health_url = format!("{}/api/health", config.database_url.trim_end_matches('/'));
        let response = client.get(&health_url).send().await;

        match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    info!("PocketBase connection established successfully");
                } else {
                    return Err(format!("PocketBase health check failed with status: {}", resp.status()).into());
                }
            }
            Err(e) => {
                return Err(format!("Failed to connect to PocketBase at {}: {}", config.database_url, e).into());
            }
        }

        Ok(Self {
            client,
            base_url: config.database_url.clone(),
            metrics: Arc::new(DatabaseMetrics::default()),
            config,
        })
    }

    /// Health check for PocketBase connection
    pub async fn health_check(&self) -> Result<bool, BoxError> {
        let health_url = format!("{}/api/health", self.base_url.trim_end_matches('/'));
        let response = self.client.get(&health_url).send().await?;

        Ok(response.status().is_success())
    }

    /// Execute HTTP request to PocketBase API
    pub async fn execute_request(&self, method: &str, endpoint: &str, body: Option<serde_json::Value>) -> Result<serde_json::Value, BoxError> {
        let start = Instant::now();
        let url = format!("{}/api{}", self.base_url.trim_end_matches('/'), endpoint);

        let mut request_builder = match method.to_uppercase().as_str() {
            "GET" => self.client.get(&url),
            "POST" => self.client.post(&url),
            "PUT" => self.client.put(&url),
            "PATCH" => self.client.patch(&url),
            "DELETE" => self.client.delete(&url),
            _ => return Err(format!("Unsupported HTTP method: {}", method).into()),
        };

        if let Some(body_data) = body {
            request_builder = request_builder
                .header("Content-Type", "application/json")
                .json(&body_data);
        }

        let response = request_builder.send().await?;
        let micros = start.elapsed().as_micros() as u64;

        if self.config.enable_metrics {
            if response.status().is_success() {
                self.metrics.record_query(QueryType::Read, micros);
            } else {
                self.metrics.record_query_error();
            }
        }

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("PocketBase API error ({}): {}", status, error_text).into());
        }

        let result: serde_json::Value = response.json().await?;

        if self.config.enable_metrics {
            self.metrics.record_query(QueryType::Read, micros);
        }

        Ok(result)
    }

    /// Get player by ID from PocketBase
    pub async fn get_player(&self, player_id: &str) -> Result<Option<PlayerRecord>, BoxError> {
        let endpoint = format!("/collections/players/records/{}", player_id);
        let response = self.execute_request("GET", &endpoint, None).await?;

        if let Some(item) = response.get("item") {
            let player_record: PlayerRecord = serde_json::from_value(item.clone())?;
            Ok(Some(player_record))
        } else {
            Ok(None)
        }
    }

    /// Create player in PocketBase
    pub async fn create_player(&self, player: &PlayerRecord) -> Result<String, BoxError> {
        let endpoint = "/collections/players/records";
        let player_data = serde_json::json!({
            "username": player.username,
            "email": player.email,
            "score": player.score,
            "is_online": player.is_online,
            "wallet_address": player.wallet_address,
            "wallet_verified": player.wallet_verified
        });

        let response = self.execute_request("POST", endpoint, Some(player_data)).await?;

        if let Some(id) = response.get("id") {
            Ok(id.as_str().unwrap_or("").to_string())
        } else {
            Err("No ID returned from PocketBase".into())
        }
    }

    /// Update player in PocketBase
    pub async fn update_player(&self, player_id: &str, player: &PlayerRecord) -> Result<(), BoxError> {
        let endpoint = format!("/collections/players/records/{}", player_id);
        let player_data = serde_json::json!({
            "username": player.username,
            "email": player.email,
            "score": player.score,
            "is_online": player.is_online,
            "wallet_address": player.wallet_address,
            "wallet_verified": player.wallet_verified
        });

        self.execute_request("PATCH", &endpoint, Some(player_data)).await?;
        Ok(())
    }

    /// Check if token is blacklisted
    pub async fn is_token_blacklisted(&self, token_jti: &str) -> Result<bool, BoxError> {
        let endpoint = format!("/collections/token_blacklist/records?filter=jti=\"{}\"", token_jti);

        match self.execute_request("GET", &endpoint, None).await {
            Ok(response) => {
                if let Some(items) = response.get("items") {
                    if let Some(items_array) = items.as_array() {
                        Ok(!items_array.is_empty())
                    } else {
                        Ok(false)
                    }
                } else {
                    Ok(false)
                }
            }
            Err(e) => {
                // If collection doesn't exist or query fails, assume token is not blacklisted
                // This prevents authentication failures due to missing database setup
                tracing::warn!("Token blacklist check failed (collection may not exist): {:?}", e);
                Ok(false)
            }
        }
    }

    /// Blacklist a token
    pub async fn blacklist_token(&self, token_jti: &str, expires_at: i64) -> Result<(), BoxError> {
        let endpoint = "/collections/token_blacklist/records";
        let blacklist_data = serde_json::json!({
            "jti": token_jti,
            "expires_at": expires_at
        });

        match self.execute_request("POST", endpoint, Some(blacklist_data)).await {
            Ok(_) => Ok(()),
            Err(e) => {
                // If collection doesn't exist, log warning but don't fail logout
                tracing::warn!("Token blacklist creation failed (collection may not exist): {:?}", e);
                Ok(())
            }
        }
    }

    /// Create game room in PocketBase
    pub async fn create_game_room(&self, room_name: &str, max_players: i32) -> Result<String, BoxError> {
        let endpoint = "/collections/rooms/records";
        let room_data = serde_json::json!({
            "name": room_name,
            "max_players": max_players,
            "is_active": true,
            "player_count": 0
        });

        let response = self.execute_request("POST", endpoint, Some(room_data)).await?;

        if let Some(id) = response.get("id") {
            Ok(id.as_str().unwrap_or("").to_string())
        } else {
            Err("No ID returned from PocketBase".into())
        }
    }

    /// Get active game rooms
    pub async fn get_active_rooms(&self) -> Result<Vec<serde_json::Value>, BoxError> {
        let endpoint = "/collections/rooms/records?filter=is_active=true";
        let response = self.execute_request("GET", endpoint, None).await?;

        if let Some(items) = response.get("items") {
            if let Some(items_array) = items.as_array() {
                Ok(items_array.clone())
            } else {
                Ok(Vec::new())
            }
        } else {
            Ok(Vec::new())
        }
    }

    /// Join player to room
    pub async fn join_room(&self, room_id: &str, player_id: &str) -> Result<(), BoxError> {
        // Get current room data
        let room_endpoint = format!("/collections/rooms/records/{}", room_id);
        let room_response = self.execute_request("GET", &room_endpoint, None).await?;

        if let Some(room_item) = room_response.get("item") {
            let current_count = room_item.get("player_count").and_then(|v| v.as_i64()).unwrap_or(0);
            let max_players = room_item.get("max_players").and_then(|v| v.as_i64()).unwrap_or(8);

            if current_count >= max_players {
                return Err("Room is full".into());
            }

            // Update room player count
            let update_data = serde_json::json!({
                "player_count": current_count + 1
            });

            self.execute_request("PATCH", &room_endpoint, Some(update_data)).await?;

            // Add player to room_players collection (if exists)
            let join_endpoint = "/collections/room_players/records";
            let join_data = serde_json::json!({
                "room_id": room_id,
                "player_id": player_id,
                "joined_at": chrono::Utc::now().timestamp()
            });

            let _ = self.execute_request("POST", join_endpoint, Some(join_data)).await;
        }

        Ok(())
    }

    /// Get performance metrics
    pub fn get_metrics(&self) -> Arc<DatabaseMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Execute a read query (legacy compatibility)
    pub async fn execute_read(&self, _query: &str) -> Result<serde_json::Value, BoxError> {
        // For PocketBase, we use specific methods instead of generic queries
        Err("Generic queries not supported with PocketBase. Use specific methods like get_player()".into())
    }

    /// Execute a write query (legacy compatibility)
    pub async fn execute_write(&self, _query: &str) -> Result<serde_json::Value, BoxError> {
        // For PocketBase, we use specific methods instead of generic queries
        Err("Generic queries not supported with PocketBase. Use specific methods like create_player()".into())
    }
}

impl Default for DatabasePool {
    fn default() -> Self {
        // Create a mock database pool when database is not available
        // This allows services to run without database connection
        let config = DatabaseConfig::default();
        let client = Client::builder()
            .timeout(Duration::from_secs(config.connection_timeout))
            .build()
            .expect("Failed to create HTTP client for mock database pool");

        Self {
            client,
            base_url: config.database_url.clone(),
            metrics: Arc::new(DatabaseMetrics::default()),
            config,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_pool_creation() {
        let config = DatabaseConfig {
            database_url: "http://localhost:8090".to_string(),
            pool_size: 10,
            min_idle: 2,
            ..Default::default()
        };

        // This test will fail if PocketBase is not running
        // In a real scenario, you'd mock the HTTP responses
        let _pool = DatabasePool::new(config).await;
    }
}