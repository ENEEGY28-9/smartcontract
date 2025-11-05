use std::{
    collections::HashMap,
    sync::{atomic::{AtomicU64, Ordering}, Arc},
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tracing::{info, warn};

#[cfg(target_os = "linux")]
extern crate libc;

/// Connection limits configuration
#[derive(Debug, Clone)]
pub struct ConnectionLimits {
    /// Maximum number of concurrent WebSocket connections
    pub max_websocket_connections: usize,
    /// Maximum number of concurrent WebRTC connections
    pub max_webrtc_connections: usize,
    /// Maximum number of connections per room
    pub max_connections_per_room: usize,
    /// Connection timeout in seconds
    pub connection_timeout_secs: u64,
    /// Memory threshold for cleanup (in MB)
    pub memory_threshold_mb: usize,
}

impl Default for ConnectionLimits {
    fn default() -> Self {
        Self {
            max_websocket_connections: 1000,
            max_webrtc_connections: 500,
            max_connections_per_room: 100,
            connection_timeout_secs: 300, // 5 minutes
            memory_threshold_mb: 512, // 512MB
        }
    }
}

/// Memory usage tracker
#[derive(Debug)]
pub struct MemoryTracker {
    /// Current memory usage in bytes
    pub current_usage: AtomicU64,
    /// Peak memory usage in bytes
    pub peak_usage: AtomicU64,
    /// Memory allocation count
    pub allocations: AtomicU64,
    /// Memory deallocation count
    pub deallocations: AtomicU64,
    /// Last cleanup time
    pub last_cleanup: RwLock<Option<Instant>>,
}

impl MemoryTracker {
    pub fn new() -> Self {
        Self {
            current_usage: AtomicU64::new(0),
            peak_usage: AtomicU64::new(0),
            allocations: AtomicU64::new(0),
            deallocations: AtomicU64::new(0),
            last_cleanup: RwLock::new(None),
        }
    }

    /// Record memory allocation
    pub fn record_allocation(&self, bytes: u64) {
        let current = self.current_usage.fetch_add(bytes, Ordering::Relaxed);
        let new_usage = current + bytes;

        // Update peak usage
        loop {
            let peak = self.peak_usage.load(Ordering::Relaxed);
            if new_usage > peak && self.peak_usage.compare_exchange_weak(peak, new_usage, Ordering::Relaxed, Ordering::Relaxed).is_ok() {
                break;
            }
        }

        self.allocations.fetch_add(1, Ordering::Relaxed);
    }

    /// Record memory deallocation
    pub fn record_deallocation(&self, bytes: u64) {
        let current = self.current_usage.fetch_sub(bytes, Ordering::Relaxed);
        self.deallocations.fetch_add(1, Ordering::Relaxed);

        if current < bytes {
            warn!("Memory usage went negative: {} - {}", current, bytes);
        }
    }

    /// Get current memory usage in MB
    pub fn get_usage_mb(&self) -> u64 {
        self.current_usage.load(Ordering::Relaxed) / (1024 * 1024)
    }

    /// Check if memory usage exceeds threshold
    pub fn should_cleanup(&self, threshold_mb: usize) -> bool {
        self.get_usage_mb() > threshold_mb as u64
    }
}

/// Connection manager with limits and monitoring
#[derive(Debug)]
pub struct ConnectionManager {
    /// Connection limits configuration
    pub limits: ConnectionLimits,
    /// Current WebSocket connections
    pub websocket_count: AtomicU64,
    /// Current WebRTC connections
    pub webrtc_count: AtomicU64,
    /// Connections per room
    pub room_connections: Arc<RwLock<HashMap<String, u64>>>,
    /// Memory tracker
    pub memory_tracker: Arc<MemoryTracker>,
}

impl ConnectionManager {
    pub fn new(limits: ConnectionLimits) -> Self {
        Self {
            limits,
            websocket_count: AtomicU64::new(0),
            webrtc_count: AtomicU64::new(0),
            room_connections: Arc::new(RwLock::new(HashMap::new())),
            memory_tracker: Arc::new(MemoryTracker::new()),
        }
    }

    /// Check if new WebSocket connection is allowed
    pub fn can_accept_websocket(&self) -> bool {
        let current = self.websocket_count.load(Ordering::Relaxed);
        current < self.limits.max_websocket_connections as u64
    }

    /// Check if new WebRTC connection is allowed
    pub fn can_accept_webrtc(&self) -> bool {
        let current = self.webrtc_count.load(Ordering::Relaxed);
        current < self.limits.max_webrtc_connections as u64
    }

    /// Check if room can accept more connections
    pub fn can_accept_room_connection(&self, _room_id: &str) -> bool {
        // This would need async access to room_connections in real implementation
        // For now, return true (implement proper logic later)
        true
    }

    /// Record new WebSocket connection
    pub fn record_websocket_connection(&self) {
        self.websocket_count.fetch_add(1, Ordering::Relaxed);
        info!("WebSocket connections: {}", self.websocket_count.load(Ordering::Relaxed));
    }

    /// Record WebSocket disconnection
    pub fn record_websocket_disconnection(&self) {
        let count = self.websocket_count.fetch_sub(1, Ordering::Relaxed);
        if count > 0 {
            info!("WebSocket connections: {}", count - 1);
        }
    }

    /// Record new WebRTC connection
    pub fn record_webrtc_connection(&self) {
        self.webrtc_count.fetch_add(1, Ordering::Relaxed);
        info!("WebRTC connections: {}", self.webrtc_count.load(Ordering::Relaxed));
    }

    /// Record WebRTC disconnection
    pub fn record_webrtc_disconnection(&self) {
        let count = self.webrtc_count.fetch_sub(1, Ordering::Relaxed);
        if count > 0 {
            info!("WebRTC connections: {}", count - 1);
        }
    }

    /// Record room connection
    pub async fn record_room_connection(&self, room_id: String) {
        let mut room_connections = self.room_connections.write().await;
        let count = room_connections.entry(room_id).or_insert(0);
        *count += 1;
    }

    /// Record room disconnection
    pub async fn record_room_disconnection(&self, room_id: String) {
        let mut room_connections = self.room_connections.write().await;
        if let Some(count) = room_connections.get_mut(&room_id) {
            *count -= 1;
            if *count == 0 {
                room_connections.remove(&room_id);
            }
        }
    }

    /// Get memory usage statistics
    pub fn get_memory_stats(&self) -> MemoryStats {
        MemoryStats {
            current_mb: self.memory_tracker.get_usage_mb(),
            peak_mb: self.memory_tracker.peak_usage.load(Ordering::Relaxed) / (1024 * 1024),
            allocations: self.memory_tracker.allocations.load(Ordering::Relaxed),
            deallocations: self.memory_tracker.deallocations.load(Ordering::Relaxed),
        }
    }

    /// Perform memory cleanup if needed
    pub async fn perform_cleanup_if_needed(&self) {
        if self.memory_tracker.should_cleanup(self.limits.memory_threshold_mb) {
            info!("Performing memory cleanup due to high usage");
            self.perform_cleanup().await;
        }
    }

    /// Force memory cleanup
    pub async fn perform_cleanup(&self) {
        // Clear room connections that have been inactive for too long
        let _room_connections = self.room_connections.write().await;
        let now = Instant::now();

        // In a real implementation, you would check last activity time
        // For now, just log the cleanup
        info!("Memory cleanup completed. Current usage: {}MB", self.memory_tracker.get_usage_mb());

        let mut last_cleanup = self.memory_tracker.last_cleanup.write().await;
        *last_cleanup = Some(now);
    }

    /// Get comprehensive connection statistics
    pub fn get_connection_stats(&self) -> ConnectionStats {
        ConnectionStats {
            websocket_connections: self.websocket_count.load(Ordering::Relaxed),
            webrtc_connections: self.webrtc_count.load(Ordering::Relaxed),
            memory: self.get_memory_stats(),
        }
    }
}

/// Memory usage statistics
#[derive(Debug, Clone)]
pub struct MemoryStats {
    pub current_mb: u64,
    pub peak_mb: u64,
    pub allocations: u64,
    pub deallocations: u64,
}

/// Connection statistics
#[derive(Debug, Clone)]
pub struct ConnectionStats {
    pub websocket_connections: u64,
    pub webrtc_connections: u64,
    pub memory: MemoryStats,
}

/// Memory profiling utilities
pub struct MemoryProfiler;

impl MemoryProfiler {
    /// Get system memory information (Linux only)
    pub fn get_system_memory_info() -> Result<SystemMemoryInfo, Box<dyn std::error::Error>> {
        #[cfg(target_os = "linux")]
        {
            let mut info = std::mem::MaybeUninit::<libc::sysinfo>::uninit();
            unsafe {
                if libc::sysinfo(info.as_mut_ptr()) == 0 {
                    let info = info.assume_init();
                    Ok(SystemMemoryInfo {
                        total_memory: info.totalram as u64 * info.mem_unit as u64,
                        free_memory: info.freeram as u64 * info.mem_unit as u64,
                        shared_memory: info.sharedram as u64 * info.mem_unit as u64,
                        buffer_memory: info.bufferram as u64 * info.mem_unit as u64,
                        total_swap: info.totalswap as u64 * info.mem_unit as u64,
                        free_swap: info.freeswap as u64 * info.mem_unit as u64,
                    })
                } else {
                    Err("Failed to get system memory info".into())
                }
            }
        }
        #[cfg(not(target_os = "linux"))]
        {
            Err("System memory info not supported on this platform".into())
        }
    }

    /// Log memory usage periodically
    pub async fn start_memory_monitoring(connection_manager: Arc<ConnectionManager>) {
        let mut interval = tokio::time::interval(Duration::from_secs(30));

        tokio::spawn(async move {
            loop {
                interval.tick().await;

                let stats = connection_manager.get_connection_stats();
                info!(
                    "Memory usage: {}MB (peak: {}MB), WebSocket: {}, WebRTC: {}",
                    stats.memory.current_mb,
                    stats.memory.peak_mb,
                    stats.websocket_connections,
                    stats.webrtc_connections
                );

                // Perform cleanup if needed
                connection_manager.perform_cleanup_if_needed().await;
            }
        });
    }
}

/// System memory information
#[derive(Debug, Clone)]
pub struct SystemMemoryInfo {
    pub total_memory: u64,
    pub free_memory: u64,
    pub shared_memory: u64,
    pub buffer_memory: u64,
    pub total_swap: u64,
    pub free_swap: u64,
}

#[cfg(target_os = "linux")]
extern "C" {
    fn sysinfo(info: *mut libc::sysinfo) -> libc::c_int;
}








