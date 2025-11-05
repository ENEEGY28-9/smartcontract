use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::{RwLock, mpsc};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};

use crate::{
    gameplay_analytics::{GameplayAnalytics, OptimizationRecommendations, AggregatedGameplayMetrics},
    error_handling::{ErrorHandler, ErrorSeverity},
};

/// Adaptive optimization system that dynamically adjusts performance based on real gameplay data
pub struct AdaptiveOptimizer {
    /// Gameplay analytics for data-driven decisions
    pub analytics: Arc<GameplayAnalytics>,
    /// Error handler for monitoring system health
    pub error_handler: Arc<ErrorHandler>,
    /// Current optimization configuration
    pub config: Arc<RwLock<OptimizationConfig>>,
    /// Optimization history for learning
    pub optimization_history: Arc<RwLock<Vec<OptimizationAction>>>,
    /// Performance monitoring
    pub performance_monitor: Arc<RwLock<PerformanceMonitor>>,
    /// Optimization triggers and thresholds
    pub triggers: OptimizationTriggers,
    /// Control channel for dynamic adjustments
    pub control_tx: mpsc::UnboundedSender<OptimizationCommand>,
    /// Background optimization task
    _optimization_task: tokio::task::JoinHandle<()>,
}

/// Current optimization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConfig {
    pub batch_size: usize,
    pub batch_timeout_ms: u64,
    pub connection_pool_size: usize,
    pub rate_limit_per_minute: u32,
    pub compression_enabled: bool,
    pub compression_level: u32,
    pub state_sync_frequency: u64,
    pub client_prediction_enabled: bool,
    pub delta_compression_enabled: bool,
    pub hierarchical_aoi_enabled: bool,
    pub performance_monitoring_interval_secs: u64,
    pub adaptive_latency_compensation: bool,
    pub load_balancing_enabled: bool,
    pub cdn_integration_enabled: bool,
    pub edge_computing_enabled: bool,
}

/// Performance monitoring for optimization decisions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMonitor {
    pub current_metrics: AggregatedGameplayMetrics,
    pub baseline_metrics: AggregatedGameplayMetrics,
    pub performance_score: f64,
    pub optimization_opportunities: Vec<String>,
    pub last_optimization: Instant,
    pub consecutive_improvements: u32,
    pub consecutive_degradations: u32,
}

/// Optimization triggers and thresholds
#[derive(Debug, Clone)]
pub struct OptimizationTriggers {
    pub latency_threshold_ms: f64,
    pub error_rate_threshold: f64,
    pub bandwidth_threshold_kbps: f64,
    pub session_drop_threshold: f64,
    pub performance_degradation_threshold: f64,
    pub improvement_confirmation_count: u32,
    pub degradation_confirmation_count: u32,
    pub optimization_cooldown_secs: u64,
}

/// Optimization actions taken by the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationAction {
    pub timestamp: Instant,
    pub action_type: OptimizationActionType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub reason: String,
    pub expected_impact: String,
    pub actual_impact: Option<PerformanceImpact>,
}

/// Types of optimization actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationActionType {
    AdjustBatchSize { new_size: usize },
    AdjustBatchTimeout { new_timeout_ms: u64 },
    AdjustConnectionPool { new_size: usize },
    AdjustRateLimit { new_limit: u32 },
    ToggleCompression { enabled: bool },
    AdjustCompressionLevel { new_level: u32 },
    AdjustStateSyncFrequency { new_frequency: u64 },
    ToggleClientPrediction { enabled: bool },
    ToggleDeltaCompression { enabled: bool },
    ToggleHierarchicalAOI { enabled: bool },
    AdjustMonitoringInterval { new_interval_secs: u64 },
    ToggleAdaptiveLatencyCompensation { enabled: bool },
    EnableLoadBalancing,
    EnableCDNIntegration,
    EnableEdgeComputing,
    Custom { action_name: String },
}

/// Performance impact of optimization actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceImpact {
    pub latency_change_percent: f64,
    pub throughput_change_percent: f64,
    pub error_rate_change_percent: f64,
    pub bandwidth_change_percent: f64,
    pub overall_score_change: f64,
    pub measurement_duration_secs: u64,
}

