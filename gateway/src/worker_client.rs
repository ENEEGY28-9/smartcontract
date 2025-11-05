use crate::circuit_breaker::{CircuitBreaker, create_worker_circuit_breaker};
use crate::error_handling::{GatewayError, ErrorSeverity};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tonic::transport::Channel;
use proto::worker::v1::worker_client::WorkerClient as GrpcWorkerClient;
use proto::worker::v1::{
    HealthCheckRequest, HealthCheckResponse,
    PushInputRequest, PushInputResponse,
    JoinRoomRequest, JoinRoomResponse,
    LeaveRoomRequest, LeaveRoomResponse,
    SendChatMessageRequest, SendChatMessageResponse,
    GetChatHistoryRequest, GetChatHistoryResponse,
    CreateRoomRequest, CreateRoomResponse,
    ListRoomsRequest, ListRoomsResponse,
    GetRoomInfoRequest, GetRoomInfoResponse,
    JoinRoomAsPlayerRequest, JoinRoomAsPlayerResponse,
    StartGameRequest, StartGameResponse,
};
use tracing::info;

/// Worker service client with circuit breaker protection
#[derive(Clone)]
pub struct WorkerClient {
    /// gRPC client for worker service
    client: Option<GrpcWorkerClient<Channel>>,
    /// Circuit breaker for fault tolerance
    circuit_breaker: Arc<CircuitBreaker>,
    /// Connection endpoint
    endpoint: String,
    /// Connection state
    connected: Arc<RwLock<bool>>,
}

impl WorkerClient {
    /// Create a new worker client
    pub fn new(endpoint: String) -> Self {
        Self {
            client: None,
            circuit_breaker: Arc::new(create_worker_circuit_breaker()),
            endpoint,
            connected: Arc::new(RwLock::new(false)),
        }
    }

    /// Connect to the worker service
    pub async fn connect(&mut self) -> Result<(), GatewayError> {
        info!("Connecting to worker service at {}", self.endpoint);

        // Create gRPC channel with timeout
        let channel = tonic::transport::Endpoint::from_shared(self.endpoint.clone())
            .map_err(|e| GatewayError::Connection {
                message: format!("Invalid endpoint: {}", e),
                severity: ErrorSeverity::High
            })?
            .timeout(Duration::from_secs(5))
            .connect_timeout(Duration::from_secs(3))
            .tcp_keepalive(Some(Duration::from_secs(30)))
            .connect()
            .await
            .map_err(|e| GatewayError::Connection {
                message: format!("Failed to connect: {}", e),
                severity: ErrorSeverity::High
            })?;

        // Create real gRPC client
        let grpc_client = GrpcWorkerClient::new(channel);

        // Test connection with health check
        match grpc_client.clone().health_check(tonic::Request::new(proto::worker::v1::HealthCheckRequest {})).await {
            Ok(response) => {
                let health_response = response.into_inner();
                if health_response.healthy {
                    info!("Worker service health check passed");
                    *self.connected.write().await = true;
                    self.client = Some(grpc_client);
                    info!("Successfully connected to worker service");
                    Ok(())
                } else {
                    Err(GatewayError::Connection {
                        message: "Worker service health check failed".to_string(),
                        severity: ErrorSeverity::High
                    })
                }
            }
            Err(e) => {
                Err(GatewayError::Connection {
                    message: format!("Worker health check failed: {}", e),
                    severity: ErrorSeverity::High
                })
            }
        }
    }

    /// Send game input to worker with circuit breaker protection (mock implementation)
    pub async fn send_game_input(
        &self,
        room_id: String,
        _player_id: String,
        _input: serde_json::Value, // Changed from GameInput to serde_json::Value
    ) -> Result<serde_json::Value, GatewayError> {
        // Check if we're connected
        if !*self.connected.read().await {
            return Err(GatewayError::Connection {
                message: "Not connected to worker service".to_string(),
                severity: ErrorSeverity::High
            });
        }

        // For now, return a mock game state
        // In real implementation, this would send input to worker service
        Ok(serde_json::json!({
            "room_id": room_id,
            "players": [],
            "game_objects": [],
            "timestamp": chrono::Utc::now().timestamp_millis(),
            "status": "updated"
        }))
    }

