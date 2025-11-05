use std::{
    collections::HashMap,
    sync::{Arc, atomic::{AtomicU64, Ordering}},
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tracing::info;
use once_cell::sync::Lazy;
use prometheus::{register_int_counter_vec, register_int_gauge_vec, register_histogram_vec, register_gauge_vec, IntCounterVec, IntGaugeVec, HistogramVec, GaugeVec};

// Game-specific performance metrics for Prometheus
static GAME_LATENCY_HISTOGRAM: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec!(
        "gateway_game_latency_seconds",
        "Game message latency in seconds",
        &["message_type", "room_id"],
        vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    ).expect("register gateway_game_latency_seconds")
});

static GAME_BANDWIDTH_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_game_bandwidth_bytes_total",
        "Total bandwidth usage for game messages",
        &["direction", "message_type", "room_id"]
    ).expect("register gateway_game_bandwidth_bytes_total")
});

static GAME_FRAME_TIME_HISTOGRAM: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec!(
        "gateway_game_frame_time_seconds",
        "Game frame processing time in seconds",
        &["room_id", "frame_type"],
        vec![0.001, 0.005, 0.01, 0.016, 0.033, 0.066, 0.1, 0.2, 0.5]
    ).expect("register gateway_game_frame_time_seconds")
});

static GAME_LATENCY_COMPENSATION_GAUGE: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec!(
        "gateway_game_latency_compensation_ms",
        "Current latency compensation applied per player",
        &["room_id", "player_id"]
    ).expect("register gateway_game_latency_compensation_ms")
});

static GAME_PREDICTION_ACCURACY_GAUGE: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec!(
        "gateway_game_prediction_accuracy",
        "Client prediction accuracy per player",
        &["room_id", "player_id"]
    ).expect("register gateway_game_prediction_accuracy")
});

static GAME_STATE_SYNC_DELAY_HISTOGRAM: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec!(
        "gateway_game_state_sync_delay_seconds",
        "Delay between state updates",
        &["room_id", "sync_type"],
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
    ).expect("register gateway_game_state_sync_delay_seconds")
});

static GAME_PLAYER_ACTIONS_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_game_player_actions_total",
        "Total number of player actions processed",
        &["room_id", "action_type", "player_id"]
    ).expect("register gateway_game_player_actions_total")
});

static GAME_ACTIVE_ROOMS_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_game_active_rooms",
        "Number of active game rooms",
        &["room_id"]
    ).expect("register gateway_game_active_rooms")
});

static GAME_PLAYER_COUNT_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_game_room_player_count",
        "Number of players in each room",
        &["room_id"]
    ).expect("register gateway_game_room_player_count")
});

// Real-time game performance tracking
#[derive(Debug)]
pub struct GamePerformanceTracker {
    pub room_id: String,
    pub player_id: String,
    pub last_update: Instant,
    pub total_messages: AtomicU64,
    pub total_bytes_sent: AtomicU64,
    pub total_bytes_received: AtomicU64,
    pub average_latency_ms: AtomicU64,
    pub frame_count: AtomicU64,
    pub total_frame_time_ms: AtomicU64,
    pub current_latency_compensation_ms: AtomicU64,
    pub prediction_accuracy: AtomicU64, // 0-100 percentage
    pub state_sync_delay_ms: AtomicU64,
    pub last_frame_time_ms: AtomicU64,
}

impl GamePerformanceTracker {
    pub fn new(room_id: String, player_id: String) -> Self {
        Self {
            room_id,
            player_id,
            last_update: Instant::now(),
            total_messages: AtomicU64::new(0),
            total_bytes_sent: AtomicU64::new(0),
            total_bytes_received: AtomicU64::new(0),
            average_latency_ms: AtomicU64::new(0),
            frame_count: AtomicU64::new(0),
            total_frame_time_ms: AtomicU64::new(0),
            current_latency_compensation_ms: AtomicU64::new(0),
            prediction_accuracy: AtomicU64::new(85), // Start with 85% accuracy assumption
            state_sync_delay_ms: AtomicU64::new(0),
            last_frame_time_ms: AtomicU64::new(0),
        }
    }

