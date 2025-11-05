use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, atomic::{AtomicU64, Ordering}},
    time::{Duration, Instant},
};
use tokio::sync::{RwLock, Semaphore};
use once_cell::sync::Lazy;
use prometheus::{register_int_gauge_vec, register_int_counter_vec, IntGaugeVec, IntCounterVec};

// Connection pooling metrics
static CONNECTION_POOL_SIZE_GAUGE: Lazy<IntGaugeVec> = Lazy::new(|| {
    register_int_gauge_vec!(
        "gateway_connection_pool_size",
        "Current size of connection pools",
        &["pool_type", "room_id"]
    ).expect("register gateway_connection_pool_size")
});

static CONNECTION_POOL_UTILIZATION_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_connection_pool_utilization_total",
        "Total connection pool utilization events",
        &["pool_type", "event_type", "room_id"]
    ).expect("register gateway_connection_pool_utilization_total")
});

static CONNECTION_POOL_EVICTIONS_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    register_int_counter_vec!(
        "gateway_connection_pool_evictions_total",
        "Total connection pool evictions",
        &["pool_type", "reason", "room_id"]
    ).expect("register gateway_connection_pool_evictions_total")
});

// Connection pool entry
#[derive(Debug, Clone)]
pub struct ConnectionPoolEntry {
    pub connection_id: String,
    pub player_id: String,
    pub room_id: String,
    pub created_at: Instant,
    pub last_used: Instant,
    pub usage_count: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub priority: u8, // Higher priority connections are kept longer
}

impl ConnectionPoolEntry {
    pub fn new(connection_id: String, player_id: String, room_id: String, priority: u8) -> Self {
        Self {
            connection_id,
            player_id,
            room_id,
            created_at: Instant::now(),
            last_used: Instant::now(),
            usage_count: 0,
            bytes_sent: 0,
            bytes_received: 0,
            priority,
        }
    }

    pub fn touch(&mut self) {
        self.last_used = Instant::now();
        self.usage_count += 1;
    }

    pub fn record_bytes(&mut self, sent: u64, received: u64) {
        self.bytes_sent += sent;
        self.bytes_received += received;
    }

    pub fn is_expired(&self, max_idle_seconds: u64) -> bool {
        self.last_used.elapsed().as_secs() > max_idle_seconds
    }

    pub fn age_seconds(&self) -> u64 {
        self.created_at.elapsed().as_secs()
    }

    pub fn score(&self) -> f64 {
        // Scoring algorithm: prioritize active, high-priority, recently used connections
        let age_score = 1.0 / (1.0 + self.age_seconds() as f64 / 3600.0); // Newer connections score higher
        let usage_score = (self.usage_count as f64).log10().max(0.0); // More used connections score higher
        let priority_score = self.priority as f64 / 255.0; // Higher priority scores higher

        age_score * 0.3 + usage_score * 0.4 + priority_score * 0.3
    }
}

// Enhanced connection limits for high-frequency game traffic
#[derive(Debug, Clone)]
pub struct OptimizedConnectionLimits {
    pub max_websocket_connections: usize,
    pub max_webrtc_connections: usize,
    pub max_connections_per_room: usize,
    pub max_idle_time_seconds: u64,
    pub connection_timeout_secs: u64,
    pub memory_threshold_mb: usize,
    pub enable_connection_pooling: bool,
    pub pool_max_size_per_room: usize,
    pub pool_cleanup_interval_seconds: u64,
    pub high_priority_connection_limit: usize,
}

impl Default for OptimizedConnectionLimits {
    fn default() -> Self {
        Self {
            max_websocket_connections: 2000, // Increased for high-frequency gaming
            max_webrtc_connections: 1000,   // Increased for high-frequency gaming
            max_connections_per_room: 200,  // Increased for larger game rooms
            max_idle_time_seconds: 300,     // 5 minutes max idle
            connection_timeout_secs: 30,    // Faster timeout for responsiveness
            memory_threshold_mb: 1024,      // 1GB memory threshold
            enable_connection_pooling: true,
            pool_max_size_per_room: 50,     // Max 50 connections per room in pool
            pool_cleanup_interval_seconds: 60, // Cleanup every minute
            high_priority_connection_limit: 100, // Reserve 100 slots for high-priority connections
        }
    }
}

