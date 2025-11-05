use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

use crate::state_sync::StateSyncPerformanceStats;

/// Performance dashboard tổng hợp tất cả metrics từ game system
pub struct PerformanceDashboard {
    /// Game metrics từ gateway (sử dụng concrete type thay vì trait object)
    pub game_metrics: Option<Arc<MockGameMetricsProvider>>,
    /// State sync performance từ worker
    pub state_sync_stats: Arc<RwLock<Option<StateSyncPerformanceStats>>>,
    /// Dashboard configuration
    pub config: DashboardConfig,
    /// Last update time
    pub last_update: Instant,
}

impl PerformanceDashboard {
    pub fn new() -> Self {
        Self {
            game_metrics: None,
            state_sync_stats: Arc::new(RwLock::new(None)),
            config: DashboardConfig::default(),
            last_update: Instant::now(),
        }
    }

    /// Set game metrics provider (từ gateway)
    pub fn set_game_metrics_provider(&mut self, provider: Arc<MockGameMetricsProvider>) {
        self.game_metrics = Some(provider);
    }

    /// Update state sync performance stats
    pub async fn update_state_sync_stats(&self, stats: StateSyncPerformanceStats) {
        let mut current = self.state_sync_stats.write().await;
        *current = Some(stats);
    }

    /// Generate comprehensive performance report
    pub async fn generate_report(&self) -> PerformanceReport {
        let state_sync_stats = self.state_sync_stats.read().await.clone();
        let game_metrics_report = if let Some(provider) = &self.game_metrics {
            provider.get_game_performance_report().await
        } else {
            None
        };

        PerformanceReport {
            timestamp: chrono::Utc::now(),
            state_sync_stats,
            game_metrics_report,
            dashboard_uptime: self.last_update.elapsed(),
            health_status: self.calculate_health_status().await,
        }
    }

    /// Calculate overall system health
    async fn calculate_health_status(&self) -> SystemHealth {
        let mut issues = Vec::new();
        let mut warnings = Vec::new();

        // Check state sync performance
        if let Some(stats) = self.state_sync_stats.read().await.as_ref() {
            // Check frame time
            if stats.frame_time_stats.average_ms > 50 {
                issues.push("High average frame time".to_string());
            } else if stats.frame_time_stats.average_ms > 33 {
                warnings.push("Elevated frame time".to_string());
            }

            if stats.frame_time_stats.p99_ms > 100 {
                issues.push("High 99th percentile frame time".to_string());
            }

            // Check error rates
            if stats.performance_stats.total_errors > 100 {
                issues.push("High error count".to_string());
            } else if stats.performance_stats.total_errors > 10 {
                warnings.push("Elevated error count".to_string());
            }
        }

        // Check game metrics if available
        if let Some(provider) = &self.game_metrics {
            let report = provider.get_game_performance_report().await;
            if let Some(game_report) = report {
                if game_report.average_latency_ms > 100 {
                    issues.push("High average latency".to_string());
                } else if game_report.average_latency_ms > 50 {
                    warnings.push("Elevated latency".to_string());
                }
            }
        }

        let status = if issues.is_empty() && warnings.is_empty() {
            HealthStatus::Healthy
        } else if issues.is_empty() {
            HealthStatus::Warning
        } else {
            HealthStatus::Critical
        };

        SystemHealth {
            status,
            issues,
            warnings,
            last_check: Instant::now(),
        }
    }

    /// Get real-time metrics for monitoring
    pub async fn get_realtime_metrics(&self) -> RealtimeMetrics {
        let state_sync_stats = self.state_sync_stats.read().await.clone();

        RealtimeMetrics {
            frame_time_ms: state_sync_stats.as_ref()
                .map(|s| s.frame_time_stats.average_ms)
                .unwrap_or(0),
            bandwidth_bps: state_sync_stats.as_ref()
                .map(|s| (s.bandwidth_report.bandwidth_per_second * 8.0) as u64)
                .unwrap_or(0),
            active_players: if let Some(provider) = &self.game_metrics {
                provider.total_players
            } else {
                0
            },
            error_rate: state_sync_stats.as_ref()
                .map(|s| s.performance_stats.total_errors)
                .unwrap_or(0),
            latency_ms: if let Some(provider) = &self.game_metrics {
                provider.average_latency
            } else {
                0
            },
        }
    }

