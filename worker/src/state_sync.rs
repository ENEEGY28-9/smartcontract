use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    time::{Duration, Instant},
};
use tracing::{debug, info, warn};

use crate::simulation::{GameSnapshot, PlayerInput, Player, TransformQ, VelocityQ};

/// Frame time tracking cho game loop performance
#[derive(Debug, Clone)]
pub struct FrameTimeTracker {
    /// Frame times cho recent frames (ms)
    pub frame_times: VecDeque<u64>,
    /// Maximum frames to track
    pub max_frames: usize,
    /// Last frame start time
    pub last_frame_start: Instant,
    /// Average frame time (ms)
    pub average_frame_time_ms: u64,
    /// Frame time variance
    pub frame_time_variance: f64,
    /// 90th percentile frame time
    pub p90_frame_time_ms: u64,
    /// 99th percentile frame time
    pub p99_frame_time_ms: u64,
}

impl FrameTimeTracker {
    pub fn new() -> Self {
        Self {
            frame_times: VecDeque::new(),
            max_frames: 1000,
            last_frame_start: Instant::now(),
            average_frame_time_ms: 0,
            frame_time_variance: 0.0,
            p90_frame_time_ms: 0,
            p99_frame_time_ms: 0,
        }
    }

    /// Record frame completion
    pub fn record_frame(&mut self, frame_time_ms: u64) {
        // Add to history
        if self.frame_times.len() >= self.max_frames {
            self.frame_times.pop_front();
        }
        self.frame_times.push_back(frame_time_ms);

        // Update statistics
        self.update_statistics();
    }

    /// Start frame timing
    pub fn start_frame(&mut self) {
        self.last_frame_start = Instant::now();
    }

    /// End frame timing và return frame time
    pub fn end_frame(&mut self) -> u64 {
        let frame_time = self.last_frame_start.elapsed().as_millis() as u64;
        self.record_frame(frame_time);
        frame_time
    }

    /// Update frame time statistics
    fn update_statistics(&mut self) {
        if self.frame_times.is_empty() {
            return;
        }

        // Calculate average
        let sum: u64 = self.frame_times.iter().sum();
        self.average_frame_time_ms = sum / self.frame_times.len() as u64;

        // Calculate variance
        let mean = self.average_frame_time_ms as f64;
        let variance: f64 = self.frame_times.iter()
            .map(|&t| (t as f64 - mean).powi(2))
            .sum::<f64>() / self.frame_times.len() as f64;
        self.frame_time_variance = variance.sqrt();

        // Calculate percentiles
        let mut sorted_times: Vec<u64> = self.frame_times.iter().cloned().collect();
        sorted_times.sort();

        let len = sorted_times.len();
        self.p90_frame_time_ms = sorted_times[(len * 90) / 100];
        self.p99_frame_time_ms = sorted_times[(len * 99) / 100];
    }

    /// Get current frame time stats
    pub fn get_stats(&self) -> FrameTimeStats {
        FrameTimeStats {
            average_ms: self.average_frame_time_ms,
            variance: self.frame_time_variance,
            p90_ms: self.p90_frame_time_ms,
            p99_ms: self.p99_frame_time_ms,
            current_frame_count: self.frame_times.len() as u64,
        }
    }
}

impl Default for FrameTimeTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// Frame time statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FrameTimeStats {
    pub average_ms: u64,
    pub variance: f64,
    pub p90_ms: u64,
    pub p99_ms: u64,
    pub current_frame_count: u64,
}

