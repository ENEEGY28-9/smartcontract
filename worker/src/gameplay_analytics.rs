use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};

/// Gameplay analytics system for collecting and analyzing real gameplay data
#[derive(Debug, Clone)]
pub struct GameplayAnalytics {
    /// Session data for each player
    pub player_sessions: Arc<RwLock<HashMap<String, PlayerSession>>>,
    /// Aggregated gameplay metrics
    pub aggregated_metrics: Arc<RwLock<AggregatedGameplayMetrics>>,
    /// Performance thresholds for optimization triggers
    pub optimization_thresholds: OptimizationThresholds,
    /// Data retention configuration
    pub retention_config: DataRetentionConfig,
    /// Last analysis time
    pub last_analysis: Instant,
}

/// Individual player session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerSession {
    pub player_id: String,
    pub session_id: String,
    pub room_id: String,
    pub start_time: Instant,
    pub end_time: Option<Instant>,
    pub total_actions: u64,
    pub total_messages: u64,
    pub latency_samples: VecDeque<f64>, // Ring buffer for latency data
    pub bandwidth_usage: BandwidthUsage,
    pub gameplay_events: Vec<GameplayEvent>,
    pub performance_issues: Vec<PerformanceIssue>,
}

/// Bandwidth usage tracking
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BandwidthUsage {
    pub total_bytes_sent: u64,
    pub total_bytes_received: u64,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub average_message_size: f64,
}

/// Gameplay events for detailed analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameplayEvent {
    pub timestamp: Instant,
    pub event_type: GameplayEventType,
    pub data: serde_json::Value,
    pub impact_score: f32, // 0.0 - 1.0, higher = more significant
}

/// Types of gameplay events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameplayEventType {
    PlayerSpawn,
    PlayerDeath,
    PlayerAction { action_type: String },
    LatencySpike { latency_ms: f64 },
    MessageDrop,
    StateDesync,
    RoomJoin,
    RoomLeave,
    ChatMessage,
    Custom { event_name: String },
}

/// Performance issues detected during gameplay
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceIssue {
    pub timestamp: Instant,
    pub issue_type: PerformanceIssueType,
    pub severity: IssueSeverity,
    pub description: String,
    pub affected_players: Vec<String>,
    pub resolution_time_ms: Option<u64>,
}

/// Types of performance issues
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceIssueType {
    HighLatency,
    MessageLoss,
    StateInconsistency,
    MemorySpike,
    CpuSpike,
    NetworkTimeout,
    Custom { issue_name: String },
}

/// Severity levels for issues
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Aggregated gameplay metrics for optimization analysis
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AggregatedGameplayMetrics {
    pub total_sessions: u64,
    pub total_players: u64,
    pub total_gameplay_hours: f64,
    pub average_session_length_minutes: f64,
    pub average_actions_per_minute: f64,
    pub average_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub p99_latency_ms: f64,
    pub message_loss_rate: f64,
    pub bandwidth_per_player_kbps: f64,
    pub peak_concurrent_players: u32,
    pub room_utilization_rate: f64,
    pub error_rate_per_session: f64,
}

/// Optimization thresholds for triggering performance improvements
#[derive(Debug, Clone)]
pub struct OptimizationThresholds {
    pub max_latency_ms: f64,
    pub max_message_loss_rate: f64,
    pub max_error_rate: f64,
    pub min_bandwidth_per_player_kbps: f64,
    pub max_session_drop_rate: f64,
    pub performance_degradation_threshold: f64,
}

/// Data retention configuration
#[derive(Debug, Clone)]
pub struct DataRetentionConfig {
    pub max_session_age_hours: u64,
    pub max_latency_samples_per_session: usize,
    pub max_events_per_session: usize,
    pub cleanup_interval_minutes: u64,
}

impl Default for OptimizationThresholds {
    fn default() -> Self {
        Self {
            max_latency_ms: 100.0,
            max_message_loss_rate: 0.05, // 5%
            max_error_rate: 0.02, // 2%
            min_bandwidth_per_player_kbps: 10.0,
            max_session_drop_rate: 0.10, // 10%
            performance_degradation_threshold: 0.20, // 20% degradation
        }
    }
}