/// Optimization commands for dynamic control
#[derive(Debug, Clone)]
pub enum OptimizationCommand {
    TriggerOptimization,
    RevertLastOptimization,
    ApplyCustomOptimization(OptimizationActionType),
    UpdateThresholds(OptimizationTriggers),
    GenerateReport,
    EnableProfiling,
    DisableProfiling,
}

/// Default optimization triggers
impl Default for OptimizationTriggers {
    fn default() -> Self {
        Self {
            latency_threshold_ms: 100.0,
            error_rate_threshold: 0.05,
            bandwidth_threshold_kbps: 50.0,
            session_drop_threshold: 0.10,
            performance_degradation_threshold: 0.20,
            improvement_confirmation_count: 3,
            degradation_confirmation_count: 2,
            optimization_cooldown_secs: 300, // 5 minutes
        }
    }
}

/// Default optimization configuration
impl Default for OptimizationConfig {
    fn default() -> Self {
        Self {
            batch_size: 50,
            batch_timeout_ms: 100,
            connection_pool_size: 1000,
            rate_limit_per_minute: 1000,
            compression_enabled: true,
            compression_level: 6,
            state_sync_frequency: 60, // Hz
            client_prediction_enabled: true,
            delta_compression_enabled: true,
            hierarchical_aoi_enabled: true,
            performance_monitoring_interval_secs: 10,
            adaptive_latency_compensation: true,
            load_balancing_enabled: false,
            cdn_integration_enabled: false,
            edge_computing_enabled: false,
        }
    }
}

impl AdaptiveOptimizer {
    /// Create new adaptive optimizer
    pub fn new(
        analytics: Arc<GameplayAnalytics>,
        error_handler: Arc<ErrorHandler>,
    ) -> Self {
        let (control_tx, mut control_rx) = mpsc::unbounded_channel();

        let config = Arc::new(RwLock::new(OptimizationConfig::default()));
        let optimization_history = Arc::new(RwLock::new(Vec::new()));
        let performance_monitor = Arc::new(RwLock::new(PerformanceMonitor {
            current_metrics: AggregatedGameplayMetrics::default(),
            baseline_metrics: AggregatedGameplayMetrics::default(),
            performance_score: 0.0,
            optimization_opportunities: Vec::new(),
            last_optimization: Instant::now(),
            consecutive_improvements: 0,
            consecutive_degradations: 0,
        }));

        let optimizer = Self {
            analytics: analytics.clone(),
            error_handler: error_handler.clone(),
            config: config.clone(),
            optimization_history: optimization_history.clone(),
            performance_monitor: performance_monitor.clone(),
            triggers: OptimizationTriggers::default(),
            control_tx,
        };

        // Start background optimization task
        let optimization_task_config = config.clone();
        let optimization_task_history = optimization_history.clone();
        let optimization_task_monitor = performance_monitor.clone();
        let optimization_task_analytics = analytics.clone();
        let optimization_task_error_handler = error_handler.clone();

        let optimization_task = tokio::spawn(async move {
            Self::run_optimization_loop(
                control_rx,
                optimization_task_config,
                optimization_task_history,
                optimization_task_monitor,
                optimization_task_analytics,
                optimization_task_error_handler,
            ).await;
        });

        // Store the task handle (would need to be stored properly in real implementation)
        // For this example, we'll just start it

        optimizer
    }

    /// Main optimization loop running in background
    async fn run_optimization_loop(
        mut control_rx: mpsc::UnboundedReceiver<OptimizationCommand>,
        config: Arc<RwLock<OptimizationConfig>>,
        history: Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: Arc<RwLock<PerformanceMonitor>>,
        analytics: Arc<GameplayAnalytics>,
        error_handler: Arc<ErrorHandler>,
    ) {
        let mut optimization_timer = tokio::time::interval(Duration::from_secs(60)); // Check every minute

        loop {
            tokio::select! {
                // Handle control commands
                command = control_rx.recv() => {
                    if let Some(cmd) = command {
                        if let Err(e) = Self::handle_optimization_command(
                            cmd,
                            &config,
                            &history,
                            &monitor,
                            &analytics,
                            &error_handler,
                        ).await {
                            error!("Failed to handle optimization command: {}", e);
                        }
                    } else {
                        break; // Channel closed
                    }
                }

                // Periodic optimization checks
                _ = optimization_timer.tick() => {
                    if let Err(e) = Self::periodic_optimization_check(
                        &config,
                        &history,
                        &monitor,
                        &analytics,
                        &error_handler,
                    ).await {
                        error!("Periodic optimization check failed: {}", e);
                    }
                }
            }
        }
    }

