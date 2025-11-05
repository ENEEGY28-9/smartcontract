use worker::{WorkerConfig, simulation::{GameWorld, spawn_test_entities, EncodedSnapshot}};
// use worker::{WorkerConfig, simulation::{GameWorld, spawn_test_entities, EncodedSnapshot}, database::PocketBaseClient};
use std::time::{Duration, Instant};
use tokio::time;
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::info;
use tracing_subscriber::EnvFilter;

#[allow(dead_code)]
const DEFAULT_EMAIL: &str = "admin@pocketbase.local";
#[allow(dead_code)]
const DEFAULT_PASSWORD: &str = "123456789";

// Performance monitoring
static FRAME_COUNT: AtomicU64 = AtomicU64::new(0);
static DB_SYNC_COUNT: AtomicU64 = AtomicU64::new(0);
const DB_SYNC_INTERVAL: u64 = 60; // Sync every 60 frames (1 second at 60fps)

// Enhanced telemetry initialization cho production
fn init_enhanced_telemetry() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("worker=info"));

    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .compact()
        .with_env_filter(filter)
        .init();

    info!("🚀 Enhanced telemetry initialized for worker");
}

#[tokio::main]
async fn main() {
    // Initialize enhanced telemetry cho production
    init_enhanced_telemetry();

    let config = match WorkerConfig::from_env() {
        Ok(config) => config,
        Err(err) => {
            tracing::error!(%err, "worker: cau hinh khong hop le");
            return;
        }
    };

    // Initialize database connection pooling for high performance
    use common_net::database::{DatabasePool, DatabaseConfig};

    // Try to initialize database connection with fallback
    let db_pool = match std::env::var("DATABASE_URL") {
        Ok(url) if url.starts_with("postgresql://") => {
            // Use PostgreSQL if available
            let db_config = DatabaseConfig {
                database_url: url,
                pool_size: 10,           // Smaller pool for development
                min_idle: 2,
                connection_timeout: 10,
                query_timeout: 5,
                enable_metrics: false,   // Disable for development
                enable_read_replica: false,
                read_replica_urls: vec![],
            };

            match DatabasePool::new(db_config.clone()).await {
                Ok(pool) => {
                    tracing::info!("Database connection pool initialized with {} max connections", db_config.pool_size);
                    Some(pool)
                }
                Err(err) => {
                    tracing::warn!(%err, "Failed to initialize database pool, running without database");
                    None
                }
            }
        }
        _ => {
            // Use PocketBase or run without database
            tracing::info!("Using PocketBase or running without database connection");
            None
        }
    };

    // Create game world với ECS và Physics
    let mut game_world = GameWorld::new();

    // Spawn test entities
    spawn_test_entities(&mut game_world);
    tracing::info!("Game world created with ECS and Physics");

    // Fixed timestep: 60 FPS (16.67ms per frame)
    let target_frame_time = Duration::from_millis(16);
    let mut accumulator = Duration::from_secs(0);
    let mut last_time = Instant::now();
    #[allow(unused_assignments)]
    let mut frame_start_time = Instant::now();

    // Giới hạn số frames tối đa có thể chạy trong một lần lặp để tránh quá tải
    const MAX_FRAMES_PER_CYCLE: u32 = 10;
    const MIN_FRAME_TIME: Duration = Duration::from_millis(10); // Minimum 10ms per frame

    // Start gRPC server in background
    let db_pool_for_grpc = db_pool.clone();
    let _grpc_handle = tokio::spawn(async move {
        if let Err(err) = worker::run_with_ctrl_c(config, db_pool_for_grpc).await {
            tracing::error!(%err, "worker gRPC server ket thuc do loi");
        }
    });

    tracing::info!("Worker simulation started with 60Hz fixed timestep (max {} frames per cycle)", MAX_FRAMES_PER_CYCLE);
    tracing::info!("Database sync every {} frames ({} seconds)", DB_SYNC_INTERVAL, DB_SYNC_INTERVAL / 60);
    tracing::info!("Minimum frame time: {}ms to prevent CPU overload", MIN_FRAME_TIME.as_millis());
    tracing::info!("Performance monitoring: every 300 frames (5 seconds)");
    tracing::info!("Snapshot logging: every 600 frames (10 seconds)");

    loop {
        frame_start_time = Instant::now();
        let current_time = Instant::now();
        let delta_time = if current_time >= last_time {
            current_time - last_time
        } else {
            // Handle system clock adjustment or timing anomaly
            tracing::warn!("Time anomaly detected: current_time < last_time, using zero delta");
            Duration::from_millis(0)
        };
        last_time = current_time;

        accumulator += delta_time;

        // Fixed timestep loop với giới hạn số frames tối đa
        let mut frames_this_cycle = 0;
        while accumulator >= target_frame_time && frames_this_cycle < MAX_FRAMES_PER_CYCLE {
            let frame_count = FRAME_COUNT.fetch_add(1, Ordering::Relaxed) + 1;
            frames_this_cycle += 1;

            // Step game simulation với ECS và Physics
            let sim_start = Instant::now();
            let snapshot = game_world.tick();
            let _sim_time = sim_start.elapsed();

            // Send snapshot to gateway for WebSocket broadcasting
            // Send every frame for real-time updates (60 FPS)
            if !game_world.get_snapshot().entities.is_empty() {
                // Only send snapshots when there are active entities
                match &snapshot {
                    EncodedSnapshot::Full(full) => {
                        if !full.entities.is_empty() {
                            // Send full snapshot to gateway
                            if let Err(e) = send_snapshot_to_gateway("default_room", &snapshot).await {
                                tracing::warn!("Failed to send snapshot to gateway: {}", e);
                            }
                        }
                    }
                    EncodedSnapshot::Delta(delta) => {
                        let total_entities = delta.created_entities.len() + delta.updated_entities.len() + delta.deleted_entities.len();
                        if total_entities > 0 {
                            // Send delta snapshot to gateway
                            if let Err(e) = send_snapshot_to_gateway("default_room", &snapshot).await {
                                tracing::warn!("Failed to send delta snapshot to gateway: {}", e);
                            }
                        }
                    }
                }
            }

            // Periodic database sync (every DB_SYNC_INTERVAL frames) - just increment counter
            if frame_count.is_multiple_of(DB_SYNC_INTERVAL) {
                DB_SYNC_COUNT.fetch_add(1, Ordering::Relaxed);
            }

            accumulator -= target_frame_time;
        }

        // Nếu không có entities nào, giảm tần suất simulation để tiết kiệm tài nguyên
        if game_world.get_snapshot().entities.is_empty() && accumulator < target_frame_time {
            // Sleep lâu hơn khi không có game nào đang chạy
            time::sleep(Duration::from_millis(50)).await;
        }

        // Performance monitoring every 300 frames (5 seconds at 60fps) to reduce spam
        if FRAME_COUNT.load(Ordering::Relaxed).is_multiple_of(300) {
            // Temporarily disabled database metrics - uncomment when db_client is available
            // let (cache_hits, cache_misses, db_queries, db_errors, avg_query_time) =
            //     db_client.get_performance_metrics();
            // let (games_cached, players_cached, sessions_cached) = db_client.get_cache_stats();
            let (cache_hits, cache_misses, db_queries, db_errors, avg_query_time) = (0, 0, 0, 0, 0);
            let (games_cached, players_cached, sessions_cached) = (0, 0, 0);

            let total_frames = FRAME_COUNT.load(Ordering::Relaxed);
            let total_syncs = DB_SYNC_COUNT.load(Ordering::Relaxed);

            // Use info level for better visibility during testing
            tracing::info!(
                "PERF STATS - Frames: {}, Syncs: {}, Cache: {}/{}/{}, DB: {}/{}/{}ms, Hit Rate: {:.2}%",
                total_frames, total_syncs,
                games_cached, players_cached, sessions_cached,
                db_queries, db_errors, avg_query_time,
                if cache_hits + cache_misses > 0 {
                    (cache_hits as f64 / (cache_hits + cache_misses) as f64) * 100.0
                } else {
                    0.0
                }
            );
        }

        // Frame timing với giới hạn tối thiểu để tránh quá tải CPU
        let frame_time = frame_start_time.elapsed();

        // Đảm bảo mỗi frame ít nhất MIN_FRAME_TIME để tránh quá tải
        if frame_time < MIN_FRAME_TIME {
            let sleep_time = MIN_FRAME_TIME - frame_time;
            tokio::time::sleep(sleep_time).await;
        }

        // Performance monitoring every 600 frames (10 seconds at 60fps) - less frequent to reduce spam
        if FRAME_COUNT.load(Ordering::Relaxed).is_multiple_of(600) {
            // Temporarily disabled database metrics - uncomment when db_client is available
            // let (cache_hits, cache_misses, db_queries, db_errors, avg_query_time) =
            //     db_client.get_performance_metrics();
            // let (games_cached, players_cached, sessions_cached) = db_client.get_cache_stats();
            let (cache_hits, cache_misses, db_queries, db_errors, avg_query_time) = (0, 0, 0, 0, 0);
            let (games_cached, players_cached, sessions_cached) = (0, 0, 0);

            let total_frames = FRAME_COUNT.load(Ordering::Relaxed);
            let total_syncs = DB_SYNC_COUNT.load(Ordering::Relaxed);

            // Use info level for better visibility during testing
            tracing::info!(
                "PERF STATS - Frames: {}, Syncs: {}, Cache: {}/{}/{}, DB: {}/{}/{}ms, Hit Rate: {:.2}%",
                total_frames, total_syncs,
                games_cached, players_cached, sessions_cached,
                db_queries, db_errors, avg_query_time,
                if cache_hits + cache_misses > 0 {
                    (cache_hits as f64 / (cache_hits + cache_misses) as f64) * 100.0
                } else {
                    0.0
                }
            );
        }
    }
}

// Send game snapshot to gateway for WebSocket broadcasting
async fn send_snapshot_to_gateway(room_id: &str, snapshot: &worker::simulation::EncodedSnapshot) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use serde_json::json;

    // Convert snapshot to JSON for sending to gateway
    let snapshot_json = match snapshot {
        worker::simulation::EncodedSnapshot::Full(full) => {
            json!({
                "tick": snapshot.tick(),
                "entities": full.entities
            })
        }
        worker::simulation::EncodedSnapshot::Delta(delta) => {
            json!({
                "tick": snapshot.tick(),
                "created_entities": delta.created_entities,
                "updated_entities": delta.updated_entities,
                "deleted_entities": delta.deleted_entities
            })
        }
    };

    // Prepare payload for gateway
    let payload = json!({
        "room_id": room_id,
        "snapshot": snapshot_json,
        "timestamp": chrono::Utc::now().timestamp_millis()
    });

    // Send to gateway
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:8080/worker/snapshot")
        .json(&payload)
        .send()
        .await?;

    if response.status().is_success() {
        tracing::debug!("Snapshot sent to gateway successfully for room {}", room_id);
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await?;
        Err(format!("Gateway returned error: {} - {}", status, error_text).into())
    }
}