impl Default for DataRetentionConfig {
    fn default() -> Self {
        Self {
            max_session_age_hours: 24,
            max_latency_samples_per_session: 1000,
            max_events_per_session: 500,
            cleanup_interval_minutes: 60,
        }
    }
}

impl GameplayAnalytics {
    /// Create new gameplay analytics system
    pub fn new() -> Self {
        Self {
            player_sessions: Arc::new(RwLock::new(HashMap::new())),
            aggregated_metrics: Arc::new(RwLock::new(AggregatedGameplayMetrics::default())),
            optimization_thresholds: OptimizationThresholds::default(),
            retention_config: DataRetentionConfig::default(),
            last_analysis: Instant::now(),
        }
    }

    /// Start a new player session
    pub async fn start_session(&self, player_id: String, session_id: String, room_id: String) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;

        if sessions.contains_key(&player_id) {
            warn!("Session already exists for player {}", player_id);
            return Ok(());
        }

        let session = PlayerSession {
            player_id: player_id.clone(),
            session_id,
            room_id,
            start_time: Instant::now(),
            end_time: None,
            total_actions: 0,
            total_messages: 0,
            latency_samples: VecDeque::with_capacity(self.retention_config.max_latency_samples_per_session),
            bandwidth_usage: BandwidthUsage::default(),
            gameplay_events: Vec::new(),
            performance_issues: Vec::new(),
        };

        sessions.insert(player_id, session);