/// Performance monitoring cho state synchronization
#[derive(Debug, Clone)]
pub struct PerformanceMonitor {
    /// State sync processing times
    pub sync_processing_times: VecDeque<u64>,
    /// Message processing counts
    pub message_counts: HashMap<String, u64>,
    /// Error counts by type
    pub error_counts: HashMap<String, u64>,
    /// Bandwidth tracking
    pub bandwidth_stats: BandwidthStats,
    /// Last cleanup time
    pub last_cleanup: Instant,
    /// Performance thresholds
    pub thresholds: PerformanceThresholds,
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self {
            sync_processing_times: VecDeque::new(),
            message_counts: HashMap::new(),
            error_counts: HashMap::new(),
            bandwidth_stats: BandwidthStats::new(),
            last_cleanup: Instant::now(),
            thresholds: PerformanceThresholds::default(),
        }
    }

    /// Record state sync processing time
    pub fn record_sync_time(&mut self, processing_time_ms: u64) {
        if self.sync_processing_times.len() >= 1000 {
            self.sync_processing_times.pop_front();
        }
        self.sync_processing_times.push_back(processing_time_ms);

        // Check threshold
        if processing_time_ms > self.thresholds.max_sync_time_ms {
            warn!("State sync processing time exceeded threshold: {}ms > {}ms",
                  processing_time_ms, self.thresholds.max_sync_time_ms);
        }
    }

    /// Record message processing
    pub fn record_message(&mut self, message_type: &str) {
        *self.message_counts.entry(message_type.to_string()).or_insert(0) += 1;
    }

    /// Record error
    pub fn record_error(&mut self, error_type: &str) {
        *self.error_counts.entry(error_type.to_string()).or_insert(0) += 1;

        // Check error threshold
        let error_count = self.error_counts.get(error_type).unwrap_or(&0);
        if *error_count > self.thresholds.max_errors_per_minute {
            warn!("Error threshold exceeded for {}: {} > {}",
                  error_type, error_count, self.thresholds.max_errors_per_minute);
        }
    }

    /// Record bandwidth usage for sent message
    pub fn record_bandwidth_sent(&mut self, message_type: &str, bytes: u64) {
        self.bandwidth_stats.record_bytes_sent(message_type, bytes);
    }

    /// Record bandwidth usage for received message
    pub fn record_bandwidth_received(&mut self, message_type: &str, bytes: u64) {
        self.bandwidth_stats.record_bytes_received(message_type, bytes);
    }

    /// Cleanup old data
    pub fn cleanup(&mut self) {
        let cutoff = Instant::now() - Duration::from_secs(300); // 5 minutes
        if self.last_cleanup < cutoff {
            self.sync_processing_times.clear();
            self.message_counts.clear();
            self.error_counts.clear();
            self.last_cleanup = Instant::now();
        }
    }

    /// Get performance stats
    pub fn get_stats(&self) -> PerformanceStats {
        let avg_sync_time = if self.sync_processing_times.is_empty() {
            0
        } else {
            self.sync_processing_times.iter().sum::<u64>() / self.sync_processing_times.len() as u64
        };

        PerformanceStats {
            average_sync_time_ms: avg_sync_time,
            total_messages: self.message_counts.values().sum(),
            total_errors: self.error_counts.values().sum(),
            message_breakdown: self.message_counts.clone(),
            error_breakdown: self.error_counts.clone(),
        }
    }
}

impl Default for PerformanceMonitor {
    fn default() -> Self {
        Self::new()
    }
}

/// Performance thresholds
#[derive(Debug, Clone)]
pub struct PerformanceThresholds {
    pub max_sync_time_ms: u64,
    pub max_errors_per_minute: u64,
    pub max_frame_time_ms: u64,
}

impl Default for PerformanceThresholds {
    fn default() -> Self {
        Self {
            max_sync_time_ms: 50, // 50ms max sync time
            max_errors_per_minute: 10,
            max_frame_time_ms: 33, // 30 FPS minimum
        }
    }
}

/// Performance statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PerformanceStats {
    pub average_sync_time_ms: u64,
    pub total_messages: u64,
    pub total_errors: u64,
    pub message_breakdown: HashMap<String, u64>,
    pub error_breakdown: HashMap<String, u64>,
}

/// Comprehensive state sync performance statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StateSyncPerformanceStats {
    pub frame_time_stats: FrameTimeStats,
    pub performance_stats: PerformanceStats,
    pub bandwidth_report: BandwidthReport,
    pub current_tick: u64,
    pub active_client_states: u64,
    pub state_history_size: u64,
}

/// Bandwidth usage statistics
#[derive(Debug, Clone)]
pub struct BandwidthStats {
    /// Total bytes sent for state updates
    pub total_state_bytes_sent: u64,
    /// Total bytes sent for reconciliation
    pub total_reconciliation_bytes_sent: u64,
    /// Total bytes sent for acknowledgments
    pub total_ack_bytes_sent: u64,
    /// Total bytes received for client predictions
    pub total_prediction_bytes_received: u64,
    /// Per-message-type bandwidth tracking
    pub message_bandwidth: HashMap<String, u64>,
    /// Last bandwidth reset time
    pub last_reset: Instant,
    /// Bandwidth per second (calculated)
    pub bandwidth_per_second: f64,
}

