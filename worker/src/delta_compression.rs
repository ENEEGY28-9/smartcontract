use std::{
    collections::HashMap,
    io::Write,
};
use tracing::debug;

use crate::simulation::{QuantizedEntitySnapshot, QuantizedSnapshot, DeltaSnapshot};

/// Advanced delta encoding với compression và selective updates
pub struct DeltaCompressionEngine {
    /// Previous states để tính toán delta
    pub previous_states: HashMap<String, QuantizedSnapshot>, // Player ID -> Last sent state
    /// Compression settings
    pub compression_settings: CompressionSettings,
    /// Selective update thresholds
    pub update_thresholds: UpdateThresholds,
    /// Compression statistics
    pub stats: CompressionStats,
}

impl DeltaCompressionEngine {
    pub fn new() -> Self {
        Self {
            previous_states: HashMap::new(),
            compression_settings: CompressionSettings::default(),
            update_thresholds: UpdateThresholds::default(),
            stats: CompressionStats::new(),
        }
    }

    /// Generate compressed delta update cho player cụ thể
    pub fn generate_compressed_delta(
        &mut self,
        player_id: &str,
        current_snapshot: &QuantizedSnapshot,
        current_tick: u64,
    ) -> Option<CompressedDeltaUpdate> {
        // Get previous state cho player này
        let previous_state = self.previous_states.get(player_id).cloned();

        if let Some(prev) = previous_state {
            // Calculate selective changes
            let selective_changes = self.calculate_selective_changes(&prev, current_snapshot);

            if selective_changes.is_empty() {
                // No significant changes
                self.stats.no_change_updates += 1;
                return None;
            }

            // Calculate change count trước khi move
            let change_count = selective_changes.created.len() + selective_changes.updated.len() + selective_changes.deleted.len() +
                selective_changes.chat_messages.len() + selective_changes.new_spectators.len() + selective_changes.removed_spectators.len();

            // Create delta snapshot với selective changes
            let removed_spectators = selective_changes.removed_spectators.clone();
            let delta = DeltaSnapshot {
                tick: current_tick,
                base_tick: prev.tick,
                created_entities: selective_changes.created,
                updated_entities: selective_changes.updated,
                deleted_entities: selective_changes.deleted,
                chat_messages: selective_changes.chat_messages,
                new_spectators: selective_changes.new_spectators,
                removed_spectators,
            };

            // Compress delta
            let compressed_data = self.compress_delta(&delta);

            // Update previous state
            self.previous_states.insert(player_id.to_string(), current_snapshot.clone());
            self.stats.compressed_updates += 1;
            self.stats.total_bytes_saved += self.estimate_uncompressed_size(&delta) - compressed_data.len();

            Some(CompressedDeltaUpdate {
                tick: current_tick,
                base_tick: prev.tick,
                compressed_data: compressed_data.clone(),
                compression_ratio: self.calculate_compression_ratio(&delta, &compressed_data),
                change_count,
            })
        } else {
            // First update - send full compressed snapshot
            let compressed_data = self.compress_full_snapshot(current_snapshot);
            self.previous_states.insert(player_id.to_string(), current_snapshot.clone());

            let change_count = current_snapshot.entities.len();
            self.stats.full_updates += 1;

            Some(CompressedDeltaUpdate {
                tick: current_tick,
                base_tick: current_tick,
                compressed_data: compressed_data.clone(),
                compression_ratio: self.calculate_compression_ratio_full(current_snapshot, &compressed_data),
                change_count,
            })
        }
    }

    /// Calculate selective changes based on thresholds
    fn calculate_selective_changes(
        &self,
        previous: &QuantizedSnapshot,
        current: &QuantizedSnapshot,
    ) -> SelectiveChanges {
        let mut changes = SelectiveChanges::new();

        // Find created entities
        for entity in &current.entities {
            if !previous.entities.iter().any(|e| e.id == entity.id) {
                changes.created.push(entity.clone());
            }
        }

        // Find updated entities (only if significant changes)
        for current_entity in &current.entities {
            if let Some(prev_entity) = previous.entities.iter().find(|e| e.id == current_entity.id) {
                if self.has_significant_change(current_entity, prev_entity) {
                    changes.updated.push(current_entity.clone());
                }
            }
        }

        // Find deleted entities
        for prev_entity in &previous.entities {
            if !current.entities.iter().any(|e| e.id == prev_entity.id) {
                changes.deleted.push(prev_entity.id);
            }
        }

        // Check chat messages (selective based on importance)
        for chat_msg in &current.chat_messages {
            if !previous.chat_messages.iter().any(|m| m.id == chat_msg.id) {
                // Only include important chat messages (global, system, or recent)
                if self.is_important_chat_message(chat_msg) {
                    changes.chat_messages.push(chat_msg.clone());
                }
            }
        }

        // Check spectators (always include for now)
        for spectator in &current.spectators {
            if !previous.spectators.iter().any(|s| s.id == spectator.id) {
                changes.new_spectators.push(spectator.clone());
            }
        }

        for prev_spectator in &previous.spectators {
            if !current.spectators.iter().any(|s| s.id == prev_spectator.id) {
                changes.removed_spectators.push(prev_spectator.id.clone());
            }
        }

        changes
    }