    /// Export metrics cho Prometheus hoặc external monitoring
    pub async fn export_prometheus_metrics(&self) -> String {
        let mut output = String::new();

        if let Some(stats) = self.state_sync_stats.read().await.as_ref() {
            // Frame time metrics
            output.push_str(&format!(
                "# HELP game_frame_time_ms Average frame time in milliseconds\n\
                 # TYPE game_frame_time_ms gauge\n\
                 game_frame_time_ms {}\n",
                stats.frame_time_stats.average_ms
            ));

            // Bandwidth metrics
            output.push_str(&format!(
                "# HELP game_bandwidth_bps Bandwidth usage in bits per second\n\
                 # TYPE game_bandwidth_bps gauge\n\
                 game_bandwidth_bps {}\n",
                (stats.bandwidth_report.bandwidth_per_second * 8.0) as u64
            ));

            // State sync metrics
            output.push_str(&format!(
                "# HELP game_state_history_size Number of states in history\n\
                 # TYPE game_state_history_size gauge\n\
                 game_state_history_size {}\n",
                stats.state_history_size
            ));
        }

        output
    }
}

impl Default for PerformanceDashboard {
    fn default() -> Self {
        Self::new()
    }
}

/// Configuration cho performance dashboard
#[derive(Debug, Clone)]
pub struct DashboardConfig {
    /// Update interval cho metrics (seconds)
    pub update_interval_secs: u64,
    /// Enable detailed logging
    pub enable_detailed_logging: bool,
    /// Alert thresholds
    pub alert_thresholds: AlertThresholds,
}

impl Default for DashboardConfig {
    fn default() -> Self {
        Self {
            update_interval_secs: 10,
            enable_detailed_logging: false,
            alert_thresholds: AlertThresholds::default(),
        }
    }
}

/// Alert thresholds cho performance monitoring
#[derive(Debug, Clone)]
pub struct AlertThresholds {
    pub max_frame_time_ms: u64,
    pub max_latency_ms: u64,
    pub max_error_rate: u64,
    pub min_bandwidth_threshold_bps: u64,
}

impl Default for AlertThresholds {
    fn default() -> Self {
        Self {
            max_frame_time_ms: 50,
            max_latency_ms: 100,
            max_error_rate: 10,
            min_bandwidth_threshold_bps: 1000,
        }
    }
}

/// System health status
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Critical,
}

impl std::fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HealthStatus::Healthy => write!(f, "healthy"),
            HealthStatus::Warning => write!(f, "warning"),
            HealthStatus::Critical => write!(f, "critical"),
        }
    }
}

/// System health information
#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemHealth {
    pub status: HealthStatus,
    pub issues: Vec<String>,
    pub warnings: Vec<String>,
    #[serde(skip)] pub last_check: Instant,
}

/// Comprehensive performance report
#[derive(Debug, Clone, serde::Serialize)]
pub struct PerformanceReport {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub state_sync_stats: Option<StateSyncPerformanceStats>,
    pub game_metrics_report: Option<GamePerformanceReport>,
    pub dashboard_uptime: Duration,
    pub health_status: SystemHealth,
}

impl PerformanceReport {
    /// Generate JSON representation
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Generate summary text
    pub fn to_summary(&self) -> String {
        let mut summary = String::new();

        summary.push_str(&format!("Performance Report - {}\n", self.timestamp));
        summary.push_str(&format!("Health: {}\n", self.health_status.status));

        if let Some(ref stats) = self.state_sync_stats {
            summary.push_str(&format!(
                "Frame Time: {}ms avg, {}ms p99\n",
                stats.frame_time_stats.average_ms,
                stats.frame_time_stats.p99_ms
            ));
            summary.push_str(&format!(
                "Bandwidth: {:.2} KB/s\n",
                stats.bandwidth_report.bandwidth_per_second / 1024.0
            ));
        }

        if let Some(ref game_report) = self.game_metrics_report {
            summary.push_str(&format!(
                "Players: {}, Latency: {}ms avg\n",
                game_report.total_players,
                game_report.average_latency_ms
            ));
        }

        summary
    }
}

/// Real-time metrics cho monitoring dashboards
#[derive(Debug, Clone)]
pub struct RealtimeMetrics {
    pub frame_time_ms: u64,
    pub bandwidth_bps: u64,
    pub active_players: u32,
    pub error_rate: u64,
    pub latency_ms: u64,
}

/// Game performance report từ gateway metrics
#[derive(Debug, Clone, serde::Serialize)]
pub struct GamePerformanceReport {
    pub total_rooms: usize,
    pub total_players: u32,
    pub total_messages: u64,
    pub total_bandwidth: u64,
    pub average_latency_ms: u64,
    pub room_details: Vec<RoomStats>,
}