impl BandwidthStats {
    pub fn new() -> Self {
        Self {
            total_state_bytes_sent: 0,
            total_reconciliation_bytes_sent: 0,
            total_ack_bytes_sent: 0,
            total_prediction_bytes_received: 0,
            message_bandwidth: HashMap::new(),
            last_reset: Instant::now(),
            bandwidth_per_second: 0.0,
        }
    }

    /// Record bytes sent for a message type
    pub fn record_bytes_sent(&mut self, message_type: &str, bytes: u64) {
        *self.message_bandwidth.entry(message_type.to_string()).or_insert(0) += bytes;

        match message_type {
            "full_state" | "delta_state" => self.total_state_bytes_sent += bytes,
            "reconcile" => self.total_reconciliation_bytes_sent += bytes,
            "ack" => self.total_ack_bytes_sent += bytes,
            _ => {}
        }

        self.update_bandwidth_per_second();
    }

    /// Record bytes received for predictions
    pub fn record_bytes_received(&mut self, message_type: &str, bytes: u64) {
        *self.message_bandwidth.entry(message_type.to_string()).or_insert(0) += bytes;

        if message_type == "client_prediction" {
            self.total_prediction_bytes_received += bytes;
        }

        self.update_bandwidth_per_second();
    }

    /// Update bandwidth per second calculation
    fn update_bandwidth_per_second(&mut self) {
        let elapsed = self.last_reset.elapsed().as_secs_f64();
        if elapsed > 0.0 {
            let total_bytes = self.message_bandwidth.values().sum::<u64>();
            self.bandwidth_per_second = total_bytes as f64 / elapsed;
        }
    }

    /// Reset bandwidth counters (for periodic reporting)
    pub fn reset(&mut self) {
        *self = Self::new();
    }

    /// Get current bandwidth stats
    pub fn get_stats(&self) -> BandwidthReport {
        BandwidthReport {
            total_state_bytes_sent: self.total_state_bytes_sent,
            total_reconciliation_bytes_sent: self.total_reconciliation_bytes_sent,
            total_ack_bytes_sent: self.total_ack_bytes_sent,
            total_prediction_bytes_received: self.total_prediction_bytes_received,
            message_bandwidth: self.message_bandwidth.clone(),
            bandwidth_per_second: self.bandwidth_per_second,
            elapsed_seconds: self.last_reset.elapsed().as_secs_f64(),
        }
    }
}

impl Default for BandwidthStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Bandwidth usage report
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BandwidthReport {
    pub total_state_bytes_sent: u64,
    pub total_reconciliation_bytes_sent: u64,
    pub total_ack_bytes_sent: u64,
    pub total_prediction_bytes_received: u64,
    pub message_bandwidth: HashMap<String, u64>,
    pub bandwidth_per_second: f64,
    pub elapsed_seconds: f64,
}

/// State synchronization framework với client prediction và rollback reconciliation
pub struct StateSyncFramework {
    /// Server state history - lưu trữ các state gần đây nhất để rollback
    pub state_history: VecDeque<ServerState>,
    /// Maximum number of states to keep in history
    pub max_history_size: usize,
    /// Current server tick
    pub current_tick: u64,
    /// Client states per player - để reconciliation
    pub client_states: HashMap<String, ClientState>,
    /// Input delay compensation (số tick để bù trừ độ trễ mạng)
    pub input_delay_ticks: u64,
    /// Last time we sent a full state update
    pub last_full_update: Instant,
    /// Full update interval (ví dụ: mỗi 60 ticks)
    pub full_update_interval: Duration,
    /// Frame time tracking
    pub frame_time_tracker: FrameTimeTracker,
    /// Performance monitoring
    pub performance_monitor: PerformanceMonitor,
}

impl StateSyncFramework {
    pub fn new(input_delay_ticks: u64, full_update_interval_secs: u64) -> Self {
        Self {
            state_history: VecDeque::new(),
            max_history_size: 100, // Lưu 100 states gần nhất
            current_tick: 0,
            client_states: HashMap::new(),
            input_delay_ticks,
            last_full_update: Instant::now(),
            full_update_interval: Duration::from_secs(full_update_interval_secs),
            frame_time_tracker: FrameTimeTracker::new(),
            performance_monitor: PerformanceMonitor::new(),
        }
    }