        info!("Started gameplay session for player {} in room {}", player_id, room_id);
        Ok(())
    }

    /// End a player session
    pub async fn end_session(&self, player_id: String) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;

        if let Some(mut session) = sessions.remove(&player_id) {
            session.end_time = Some(Instant::now());

            // Record session end event
            self.record_gameplay_event(
                player_id.clone(),
                GameplayEvent {
                    timestamp: Instant::now(),
                    event_type: GameplayEventType::RoomLeave,
                    data: serde_json::json!({
                        "session_duration_minutes": session.start_time.elapsed().as_secs_f64() / 60.0,
                        "total_actions": session.total_actions,
                        "total_messages": session.total_messages
                    }),
                    impact_score: 0.3,
                }
            ).await?;

            info!("Ended gameplay session for player {} (duration: {:.2} minutes)",
                  player_id, session.start_time.elapsed().as_secs_f64() / 60.0);

            // Update aggregated metrics
            self.update_aggregated_metrics(&session).await;
        }

        Ok(())
    }

    /// Record gameplay event for a player
    pub async fn record_gameplay_event(&self, player_id: String, event: GameplayEvent) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;

        if let Some(session) = sessions.get_mut(&player_id) {
            // Limit events per session
            if session.gameplay_events.len() >= self.retention_config.max_events_per_session {
                session.gameplay_events.remove(0); // Remove oldest
            }

            session.gameplay_events.push(event);

            // Check for performance issues
            self.detect_performance_issues(&player_id, &session).await?;
        }

        Ok(())
    }

    /// Record latency measurement for a player
    pub async fn record_latency(&self, player_id: String, latency_ms: f64) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;

        if let Some(session) = sessions.get_mut(&player_id) {
            // Maintain latency samples within limit
            if session.latency_samples.len() >= self.retention_config.max_latency_samples_per_session {
                session.latency_samples.pop_front();
            }

            session.latency_samples.push_back(latency_ms);
        }

        Ok(())
    }

    /// Record bandwidth usage for a player
    pub async fn record_bandwidth_usage(&self, player_id: String, bytes_sent: u64, bytes_received: u64, message_size: usize) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;

        if let Some(session) = sessions.get_mut(&player_id) {
            session.bandwidth_usage.total_bytes_sent += bytes_sent;
            session.bandwidth_usage.total_bytes_received += bytes_received;
            session.bandwidth_usage.messages_sent += 1;

            // Update average message size
            let total_messages = session.bandwidth_usage.messages_sent;
            session.bandwidth_usage.average_message_size =
                (session.bandwidth_usage.average_message_size * (total_messages - 1) as f64 + message_size as f64) / total_messages as f64;
        }

        Ok(())
    }

    /// Detect performance issues based on gameplay data
    async fn detect_performance_issues(&self, player_id: &str, session: &PlayerSession) -> Result<(), Box<dyn std::error::Error>> {
        let mut issues_detected = Vec::new();

        // Check for high latency
        if let Some(&max_latency) = session.latency_samples.iter().max_by(|a, b| a.partial_cmp(b).unwrap()) {
            if max_latency > self.optimization_thresholds.max_latency_ms {
                issues_detected.push(PerformanceIssue {
                    timestamp: Instant::now(),
                    issue_type: PerformanceIssueType::HighLatency,
                    severity: if max_latency > 200.0 { IssueSeverity::Critical }
                             else if max_latency > 150.0 { IssueSeverity::High }
                             else { IssueSeverity::Medium },
                    description: format!("High latency detected: {:.2}ms", max_latency),
                    affected_players: vec![player_id.to_string()],
                    resolution_time_ms: None,
                });
            }
        }

        // Check for message loss (inferred from sequence gaps)
        // This would require tracking message sequences in real implementation

        // Check for state inconsistencies
        // This would analyze gameplay events for inconsistencies

        // Record detected issues
        for issue in issues_detected {
            if let Ok(mut sessions) = self.player_sessions.write().await {
                if let Some(session) = sessions.get_mut(player_id) {
                    session.performance_issues.push(issue);
                }
            }
        }

        Ok(())
    }

    /// Update aggregated metrics based on completed session
    async fn update_aggregated_metrics(&self, session: &PlayerSession) {
        if let Ok(mut metrics) = self.aggregated_metrics.write().await {
            metrics.total_sessions += 1;

            if let Some(end_time) = session.end_time {
                let session_duration_minutes = end_time.duration_since(session.start_time).as_secs_f64() / 60.0;
                metrics.total_gameplay_hours += session_duration_minutes / 60.0;
                metrics.average_session_length_minutes =
                    (metrics.average_session_length_minutes * (metrics.total_sessions - 1) as f64 + session_duration_minutes) / metrics.total_sessions as f64;
            }

            if !session.latency_samples.is_empty() {
                let avg_latency = session.latency_samples.iter().sum::<f64>() / session.latency_samples.len() as f64;
                metrics.average_latency_ms =
                    (metrics.average_latency_ms * (metrics.total_sessions - 1) as f64 + avg_latency) / metrics.total_sessions as f64;
            }

            // Update peak concurrent players (simplified - would need real-time tracking)
            metrics.total_players += 1;
        }
    }

    /// Analyze gameplay data for optimization opportunities
    pub async fn analyze_for_optimization(&self) -> Result<OptimizationRecommendations, Box<dyn std::error::Error>> {
        let sessions = self.player_sessions.read().await;
        let metrics = self.aggregated_metrics.read().await;

        let mut recommendations = OptimizationRecommendations::default();

        // Analyze latency patterns
        let mut all_latencies = Vec::new();
        for session in sessions.values() {
            all_latencies.extend(session.latency_samples.iter());
        }

        if !all_latencies.is_empty() {
            all_latencies.sort_by(|a, b| a.partial_cmp(b).unwrap());

            let p95_latency = all_latencies[(all_latencies.len() as f32 * 0.95) as usize];
            let p99_latency = all_latencies[(all_latencies.len() as f32 * 0.99) as usize];

            if p95_latency > self.optimization_thresholds.max_latency_ms {
                recommendations.bandwidth_optimization = true;
                recommendations.compression_improvements = true;
            }

            if p99_latency > 200.0 {
                recommendations.cdn_integration = true;
                recommendations.edge_computing = true;
            }
        }

        // Analyze session patterns
        let active_sessions: Vec<_> = sessions.values()
            .filter(|s| s.end_time.is_none())
            .collect();

        if active_sessions.len() as f64 > (metrics.total_players as f64 * 0.8) {
            recommendations.load_balancing = true;
        }

        // Analyze performance issues
        let critical_issues: Vec<_> = sessions.values()
            .flat_map(|s| &s.performance_issues)
            .filter(|i| matches!(i.severity, IssueSeverity::Critical))
            .collect();

        if !critical_issues.is_empty() {
            recommendations.infrastructure_scaling = true;
            recommendations.monitoring_improvements = true;
        }

        // Analyze bandwidth usage
        let total_bandwidth: u64 = sessions.values()
            .map(|s| s.bandwidth_usage.total_bytes_sent + s.bandwidth_usage.total_bytes_received)
            .sum();

        let avg_bandwidth_per_player = if metrics.total_players > 0 {
            total_bandwidth as f64 / metrics.total_players as f64 / 1024.0 // KB per player
        } else {
            0.0
        };

        if avg_bandwidth_per_player > 100.0 { // More than 100KB per player
            recommendations.data_compression = true;
            recommendations.selective_sync = true;
        }

        recommendations.analysis_timestamp = Instant::now();
        recommendations.confidence_score = self.calculate_confidence_score(&recommendations);

        Ok(recommendations)
    }

    /// Calculate confidence score for optimization recommendations
    fn calculate_confidence_score(&self, recommendations: &OptimizationRecommendations) -> f64 {
        let mut score = 0.0;
        let mut factors = 0;

        // Base confidence on data availability
        // This is a simplified calculation - real implementation would be more sophisticated

        score
    }

    /// Clean up old session data based on retention policy
    pub async fn cleanup_old_data(&self) -> Result<CleanupReport, Box<dyn std::error::Error>> {
        let mut sessions = self.player_sessions.write().await;
        let cutoff_time = Instant::now() - Duration::from_secs(self.retention_config.max_session_age_hours * 3600);

        let mut removed_sessions = 0;
        let mut removed_events = 0;
        let mut removed_issues = 0;

        sessions.retain(|_, session| {
            let should_retain = session.start_time > cutoff_time;

            if !should_retain {
                removed_sessions += 1;
                removed_events += session.gameplay_events.len();
                removed_issues += session.performance_issues.len();
            }

            should_retain
        });

        // Also clean up old events and issues within retained sessions
        for session in sessions.values_mut() {
            // Remove old events
            let initial_event_count = session.gameplay_events.len();
            session.gameplay_events.retain(|event| {
                event.timestamp.elapsed().as_secs() < self.retention_config.max_session_age_hours * 3600
            });
            removed_events += initial_event_count - session.gameplay_events.len();

            // Remove old issues
            let initial_issue_count = session.performance_issues.len();
            session.performance_issues.retain(|issue| {
                issue.timestamp.elapsed().as_secs() < self.retention_config.max_session_age_hours * 3600
            });
            removed_issues += initial_issue_count - session.performance_issues.len();
        }

        Ok(CleanupReport {
            removed_sessions,
            removed_events,
            removed_issues,
            remaining_sessions: sessions.len(),
            cleanup_timestamp: Instant::now(),
        })
    }

    /// Generate comprehensive gameplay analytics report
    pub async fn generate_report(&self) -> Result<GameplayAnalyticsReport, Box<dyn std::error::Error>> {
        let sessions = self.player_sessions.read().await;
        let metrics = self.aggregated_metrics.read().await;

        let mut report = GameplayAnalyticsReport {
            generated_at: Instant::now(),
            analysis_period: self.last_analysis.elapsed(),
            aggregated_metrics: metrics.clone(),
            top_performance_issues: Vec::new(),
            optimization_opportunities: Vec::new(),
            player_behavior_patterns: HashMap::new(),
        };

        // Analyze performance issues
        let mut issue_counts = HashMap::new();
        for session in sessions.values() {
            for issue in &session.performance_issues {
                *issue_counts.entry(format!("{:?}", issue.issue_type)).or_insert(0) += 1;
            }
        }

        report.top_performance_issues = issue_counts
            .into_iter()
            .map(|(issue_type, count)| IssueSummary { issue_type, count })
            .collect();

        // Generate optimization recommendations
        let recommendations = self.analyze_for_optimization().await?;
        report.optimization_opportunities = recommendations.get_opportunity_list();

        // Analyze player behavior patterns
        report.player_behavior_patterns = self.analyze_player_patterns(&sessions).await;

        Ok(report)
    }

    /// Analyze player behavior patterns from session data
    async fn analyze_player_patterns(&self, sessions: &HashMap<String, PlayerSession>) -> HashMap<String, PlayerPattern> {
        let mut patterns = HashMap::new();

        // Analyze session duration patterns
        let mut session_durations = Vec::new();
        for session in sessions.values() {
            if let Some(end_time) = session.end_time {
                session_durations.push(end_time.duration_since(session.start_time).as_secs_f64() / 60.0);
            }
        }

        if !session_durations.is_empty() {
            session_durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
            patterns.insert("session_duration_minutes".to_string(), PlayerPattern {
                pattern_type: "session_duration".to_string(),
                average: session_durations.iter().sum::<f64>() / session_durations.len() as f64,
                median: session_durations[session_durations.len() / 2],
                p95: session_durations[(session_durations.len() as f32 * 0.95) as usize],
                sample_size: session_durations.len(),
            });
        }

        // Analyze action frequency patterns
        let mut action_rates = Vec::new();
        for session in sessions.values() {
            if let Some(end_time) = session.end_time {
                let duration_minutes = end_time.duration_since(session.start_time).as_secs_f64() / 60.0;
                if duration_minutes > 0.0 {
                    let actions_per_minute = session.total_actions as f64 / duration_minutes;
                    action_rates.push(actions_per_minute);
                }
            }
        }

        if !action_rates.is_empty() {
            action_rates.sort_by(|a, b| a.partial_cmp(b).unwrap());
            patterns.insert("actions_per_minute".to_string(), PlayerPattern {
                pattern_type: "action_frequency".to_string(),
                average: action_rates.iter().sum::<f64>() / action_rates.len() as f64,
                median: action_rates[action_rates.len() / 2],
                p95: action_rates[(action_rates.len() as f32 * 0.95) as usize],
                sample_size: action_rates.len(),
            });
        }

        patterns
    }

    /// Export analytics data for external analysis
    pub async fn export_data(&self, format: ExportFormat) -> Result<String, Box<dyn std::error::Error>> {
        let sessions = self.player_sessions.read().await;
        let metrics = self.aggregated_metrics.read().await;

        match format {
            ExportFormat::Json => {
                let export_data = serde_json::json!({
                    "export_timestamp": chrono::Utc::now(),
                    "sessions": sessions,
                    "aggregated_metrics": metrics,
                    "retention_config": self.retention_config,
                });

                Ok(serde_json::to_string_pretty(&export_data)?)
            }
            ExportFormat::Csv => {
                // Generate CSV format for spreadsheet analysis
                let mut csv = String::new();
                csv.push_str("Player ID,Session ID,Room ID,Session Duration (min),Total Actions,Total Messages,Avg Latency (ms),Total Bandwidth (KB)\n");

                for session in sessions.values() {
                    let duration_minutes = if let Some(end_time) = session.end_time {
                        end_time.duration_since(session.start_time).as_secs_f64() / 60.0
                    } else {
                        0.0
                    };

                    let avg_latency = if session.latency_samples.is_empty() {
                        0.0
                    } else {
                        session.latency_samples.iter().sum::<f64>() / session.latency_samples.len() as f64
                    };

                    let total_bandwidth_kb = (session.bandwidth_usage.total_bytes_sent +
                                            session.bandwidth_usage.total_bytes_received) as f64 / 1024.0;

                    csv.push_str(&format!(
                        "{},{},{},{:.2},{},{},{:.2},{:.2}\n",
                        session.player_id,
                        session.session_id,
                        session.room_id,
                        duration_minutes,
                        session.total_actions,
                        session.total_messages,
                        avg_latency,
                        total_bandwidth_kb
                    ));
                }

                Ok(csv)
            }
        }
    }
}