/// Room statistics từ gateway
#[derive(Debug, Clone, serde::Serialize)]
pub struct RoomStats {
    pub room_id: String,
    pub active_players: u32,
    pub total_messages: u64,
    pub total_bandwidth: u64,
    pub average_latency_ms: u64,
    #[serde(skip)] pub created_at: Instant,
    #[serde(skip)] pub last_activity: Instant,
}


/// Mock game metrics provider để testing
pub struct MockGameMetricsProvider {
    pub total_players: u32,
    pub average_latency: u64,
    pub total_rooms: usize,
}

impl MockGameMetricsProvider {
    pub fn new(total_players: u32, average_latency: u64) -> Self {
        Self {
            total_players,
            average_latency,
            total_rooms: 3,
        }
    }
}

impl MockGameMetricsProvider {
    pub async fn get_game_performance_report(&self) -> Option<GamePerformanceReport> {
        Some(GamePerformanceReport {
            total_rooms: self.total_rooms,
            total_players: self.total_players,
            total_messages: 1000,
            total_bandwidth: 50000,
            average_latency_ms: self.average_latency,
            room_details: vec![
                RoomStats {
                    room_id: "room1".to_string(),
                    active_players: 2,
                    total_messages: 300,
                    total_bandwidth: 15000,
                    average_latency_ms: 45,
                    created_at: Instant::now(),
                    last_activity: Instant::now(),
                },
                RoomStats {
                    room_id: "room2".to_string(),
                    active_players: 1,
                    total_messages: 200,
                    total_bandwidth: 10000,
                    average_latency_ms: 55,
                    created_at: Instant::now(),
                    last_activity: Instant::now(),
                },
            ],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state_sync::{FrameTimeStats, PerformanceStats, BandwidthReport, StateSyncPerformanceStats};

    #[tokio::test]
    async fn test_performance_dashboard_basic() {
        let mut dashboard = PerformanceDashboard::new();

        // Set mock game metrics provider
        let mock_provider = Arc::new(MockGameMetricsProvider::new(5, 50));
        dashboard.set_game_metrics_provider(mock_provider);

        // Create mock state sync stats
        let state_sync_stats = StateSyncPerformanceStats {
            frame_time_stats: FrameTimeStats {
                average_ms: 16,
                variance: 2.5,
                p90_ms: 20,
                p99_ms: 25,
                current_frame_count: 1000,
            },
            performance_stats: PerformanceStats {
                average_sync_time_ms: 15,
                total_messages: 500,
                total_errors: 2,
                message_breakdown: [("state_update".to_string(), 400), ("reconcile".to_string(), 100)].iter().cloned().collect(),
                error_breakdown: [("validation_error".to_string(), 2)].iter().cloned().collect(),
            },
            bandwidth_report: BandwidthReport {
                total_state_bytes_sent: 25000,
                total_reconciliation_bytes_sent: 5000,
                total_ack_bytes_sent: 1000,
                total_prediction_bytes_received: 15000,
                message_bandwidth: [("state_update".to_string(), 25000), ("reconcile".to_string(), 5000)].iter().cloned().collect(),
                bandwidth_per_second: 5000.0,
                elapsed_seconds: 10.0,
            },
            current_tick: 1000,
            active_client_states: 3,
            state_history_size: 50,
        };

        // Update dashboard với state sync stats
        dashboard.update_state_sync_stats(state_sync_stats).await;

        // Generate report
        let report = dashboard.generate_report().await;

        // Verify report
        assert!(report.timestamp > chrono::Utc::now() - chrono::Duration::seconds(1));
        assert!(report.health_status.status == HealthStatus::Healthy);

        // Check state sync stats
        assert!(report.state_sync_stats.is_some());
        let stats = report.state_sync_stats.unwrap();
        assert_eq!(stats.frame_time_stats.average_ms, 16);
        assert_eq!(stats.performance_stats.total_messages, 500);

        // Check game metrics
        assert!(report.game_metrics_report.is_some());
        let game_report = report.game_metrics_report.unwrap();
        assert_eq!(game_report.total_players, 5);
        assert_eq!(game_report.average_latency_ms, 50);
    }

    #[tokio::test]
    async fn test_performance_dashboard_health_warnings() {
        let mut dashboard = PerformanceDashboard::new();

        // Create stats với high frame time (should trigger warning)
        let state_sync_stats = StateSyncPerformanceStats {
            frame_time_stats: FrameTimeStats {
                average_ms: 45, // Above 33ms threshold
                variance: 5.0,
                p90_ms: 60,
                p99_ms: 80,
                current_frame_count: 1000,
            },
            performance_stats: PerformanceStats {
                average_sync_time_ms: 15,
                total_messages: 500,
                total_errors: 5, // Above 2 error threshold
                message_breakdown: [("state_update".to_string(), 400)].iter().cloned().collect(),
                error_breakdown: [("timeout".to_string(), 5)].iter().cloned().collect(),
            },
            bandwidth_report: BandwidthReport {
                total_state_bytes_sent: 25000,
                total_reconciliation_bytes_sent: 5000,
                total_ack_bytes_sent: 1000,
                total_prediction_bytes_received: 15000,
                message_bandwidth: [("state_update".to_string(), 25000)].iter().cloned().collect(),
                bandwidth_per_second: 5000.0,
                elapsed_seconds: 10.0,
            },
            current_tick: 1000,
            active_client_states: 3,
            state_history_size: 50,
        };

        dashboard.update_state_sync_stats(state_sync_stats).await;
        let report = dashboard.generate_report().await;

        // Should have warnings for high frame time and error count
        assert!(report.health_status.warnings.len() > 0 || report.health_status.issues.len() > 0);
    }

    #[tokio::test]
    async fn test_realtime_metrics() {
        let mut dashboard = PerformanceDashboard::new();
        let mock_provider = Arc::new(MockGameMetricsProvider::new(3, 75));
        dashboard.set_game_metrics_provider(mock_provider);

        let state_sync_stats = StateSyncPerformanceStats {
            frame_time_stats: FrameTimeStats {
                average_ms: 20,
                variance: 3.0,
                p90_ms: 25,
                p99_ms: 30,
                current_frame_count: 1000,
            },
            performance_stats: PerformanceStats {
                average_sync_time_ms: 18,
                total_messages: 300,
                total_errors: 1,
                message_breakdown: HashMap::new(),
                error_breakdown: HashMap::new(),
            },
            bandwidth_report: BandwidthReport {
                total_state_bytes_sent: 15000,
                total_reconciliation_bytes_sent: 3000,
                total_ack_bytes_sent: 500,
                total_prediction_bytes_received: 8000,
                message_bandwidth: HashMap::new(),
                bandwidth_per_second: 3000.0,
                elapsed_seconds: 10.0,
            },
            current_tick: 500,
            active_client_states: 2,
            state_history_size: 25,
        };

        dashboard.update_state_sync_stats(state_sync_stats).await;

        let metrics = dashboard.get_realtime_metrics().await;

        assert_eq!(metrics.frame_time_ms, 20);
        assert_eq!(metrics.bandwidth_bps, 24000); // 3000 bytes/sec * 8 bits
        assert_eq!(metrics.active_players, 3);
        assert_eq!(metrics.error_rate, 1);
        assert_eq!(metrics.latency_ms, 75);
    }

    #[tokio::test]
    async fn test_prometheus_export() {
        let mut dashboard = PerformanceDashboard::new();

        let state_sync_stats = StateSyncPerformanceStats {
            frame_time_stats: FrameTimeStats {
                average_ms: 25,
                variance: 4.0,
                p90_ms: 35,
                p99_ms: 45,
                current_frame_count: 500,
            },
            performance_stats: PerformanceStats {
                average_sync_time_ms: 22,
                total_messages: 200,
                total_errors: 0,
                message_breakdown: HashMap::new(),
                error_breakdown: HashMap::new(),
            },
            bandwidth_report: BandwidthReport {
                total_state_bytes_sent: 10000,
                total_reconciliation_bytes_sent: 2000,
                total_ack_bytes_sent: 300,
                total_prediction_bytes_received: 5000,
                message_bandwidth: HashMap::new(),
                bandwidth_per_second: 2000.0,
                elapsed_seconds: 10.0,
            },
            current_tick: 300,
            active_client_states: 1,
            state_history_size: 15,
        };

        dashboard.update_state_sync_stats(state_sync_stats).await;

        let prometheus_output = dashboard.export_prometheus_metrics().await;

        // Verify Prometheus format
        assert!(prometheus_output.contains("# HELP game_frame_time_ms"));
        assert!(prometheus_output.contains("# TYPE game_frame_time_ms gauge"));
        assert!(prometheus_output.contains("game_frame_time_ms 25"));
        assert!(prometheus_output.contains("# HELP game_bandwidth_bps"));
        assert!(prometheus_output.contains("game_bandwidth_bps 16000")); // 2000 bytes/sec * 8
        assert!(prometheus_output.contains("# HELP game_state_history_size"));
        assert!(prometheus_output.contains("game_state_history_size 15"));
    }
}
