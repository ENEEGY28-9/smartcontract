use common_net::telemetry;

pub mod api;
pub mod collections;
pub mod jobs;
pub mod persistence;
pub mod pocketbase;

#[allow(dead_code)]
fn main() {
    telemetry::init("services");
    tracing::info!("services runner started");
}