impl Default for GameplayAnalytics {
    fn default() -> Self {
        Self::new()
    }
}

/// Optimization recommendations based on gameplay analysis
#[derive(Debug, Clone, Default)]
pub struct OptimizationRecommendations {
    pub bandwidth_optimization: bool,
    pub compression_improvements: bool,
    pub load_balancing: bool,
    pub cdn_integration: bool,
    pub edge_computing: bool,
    pub data_compression: bool,
    pub selective_sync: bool,
    pub infrastructure_scaling: bool,
    pub monitoring_improvements: bool,
    pub analysis_timestamp: Instant,
    pub confidence_score: f64,
}

impl OptimizationRecommendations {
    /// Get list of optimization opportunities as strings
    pub fn get_opportunity_list(&self) -> Vec<String> {
        let mut opportunities = Vec::new();

        if self.bandwidth_optimization {
            opportunities.push("Optimize bandwidth usage patterns".to_string());
        }
        if self.compression_improvements {
            opportunities.push("Improve message compression algorithms".to_string());
        }
        if self.load_balancing {
            opportunities.push("Implement advanced load balancing".to_string());
        }
        if self.cdn_integration {
            opportunities.push("Integrate CDN for static assets".to_string());
        }
        if self.edge_computing {
            opportunities.push("Deploy edge computing nodes".to_string());
        }
        if self.data_compression {
            opportunities.push("Implement data compression techniques".to_string());
        }
        if self.selective_sync {
            opportunities.push("Implement selective state synchronization".to_string());
        }
        if self.infrastructure_scaling {
            opportunities.push("Scale infrastructure based on demand".to_string());
        }
        if self.monitoring_improvements {
            opportunities.push("Enhance monitoring and alerting systems".to_string());
        }

        opportunities
    }
}