    /// Add new server state to history với frame time tracking
    pub fn add_server_state(&mut self, snapshot: GameSnapshot, inputs: Vec<PlayerInput>) {
        // Start frame timing
        self.frame_time_tracker.start_frame();

        let server_state = ServerState {
            tick: self.current_tick,
            snapshot,
            processed_inputs: inputs,
            timestamp: Instant::now(),
        };

        // Giữ history trong giới hạn
        if self.state_history.len() >= self.max_history_size {
            self.state_history.pop_front();
        }
        self.state_history.push_back(server_state);

        // End frame timing và record performance
        let frame_time = self.frame_time_tracker.end_frame();
        self.performance_monitor.record_sync_time(frame_time);

        self.current_tick += 1;
        debug!("Added server state at tick {} (frame time: {}ms)", self.current_tick, frame_time);
    }

    /// Get server state at specific tick
    pub fn get_server_state(&self, tick: u64) -> Option<&ServerState> {
        self.state_history.iter().find(|state| state.tick == tick)
    }

    /// Get latest server state
    pub fn get_latest_state(&self) -> Option<&ServerState> {
        self.state_history.back()
    }

    /// Register client state for reconciliation
    pub fn register_client_state(&mut self, player_id: String, client_state: ClientState) {
        self.client_states.insert(player_id.clone(), client_state);
        info!("Registered client state for player: {}", player_id);
    }

    /// Update client state
    pub fn update_client_state(&mut self, player_id: &str, tick: u64, predicted_position: [f32; 3]) {
        if let Some(client_state) = self.client_states.get_mut(player_id) {
            client_state.last_predicted_tick = tick;
            client_state.predicted_position = predicted_position;
            client_state.last_update = Instant::now();
        }
    }

    /// Check if client prediction cần reconciliation
    pub fn needs_reconciliation(&self, player_id: &str, server_tick: u64) -> bool {
        if let Some(client_state) = self.client_states.get(player_id) {
            // Reconciliation cần thiết nếu:
            // 1. Client prediction quá cũ (> 10 ticks)
            // 2. Client state khác biệt đáng kể với server state
            server_tick.saturating_sub(client_state.last_predicted_tick) > 10
        } else {
            false
        }
    }

    /// Calculate reconciliation data cho client
    pub fn calculate_reconciliation(&self, player_id: &str, current_tick: u64) -> Option<ReconciliationData> {
        if let (Some(client_state), Some(server_state)) = (
            self.client_states.get(player_id),
            self.get_server_state(current_tick)
        ) {
            // Find player entity trong server state
            if let Some(player_entity) = server_state.snapshot.entities.iter()
                .find(|e| e.player.as_ref().map_or(false, |p| p.id == player_id)) {

                let server_position = player_entity.transform.position;
                let predicted_position = client_state.predicted_position;

                // Tính toán sự khác biệt
                let position_diff = [
                    server_position[0] - predicted_position[0],
                    server_position[1] - predicted_position[1],
                    server_position[2] - predicted_position[2],
                ];

                let distance = (position_diff[0].powi(2) + position_diff[1].powi(2) + position_diff[2].powi(2)).sqrt();

                // Nếu khác biệt quá lớn (> 1.0 units), cần reconciliation
                if distance > 1.0 {
                    return Some(ReconciliationData {
                        server_tick: current_tick,
                        server_position,
                        client_predicted_position: predicted_position,
                        position_correction: position_diff,
                        velocity_correction: [0.0, 0.0, 0.0], // Có thể tính toán từ physics
                    });
                }
            }
        }
        None
    }

    /// Check if cần gửi full state update
    pub fn should_send_full_update(&self) -> bool {
        self.last_full_update.elapsed() >= self.full_update_interval
    }

    /// Mark full update đã được gửi
    pub fn mark_full_update_sent(&mut self) {
        self.last_full_update = Instant::now();
    }

    /// Get predicted state cho client (client-side prediction)
    pub fn get_predicted_state(&self, player_id: &str, future_ticks: u64) -> Option<PredictedState> {
        if let Some(client_state) = self.client_states.get(player_id) {
            // Tính toán state dự đoán dựa trên inputs gần nhất
            let predicted_tick = client_state.last_predicted_tick + future_ticks;

            Some(PredictedState {
                predicted_tick,
                predicted_position: client_state.predicted_position,
                confidence: self.calculate_prediction_confidence(player_id, future_ticks),
            })
        } else {
            None
        }
    }