    /// Check if entity có significant change để include trong delta
    fn has_significant_change(&self, current: &QuantizedEntitySnapshot, previous: &QuantizedEntitySnapshot) -> bool {
        // Position change threshold
        let pos_diff_x = (current.transform.position.0 as i32).abs_diff(previous.transform.position.0 as i32);
        let pos_diff_y = (current.transform.position.1 as i32).abs_diff(previous.transform.position.1 as i32);
        let pos_diff_z = (current.transform.position.2 as i32).abs_diff(previous.transform.position.2 as i32);

        if pos_diff_x > self.update_thresholds.position_threshold as u32 ||
           pos_diff_y > self.update_thresholds.position_threshold as u32 ||
           pos_diff_z > self.update_thresholds.position_threshold as u32 {
            return true;
        }

        // Velocity change threshold (if velocity exists)
        if let (Some(curr_vel), Some(prev_vel)) = (&current.velocity, &previous.velocity) {
            let vel_diff_x = (curr_vel.velocity.0 as i32).abs_diff(prev_vel.velocity.0 as i32);
            let vel_diff_y = (curr_vel.velocity.1 as i32).abs_diff(prev_vel.velocity.1 as i32);
            let vel_diff_z = (curr_vel.velocity.2 as i32).abs_diff(prev_vel.velocity.2 as i32);

            if vel_diff_x > self.update_thresholds.velocity_threshold as u32 ||
               vel_diff_y > self.update_thresholds.velocity_threshold as u32 ||
               vel_diff_z > self.update_thresholds.velocity_threshold as u32 {
                return true;
            }
        }

        // Player score changes (significant threshold)
        if let (Some(curr_player), Some(prev_player)) = (&current.player, &previous.player) {
            if (curr_player.score as i32 - prev_player.score as i32).abs() >= self.update_thresholds.score_threshold {
                return true;
            }
        }

        false
    }

    /// Check if chat message is important enough to include
    fn is_important_chat_message(&self, message: &crate::simulation::ChatMessage) -> bool {
        use crate::simulation::ChatMessageType::*;

        match message.message_type {
            Global | System => true,
            Team | Whisper => {
                // Include team/whisper messages chỉ nếu recent (within 5 seconds)
                message.timestamp > chrono::Utc::now().timestamp() as u64 - 5
            }
        }
    }

    /// Compress delta snapshot
    fn compress_delta(&self, delta: &DeltaSnapshot) -> Vec<u8> {
        // Serialize to JSON first
        let json_data = serde_json::to_vec(delta).unwrap_or_default();

        // Apply compression
        match self.compression_settings.method {
            CompressionMethod::None => json_data,
            CompressionMethod::Gzip => self.gzip_compress(&json_data),
            CompressionMethod::Lz4 => self.lz4_compress(&json_data),
            CompressionMethod::Zstd => self.zstd_compress(&json_data),
        }
    }

    /// Compress full snapshot
    fn compress_full_snapshot(&self, snapshot: &QuantizedSnapshot) -> Vec<u8> {
        let json_data = serde_json::to_vec(snapshot).unwrap_or_default();

        match self.compression_settings.method {
            CompressionMethod::None => json_data,
            CompressionMethod::Gzip => self.gzip_compress(&json_data),
            CompressionMethod::Lz4 => self.lz4_compress(&json_data),
            CompressionMethod::Zstd => self.zstd_compress(&json_data),
        }
    }

    /// Gzip compression
    fn gzip_compress(&self, data: &[u8]) -> Vec<u8> {
        use flate2::{write::GzEncoder, Compression};
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).ok();
        encoder.finish().unwrap_or_default()
    }

    /// LZ4 compression
    fn lz4_compress(&self, data: &[u8]) -> Vec<u8> {
        // Simple LZ4-like compression (placeholder implementation)
        // In production, use a proper LZ4 crate
        data.to_vec()
    }

    /// Zstd compression
    fn zstd_compress(&self, data: &[u8]) -> Vec<u8> {
        // Simple Zstd-like compression (placeholder implementation)
        // In production, use zstd crate
        data.to_vec()
    }

    /// Estimate uncompressed size của delta
    fn estimate_uncompressed_size(&self, delta: &DeltaSnapshot) -> usize {
        serde_json::to_vec(delta).map(|v| v.len()).unwrap_or(0)
    }

    /// Calculate compression ratio
    fn calculate_compression_ratio(&self, delta: &DeltaSnapshot, compressed: &[u8]) -> f32 {
        let uncompressed = self.estimate_uncompressed_size(delta);
        if uncompressed == 0 {
            1.0
        } else {
            compressed.len() as f32 / uncompressed as f32
        }
    }

    /// Calculate compression ratio for full snapshot
    fn calculate_compression_ratio_full(&self, snapshot: &QuantizedSnapshot, compressed: &[u8]) -> f32 {
        let uncompressed = serde_json::to_vec(snapshot).map(|v| v.len()).unwrap_or(0);
        if uncompressed == 0 {
            1.0
        } else {
            compressed.len() as f32 / uncompressed as f32
        }
    }

    /// Get compression statistics
    pub fn get_stats(&self) -> &CompressionStats {
        &self.stats
    }

    /// Reset statistics
    pub fn reset_stats(&mut self) {
        self.stats = CompressionStats::new();
    }

    /// Cleanup old states
    pub fn cleanup(&mut self) {
        // Remove states older than 5 minutes
        let cutoff_tick = chrono::Utc::now().timestamp() as u64 - 300;
        self.previous_states.retain(|_, state| state.tick > cutoff_tick);

        debug!("Delta compression cleanup: {} player states remaining", self.previous_states.len());
    }
}