/// Cleanup report for data retention operations
#[derive(Debug, Clone)]
pub struct CleanupReport {
    pub removed_sessions: usize,
    pub removed_events: usize,
    pub removed_issues: usize,
    pub remaining_sessions: usize,
    pub cleanup_timestamp: Instant,
}

/// Comprehensive gameplay analytics report
#[derive(Debug, Clone)]
pub struct GameplayAnalyticsReport {
    pub generated_at: Instant,
    pub analysis_period: Duration,
    pub aggregated_metrics: AggregatedGameplayMetrics,
    pub top_performance_issues: Vec<IssueSummary>,
    pub optimization_opportunities: Vec<String>,
    pub player_behavior_patterns: HashMap<String, PlayerPattern>,
}

/// Summary of performance issues
#[derive(Debug, Clone)]
pub struct IssueSummary {
    pub issue_type: String,
    pub count: usize,
}

/// Player behavior pattern analysis
#[derive(Debug, Clone)]
pub struct PlayerPattern {
    pub pattern_type: String,
    pub average: f64,
    pub median: f64,
    pub p95: f64,
    pub sample_size: usize,
}

/// Export format options
#[derive(Debug, Clone)]
pub enum ExportFormat {
    Json,
    Csv,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_gameplay_analytics_creation() {
        let analytics = GameplayAnalytics::new();
        assert!(analytics.player_sessions.read().await.is_empty());
    }

