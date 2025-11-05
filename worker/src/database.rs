// use pocketbase::PocketBaseClient as BasePocketBaseClient;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use dashmap::DashMap;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicU64, Ordering};

// Temporarily disabled due to PocketBase dependency issues
// const POCKETBASE_URL: &str = "http://127.0.0.1:8090";
// #[allow(dead_code)]
// const DEFAULT_EMAIL: &str = "admin@pocketbase.local";
// #[allow(dead_code)]
// const DEFAULT_PASSWORD: &str = "123456789";

// Performance optimizations
#[allow(dead_code)]
const CACHE_TTL_SECONDS: u64 = 30; // Cache game state for 30 seconds
#[allow(dead_code)]
const BATCH_SIZE: usize = 10; // Batch database operations
#[allow(dead_code)]
const SYNC_INTERVAL_FRAMES: u64 = 60; // Sync every 60 frames (1 second at 60fps)

// In-memory cache for game state
#[derive(Debug)]
struct GameStateCache {
    games: DashMap<String, (GameRecord, Instant)>, // (game_data, cached_at)
    players: DashMap<String, (PlayerRecord, Instant)>,
    sessions: DashMap<String, (GameSessionRecord, Instant)>,
}

impl GameStateCache {
    fn new() -> Self {
        Self {
            games: DashMap::new(),
            players: DashMap::new(),
            sessions: DashMap::new(),
        }
    }

    #[allow(dead_code)]
    fn get_game(&self, game_id: &str) -> Option<GameRecord> {
        if let Some(entry) = self.games.get(game_id) {
            let (game, cached_at) = entry.value();
            if cached_at.elapsed().as_secs() < CACHE_TTL_SECONDS {
                return Some(game.clone());
            } else {
                // Cache expired, remove it
                self.games.remove(game_id);
            }
        }
        None
    }

    fn set_game(&self, game: GameRecord) {
        let game_id = game.id.as_ref().unwrap_or(&"".to_string()).clone();
        self.games.insert(game_id, (game, Instant::now()));
    }

    fn invalidate_game(&self, game_id: &str) {
        self.games.remove(game_id);
    }
}

// Performance metrics
#[derive(Debug, Default)]
struct DatabaseMetrics {
    cache_hits: AtomicU64,
    cache_misses: AtomicU64,
    db_queries: AtomicU64,
    db_errors: AtomicU64,
    total_query_time_ms: AtomicU64,
}

impl DatabaseMetrics {
    #[allow(dead_code)]
    fn record_cache_hit(&self) {
        self.cache_hits.fetch_add(1, Ordering::Relaxed);
    }

    #[allow(dead_code)]
    fn record_cache_miss(&self) {
        self.cache_misses.fetch_add(1, Ordering::Relaxed);
    }

    fn record_db_query(&self, duration_ms: u64) {
        self.db_queries.fetch_add(1, Ordering::Relaxed);
        self.total_query_time_ms.fetch_add(duration_ms, Ordering::Relaxed);
    }

    fn record_db_error(&self) {
        self.db_errors.fetch_add(1, Ordering::Relaxed);
    }

    fn get_stats(&self) -> (u64, u64, u64, u64, u64) {
        let queries = self.db_queries.load(Ordering::Relaxed);
        let total_time = self.total_query_time_ms.load(Ordering::Relaxed);
        let avg_time = if queries > 0 { total_time / queries } else { 0 };

        (
            self.cache_hits.load(Ordering::Relaxed),
            self.cache_misses.load(Ordering::Relaxed),
            queries,
            self.db_errors.load(Ordering::Relaxed),
            avg_time,
        )
    }
}

// Global instances
static CACHE: Lazy<GameStateCache> = Lazy::new(GameStateCache::new);
static METRICS: Lazy<DatabaseMetrics> = Lazy::new(DatabaseMetrics::default);

