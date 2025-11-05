use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    sync::{mpsc, RwLock},
    time::interval,
};
use tracing::{info, error};
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use prometheus::{register_int_counter_vec, register_int_gauge_vec, IntCounterVec, IntGaugeVec};

// Game-specific batch processing metrics
static GAME_BATCHES_PROCESSED_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_game_batches_processed_total",
        "Total number of game message batches processed",
        &["batch_type", "status"]
    ).expect("register gateway_game_batches_processed_total")
});

static GAME_BATCH_SIZE_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_game_batch_size",
        "Current batch size for game messages",
        &["batch_type"]
    ).expect("register gateway_game_batch_size")
});

static GAME_BATCH_PROCESSING_DURATION: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_game_batch_processing_duration_seconds",
        "Time spent processing game message batches",
        &["batch_type"]
    ).expect("register gateway_game_batch_processing_duration_seconds")
});

// Game message types for batching
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameMessageType {
    PlayerUpdate,
    GameState,
    Action,
    Chat,
    System,
}

#[derive(Debug, Clone)]
pub struct GameMessage {
    pub id: String,
    pub room_id: String,
    pub player_id: String,
    pub message_type: GameMessageType,
    pub data: serde_json::Value,
    pub timestamp: Instant,
    pub priority: u8, // 0-255, higher = more important
}

impl serde::Serialize for GameMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("GameMessage", 6)?;
        state.serialize_field("id", &self.id)?;
        state.serialize_field("room_id", &self.room_id)?;
        state.serialize_field("player_id", &self.player_id)?;
        state.serialize_field("message_type", &self.message_type)?;
        state.serialize_field("data", &self.data)?;
        state.serialize_field("timestamp_ms", &(self.timestamp.elapsed().as_millis() as u64))?;
        state.serialize_field("priority", &self.priority)?;
        state.end()
    }
}

#[derive(Debug, Clone)]
pub struct BatchConfig {
    pub max_batch_size: usize,
    pub max_wait_time_ms: u64,
    pub max_priority_threshold: u8,
    pub flush_on_priority: bool,
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            max_batch_size: 50, // Process up to 50 messages per batch
            max_wait_time_ms: 100, // Wait max 100ms before flushing
            max_priority_threshold: 200, // High priority threshold
            flush_on_priority: true, // Flush immediately for high priority messages
        }
    }
}

pub struct BatchProcessor {
    batches: Arc<RwLock<HashMap<String, Vec<GameMessage>>>>,
    config: BatchConfig,
    sender: mpsc::UnboundedSender<GameMessage>,
    _flush_task: tokio::task::JoinHandle<()>,
}

impl BatchProcessor {
    pub fn new(config: BatchConfig) -> Self {
        let (sender, mut receiver) = mpsc::unbounded_channel::<GameMessage>();
        let batches = Arc::new(RwLock::new(HashMap::new()));

        // Background task to process batches
        let batches_clone = batches.clone();
        let config_clone = config.clone();

        let flush_task = tokio::spawn(async move {
            let mut flush_timer = interval(Duration::from_millis(config_clone.max_wait_time_ms));

            loop {
                tokio::select! {
                    // Timer-based flush
                    _ = flush_timer.tick() => {
                        Self::flush_all_batches(&batches_clone, &config_clone).await;
                    }

                    // Message received
                    message = receiver.recv() => {
                        if let Some(msg) = message {
                            Self::add_to_batch(&batches_clone, msg, &config_clone).await;
                        } else {
                            break; // Channel closed
                        }
                    }
                }
            }
        });

        Self {
            batches,
            config,
            sender,
            _flush_task: flush_task,
        }
    }

    pub fn sender(&self) -> mpsc::UnboundedSender<GameMessage> {
        self.sender.clone()
    }

    async fn add_to_batch(
        batches: &Arc<RwLock<HashMap<String, Vec<GameMessage>>>>,
        message: GameMessage,
        config: &BatchConfig,
    ) {
        let room_id = message.room_id.clone();

        // Check if high priority message should trigger immediate flush
        if config.flush_on_priority && message.priority >= config.max_priority_threshold {
            Self::flush_room_batch(batches, &room_id, config).await;
        }

        // Add message to batch
        let mut batches_guard = batches.write().await;
        let batch = batches_guard.entry(room_id.clone()).or_insert_with(Vec::new);

        batch.push(message);

        // Update batch size metric
        GAME_BATCH_SIZE_GAUGE
            .with_label_values(&["player_updates"])
            .set(batch.len() as i64);

        // Check if batch should be flushed due to size
        if batch.len() >= config.max_batch_size {
            Self::flush_room_batch(batches, &room_id, config).await;
        }
    }

    async fn flush_room_batch(
        batches: &Arc<RwLock<HashMap<String, Vec<GameMessage>>>>,
        room_id: &str,
        config: &BatchConfig,
    ) {
        let mut batches_guard = batches.write().await;
        if let Some(mut batch) = batches_guard.remove(room_id) {
            drop(batches_guard); // Release lock before processing

            Self::process_batch(&mut batch, config).await;
        }
    }