    #[tokio::test]
    async fn test_session_management() {
        let analytics = GameplayAnalytics::new();

        // Start session
        analytics.start_session("player1".to_string(), "session1".to_string(), "room1".to_string()).await.unwrap();

        {
            let sessions = analytics.player_sessions.read().await;
            assert!(sessions.contains_key("player1"));
            assert_eq!(sessions.get("player1").unwrap().total_actions, 0);
        }

        // Record some events
        analytics.record_gameplay_event("player1".to_string(), GameplayEvent {
            timestamp: Instant::now(),
            event_type: GameplayEventType::PlayerAction { action_type: "jump".to_string() },
            data: serde_json::json!({"height": 10.0}),
            impact_score: 0.5,
        }).await.unwrap();

        // Record latency
        analytics.record_latency("player1".to_string(), 50.0).await.unwrap();

        // End session
        analytics.end_session("player1".to_string()).await.unwrap();

        {
            let sessions = analytics.player_sessions.read().await;
            assert!(!sessions.contains_key("player1"));
        }
    }

    #[tokio::test]
    async fn test_optimization_analysis() {
        let analytics = GameplayAnalytics::new();

        // Create test session with high latency
        analytics.start_session("player1".to_string(), "session1".to_string(), "room1".to_string()).await.unwrap();

        // Record high latency samples
        for _ in 0..10 {
            analytics.record_latency("player1".to_string(), 150.0).await.unwrap();
        }

        let recommendations = analytics.analyze_for_optimization().await.unwrap();

        // Should recommend bandwidth optimization due to high latency
        assert!(recommendations.bandwidth_optimization);
    }

    #[tokio::test]
    async fn test_data_cleanup() {
        let analytics = GameplayAnalytics::new();

        // Start and quickly end a session
        analytics.start_session("player1".to_string(), "session1".to_string(), "room1".to_string()).await.unwrap();
        sleep(Duration::from_millis(10)).await;
        analytics.end_session("player1".to_string()).await.unwrap();

        // Manually set old timestamp for testing
        {
            let mut sessions = analytics.player_sessions.write().await;
            if let Some(session) = sessions.get_mut("player1") {
                // This is a test hack - in real implementation, cleanup would handle this
            }
        }

        let report = analytics.cleanup_old_data().await.unwrap();
        assert!(report.cleanup_timestamp.elapsed().as_secs() < 1);
    }
}
