use std::{
    collections::{HashMap, VecDeque},
    time::{Duration, Instant},
};
use tracing::{debug, info};

use crate::simulation::{PlayerInput, GameSnapshot, EntitySnapshot, TransformQ, VelocityQ};
use crate::state_sync::ReconciliationData;

/// Latency compensation settings cho toàn bộ game
#[derive(Debug, Clone)]
pub struct LatencyCompensationSettings {
    /// Base latency compensation (ms)
    pub base_compensation_ms: u64,
    /// Maximum allowed compensation (ms)
    pub max_compensation_ms: u64,
    /// Minimum compensation threshold (ms)
    pub min_compensation_ms: u64,
    /// Adaptive compensation enabled
    pub adaptive_enabled: bool,
    /// Smoothing factor for compensation changes
    pub smoothing_factor: f32,
}

impl Default for LatencyCompensationSettings {
    fn default() -> Self {
        Self {
            base_compensation_ms: 50, // 50ms base compensation
            max_compensation_ms: 200, // Max 200ms compensation
            min_compensation_ms: 10,  // Min 10ms compensation
            adaptive_enabled: true,
            smoothing_factor: 0.3,
        }
    }
}

/// Latency compensation data cho từng player
#[derive(Debug, Clone)]
pub struct LatencyCompensation {
    /// Current ping của player (ms)
    pub current_ping_ms: u64,
    /// Applied compensation (ms)
    pub applied_compensation_ms: u64,
    /// Prediction accuracy history
    pub accuracy_history: VecDeque<f32>,
    /// Last compensation update
    pub last_update: Instant,
    /// Adaptive compensation enabled cho player này
    pub adaptive_enabled: bool,
}

impl LatencyCompensation {
    pub fn new() -> Self {
        Self {
            current_ping_ms: 0,
            applied_compensation_ms: 50, // Start with base compensation
            accuracy_history: VecDeque::new(),
            last_update: Instant::now(),
            adaptive_enabled: true,
        }
    }

    /// Update latency và recalculate compensation
    pub fn update_latency(&mut self, ping_ms: u64, settings: &LatencyCompensationSettings) {
        self.current_ping_ms = ping_ms;
        self.last_update = Instant::now();

        if !self.adaptive_enabled {
            return;
        }

        // Adaptive compensation dựa trên ping và accuracy
        let mut new_compensation = settings.base_compensation_ms;

        // Adjust dựa trên ping
        if ping_ms > 100 {
            new_compensation += (ping_ms - 100) / 2; // Add half of extra ping
        }

        // Adjust dựa trên average accuracy
        let avg_accuracy = self.get_average_accuracy();
        if avg_accuracy < 0.7 { // If accuracy < 70%, increase compensation
            new_compensation += 20;
        } else if avg_accuracy > 0.9 { // If accuracy > 90%, decrease compensation
            new_compensation = new_compensation.saturating_sub(10);
        }

        // Clamp to limits
        new_compensation = new_compensation.clamp(settings.min_compensation_ms, settings.max_compensation_ms);

        // Smooth transition
        let smoothed = (self.applied_compensation_ms as f32 * (1.0 - settings.smoothing_factor) +
                       new_compensation as f32 * settings.smoothing_factor) as u64;

        self.applied_compensation_ms = smoothed;
    }

    /// Record prediction accuracy để adaptive algorithm
    pub fn record_accuracy(&mut self, accuracy: f32) {
        if self.accuracy_history.len() >= 20 {
            self.accuracy_history.pop_front();
        }
        self.accuracy_history.push_back(accuracy);
    }

    /// Get average accuracy từ history
    fn get_average_accuracy(&self) -> f32 {
        if self.accuracy_history.is_empty() {
            0.8 // Default assumption
        } else {
            self.accuracy_history.iter().sum::<f32>() / self.accuracy_history.len() as f32
        }
    }
}