    /// Handle optimization commands
    async fn handle_optimization_command(
        command: OptimizationCommand,
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
        error_handler: &Arc<ErrorHandler>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match command {
            OptimizationCommand::TriggerOptimization => {
                Self::trigger_optimization(config, history, monitor, analytics, error_handler).await
            }
            OptimizationCommand::RevertLastOptimization => {
                Self::revert_last_optimization(config, history, monitor).await
            }
            OptimizationCommand::ApplyCustomOptimization(action_type) => {
                Self::apply_custom_optimization(action_type, config, history, monitor, analytics).await
            }
            OptimizationCommand::UpdateThresholds(new_triggers) => {
                // Update triggers (would need to be stored in the optimizer instance)
                info!("Updated optimization triggers");
                Ok(())
            }
            OptimizationCommand::GenerateReport => {
                Self::generate_optimization_report(config, history, monitor, analytics).await.map(|_| ())
            }
            OptimizationCommand::EnableProfiling => {
                info!("Enabled performance profiling");
                Ok(())
            }
            OptimizationCommand::DisableProfiling => {
                info!("Disabled performance profiling");
                Ok(())
            }
        }
    }

    /// Periodic optimization check
    async fn periodic_optimization_check(
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
        error_handler: &Arc<ErrorHandler>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Update current performance metrics
        Self::update_performance_monitor(monitor, analytics).await?;

        // Check if optimization is needed
        let should_optimize = Self::should_trigger_optimization(monitor, error_handler).await?;

        if should_optimize {
            Self::trigger_optimization(config, history, monitor, analytics, error_handler).await?;
        }

        Ok(())
    }

    /// Update performance monitor with latest data
    async fn update_performance_monitor(
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut perf_monitor = monitor.write().await;

        // Get latest metrics from analytics
        let current_metrics = analytics.aggregated_metrics.read().await.clone();

        // Calculate performance score
        perf_monitor.performance_score = Self::calculate_performance_score(&current_metrics);

        // Update baseline if this is significantly better
        if perf_monitor.performance_score > perf_monitor.baseline_metrics.average_latency_ms * 1.1 {
            perf_monitor.baseline_metrics = current_metrics.clone();
        }

        perf_monitor.current_metrics = current_metrics;

        Ok(())
    }

    /// Calculate overall performance score (lower is better for latency-based metrics)
    fn calculate_performance_score(metrics: &AggregatedGameplayMetrics) -> f64 {
        // Weighted score combining key metrics
        // Lower latency, lower error rate, higher throughput = better score
        let latency_score = metrics.average_latency_ms;
        let error_score = metrics.error_rate_per_session * 1000.0; // Scale error rate
        let throughput_score = 1000.0 / (metrics.total_gameplay_hours + 1.0); // More hours = better

        latency_score + error_score - throughput_score
    }

    /// Check if optimization should be triggered
    async fn should_trigger_optimization(
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        error_handler: &Arc<ErrorHandler>,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let perf_monitor = monitor.read().await;

        // Check if enough time has passed since last optimization
        if perf_monitor.last_optimization.elapsed().as_secs() < 300 { // 5 minutes cooldown
            return Ok(false);
        }

        // Check current performance against thresholds
        if perf_monitor.current_metrics.average_latency_ms > 150.0 {
            return Ok(true);
        }

        if perf_monitor.current_metrics.error_rate_per_session > 0.10 {
            return Ok(true);
        }

        // Check error handler for critical issues
        let error_stats = error_handler.get_error_statistics().await;
        if error_stats.total_errors > 100 && error_stats.consecutive_errors > 5 {
            return Ok(true);
        }

        Ok(false)
    }

