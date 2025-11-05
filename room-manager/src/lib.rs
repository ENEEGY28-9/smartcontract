use std::{
    collections::HashMap,
    env,
    sync::Arc,
    time::Duration,
};

use common_net::{
    metrics::{self, MatchmakingMetrics},
    shutdown,
};
// Temporarily disabled due to PocketBase dependency issues
// use pocketbase::PocketBaseClient;
use serde::{Deserialize, Serialize};
use tokio::{sync::{oneshot, RwLock}, time::interval};
use tracing::{error, info, warn};
use uuid::Uuid;

pub type BoxError = metrics::BoxError;

const DEFAULT_METRICS_ADDR: &str = "127.0.0.1:3200";

pub const METRICS_PATH: &str = "/metrics";

// Minimal implementation for compilation

// Room và Player structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub game_mode: GameMode,
    pub max_players: u32,
    pub current_players: u32,
    pub spectator_count: u32,
    pub status: RoomStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub host_player_id: String,
    pub worker_endpoint: Option<String>, // Worker được assign để chạy game này
    pub settings: serde_json::Value,
    pub ttl_seconds: Option<u32>, // Time to live in seconds
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameMode {
    #[serde(rename = "deathmatch")]
    Deathmatch,
    #[serde(rename = "team_deathmatch")]
    TeamDeathmatch,
    #[serde(rename = "capture_the_flag")]
    CaptureTheFlag,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoomStatus {
    #[serde(rename = "waiting")]
    Waiting,
    #[serde(rename = "starting")]
    Starting,
    #[serde(rename = "in_progress")]
    InProgress,
    #[serde(rename = "finished")]
    Finished,
    #[serde(rename = "closed")]
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub room_id: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
    pub last_seen: chrono::DateTime<chrono::Utc>,
    pub status: PlayerStatus,
    pub team: Option<String>,
    pub game_stats: serde_json::Value,
    pub score: u32,
    pub is_host: bool,
    pub connection_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Spectator {
    pub id: String,
    pub name: String,
    pub room_id: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
    pub connection_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PlayerStatus {
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "left")]
    Left,
}

// Room Manager state
#[derive(Debug)]
pub struct RoomManagerState {
    pub rooms: HashMap<String, Room>,
    pub players: HashMap<String, Player>,
    pub spectators: HashMap<String, Spectator>,
    // pub pocketbase: PocketBaseClient, // Temporarily disabled due to dependency issues
    pub heartbeat_interval: Duration,
    pub room_ttl: Duration,
}

// Minimal implementation for compilation
impl RoomManagerState {
    pub async fn new_async(_pocketbase_url: &str) -> Result<Self, BoxError> {
        Ok(Self {
            rooms: HashMap::new(),
            players: HashMap::new(),
            spectators: HashMap::new(),
            heartbeat_interval: Duration::from_secs(30),
            room_ttl: Duration::from_secs(300),
        })
    }

    pub fn new(_pocketbase_url: &str) -> Result<Self, BoxError> {
        Ok(Self {
            rooms: HashMap::new(),
            players: HashMap::new(),
            spectators: HashMap::new(),
            heartbeat_interval: Duration::from_secs(30),
            room_ttl: Duration::from_secs(300),
        })
    }

    pub async fn create_room(&mut self, req: CreateRoomRequest) -> Result<CreateRoomResponse, BoxError> {
        let room_id = Uuid::new_v4().to_string();

        // Record metrics
        metrics::matchmaking_metrics().inc_rooms_created();

        Ok(CreateRoomResponse {
            room_id: room_id.clone(),
            success: true,
            error: None,
        })
    }

    pub async fn join_room(&mut self, req: JoinRoomRequest) -> Result<JoinRoomResponse, BoxError> {
        if let Some(room) = self.rooms.get_mut(&req.room_id) {
            if room.current_players < room.max_players {
                room.current_players += 1;
                room.last_activity = chrono::Utc::now();
                room.updated_at = chrono::Utc::now();

                Ok(JoinRoomResponse {
                    success: true,
                    error: None,
                    room: Some(room.clone()),
                })
            } else {
                Ok(JoinRoomResponse {
                    success: false,
                    error: Some("Room is full".to_string()),
                    room: None,
                })
            }
        } else {
            Ok(JoinRoomResponse {
                success: false,
                error: Some("Room not found".to_string()),
                room: None,
            })
        }
    }

    pub async fn list_rooms(&mut self, req: ListRoomsRequest) -> Result<ListRoomsResponse, BoxError> {
        let mut rooms = Vec::new();

        for room in self.rooms.values() {
            // Filter by game_mode if specified
            if let Some(ref game_mode) = req.game_mode {
                if room.game_mode != *game_mode {
                    continue;
                }
            }

            // Filter by status if specified
            if let Some(ref status) = req.status {
                if room.status != *status {
                    continue;
                }
            }

            rooms.push(room.clone());
        }

        Ok(ListRoomsResponse {
            rooms,
        })
    }

    pub async fn heartbeat(&mut self) -> Result<(), BoxError> {
        // Clean up expired rooms based on TTL
        let now = chrono::Utc::now();
        let mut expired_rooms = Vec::new();

        for (room_id, room) in &self.rooms {
            if let Some(ttl_seconds) = room.ttl_seconds {
                let ttl_duration = chrono::Duration::seconds(ttl_seconds as i64);
                if now - room.updated_at > ttl_duration {
                    expired_rooms.push(room_id.clone());
                }
            }
        }

        for room_id in expired_rooms {
            info!("Cleaning up expired room: {}", room_id);
            self.rooms.remove(&room_id);
        }

        Ok(())
    }

    pub async fn sync_with_database(&mut self) -> Result<(), BoxError> {
        // TODO: Implement database sync when PocketBase client is available
        info!("Database sync completed (placeholder)");
        Ok(())
    }
}

// Helper functions and configuration
pub async fn create_room(
    state: Arc<RwLock<RoomManagerState>>,
    request: CreateRoomRequest,
) -> Result<CreateRoomResponse, BoxError> {
    let mut state = state.write().await;
    let response = state.create_room(request.clone()).await?;

    // Add room to state if creation was successful
    if response.success {
        let room = Room {
            id: response.room_id.clone(),
            name: request.name,
            game_mode: request.game_mode,
            max_players: request.max_players,
            current_players: 1, // Host player
            spectator_count: 0,
            status: RoomStatus::Waiting,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            last_activity: chrono::Utc::now(),
            host_player_id: request.host_player_id,
            worker_endpoint: None,
            settings: request.settings.unwrap_or(serde_json::json!({})),
            ttl_seconds: Some(3600), // 1 hour TTL
        };

        state.rooms.insert(response.room_id.clone(), room);
        info!("Room created and added to state: {}", response.room_id);
    }

    Ok(response)
}

pub async fn join_room(
    state: Arc<RwLock<RoomManagerState>>,
    request: JoinRoomRequest,
) -> Result<JoinRoomResponse, BoxError> {
    let mut state = state.write().await;
    let response = state.join_room(request).await?;

    // Add player to state if join was successful (placeholder implementation)
    if response.success {
        // TODO: Add player to players HashMap when Player structure is implemented
        info!("Player joined room: {}", response.room.as_ref().unwrap().id);
    }

    Ok(response)
}

pub async fn list_rooms(
    state: Arc<RwLock<RoomManagerState>>,
    request: ListRoomsRequest,
) -> Result<ListRoomsResponse, BoxError> {
    let mut state = state.write().await;
    state.list_rooms(request).await
}

pub async fn heartbeat(
    state: Arc<RwLock<RoomManagerState>>,
) -> Result<(), BoxError> {
    let mut state = state.write().await;
    state.heartbeat().await
}

// Room Manager settings and configuration
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct RoomManagerSettings {
    pub metrics_addr: std::net::SocketAddr,
}

impl RoomManagerSettings {
    pub fn from_env() -> Result<Self, BoxError> {
        let metrics_addr = env::var("ROOM_MANAGER_METRICS_ADDR")
            .unwrap_or_else(|_| DEFAULT_METRICS_ADDR.to_string());
        let metrics_addr = metrics_addr
            .parse()
            .map_err(|err| Box::new(err) as BoxError)?;
        Ok(Self { metrics_addr })
    }
}

impl Default for RoomManagerSettings {
    fn default() -> Self {
        Self {
            metrics_addr: DEFAULT_METRICS_ADDR
                .parse()
                .expect("default room-manager metrics addr"),
        }
    }
}

#[derive(Debug)]
pub struct RoomManagerConfig {
    pub metrics_addr: std::net::SocketAddr,
    pub ready_tx: Option<oneshot::Sender<std::net::SocketAddr>>,
}

impl RoomManagerConfig {
    pub fn from_settings(settings: RoomManagerSettings) -> Self {
        Self {
            metrics_addr: settings.metrics_addr,
            ready_tx: None,
        }
    }

    pub fn from_env() -> Result<Self, BoxError> {
        RoomManagerSettings::from_env().map(Self::from_settings)
    }
}

pub fn matchmaking_metrics() -> &'static MatchmakingMetrics {
    metrics::matchmaking_metrics()
}