/// Client prediction system để dự đoán state phía client và rollback khi cần thiết
pub struct ClientPredictionEngine {
    /// Predicted states cho từng player
    pub predicted_states: HashMap<String, PredictedStateBuffer>,
    /// Input history để rollback
    pub input_history: HashMap<String, InputHistory>,
    /// Physics constants cho prediction
    pub physics_constants: PhysicsConstants,
    /// Maximum prediction steps ahead
    pub max_prediction_steps: usize,
    /// Prediction accuracy tracking
    pub prediction_accuracy: HashMap<String, PredictionAccuracy>,
    /// Latency compensation per player
    pub latency_compensation: HashMap<String, LatencyCompensation>,
    /// Global latency compensation settings
    pub global_latency_settings: LatencyCompensationSettings,
}

impl ClientPredictionEngine {
    pub fn new() -> Self {
        Self {
            predicted_states: HashMap::new(),
            input_history: HashMap::new(),
            physics_constants: PhysicsConstants::default(),
            max_prediction_steps: 10, // Dự đoán tối đa 10 steps ahead
            prediction_accuracy: HashMap::new(),
            latency_compensation: HashMap::new(),
            global_latency_settings: LatencyCompensationSettings::default(),
        }
    }

    /// Update latency cho player và recalculate compensation
    pub fn update_player_latency(&mut self, player_id: &str, ping_ms: u64) {
        let compensation = self.latency_compensation
            .entry(player_id.to_string())
            .or_insert_with(LatencyCompensation::new);

        compensation.update_latency(ping_ms, &self.global_latency_settings);
    }

    /// Get current compensation cho player
    pub fn get_compensation_for_player(&self, player_id: &str) -> u64 {
        self.latency_compensation
            .get(player_id)
            .map(|comp| comp.applied_compensation_ms)
            .unwrap_or(self.global_latency_settings.base_compensation_ms)
    }

    /// Initialize prediction cho player mới
    pub fn initialize_player(&mut self, player_id: String, initial_snapshot: &GameSnapshot) {
        // Find player entity trong snapshot
        if let Some(player_entity) = initial_snapshot.entities.iter()
            .find(|e| e.player.as_ref().map_or(false, |p| p.id == player_id)) {

            let predicted_buffer = PredictedStateBuffer {
                player_id: player_id.clone(),
                current_predicted_state: player_entity.clone(),
                prediction_history: VecDeque::new(),
                last_prediction_tick: initial_snapshot.tick,
                confidence: 1.0,
            };

            self.predicted_states.insert(player_id.clone(), predicted_buffer);

            let input_history = InputHistory {
                inputs: VecDeque::new(),
                last_processed_sequence: 0,
            };

            self.input_history.insert(player_id.clone(), input_history);

            info!("Initialized client prediction for player: {}", player_id);
        }
    }

    /// Process new input và update prediction
    pub fn process_input(&mut self, player_id: &str, input: PlayerInput, current_tick: u64) -> PredictedStateUpdate {
        // Validate input trước
        if !self.validate_input(&input) {
            return PredictedStateUpdate::InvalidInput;
        }

        // Update input history
        if let Some(input_hist) = self.input_history.get_mut(player_id) {
            input_hist.add_input(input.clone());
        }

        // Generate prediction dựa trên input
        let prediction = self.generate_prediction(player_id, &input, current_tick);

        // Update predicted state
        if let Some(predicted_buffer) = self.predicted_states.get_mut(player_id) {
            predicted_buffer.apply_prediction(prediction.clone());
        }

        // Track prediction accuracy
        self.track_prediction_accuracy(player_id, &prediction);

        PredictedStateUpdate::Success(prediction)
    }