    pub fn record_message(&self, message_type: &str, bytes: u64, latency_ms: u64) {
        self.total_messages.fetch_add(1, Ordering::Relaxed);
        self.total_bytes_sent.fetch_add(bytes, Ordering::Relaxed);

        // Update average latency using exponential moving average
        let current_avg = self.average_latency_ms.load(Ordering::Relaxed);
        let new_avg = if current_avg == 0 {
            latency_ms
        } else {
            (current_avg * 9 + latency_ms) / 10 // 90% current, 10% new
        };
        self.average_latency_ms.store(new_avg, Ordering::Relaxed);

        // Record Prometheus metrics
        GAME_LATENCY_HISTOGRAM
            .with_label_values(&[message_type, &self.room_id])
            .observe(latency_ms as f64 / 1000.0);

        GAME_BANDWIDTH_COUNTER
            .with_label_values(&["outbound", message_type, &self.room_id])
            .inc_by(bytes);
    }

    pub fn record_frame(&self, frame_time_ms: u64) {
        self.frame_count.fetch_add(1, Ordering::Relaxed);
        self.total_frame_time_ms.fetch_add(frame_time_ms, Ordering::Relaxed);

        GAME_FRAME_TIME_HISTOGRAM
            .with_label_values(&[&self.room_id, "game_loop"])
            .observe(frame_time_ms as f64 / 1000.0);
    }

    pub fn record_player_action(&self, action_type: &str) {
        GAME_PLAYER_ACTIONS_COUNTER
            .with_label_values(&[&self.room_id, action_type, &self.player_id])
            .inc();
    }

    pub fn record_latency_compensation(&self, compensation_ms: u64) {
        self.current_latency_compensation_ms.store(compensation_ms, Ordering::Relaxed);

        GAME_LATENCY_COMPENSATION_GAUGE
            .with_label_values(&[&self.room_id, &self.player_id])
            .set(compensation_ms as f64);
    }

    pub fn record_prediction_accuracy(&self, accuracy_percent: u64) {
        self.prediction_accuracy.store(accuracy_percent, Ordering::Relaxed);

        GAME_PREDICTION_ACCURACY_GAUGE
            .with_label_values(&[&self.room_id, &self.player_id])
            .set(accuracy_percent as f64 / 100.0);
    }

    pub fn record_state_sync_delay(&self, delay_ms: u64, sync_type: &str) {
        self.state_sync_delay_ms.store(delay_ms, Ordering::Relaxed);

        GAME_STATE_SYNC_DELAY_HISTOGRAM
            .with_label_values(&[&self.room_id, sync_type])
            .observe(delay_ms as f64 / 1000.0);
    }

    pub fn record_frame_time(&self, frame_time_ms: u64) {
        self.last_frame_time_ms.store(frame_time_ms, Ordering::Relaxed);

        GAME_FRAME_TIME_HISTOGRAM
            .with_label_values(&[&self.room_id, "game_loop"])
            .observe(frame_time_ms as f64 / 1000.0);
    }

    pub fn get_stats(&self) -> GamePlayerStats {
        GamePlayerStats {
            room_id: self.room_id.clone(),
            player_id: self.player_id.clone(),
            total_messages: self.total_messages.load(Ordering::Relaxed),
            total_bytes_sent: self.total_bytes_sent.load(Ordering::Relaxed),
            total_bytes_received: self.total_bytes_received.load(Ordering::Relaxed),
            average_latency_ms: self.average_latency_ms.load(Ordering::Relaxed),
            frame_count: self.frame_count.load(Ordering::Relaxed),
            total_frame_time_ms: self.total_frame_time_ms.load(Ordering::Relaxed),
            messages_per_second: self.calculate_messages_per_second(),
            current_latency_compensation_ms: self.current_latency_compensation_ms.load(Ordering::Relaxed),
            prediction_accuracy: self.prediction_accuracy.load(Ordering::Relaxed),
            state_sync_delay_ms: self.state_sync_delay_ms.load(Ordering::Relaxed),
            last_frame_time_ms: self.last_frame_time_ms.load(Ordering::Relaxed),
        }
    }

    fn calculate_messages_per_second(&self) -> f64 {
        let elapsed = self.last_update.elapsed().as_secs_f64();
        if elapsed > 0.0 {
            self.total_messages.load(Ordering::Relaxed) as f64 / elapsed
        } else {
            0.0
        }
    }
}

#[derive(Debug, Clone)]
pub struct GamePlayerStats {
    pub room_id: String,
    pub player_id: String,
    pub total_messages: u64,
    pub total_bytes_sent: u64,
    pub total_bytes_received: u64,
    pub average_latency_ms: u64,
    pub frame_count: u64,
    pub total_frame_time_ms: u64,
    pub messages_per_second: f64,
    pub current_latency_compensation_ms: u64,
    pub prediction_accuracy: u64,
    pub state_sync_delay_ms: u64,
    pub last_frame_time_ms: u64,
}