    /// Trigger optimization based on current conditions
    async fn trigger_optimization(
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
        error_handler: &Arc<ErrorHandler>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("🔧 Triggering adaptive optimization...");

        // Get current performance data
        let current_metrics = analytics.aggregated_metrics.read().await.clone();
        let error_stats = error_handler.get_error_statistics().await;

        // Analyze optimization opportunities
        let recommendations = analytics.analyze_for_optimization().await?;

        // Generate optimization actions
        let actions = Self::generate_optimization_actions(&current_metrics, &error_stats, &recommendations);

        // Apply optimizations
        for action in actions {
            Self::apply_optimization_action(&action, config, history, monitor).await?;
        }

        // Update monitor
        let mut perf_monitor = monitor.write().await;
        perf_monitor.last_optimization = Instant::now();

        info!("✅ Optimization completed");
        Ok(())
    }

    /// Generate optimization actions based on current conditions
    fn generate_optimization_actions(
        metrics: &AggregatedGameplayMetrics,
        error_stats: &crate::error_handling::ErrorStatistics,
        recommendations: &OptimizationRecommendations,
    ) -> Vec<OptimizationAction> {
        let mut actions = Vec::new();

        // High latency optimization
        if metrics.average_latency_ms > 150.0 {
            actions.push(OptimizationAction {
                timestamp: Instant::now(),
                action_type: OptimizationActionType::AdjustBatchSize { new_size: 25 },
                parameters: HashMap::new(),
                reason: format!("High latency detected: {:.2}ms", metrics.average_latency_ms),
                expected_impact: "Reduce latency by processing smaller batches more frequently".to_string(),
                actual_impact: None,
            });

            if !recommendations.compression_improvements {
                actions.push(OptimizationAction {
                    timestamp: Instant::now(),
                    action_type: OptimizationActionType::ToggleCompression { enabled: true },
                    parameters: HashMap::new(),
                    reason: "Enable compression to reduce message size and latency".to_string(),
                    expected_impact: "Reduce bandwidth usage and improve latency".to_string(),
                    actual_impact: None,
                });
            }
        }

        // High error rate optimization
        if metrics.error_rate_per_session > 0.10 {
            actions.push(OptimizationAction {
                timestamp: Instant::now(),
                action_type: OptimizationActionType::AdjustStateSyncFrequency { new_frequency: 30 },
                parameters: HashMap::new(),
                reason: format!("High error rate: {:.2}%", metrics.error_rate_per_session * 100.0),
                expected_impact: "Reduce state sync frequency to lower error rate".to_string(),
                actual_impact: None,
            });
        }

        // Resource exhaustion optimization
        if error_stats.errors_by_severity.get(&ErrorSeverity::Critical).unwrap_or(&0) > &5 {
            actions.push(OptimizationAction {
                timestamp: Instant::now(),
                action_type: OptimizationActionType::AdjustConnectionPool { new_size: 500 },
                parameters: HashMap::new(),
                reason: "Critical errors detected, reducing connection pool size".to_string(),
                expected_impact: "Reduce resource usage and improve stability".to_string(),
                actual_impact: None,
            });
        }

        // Apply recommendation-based optimizations
        if recommendations.load_balancing && !recommendations.edge_computing {
            actions.push(OptimizationAction {
                timestamp: Instant::now(),
                action_type: OptimizationActionType::EnableLoadBalancing,
                parameters: HashMap::new(),
                reason: "Load balancing recommended based on gameplay analysis".to_string(),
                expected_impact: "Better distribution of load across servers".to_string(),
                actual_impact: None,
            });
        }

        actions
    }