pub async fn run_with_ctrl_c(config: RoomManagerConfig) -> Result<(), BoxError> {
    let (shutdown_tx, shutdown_rx) = shutdown::channel();

    let ctrl_c = tokio::spawn(async move {
        if let Err(err) = tokio::signal::ctrl_c().await {
            error!(%err, "room-manager: khong the lang nghe ctrl_c");
        }
        shutdown::trigger(&shutdown_tx);
    });

    let result = run(config, shutdown_rx).await;

    ctrl_c.abort();
    result
}

pub async fn run(
    config: RoomManagerConfig,
    shutdown_rx: shutdown::ShutdownReceiver,
) -> Result<(), BoxError> {
    matchmaking_metrics().on_startup();

    let listener = tokio::net::TcpListener::bind(config.metrics_addr)
        .await
        .map_err(|err| Box::new(err) as BoxError)?;
    let local_addr = listener
        .local_addr()
        .map_err(|err| Box::new(err) as BoxError)?;

    if let Some(tx) = config.ready_tx {
        let _ = tx.send(local_addr);
    }

    info!(%local_addr, path = METRICS_PATH, "room-manager metrics exporter dang lang nghe");

    // Initialize Room Manager state
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let room_state = Arc::new(RwLock::new(match RoomManagerState::new(&pocketbase_url) {
        Ok(state) => {
            info!("Room Manager state initialized successfully");
            state
        }
        Err(e) => {
            error!("Failed to initialize Room Manager state: {}", e);
            // Create state without database connection
            RoomManagerState::new("").expect("Failed to create basic Room Manager state")
        }
    }));

    // Try to sync với database khi khởi động (optional)
    {
        let mut state = room_state.write().await;
        if let Err(e) = state.sync_with_database().await {
            warn!("Failed to sync with database, running without database: {}", e);
        }
    }

    // Background heartbeat task
    let heartbeat_state = room_state.clone();
    let heartbeat_task = tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            let mut state = heartbeat_state.write().await;
            if let Err(e) = state.heartbeat().await {
                error!("Heartbeat failed: {}", e);
            }
        }
    });

    // Background metrics collection task
    let metrics_state = room_state.clone();
    let metrics_task = tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(15));
        loop {
            interval.tick().await;

            // Update metrics từ room state
            {
                let state = metrics_state.read().await;
                let active_rooms = state.rooms.len() as i64;
                matchmaking_metrics().set_active_rooms(active_rooms);

                // Count rooms by status
                let mut waiting_rooms = 0;
                let mut in_progress_rooms = 0;
                let mut finished_rooms = 0;

                for room in state.rooms.values() {
                    match room.status {
                        RoomStatus::Waiting => waiting_rooms += 1,
                        RoomStatus::Starting | RoomStatus::InProgress => in_progress_rooms += 1,
                        RoomStatus::Finished => finished_rooms += 1,
                        RoomStatus::Closed => {}
                    }
                }

                // Set room counts by status (using additional metrics if available)
                matchmaking_metrics().set_queue_depth(waiting_rooms);
            }
        }
    });

    let server = tokio::spawn(async move {
        if let Err(err) = metrics::serve_metrics(listener, METRICS_PATH).await {
            error!(%err, "room-manager metrics exporter dung bat thuong");
        }
    });

    // Wait for shutdown signal
    tokio::select! {
        _ = shutdown::wait(shutdown_rx) => {
            info!("Room Manager shutting down...");
        }
    }

    // Cleanup
    heartbeat_task.abort();
    metrics_task.abort();
    server.abort();

    Ok(())
}

// API Request/Response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub game_mode: GameMode,
    pub max_players: u32,
    pub host_player_id: String,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRoomResponse {
    pub room_id: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JoinRoomRequest {
    pub room_id: String,
    pub player_id: String,
    pub player_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JoinRoomResponse {
    pub success: bool,
    pub error: Option<String>,
    pub room: Option<Room>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListRoomsRequest {
    pub game_mode: Option<GameMode>,
    pub status: Option<RoomStatus>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListRoomsResponse {
    pub rooms: Vec<Room>,
}