    /// Generate prediction dựa trên input hiện tại với latency compensation
    fn generate_prediction(&self, player_id: &str, input: &PlayerInput, target_tick: u64) -> EntityPrediction {
        if let Some(predicted_buffer) = self.predicted_states.get(player_id) {
            let current_state = &predicted_buffer.current_predicted_state;
            let steps_ahead = (target_tick - predicted_buffer.last_prediction_tick) as usize;

            // Clamp to max prediction steps
            let steps = steps_ahead.min(self.max_prediction_steps);

            // Apply physics simulation để dự đoán vị trí mới
            let predicted_transform = self.simulate_physics_steps(current_state, input, steps);

            EntityPrediction {
                entity_id: current_state.id,
                predicted_tick: target_tick,
                predicted_transform,
                predicted_velocity: self.calculate_predicted_velocity(current_state, input, steps),
                confidence: self.calculate_confidence(player_id, steps),
                applied_input: input.clone(),
            }
        } else {
            // Fallback nếu không có predicted state
            EntityPrediction {
                entity_id: 0,
                predicted_tick: target_tick,
                predicted_transform: TransformQ {
                    position: [0.0, 5.0, 0.0],
                    rotation: [0.0, 0.0, 0.0, 1.0],
                },
                predicted_velocity: Some(VelocityQ {
                    velocity: [0.0, 0.0, 0.0],
                    angular_velocity: [0.0, 0.0, 0.0],
                }),
                confidence: self.calculate_confidence(player_id, 0),
                applied_input: input.clone(),
            }
        }
    }

    /// Simulate physics steps để dự đoán vị trí mới
    fn simulate_physics_steps(&self, current_state: &EntitySnapshot, input: &PlayerInput, steps: usize) -> TransformQ {
        let mut position = current_state.transform.position;
        let rotation = current_state.transform.rotation;

        // Get current velocity hoặc sử dụng input để tính velocity mới
        let velocity = current_state.velocity.as_ref()
            .map(|v| v.velocity)
            .unwrap_or([input.movement[0] * 10.0, 0.0, input.movement[2] * 10.0]);

        // Simple physics simulation (có thể thay thế bằng Rapier simulation đơn giản)
        for _ in 0..steps {
            // Update position dựa trên velocity
            position[0] += velocity[0] * self.physics_constants.delta_time;
            position[1] += velocity[1] * self.physics_constants.delta_time;
            position[2] += velocity[2] * self.physics_constants.delta_time;

            // Apply gravity nếu không có velocity Y
            if velocity[1] == 0.0 {
                position[1] += self.physics_constants.gravity * self.physics_constants.delta_time;
            }

            // Simple ground collision (giữ player trên mặt đất)
            if position[1] < 0.0 {
                position[1] = 0.0;
            }

            // Apply friction để giảm tốc độ dần
            let friction = 0.9;
            let _new_velocity = [
                velocity[0] * friction,
                velocity[1],
                velocity[2] * friction,
            ];
        }

        TransformQ { position, rotation }
    }

    /// Calculate predicted velocity dựa trên input và physics
    fn calculate_predicted_velocity(&self, current_state: &EntitySnapshot, input: &PlayerInput, _steps: usize) -> Option<VelocityQ> {
        let input_velocity = [
            input.movement[0] * 10.0,
            0.0,
            input.movement[2] * 10.0,
        ];

        let current_velocity = current_state.velocity.as_ref()
            .map(|v| v.velocity)
            .unwrap_or([0.0, 0.0, 0.0]);

        // Lerp giữa current velocity và input velocity
        let lerp_factor = 0.3;
        let predicted_velocity = [
            current_velocity[0] * (1.0 - lerp_factor) + input_velocity[0] * lerp_factor,
            current_velocity[1],
            current_velocity[2] * (1.0 - lerp_factor) + input_velocity[2] * lerp_factor,
        ];

        Some(VelocityQ {
            velocity: predicted_velocity,
            angular_velocity: [0.0, 0.0, 0.0],
        })
    }