// Temporarily disabled due to PocketBase dependency issues
// #[derive(Debug, Clone)]
// pub struct PocketBaseClient {
//     base_client: BasePocketBaseClient,
// }

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserRecord,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserRecord {
    pub id: String,
    pub email: String,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerRecord {
    pub id: Option<String>,
    pub username: String,
    pub email: String,
    pub score: i32,
    pub is_online: bool,
    pub created: Option<String>,
    pub updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameRecord {
    pub id: Option<String>,
    pub name: String,
    pub max_players: i32,
    pub status: String, // "waiting", "playing", "finished"
    pub created: Option<String>,
    pub updated: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameSessionRecord {
    pub id: Option<String>,
    pub game_id: String,
    pub player_id: String,
    pub score: i32,
    pub position: serde_json::Value, // JSON position data
    pub status: String, // "active", "finished"
    pub created: Option<String>,
    pub updated: Option<String>,
}

// Temporarily disabled due to PocketBase dependency issues
// // impl PocketBaseClient {
// //     pub fn new() -> Self {
// //         Self {
// //             base_client: BasePocketBaseClient::new(POCKETBASE_URL),
// //         }
// //     }
// 
//     pub fn base_url(&self) -> &str {
//         self.base_client.base_url()
//     }
// 
//     pub async fn authenticate(&mut self, email: &str, password: &str) -> Result<()> {
//         match self.base_client.auth_admin(email, password).await {
//             Ok(_) => {
//                 info!("Successfully authenticated with PocketBase");
//                 Ok(())
//             }
//             Err(e) => {
//                 error!("Authentication failed: {}", e);
//                 Err(anyhow!("Authentication failed: {}", e))
//             }
//         }
//     }
// 
//     pub async fn test_connection(&self) -> Result<bool> {
//         match self.base_client.health().await {
//             Ok(_) => Ok(true),
//             Err(e) => {
//                 error!("Health check failed: {}", e);
//                 Ok(false)
//             }
//         }
//     }
// 
//     /// Non-blocking version for use in game loop
//     pub fn test_connection_blocking(&self) -> Result<bool> {
//         // Real synchronous health check using blocking reqwest
//         let client = reqwest::blocking::Client::builder()
//             .timeout(std::time::Duration::from_secs(1))
//             .build()
//             .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;
// 
//         let url = format!("{}/api/health", self.base_client.base_url());
//         match client.get(&url).send() {
//             Ok(response) => Ok(response.status().is_success()),
//             Err(e) => {
//                 tracing::debug!("Health check failed: {}", e);
//                 Ok(false)
//             }
//         }
//     }
// 
//     pub async fn create_collection(&self, name: &str, schema: Value) -> Result<String> {
//         // use pocketbase::{CollectionCreateRequest, FieldSchema};
// 
//         // Convert schema từ Value sang Vec<FieldSchema>
//         let fields: Vec<FieldSchema> = serde_json::from_value(schema)
//             .map_err(|e| anyhow!("Failed to parse schema: {}", e))?;
// 
//         let collection_request = CollectionCreateRequest {
//             name: name.to_string(),
//             schema: fields,
//             indexes: Some(vec![]),
//             rules: None,
//         };
// 
//         match self.base_client.create_collection(collection_request).await {
//             Ok(collection) => {
//                 info!("Created collection: {} (ID: {})", name, collection.id);
//                 Ok(collection.id)
//             }
//             Err(e) => {
//                 error!("Failed to create collection {}: {}", name, e);
//                 Err(anyhow!("Failed to create collection: {}", e))
//             }
//         }
//     }
// 
//     pub async fn save_game(&self, game: &GameRecord) -> Result<String> {
//         let game_data = json!({
//             "name": game.name,
//             "max_players": game.max_players,
//             "status": game.status
//         });
// 
//         match self.base_client.create_record("games", game_data).await {
//             Ok(record) => {
//                 info!("Saved game: {} (ID: {})", game.name, record.id);
// 
//                 // Update cache with new game
//                 let mut updated_game = game.clone();
//                 updated_game.id = Some(record.id.clone());
//                 CACHE.set_game(updated_game);
// 
//                 Ok(record.id)
//             }
//             Err(e) => {
//                 error!("Failed to save game {}: {}", game.name, e);
//                 Err(anyhow!("Failed to save game: {}", e))
//             }
//         }
//     }
// 
//     pub async fn update_game_status(&self, game_id: &str, status: &str) -> Result<()> {
//         let update_data = json!({
//             "status": status
//         });
// 
//         match self.base_client.update_record("games", game_id, update_data).await {
//             Ok(_) => {
//                 info!("Updated game {} status to: {}", game_id, status);
// 
//                 // Invalidate cache for this game since status changed
//                 CACHE.invalidate_game(game_id);
// 
//                 Ok(())
//             }
//             Err(e) => {
//                 error!("Failed to update game {}: {}", game_id, e);
//                 Err(anyhow!("Failed to update game: {}", e))
//             }
//         }
//     }
// 
//     /// Get performance metrics for monitoring
//     pub fn get_performance_metrics(&self) -> (u64, u64, u64, u64, u64) {
//         METRICS.get_stats()
//     }
// 
//     /// Get cache statistics
//     pub fn get_cache_stats(&self) -> (usize, usize, usize) {
//         (CACHE.games.len(), CACHE.players.len(), CACHE.sessions.len())
//     }
// 
//     pub async fn get_games(&self) -> Result<Vec<GameRecord>> {
//         let start_time = Instant::now();
// 
//         // Try cache first
//         let _games: Vec<GameRecord> = Vec::new();
//         let _cache_hits = 0;
//         let _cache_misses = 0;
// 
//         // Check cache for existing games
//         // For now, we'll query database and cache results
//         // In a full implementation, we'd check cache first
// 
//         match self.base_client.list_records("games", None, None).await {
//             Ok(records) => {
//                 let query_time = start_time.elapsed().as_millis() as u64;
//                 METRICS.record_db_query(query_time);
// 
//                 let games: Vec<GameRecord> = records
//                     .into_iter()
//                     .map(|record| {
//                         let game = GameRecord {
//                             id: Some(record.id.clone()),
//                             name: record.fields.get("name")
//                                 .and_then(|v| v.as_str()).unwrap_or("").to_string(),
//                             max_players: record.fields.get("max_players")
//                                 .and_then(|v| v.as_i64()).unwrap_or(0) as i32,
//                             status: record.fields.get("status")
//                                 .and_then(|v| v.as_str()).unwrap_or("").to_string(),
//                             created: Some(record.created),
//                             updated: Some(record.updated),
//                         };
// 
//                         // Cache this game
//                         CACHE.set_game(game.clone());
//                         game
//                     })
//                     .collect();
// 
//                 debug!("Database query took {}ms for {} games", query_time, games.len());
//                 Ok(games)
//             }
//             Err(e) => {
//                 METRICS.record_db_error();
//                 error!("Failed to get games: {}", e);
//                 Err(anyhow!("Failed to get games: {}", e))
//             }
//         }
//     }
// }
// 
// impl Default for PocketBaseClient {
//     fn default() -> Self {
//         Self::new()
//     }
// }

// #[cfg(test)]
mod tests {
    

    // #[tokio::test]
}