    /// Calculate prediction confidence dựa trên thời gian và độ trễ mạng
    fn calculate_prediction_confidence(&self, _player_id: &str, future_ticks: u64) -> f32 {
        // Confidence giảm theo thời gian dự đoán và độ trễ mạng
        let time_factor = 1.0 - (future_ticks as f32 * 0.01).min(0.5); // Max giảm 50%
        let latency_factor = 1.0; // Có thể tích hợp với network latency

        (time_factor * latency_factor).max(0.1) // Minimum 10% confidence
    }

    /// Cleanup old states và client states không hoạt động
    pub fn cleanup(&mut self) {
        let cutoff_time = Instant::now() - Duration::from_secs(300); // 5 minutes

        // Cleanup old server states
        while let Some(oldest) = self.state_history.front() {
            if oldest.timestamp < cutoff_time && self.state_history.len() > 10 {
                self.state_history.pop_front();
            } else {
                break;
            }
        }

        // Cleanup inactive client states
        self.client_states.retain(|_player_id, client_state| {
            client_state.last_update.elapsed() < Duration::from_secs(60) // 1 minute timeout
        });

        // Cleanup performance data
        self.performance_monitor.cleanup();

        debug!("State sync cleanup: {} server states, {} client states",
               self.state_history.len(), self.client_states.len());
    }

    /// Get comprehensive performance statistics
    pub fn get_performance_stats(&self) -> StateSyncPerformanceStats {
        StateSyncPerformanceStats {
            frame_time_stats: self.frame_time_tracker.get_stats(),
            performance_stats: self.performance_monitor.get_stats(),
            bandwidth_report: self.performance_monitor.bandwidth_stats.get_stats(),
            current_tick: self.current_tick,
            active_client_states: self.client_states.len() as u64,
            state_history_size: self.state_history.len() as u64,
        }
    }
}

/// Server state tại một tick cụ thể
#[derive(Debug, Clone)]
pub struct ServerState {
    pub tick: u64,
    pub snapshot: GameSnapshot,
    pub processed_inputs: Vec<PlayerInput>,
    pub timestamp: Instant,
}

/// Client state để track prediction và reconciliation
#[derive(Debug, Clone)]
pub struct ClientState {
    pub player_id: String,
    pub last_predicted_tick: u64,
    pub predicted_position: [f32; 3],
    pub last_update: Instant,
    pub ping_ms: u64,
    pub prediction_error_history: VecDeque<f32>, // Lịch sử lỗi dự đoán
}

/// Reconciliation data để gửi về client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconciliationData {
    pub server_tick: u64,
    pub server_position: [f32; 3],
    pub client_predicted_position: [f32; 3],
    pub position_correction: [f32; 3],
    pub velocity_correction: [f32; 3],
}

/// Predicted state để gửi về client cho client-side prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictedState {
    pub predicted_tick: u64,
    pub predicted_position: [f32; 3],
    pub confidence: f32, // 0.0 - 1.0
}

/// State sync message để gửi giữa client và server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateSyncMessage {
    /// Full state update
    FullState {
        tick: u64,
        snapshot: GameSnapshot,
    },
    /// Delta state update
    DeltaState {
        base_tick: u64,
        current_tick: u64,
        changes: Vec<EntityStateChange>,
    },
    /// Reconciliation message
    Reconcile {
        reconciliation: ReconciliationData,
    },
    /// Client prediction update từ client
    ClientPrediction {
        player_id: String,
        predicted_tick: u64,
        predicted_position: [f32; 3],
        input_sequence: u32,
    },
    /// Acknowledgment từ client
    Ack {
        player_id: String,
        acknowledged_tick: u64,
    },
}

/// Entity state change cho delta updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityStateChange {
    pub entity_id: u32,
    pub transform: Option<TransformQ>,
    pub velocity: Option<VelocityQ>,
    pub player: Option<Player>,
    // Các component khác có thể thêm vào đây
}

/// State synchronization manager để điều phối việc sync
pub struct StateSyncManager {
    pub framework: StateSyncFramework,
    pub message_queue: VecDeque<StateSyncMessage>,
    pub broadcast_buffer: HashMap<String, Vec<u8>>, // Player ID -> serialized state
}

impl StateSyncManager {
    pub fn new(input_delay_ticks: u64, full_update_interval_secs: u64) -> Self {
        Self {
            framework: StateSyncFramework::new(input_delay_ticks, full_update_interval_secs),
            message_queue: VecDeque::new(),
            broadcast_buffer: HashMap::new(),
        }
    }