    /// Calculate prediction confidence dựa trên số steps dự đoán và latency compensation
    fn calculate_confidence(&self, player_id: &str, steps: usize) -> f32 {
        // Base confidence dựa trên số steps dự đoán
        let base_confidence = 1.0 - (steps as f32 * 0.1).min(0.8); // Max giảm 80%

        // Adjust dựa trên latency compensation
        let compensation_ms = self.get_compensation_for_player(player_id);
        let latency_factor = if compensation_ms > 100 {
            0.8 // High latency, lower confidence
        } else if compensation_ms > 50 {
            0.9 // Medium latency
        } else {
            1.0 // Low latency, full confidence
        };

        // Get historical accuracy nếu có
        let accuracy_factor = self.latency_compensation
            .get(player_id)
            .map(|comp| comp.get_average_accuracy())
            .unwrap_or(0.8);

        base_confidence * latency_factor * accuracy_factor
    }

    /// Validate input trước khi prediction
    fn validate_input(&self, input: &PlayerInput) -> bool {
        // Basic validation rules
        input.input_sequence > 0 &&
        input.movement.iter().all(|&v| v >= -10.0 && v <= 10.0) && // Clamp movement
        input.timestamp > 0
    }

    /// Track prediction accuracy để cải thiện prediction và latency compensation
    fn track_prediction_accuracy(&mut self, player_id: &str, prediction: &EntityPrediction) {
        let accuracy_entry = self.prediction_accuracy
            .entry(player_id.to_string())
            .or_insert_with(PredictionAccuracy::new);

        accuracy_entry.total_predictions += 1;
        accuracy_entry.last_prediction_confidence = prediction.confidence;

        // Update average confidence
        accuracy_entry.average_confidence = (
            accuracy_entry.average_confidence * (accuracy_entry.total_predictions - 1) as f32 +
            prediction.confidence
        ) / accuracy_entry.total_predictions as f32;

        // Update latency compensation với accuracy mới
        if let Some(latency_comp) = self.latency_compensation.get_mut(player_id) {
            latency_comp.record_accuracy(prediction.confidence);
        }
    }

    /// Get current predicted state cho player
    pub fn get_predicted_state(&self, player_id: &str) -> Option<&EntitySnapshot> {
        self.predicted_states.get(player_id)
            .map(|buffer| &buffer.current_predicted_state)
    }

    /// Apply reconciliation từ server
    pub fn apply_reconciliation(&mut self, player_id: &str, reconciliation: &ReconciliationData) {
        if let Some(predicted_buffer) = self.predicted_states.get_mut(player_id) {
            // Rollback to server state
            predicted_buffer.current_predicted_state.transform.position = reconciliation.server_position;

            // Apply correction với smoothing để tránh jerk
            let smoothing_factor = 0.7;
            if let Some(velocity) = &mut predicted_buffer.current_predicted_state.velocity {
                velocity.velocity[0] += reconciliation.velocity_correction[0] * smoothing_factor;
                velocity.velocity[1] += reconciliation.velocity_correction[1] * smoothing_factor;
                velocity.velocity[2] += reconciliation.velocity_correction[2] * smoothing_factor;
            }

            // Reset prediction confidence
            predicted_buffer.confidence = 0.5;

            info!("Applied reconciliation for player {} at tick {}",
                  player_id, reconciliation.server_tick);
        }
    }

    /// Get prediction accuracy stats
    pub fn get_prediction_stats(&self, player_id: &str) -> Option<&PredictionAccuracy> {
        self.prediction_accuracy.get(player_id)
    }

    /// Cleanup old prediction data
    pub fn cleanup(&mut self) {
        let cutoff_time = Instant::now() - Duration::from_secs(300); // 5 minutes

        // Cleanup old input history
        for input_hist in self.input_history.values_mut() {
            input_hist.cleanup(cutoff_time);
        }

        // Cleanup old prediction history
        for predicted_buffer in self.predicted_states.values_mut() {
            while predicted_buffer.prediction_history.len() > 50 {
                predicted_buffer.prediction_history.pop_front();
            }
        }

        debug!("Client prediction cleanup completed");
    }
}