    /// Send player input to worker (mock implementation)
    pub async fn send_player_input(
        &self,
        room_id: String,
        player_id: String,
        _input: serde_json::Value, // Changed from PlayerInput to serde_json::Value
    ) -> Result<(), GatewayError> {
        if !*self.connected.read().await {
            return Err(GatewayError::Connection {
                message: "Not connected to worker service".to_string(),
                severity: ErrorSeverity::High
            });
        }

        // For now, just log the player input
        // In real implementation, this would send input to worker service
        info!("Player {} in room {} sent input (mock implementation)", player_id, room_id);
        Ok(())
    }

    /// Get circuit breaker state for monitoring
    pub fn circuit_breaker_state(&self) -> String {
        match self.circuit_breaker.state() {
            crate::circuit_breaker::CircuitBreakerState::Closed => "closed".to_string(),
            crate::circuit_breaker::CircuitBreakerState::Open => "open".to_string(),
            crate::circuit_breaker::CircuitBreakerState::HalfOpen => "half_open".to_string(),
        }
    }

    /// Get circuit breaker failure count for monitoring
    pub fn circuit_breaker_failure_count(&self) -> usize {
        self.circuit_breaker.failure_count()
    }

    /// Check if client is connected
    pub async fn is_connected(&self) -> bool {
        *self.connected.read().await
    }

    /// Attempt to reconnect to worker service
    pub async fn reconnect(&mut self) -> Result<(), GatewayError> {
        info!("Attempting to reconnect to worker service");

        // Reset circuit breaker
        self.circuit_breaker.reset();

        // Disconnect current connection
        *self.connected.write().await = false;
        self.client = None;

        // Attempt new connection
        self.connect().await
    }

    /// Gracefully shutdown the client
    pub async fn shutdown(&mut self) {
        info!("Shutting down worker client");
        *self.connected.write().await = false;
        self.client = None;
        self.circuit_breaker.reset();
    }

    /// Health check method
    pub async fn health_check(&mut self, _request: tonic::Request<HealthCheckRequest>) -> Result<tonic::Response<HealthCheckResponse>, GatewayError> {
        if !*self.connected.read().await {
            return Err(GatewayError::Connection {
                message: "Not connected to worker service".to_string(),
                severity: ErrorSeverity::High
            });
        }

        match &mut self.client {
            Some(client) => {
                match client.health_check(tonic::Request::new(HealthCheckRequest {})).await {
                    Ok(response) => Ok(response),
                    Err(e) => Err(GatewayError::Connection {
                        message: format!("Worker health check failed: {}", e),
                        severity: ErrorSeverity::High
                    })
                }
            }
            None => Err(GatewayError::Connection {
                message: "gRPC client not initialized".to_string(),
                severity: ErrorSeverity::High
            })
        }
    }