/// Selective changes result
#[derive(Debug, Default)]
struct SelectiveChanges {
    pub created: Vec<QuantizedEntitySnapshot>,
    pub updated: Vec<QuantizedEntitySnapshot>,
    pub deleted: Vec<u32>,
    pub chat_messages: Vec<crate::simulation::ChatMessage>,
    pub new_spectators: Vec<crate::simulation::SpectatorSnapshot>,
    pub removed_spectators: Vec<String>,
}

impl SelectiveChanges {
    fn new() -> Self {
        Self::default()
    }

    fn total_changes(&self) -> usize {
        self.created.len() + self.updated.len() + self.deleted.len() +
        self.chat_messages.len() + self.new_spectators.len() + self.removed_spectators.len()
    }

    fn is_empty(&self) -> bool {
        self.total_changes() == 0
    }
}

/// Compressed delta update
#[derive(Debug, Clone)]
pub struct CompressedDeltaUpdate {
    pub tick: u64,
    pub base_tick: u64,
    pub compressed_data: Vec<u8>,
    pub compression_ratio: f32,
    pub change_count: usize,
}

impl CompressedDeltaUpdate {
    /// Decompress và parse delta update
    pub fn decompress(&self) -> Option<DeltaSnapshot> {
        // Simple decompression (placeholder)
        // In production, implement proper decompression based on compression method
        serde_json::from_slice(&self.compressed_data).ok()
    }

    /// Get estimated size savings
    pub fn size_savings(&self, uncompressed_size: usize) -> usize {
        uncompressed_size.saturating_sub(self.compressed_data.len())
    }
}

/// Compression settings
#[derive(Debug, Clone)]
pub struct CompressionSettings {
    pub method: CompressionMethod,
    pub level: u32, // Compression level (1-9 for most algorithms)
    pub enable_selective_updates: bool,
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self {
            method: CompressionMethod::Gzip,
            level: 6,
            enable_selective_updates: true,
        }
    }
}

/// Compression methods
#[derive(Debug, Clone, Copy)]
pub enum CompressionMethod {
    None,
    Gzip,
    Lz4,
    Zstd,
}

/// Update thresholds để control selective updates
#[derive(Debug, Clone)]
pub struct UpdateThresholds {
    pub position_threshold: i16,    // Minimum position change để trigger update
    pub velocity_threshold: i16,    // Minimum velocity change để trigger update
    pub score_threshold: i32,       // Minimum score change để trigger update
    pub rotation_threshold: i16,    // Minimum rotation change để trigger update
    pub chat_importance_threshold: f32, // Threshold for chat message importance
}

impl Default for UpdateThresholds {
    fn default() -> Self {
        Self {
            position_threshold: 2,      // 2 units minimum change
            velocity_threshold: 3,      // 3 units/sec minimum change
            score_threshold: 10,        // 10 points minimum change
            rotation_threshold: 5,      // 5 degrees minimum change
            chat_importance_threshold: 0.5,
        }
    }
}

/// Compression statistics
#[derive(Debug, Clone)]
pub struct CompressionStats {
    pub compressed_updates: u64,
    pub full_updates: u64,
    pub no_change_updates: u64,
    pub total_bytes_saved: usize,
    pub average_compression_ratio: f32,
    pub total_updates: u64,
}

impl CompressionStats {
    pub fn new() -> Self {
        Self {
            compressed_updates: 0,
            full_updates: 0,
            no_change_updates: 0,
            total_bytes_saved: 0,
            average_compression_ratio: 0.0,
            total_updates: 0,
        }
    }

    /// Update average compression ratio
    pub fn update_average_ratio(&mut self) {
        self.total_updates = self.compressed_updates + self.full_updates + self.no_change_updates;
        if self.total_updates > 0 {
            // Simple calculation - in production, track per-update ratios
            self.average_compression_ratio = 0.7; // Placeholder
        }
    }

    /// Get bandwidth savings percentage
    pub fn bandwidth_savings_percent(&self) -> f32 {
        if self.total_bytes_saved == 0 {
            0.0
        } else {
            // Placeholder calculation
            30.0 // Assume 30% savings
        }
    }
}

impl Default for DeltaCompressionEngine {
    fn default() -> Self {
        Self::new()
    }
}