    async fn flush_all_batches(
        batches: &Arc<RwLock<HashMap<String, Vec<GameMessage>>>>,
        config: &BatchConfig,
    ) {
        let mut batches_guard = batches.write().await;
        let room_ids: Vec<String> = batches_guard.keys().cloned().collect();

        for room_id in room_ids {
            if let Some(mut batch) = batches_guard.remove(&room_id) {
                drop(batches_guard); // Release lock before processing

                Self::process_batch(&mut batch, config).await;

                // Re-acquire lock for next iteration
                batches_guard = batches.write().await;
            }
        }
    }

    async fn process_batch(batch: &mut Vec<GameMessage>, _config: &BatchConfig) {
        if batch.is_empty() {
            return;
        }

        let start_time = Instant::now();
        let batch_size = batch.len();

        // Sort by priority (higher priority first)
        batch.sort_by(|a, b| b.priority.cmp(&a.priority));

        // Process batch based on message type
        let mut success_count = 0;
        let mut error_count = 0;

        for message in batch.iter() {
            match Self::process_single_message(message).await {
                Ok(_) => success_count += 1,
                Err(e) => {
                    error_count += 1;
                    error!("Failed to process game message {}: {}", message.id, e);
                }
            }
        }

        let processing_time = start_time.elapsed().as_secs_f64();

        // Update metrics
        GAME_BATCHES_PROCESSED_TOTAL
            .with_label_values(&["player_updates", "success"])
            .inc_by(success_count);

        GAME_BATCHES_PROCESSED_TOTAL
            .with_label_values(&["player_updates", "error"])
            .inc_by(error_count);

        GAME_BATCH_PROCESSING_DURATION
            .with_label_values(&["player_updates"])
            .inc_by((processing_time * 1000.0) as u64);

        info!(
            "Processed game batch: {} messages in {:.2}ms (success: {}, errors: {})",
            batch_size, processing_time * 1000.0, success_count, error_count
        );
    }

    async fn process_single_message(message: &GameMessage) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // This would integrate with the existing game state management
        // For now, we'll simulate processing by logging
        match message.message_type {
            GameMessageType::PlayerUpdate => {
                // Process player position/rotation updates
                info!("Processing player update for player {} in room {}",
                      message.player_id, message.room_id);
            }
            GameMessageType::GameState => {
                // Process game state changes
                info!("Processing game state update for room {}", message.room_id);
            }
            GameMessageType::Action => {
                // Process player actions (jump, shoot, etc.)
                info!("Processing action from player {} in room {}",
                      message.player_id, message.room_id);
            }
            GameMessageType::Chat => {
                // Process chat messages
                info!("Processing chat message from player {} in room {}",
                      message.player_id, message.room_id);
            }
            GameMessageType::System => {
                // Process system messages
                info!("Processing system message for room {}", message.room_id);
            }
        }

        // Simulate some processing time
        tokio::time::sleep(Duration::from_millis(1)).await;

        Ok(())
    }

    pub async fn get_batch_stats(&self) -> HashMap<String, usize> {
        let batches = self.batches.read().await;
        batches.iter().map(|(k, v)| (k.clone(), v.len())).collect()
    }
}

// Factory function for creating batch processor with default config
pub fn create_game_batch_processor() -> BatchProcessor {
    let config = BatchConfig {
        max_batch_size: 50,
        max_wait_time_ms: 100,
        max_priority_threshold: 200,
        flush_on_priority: true,
    };

    BatchProcessor::new(config)
}

// High-level API for sending game messages
pub struct GameMessageSender {
    sender: mpsc::UnboundedSender<GameMessage>,
}

impl GameMessageSender {
    pub fn new(sender: mpsc::UnboundedSender<GameMessage>) -> Self {
        Self { sender }
    }

    pub fn send_player_update(
        &self,
        room_id: String,
        player_id: String,
        data: serde_json::Value,
        priority: u8,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = GameMessage {
            id: uuid::Uuid::new_v4().to_string(),
            room_id,
            player_id,
            message_type: GameMessageType::PlayerUpdate,
            data,
            timestamp: Instant::now(),
            priority,
        };

        self.sender.send(message).map_err(|_| "Failed to send message")?;
        Ok(())
    }

    pub fn send_game_state(
        &self,
        room_id: String,
        player_id: String,
        data: serde_json::Value,
        priority: u8,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = GameMessage {
            id: uuid::Uuid::new_v4().to_string(),
            room_id,
            player_id,
            message_type: GameMessageType::GameState,
            data,
            timestamp: Instant::now(),
            priority,
        };

        self.sender.send(message).map_err(|_| "Failed to send message")?;
        Ok(())
    }

    pub fn send_action(
        &self,
        room_id: String,
        player_id: String,
        data: serde_json::Value,
        priority: u8,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = GameMessage {
            id: uuid::Uuid::new_v4().to_string(),
            room_id,
            player_id,
            message_type: GameMessageType::Action,
            data,
            timestamp: Instant::now(),
            priority,
        };

        self.sender.send(message).map_err(|_| "Failed to send message")?;
        Ok(())
    }
}