    /// Push input method (mock implementation for now)
    pub async fn push_input(&mut self, request: proto::worker::v1::PushInputRequest) -> Result<tonic::Response<proto::worker::v1::PushInputResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::PushInputResponse {
            ok: true,
            room_id: request.room_id,
            snapshot: None,
            error: "".to_string(),
        }))
    }

    /// Join room method (mock implementation for now)
    pub async fn join_room(&mut self, request: proto::worker::v1::JoinRoomRequest) -> Result<tonic::Response<proto::worker::v1::JoinRoomResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::JoinRoomResponse {
            ok: true,
            room_id: request.room_id,
            snapshot: None,
            error: "".to_string(),
        }))
    }

    /// Leave room method (mock implementation for now)
    pub async fn leave_room(&mut self, request: proto::worker::v1::LeaveRoomRequest) -> Result<tonic::Response<proto::worker::v1::LeaveRoomResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::LeaveRoomResponse {
            ok: true,
            room_id: request.room_id,
            error: "".to_string(),
        }))
    }

    /// Send chat message method (mock implementation for now)
    pub async fn send_chat_message(&mut self, _request: tonic::Request<proto::worker::v1::SendChatMessageRequest>) -> Result<tonic::Response<proto::worker::v1::SendChatMessageResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::SendChatMessageResponse {
            success: true,
            message_id: format!("msg_{}", chrono::Utc::now().timestamp()),
            error: "".to_string(),
        }))
    }

    /// Get chat history method (mock implementation for now)
    pub async fn get_chat_history(&mut self, _request: tonic::Request<proto::worker::v1::GetChatHistoryRequest>) -> Result<tonic::Response<proto::worker::v1::GetChatHistoryResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::GetChatHistoryResponse {
            success: true,
            messages: vec![],
            error: "".to_string(),
        }))
    }

    /// Create room method (mock implementation for now)
    pub async fn create_room(&mut self, _request: proto::worker::v1::CreateRoomRequest) -> Result<tonic::Response<proto::worker::v1::CreateRoomResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::CreateRoomResponse {
            success: true,
            room_id: format!("room_{}", chrono::Utc::now().timestamp()),
            error: "".to_string(),
        }))
    }

    /// List rooms method (mock implementation for now)
    pub async fn list_rooms(&mut self, _request: tonic::Request<proto::worker::v1::ListRoomsRequest>) -> Result<tonic::Response<proto::worker::v1::ListRoomsResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::ListRoomsResponse {
            success: true,
            rooms: vec![],
            error: "".to_string(),
        }))
    }

    /// Get room info method (mock implementation for now)
    pub async fn get_room_info(&mut self, _request: proto::worker::v1::GetRoomInfoRequest) -> Result<tonic::Response<proto::worker::v1::GetRoomInfoResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::GetRoomInfoResponse {
            success: true,
            room: None,
            error: "".to_string(),
        }))
    }

    /// Join room as player method (mock implementation for now)
    pub async fn join_room_as_player(&mut self, _request: proto::worker::v1::JoinRoomAsPlayerRequest) -> Result<tonic::Response<proto::worker::v1::JoinRoomAsPlayerResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::JoinRoomAsPlayerResponse {
            success: true,
            error: "".to_string(),
        }))
    }

    /// Start game method (mock implementation for now)
    pub async fn start_game(&mut self, _request: proto::worker::v1::StartGameRequest) -> Result<tonic::Response<proto::worker::v1::StartGameResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::StartGameResponse {
            success: true,
            error: "".to_string(),
        }))
    }

    /// End game method (mock implementation for now)
    pub async fn end_game(&mut self, _request: proto::worker::v1::EndGameRequest) -> Result<tonic::Response<proto::worker::v1::EndGameResponse>, GatewayError> {
        // For now, return mock response
        Ok(tonic::Response::new(proto::worker::v1::EndGameResponse {
            success: true,
            error: "".to_string(),
        }))
    }
}

impl Default for WorkerClient {
    fn default() -> Self {
        Self::new("http://localhost:50051".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_client_creation() {
        let client = WorkerClient::new("http://localhost:50051".to_string());
        assert!(!client.is_connected().await);
        assert_eq!(client.circuit_breaker_state(), "closed");
        assert_eq!(client.circuit_breaker_failure_count(), 0);
    }

    #[tokio::test]
    async fn test_circuit_breaker_integration() {
        let client = WorkerClient::new("http://localhost:50051".to_string());

        // Circuit breaker should start in closed state
        assert_eq!(client.circuit_breaker_state(), "closed");

        // Manually trigger some failures to test circuit breaker
        for _ in 0..3 {
            let _ = client.circuit_breaker.call(|| {
                Err::<(), _>(std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "test"))
            }).await;
        }

        // Circuit breaker should be open after 3 failures
        assert_eq!(client.circuit_breaker_state(), "open");
    }
}