pub struct GameMetricsManager {
    trackers: Arc<RwLock<HashMap<String, Arc<GamePerformanceTracker>>>>,
    room_stats: Arc<RwLock<HashMap<String, RoomStats>>>,
}

#[derive(Debug, Clone)]
pub struct RoomStats {
    pub room_id: String,
    pub active_players: u32,
    pub total_messages: u64,
    pub total_bandwidth: u64,
    pub average_latency_ms: u64,
    pub created_at: Instant,
    pub last_activity: Instant,
}

impl GameMetricsManager {
    pub fn new() -> Self {
        Self {
            trackers: Arc::new(RwLock::new(HashMap::new())),
            room_stats: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get_or_create_tracker(&self, room_id: String, player_id: String) -> Arc<GamePerformanceTracker> {
        let key = format!("{}:{}", room_id, player_id);
        let trackers = self.trackers.read().await;

        if let Some(tracker) = trackers.get(&key) {
            tracker.clone()
        } else {
            drop(trackers); // Release read lock

            let mut trackers = self.trackers.write().await;
            let tracker = Arc::new(GamePerformanceTracker::new(room_id.clone(), player_id.clone()));
            trackers.insert(key, tracker.clone());

            // Update room stats
            self.update_room_stats(&room_id, true).await;

            tracker
        }
    }

    pub async fn remove_tracker(&self, room_id: String, player_id: String) {
        let key = format!("{}:{}", room_id, player_id);
        let mut trackers = self.trackers.write().await;
        trackers.remove(&key);

        // Update room stats
        self.update_room_stats(&room_id, false).await;
    }

    async fn update_room_stats(&self, room_id: &str, player_joined: bool) {
        let mut room_stats = self.room_stats.write().await;
        let stats = room_stats.entry(room_id.to_string()).or_insert_with(|| RoomStats {
            room_id: room_id.to_string(),
            active_players: 0,
            total_messages: 0,
            total_bandwidth: 0,
            average_latency_ms: 0,
            created_at: Instant::now(),
            last_activity: Instant::now(),
        });

        if player_joined {
            stats.active_players += 1;
        } else {
            stats.active_players = stats.active_players.saturating_sub(1);
        }

        stats.last_activity = Instant::now();

        // Update Prometheus gauges
        GAME_ACTIVE_ROOMS_GAUGE
            .with_label_values(&[room_id])
            .set(1);

        GAME_PLAYER_COUNT_GAUGE
            .with_label_values(&[room_id])
            .set(stats.active_players as i64);
    }

    pub async fn record_game_message(&self, room_id: String, player_id: String, message_type: &str, bytes: u64, latency_ms: u64) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_message(message_type, bytes, latency_ms);

        // Update room stats
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.total_messages += 1;
            stats.total_bandwidth += bytes;
            stats.last_activity = Instant::now();

            // Recalculate average latency across all players
            let trackers = self.trackers.read().await;
            let room_trackers: Vec<_> = trackers.values()
                .filter(|t| t.room_id == room_id)
                .collect();

            if !room_trackers.is_empty() {
                let total_latency: u64 = room_trackers.iter()
                    .map(|t| t.average_latency_ms.load(Ordering::Relaxed))
                    .sum();
                stats.average_latency_ms = total_latency / room_trackers.len() as u64;
            }
        }
    }

    pub async fn record_player_action(&self, room_id: String, player_id: String, action_type: &str) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_player_action(action_type);