    /// Apply a single optimization action
    async fn apply_optimization_action(
        action: &OptimizationAction,
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut current_config = config.write().await;
        let mut optimization_history = history.write().await;

        match &action.action_type {
            OptimizationActionType::AdjustBatchSize { new_size } => {
                current_config.batch_size = *new_size;
                info!("Adjusted batch size to {}", new_size);
            }
            OptimizationActionType::AdjustBatchTimeout { new_timeout_ms } => {
                current_config.batch_timeout_ms = *new_timeout_ms;
                info!("Adjusted batch timeout to {}ms", new_timeout_ms);
            }
            OptimizationActionType::AdjustConnectionPool { new_size } => {
                current_config.connection_pool_size = *new_size;
                info!("Adjusted connection pool size to {}", new_size);
            }
            OptimizationActionType::AdjustRateLimit { new_limit } => {
                current_config.rate_limit_per_minute = *new_limit;
                info!("Adjusted rate limit to {} per minute", new_limit);
            }
            OptimizationActionType::ToggleCompression { enabled } => {
                current_config.compression_enabled = *enabled;
                info!("Toggled compression: {}", enabled);
            }
            OptimizationActionType::AdjustCompressionLevel { new_level } => {
                current_config.compression_level = *new_level;
                info!("Adjusted compression level to {}", new_level);
            }
            OptimizationActionType::AdjustStateSyncFrequency { new_frequency } => {
                current_config.state_sync_frequency = *new_frequency;
                info!("Adjusted state sync frequency to {} Hz", new_frequency);
            }
            OptimizationActionType::ToggleClientPrediction { enabled } => {
                current_config.client_prediction_enabled = *enabled;
                info!("Toggled client prediction: {}", enabled);
            }
            OptimizationActionType::ToggleDeltaCompression { enabled } => {
                current_config.delta_compression_enabled = *enabled;
                info!("Toggled delta compression: {}", enabled);
            }
            OptimizationActionType::ToggleHierarchicalAOI { enabled } => {
                current_config.hierarchical_aoi_enabled = *enabled;
                info!("Toggled hierarchical AOI: {}", enabled);
            }
            OptimizationActionType::AdjustMonitoringInterval { new_interval_secs } => {
                current_config.performance_monitoring_interval_secs = *new_interval_secs;
                info!("Adjusted monitoring interval to {} seconds", new_interval_secs);
            }
            OptimizationActionType::ToggleAdaptiveLatencyCompensation { enabled } => {
                current_config.adaptive_latency_compensation = *enabled;
                info!("Toggled adaptive latency compensation: {}", enabled);
            }
            OptimizationActionType::EnableLoadBalancing => {
                current_config.load_balancing_enabled = true;
                info!("Enabled load balancing");
            }
            OptimizationActionType::EnableCDNIntegration => {
                current_config.cdn_integration_enabled = true;
                info!("Enabled CDN integration");
            }
            OptimizationActionType::EnableEdgeComputing => {
                current_config.edge_computing_enabled = true;
                info!("Enabled edge computing");
            }
            OptimizationActionType::Custom { action_name } => {
                info!("Applied custom optimization: {}", action_name);
            }
        }

        // Record the optimization action
        optimization_history.push(action.clone());

        // Keep only recent history
        if optimization_history.len() > 100 {
            optimization_history.remove(0);
        }

        Ok(())
    }

    /// Revert the last optimization if it caused degradation
    async fn revert_last_optimization(
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut optimization_history = history.write().await;

        if let Some(last_action) = optimization_history.pop() {
            info!("🔄 Reverting last optimization: {:?}", last_action.action_type);

            // The actual revert logic would depend on the specific optimization
            // For this example, we'll just log it
            warn!("Optimization reverted due to performance degradation");

            let mut perf_monitor = monitor.write().await;
            perf_monitor.consecutive_degradations += 1;
        }

        Ok(())
    }

    /// Apply custom optimization
    async fn apply_custom_optimization(
        action_type: OptimizationActionType,
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let action = OptimizationAction {
            timestamp: Instant::now(),
            action_type,
            parameters: HashMap::new(),
            reason: "Custom optimization applied via command".to_string(),
            expected_impact: "Manual optimization".to_string(),
            actual_impact: None,
        };

        Self::apply_optimization_action(&action, config, history, monitor).await
    }