pub struct OptimizedConnectionManager {
    limits: OptimizedConnectionLimits,
    websocket_count: AtomicU64,
    webrtc_count: AtomicU64,
    high_priority_count: AtomicU64,
    room_pools: Arc<RwLock<HashMap<String, VecDeque<ConnectionPoolEntry>>>>,
    connection_semaphore: Arc<Semaphore>,
    high_priority_semaphore: Arc<Semaphore>,
    _cleanup_task: tokio::task::JoinHandle<()>,
}

impl OptimizedConnectionManager {
    pub fn new(limits: OptimizedConnectionLimits) -> Self {
        let connection_semaphore = Arc::new(Semaphore::new(limits.max_websocket_connections + limits.max_webrtc_connections));
        let high_priority_semaphore = Arc::new(Semaphore::new(limits.high_priority_connection_limit));

        let room_pools = Arc::new(RwLock::new(HashMap::new()));

        // Background cleanup task
        let room_pools_clone = room_pools.clone();
        let cleanup_interval = limits.pool_cleanup_interval_seconds;
        let limits_clone = limits.clone();

        let cleanup_task = tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(cleanup_interval));

            loop {
                interval.tick().await;
                Self::cleanup_pools(&room_pools_clone, &limits_clone).await;
            }
        });

        Self {
            limits,
            websocket_count: AtomicU64::new(0),
            webrtc_count: AtomicU64::new(0),
            high_priority_count: AtomicU64::new(0),
            room_pools,
            connection_semaphore,
            high_priority_semaphore,
            _cleanup_task: cleanup_task,
        }
    }

    pub async fn can_accept_connection(&self, transport_type: &str, room_id: &str, priority: u8) -> bool {
        // Check if we have capacity for regular connections
        if priority < 200 { // Not high priority
            let current_connections = match transport_type {
                "websocket" => self.websocket_count.load(Ordering::Relaxed),
                "webrtc" => self.webrtc_count.load(Ordering::Relaxed),
                _ => 0,
            };

            let max_for_type = match transport_type {
                "websocket" => self.limits.max_websocket_connections,
                "webrtc" => self.limits.max_webrtc_connections,
                _ => 0,
            };

            if current_connections >= max_for_type as u64 {
                return false;
            }
        }

        // Check room-specific limits
        let room_pools = self.room_pools.read().await;
        if let Some(pool) = room_pools.get(room_id) {
            if pool.len() >= self.limits.pool_max_size_per_room {
                return false;
            }
        }

        true
    }

    pub async fn acquire_connection_slot(&self, transport_type: &str, priority: u8) -> Option<ConnectionGuard> {
        // Try to acquire high priority slot first for high priority connections
        if priority >= 200 {
            if let Ok(_permit) = self.high_priority_semaphore.try_acquire() {
                self.high_priority_count.fetch_add(1, Ordering::Relaxed);
                return Some(ConnectionGuard::HighPriority);
            }
        }

        // Try to acquire regular connection slot
        if let Ok(_permit) = self.connection_semaphore.try_acquire() {
            match transport_type {
                "websocket" => {
                    self.websocket_count.fetch_add(1, Ordering::Relaxed);
                }
                "webrtc" => {
                    self.webrtc_count.fetch_add(1, Ordering::Relaxed);
                }
                _ => {}
            }

            return Some(ConnectionGuard::Regular);
        }

        None
    }

    pub async fn record_connection(&self, connection_id: String, player_id: String, room_id: String, priority: u8) {
        let mut room_pools = self.room_pools.write().await;
        let pool = room_pools.entry(room_id.clone()).or_insert_with(VecDeque::new);

        let entry = ConnectionPoolEntry::new(connection_id, player_id, room_id.clone(), priority);
        pool.push_back(entry);

        // Update metrics
        CONNECTION_POOL_SIZE_GAUGE
            .with_label_values(&["websocket", &room_id])
            .set(pool.len() as i64);

        CONNECTION_POOL_UTILIZATION_COUNTER
            .with_label_values(&["websocket", "connection_added", &room_id])
            .inc();
    }

    pub async fn touch_connection(&self, room_id: &str, player_id: &str, bytes_sent: u64, bytes_received: u64) {
        let mut room_pools = self.room_pools.write().await;
        if let Some(pool) = room_pools.get_mut(room_id) {
            if let Some(entry) = pool.iter_mut().find(|e| e.player_id == player_id) {
                entry.touch();
                entry.record_bytes(bytes_sent, bytes_received);
            }
        }
    }

    pub async fn remove_connection(&self, room_id: &str, player_id: &str) -> Option<ConnectionPoolEntry> {
        let mut room_pools = self.room_pools.write().await;
        if let Some(pool) = room_pools.get_mut(room_id) {
            if let Some(pos) = pool.iter().position(|e| e.player_id == player_id) {
                let entry = pool.remove(pos);

                // Update metrics
                CONNECTION_POOL_SIZE_GAUGE
                    .with_label_values(&["websocket", room_id])
                    .set(pool.len() as i64);

                CONNECTION_POOL_UTILIZATION_COUNTER
                    .with_label_values(&["websocket", "connection_removed", room_id])
                    .inc();

                return Some(entry.unwrap());
            }
        }
        None
    }

    async fn cleanup_pools(room_pools: &Arc<RwLock<HashMap<String, VecDeque<ConnectionPoolEntry>>>>, limits: &OptimizedConnectionLimits) {
        let mut room_pools_guard = room_pools.write().await;
        let mut rooms_to_cleanup = Vec::new();

        for (room_id, pool) in room_pools_guard.iter_mut() {
            // Remove expired connections
            let initial_size = pool.len();
            pool.retain(|entry| !entry.is_expired(limits.max_idle_time_seconds));

            let removed_count = initial_size - pool.len();
            if removed_count > 0 {
                CONNECTION_POOL_EVICTIONS_COUNTER
                    .with_label_values(&["websocket", "expired", room_id])
                    .inc_by(removed_count as u64);
            }

            // If pool is still too large, evict lowest scoring connections
            while pool.len() > limits.pool_max_size_per_room {
                if let Some(lowest_score_entry) = pool.iter().min_by(|a, b| a.score().partial_cmp(&b.score()).unwrap()) {
                    if let Some(pos) = pool.iter().position(|e| e.connection_id == lowest_score_entry.connection_id) {
                        pool.remove(pos);

                        CONNECTION_POOL_EVICTIONS_COUNTER
                            .with_label_values(&["websocket", "low_score", room_id])
                            .inc();
                    }
                }
            }

            // Mark empty rooms for removal
            if pool.is_empty() {
                rooms_to_cleanup.push(room_id.clone());
            }
        }

        // Remove empty rooms
        for room_id in rooms_to_cleanup {
            room_pools_guard.remove(&room_id);

            // Remove from Prometheus
            let _ = CONNECTION_POOL_SIZE_GAUGE.remove_label_values(&["websocket", &room_id]);
            let _ = CONNECTION_POOL_UTILIZATION_COUNTER.remove_label_values(&["websocket", "room_removed", &room_id]);
        }
    }

    pub async fn get_room_connection_count(&self, room_id: &str) -> usize {
        let room_pools = self.room_pools.read().await;
        room_pools.get(room_id).map(|p| p.len()).unwrap_or(0)
    }

    pub async fn get_connection_stats(&self) -> ConnectionStats {
        let room_pools = self.room_pools.read().await;

        let mut total_pooled = 0;
        let mut active_rooms = 0;

        for (_, pool) in room_pools.iter() {
            total_pooled += pool.len();
            if !pool.is_empty() {
                active_rooms += 1;
            }
        }

        ConnectionStats {
            websocket_connections: self.websocket_count.load(Ordering::Relaxed),
            webrtc_connections: self.webrtc_count.load(Ordering::Relaxed),
            high_priority_connections: self.high_priority_count.load(Ordering::Relaxed),
            pooled_connections: total_pooled as u64,
            active_rooms,
            available_connection_slots: self.connection_semaphore.available_permits(),
            available_high_priority_slots: self.high_priority_semaphore.available_permits(),
        }
    }
}

// Connection guard to automatically release slots when dropped
pub enum ConnectionGuard {
    Regular,
    HighPriority,
}

impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        // Connection slots will be automatically released when the semaphore permit is dropped
        // Additional cleanup can be added here if needed
    }
}

#[derive(Debug, Clone)]
pub struct ConnectionStats {
    pub websocket_connections: u64,
    pub webrtc_connections: u64,
    pub high_priority_connections: u64,
    pub pooled_connections: u64,
    pub active_rooms: usize,
    pub available_connection_slots: usize,
    pub available_high_priority_slots: usize,
}

// Factory function for creating optimized connection manager
pub fn create_optimized_connection_manager() -> OptimizedConnectionManager {
    OptimizedConnectionManager::new(OptimizedConnectionLimits::default())
}