        // Update room activity
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.last_activity = Instant::now();
        }
    }

    pub async fn record_latency_compensation(&self, room_id: String, player_id: String, compensation_ms: u64) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_latency_compensation(compensation_ms);

        // Update room activity
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.last_activity = Instant::now();
        }
    }

    pub async fn record_prediction_accuracy(&self, room_id: String, player_id: String, accuracy_percent: u64) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_prediction_accuracy(accuracy_percent);

        // Update room activity
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.last_activity = Instant::now();
        }
    }

    pub async fn record_state_sync_delay(&self, room_id: String, player_id: String, delay_ms: u64, sync_type: &str) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_state_sync_delay(delay_ms, sync_type);

        // Update room activity
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.last_activity = Instant::now();
        }
    }

    pub async fn record_frame_time(&self, room_id: String, player_id: String, frame_time_ms: u64) {
        let tracker = self.get_or_create_tracker(room_id.clone(), player_id.clone()).await;
        tracker.record_frame_time(frame_time_ms);

        // Update room activity
        let mut room_stats = self.room_stats.write().await;
        if let Some(stats) = room_stats.get_mut(&room_id) {
            stats.last_activity = Instant::now();
        }
    }

    pub async fn get_room_stats(&self, room_id: &str) -> Option<RoomStats> {
        let room_stats = self.room_stats.read().await;
        room_stats.get(room_id).cloned()
    }

    pub async fn get_all_room_stats(&self) -> HashMap<String, RoomStats> {
        let room_stats = self.room_stats.read().await;
        room_stats.clone()
    }

    pub async fn cleanup_inactive_rooms(&self, max_idle_minutes: u64) {
        let cutoff = Instant::now() - Duration::from_secs(max_idle_minutes * 60);
        let mut room_stats = self.room_stats.write().await;

        let inactive_rooms: Vec<String> = room_stats.iter()
            .filter(|(_, stats)| stats.last_activity < cutoff && stats.active_players == 0)
            .map(|(room_id, _)| room_id.clone())
            .collect();

        for room_id in inactive_rooms {
            room_stats.remove(&room_id);

            // Remove from Prometheus
            let _ = GAME_ACTIVE_ROOMS_GAUGE.remove_label_values(&[&room_id]);
            let _ = GAME_PLAYER_COUNT_GAUGE.remove_label_values(&[&room_id]);

            info!("Cleaned up inactive room: {}", room_id);
        }

        // Also cleanup trackers for inactive rooms
        let mut trackers = self.trackers.write().await;
        trackers.retain(|key, _tracker| {
            let room_id = key.split(':').next().unwrap();
            room_stats.contains_key(room_id)
        });
    }

    pub async fn get_performance_report(&self) -> GamePerformanceReport {
        let room_stats = self.room_stats.read().await;
        let _trackers = self.trackers.read().await;

        let mut total_players = 0;
        let mut total_messages = 0;
        let mut total_bandwidth = 0;
        let mut total_latency_ms = 0;
        let mut room_count = 0;

        for (_, stats) in room_stats.iter() {
            total_players += stats.active_players;
            total_messages += stats.total_messages;
            total_bandwidth += stats.total_bandwidth;
            total_latency_ms += stats.average_latency_ms;
            room_count += 1;
        }

        let average_latency_ms = if room_count > 0 { total_latency_ms / room_count } else { 0 };

        GamePerformanceReport {
            total_rooms: room_count as usize,
            total_players,
            total_messages,
            total_bandwidth,
            average_latency_ms,
            room_details: room_stats.values().cloned().collect(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct GamePerformanceReport {
    pub total_rooms: usize,
    pub total_players: u32,
    pub total_messages: u64,
    pub total_bandwidth: u64,
    pub average_latency_ms: u64,
    pub room_details: Vec<RoomStats>,
}

// Global game metrics manager instance
pub static GAME_METRICS_MANAGER: Lazy<Arc<GameMetricsManager>> = Lazy::new(|| {
    Arc::new(GameMetricsManager::new())
});

// Helper functions for easy integration
pub async fn record_game_message(
    room_id: String,
    player_id: String,
    message_type: &str,
    bytes: u64,
    latency_ms: u64,
) {
    GAME_METRICS_MANAGER
        .record_game_message(room_id, player_id, message_type, bytes, latency_ms)
        .await;
}

pub async fn record_player_action(room_id: String, player_id: String, action_type: &str) {
    GAME_METRICS_MANAGER
        .record_player_action(room_id, player_id, action_type)
        .await;
}

pub async fn get_game_performance_report() -> GamePerformanceReport {
    GAME_METRICS_MANAGER.get_performance_report().await
}

// Additional helper functions for latency and performance monitoring
pub async fn record_latency_compensation(room_id: String, player_id: String, compensation_ms: u64) {
    GAME_METRICS_MANAGER.record_latency_compensation(room_id, player_id, compensation_ms).await;
}

pub async fn record_prediction_accuracy(room_id: String, player_id: String, accuracy_percent: u64) {
    GAME_METRICS_MANAGER.record_prediction_accuracy(room_id, player_id, accuracy_percent).await;
}

pub async fn record_state_sync_delay(room_id: String, player_id: String, delay_ms: u64, sync_type: &str) {
    GAME_METRICS_MANAGER.record_state_sync_delay(room_id, player_id, delay_ms, sync_type).await;
}

pub async fn record_frame_time(room_id: String, player_id: String, frame_time_ms: u64) {
    GAME_METRICS_MANAGER.record_frame_time(room_id, player_id, frame_time_ms).await;
}