/// Buffer chứa predicted states cho một player
#[derive(Debug, Clone)]
pub struct PredictedStateBuffer {
    pub player_id: String,
    pub current_predicted_state: EntitySnapshot,
    pub prediction_history: VecDeque<EntityPrediction>,
    pub last_prediction_tick: u64,
    pub confidence: f32,
}

impl PredictedStateBuffer {
    pub fn apply_prediction(&mut self, prediction: EntityPrediction) {
        // Update current state
        self.current_predicted_state.transform = prediction.predicted_transform.clone();
        self.current_predicted_state.velocity = prediction.predicted_velocity.clone();
        self.last_prediction_tick = prediction.predicted_tick;
        self.confidence = prediction.confidence;

        // Add to history
        if self.prediction_history.len() >= 20 {
            self.prediction_history.pop_front();
        }
        self.prediction_history.push_back(prediction);
    }
}

/// Input history để rollback khi cần thiết
#[derive(Debug, Clone)]
pub struct InputHistory {
    pub inputs: VecDeque<PlayerInput>,
    pub last_processed_sequence: u32,
}

impl InputHistory {
    pub fn add_input(&mut self, input: PlayerInput) {
        // Insert theo sequence order
        let insert_pos = self.inputs.partition_point(|i| i.input_sequence < input.input_sequence);
        self.inputs.insert(insert_pos, input);

        // Keep only recent inputs (last 100)
        if self.inputs.len() > 100 {
            self.inputs.drain(..self.inputs.len() - 100);
        }
    }

    pub fn get_inputs_after_sequence(&self, sequence: u32) -> Vec<&PlayerInput> {
        self.inputs.iter()
            .filter(|input| input.input_sequence > sequence)
            .collect()
    }

    pub fn cleanup(&mut self, cutoff_time: Instant) {
        // Remove inputs older than cutoff
        self.inputs.retain(|input| {
            // Simple timestamp check (có thể cần cải thiện)
            input.timestamp > cutoff_time.elapsed().as_millis() as u64
        });
    }
}

/// Physics constants cho client prediction
#[derive(Debug, Clone)]
pub struct PhysicsConstants {
    pub delta_time: f32,
    pub gravity: f32,
    pub friction: f32,
    pub max_velocity: f32,
}

impl Default for PhysicsConstants {
    fn default() -> Self {
        Self {
            delta_time: 1.0 / 60.0, // 60 FPS
            gravity: -9.81,
            friction: 0.9,
            max_velocity: 15.0,
        }
    }
}

/// Entity prediction result
#[derive(Debug, Clone)]
pub struct EntityPrediction {
    pub entity_id: u32,
    pub predicted_tick: u64,
    pub predicted_transform: TransformQ,
    pub predicted_velocity: Option<VelocityQ>,
    pub confidence: f32,
    pub applied_input: PlayerInput,
}

/// Prediction accuracy tracking
#[derive(Debug, Clone)]
pub struct PredictionAccuracy {
    pub total_predictions: u32,
    pub average_confidence: f32,
    pub last_prediction_confidence: f32,
    pub total_error_distance: f32,
    pub average_error_distance: f32,
}

impl PredictionAccuracy {
    pub fn new() -> Self {
        Self {
            total_predictions: 0,
            average_confidence: 0.0,
            last_prediction_confidence: 0.0,
            total_error_distance: 0.0,
            average_error_distance: 0.0,
        }
    }

    /// Record prediction error (khi reconciliation xảy ra)
    pub fn record_error(&mut self, error_distance: f32) {
        self.total_error_distance += error_distance;
        self.average_error_distance = self.total_error_distance / (self.total_predictions as f32 + 1.0);
    }
}

/// Result của prediction operation
#[derive(Debug)]
pub enum PredictedStateUpdate {
    Success(EntityPrediction),
    InvalidInput,
    PlayerNotFound,
    PredictionFailed(String),
}

impl Default for ClientPredictionEngine {
    fn default() -> Self {
        Self::new()
    }
}