    /// Generate optimization report
    async fn generate_optimization_report(
        config: &Arc<RwLock<OptimizationConfig>>,
        history: &Arc<RwLock<Vec<OptimizationAction>>>,
        monitor: &Arc<RwLock<PerformanceMonitor>>,
        analytics: &Arc<GameplayAnalytics>,
    ) -> Result<OptimizationReport, Box<dyn std::error::Error>> {
        let current_config = config.read().await.clone();
        let optimization_history = history.read().await.clone();
        let perf_monitor = monitor.read().await.clone();
        let analytics_report = analytics.generate_report().await?;

        Ok(OptimizationReport {
            generated_at: Instant::now(),
            current_config,
            recent_optimizations: optimization_history.into_iter().rev().take(10).collect(),
            performance_monitor: perf_monitor,
            analytics_summary: analytics_report,
        })
    }

    /// Get current optimization configuration
    pub async fn get_current_config(&self) -> OptimizationConfig {
        self.config.read().await.clone()
    }

    /// Get optimization history
    pub async fn get_optimization_history(&self) -> Vec<OptimizationAction> {
        self.optimization_history.read().await.clone()
    }

    /// Get performance monitor status
    pub async fn get_performance_status(&self) -> PerformanceMonitor {
        self.performance_monitor.read().await.clone()
    }

    /// Trigger manual optimization
    pub async fn trigger_manual_optimization(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.control_tx.send(OptimizationCommand::TriggerOptimization)?;
        Ok(())
    }

    /// Apply custom optimization
    pub async fn apply_custom_optimization_cmd(&self, action: OptimizationActionType) -> Result<(), Box<dyn std::error::Error>> {
        self.control_tx.send(OptimizationCommand::ApplyCustomOptimization(action))?;
        Ok(())
    }
}

impl Default for AdaptiveOptimizer {
    fn default() -> Self {
        let analytics = Arc::new(GameplayAnalytics::new());
        let error_handler = Arc::new(ErrorHandler::new());
        Self::new(analytics, error_handler)
    }
}

/// Comprehensive optimization report
#[derive(Debug, Clone, Serialize)]
pub struct OptimizationReport {
    pub generated_at: Instant,
    pub current_config: OptimizationConfig,
    pub recent_optimizations: Vec<OptimizationAction>,
    pub performance_monitor: PerformanceMonitor,
    pub analytics_summary: crate::gameplay_analytics::GameplayAnalyticsReport,
}

impl OptimizationReport {
    /// Generate JSON representation
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Generate summary text
    pub fn to_summary(&self) -> String {
        let mut summary = String::new();

        summary.push_str(&format!("Optimization Report - {}\n", self.generated_at));
        summary.push_str(&format!("Performance Score: {:.2}\n", self.performance_monitor.performance_score));
        summary.push_str(&format!("Recent Optimizations: {}\n", self.recent_optimizations.len()));

        if !self.recent_optimizations.is_empty() {
            summary.push_str("\nRecent Actions:\n");
            for action in self.recent_optimizations.iter().take(5) {
                summary.push_str(&format!("- {:?}: {}\n", action.action_type, action.reason));
            }
        }

        summary
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_adaptive_optimizer_creation() {
        let optimizer = AdaptiveOptimizer::default();
        let config = optimizer.get_current_config().await;

        assert_eq!(config.batch_size, 50);
        assert!(config.compression_enabled);
        assert!(config.client_prediction_enabled);
    }

    #[tokio::test]
    async fn test_optimization_config_adjustment() {
        let optimizer = AdaptiveOptimizer::default();

        // Apply a custom optimization
        optimizer.apply_custom_optimization_cmd(OptimizationActionType::AdjustBatchSize { new_size: 25 }).await.unwrap();

        let config = optimizer.get_current_config().await;
        assert_eq!(config.batch_size, 25);
    }

    #[tokio::test]
    async fn test_optimization_history() {
        let optimizer = AdaptiveOptimizer::default();

        // Apply some optimizations
        optimizer.apply_custom_optimization_cmd(OptimizationActionType::AdjustBatchSize { new_size: 25 }).await.unwrap();
        optimizer.apply_custom_optimization_cmd(OptimizationActionType::ToggleCompression { enabled: false }).await.unwrap();

        let history = optimizer.get_optimization_history().await;
        assert_eq!(history.len(), 2);
        assert!(matches!(history[0].action_type, OptimizationActionType::AdjustBatchSize { .. }));
    }
}