    /// Process incoming client prediction
    pub fn process_client_prediction(&mut self, message: StateSyncMessage) {
        match message {
            StateSyncMessage::ClientPrediction { player_id, predicted_tick, predicted_position, input_sequence: _ } => {
                self.framework.update_client_state(&player_id, predicted_tick, predicted_position);

                // Queue acknowledgment
                self.message_queue.push_back(StateSyncMessage::Ack {
                    player_id: player_id.clone(),
                    acknowledged_tick: predicted_tick,
                });

                debug!("Processed client prediction for player {} at tick {}", player_id, predicted_tick);
            }
            _ => {
                warn!("Unexpected message type in process_client_prediction");
            }
        }
    }

    /// Generate state update cho player cụ thể
    pub fn generate_state_update(&mut self, player_id: &str, current_tick: u64) -> Option<StateSyncMessage> {
        // Check if reconciliation needed
        if self.framework.needs_reconciliation(player_id, current_tick) {
            if let Some(reconciliation) = self.framework.calculate_reconciliation(player_id, current_tick) {
                return Some(StateSyncMessage::Reconcile { reconciliation });
            }
        }

        // Check if full update needed
        if self.framework.should_send_full_update() {
            if let Some(server_state) = self.framework.get_latest_state().cloned() {
                self.framework.mark_full_update_sent();
                return Some(StateSyncMessage::FullState {
                    tick: server_state.tick,
                    snapshot: server_state.snapshot,
                });
            }
        }

        // Generate delta update
        if let Some(server_state) = self.framework.get_latest_state() {
            // Calculate delta changes từ previous state
            let changes = self.calculate_delta_changes(server_state);
            if !changes.is_empty() {
                return Some(StateSyncMessage::DeltaState {
                    base_tick: current_tick.saturating_sub(1),
                    current_tick,
                    changes,
                });
            }
        }

        None
    }

    /// Calculate delta changes between current and previous state
    fn calculate_delta_changes(&self, current_state: &ServerState) -> Vec<EntityStateChange> {
        let mut changes = Vec::new();

        // Find previous state để so sánh
        if let Some(prev_state) = self.framework.state_history
            .iter()
            .rev()
            .nth(1) // Get second-to-last state
        {
            for current_entity in &current_state.snapshot.entities {
                if let Some(prev_entity) = prev_state.snapshot.entities.iter()
                    .find(|e| e.id == current_entity.id) {

                    // Check for significant changes
                    let mut entity_change = EntityStateChange {
                        entity_id: current_entity.id,
                        transform: None,
                        velocity: None,
                        player: None,
                    };

                    // Check transform changes
                    if current_entity.transform.position != prev_entity.transform.position {
                        entity_change.transform = Some(current_entity.transform.clone());
                    }

                    // Check velocity changes
                    if current_entity.velocity != prev_entity.velocity {
                        entity_change.velocity = current_entity.velocity.clone();
                    }

                    // Check player changes
                    if current_entity.player != prev_entity.player {
                        entity_change.player = current_entity.player.clone();
                    }

                    // Only add if there are actual changes
                    if entity_change.transform.is_some() ||
                       entity_change.velocity.is_some() ||
                       entity_change.player.is_some() {
                        changes.push(entity_change);
                    }
                } else {
                    // New entity - include all data
                    changes.push(EntityStateChange {
                        entity_id: current_entity.id,
                        transform: Some(current_entity.transform.clone()),
                        velocity: current_entity.velocity.clone(),
                        player: current_entity.player.clone(),
                    });
                }
            }
        }

        changes
    }

    /// Get queued messages để gửi
    pub fn get_queued_messages(&mut self) -> Vec<StateSyncMessage> {
        self.message_queue.drain(..).collect()
    }

    /// Cleanup và maintenance
    pub fn cleanup(&mut self) {
        self.framework.cleanup();
        self.broadcast_buffer.clear();
        self.message_queue.retain(|msg| {
            // Keep only recent messages (last 5 seconds worth)
            match msg {
                StateSyncMessage::Ack { .. } => false, // Remove old acks
                _ => true,
            }
        });
    }
}

impl Default for StateSyncFramework {
    fn default() -> Self {
        Self::new(3, 60) // 3 tick delay, 60 second full update interval
    }
}

impl Default for StateSyncManager {
    fn default() -> Self {
        Self::new(3, 60)
    }
}
