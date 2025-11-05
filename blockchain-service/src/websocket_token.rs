use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use tokio_tungstenite::tungstenite::Message;
use serde::{Serialize, Deserialize};
use tracing::{info, warn};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TokenUpdateMessage {
    pub user_id: String,
    pub new_balance: u64,
    pub amount_minted: i64,
    pub timestamp: i64,
}

pub struct TokenWebSocketManager {
    connections: RwLock<HashMap<String, broadcast::Sender<Message>>>,
}

impl TokenWebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
        }
    }

    /// Add a new WebSocket connection for a user
    pub async fn add_connection(&self, user_id: String, sender: broadcast::Sender<Message>) {
        let mut connections = self.connections.write().await;
        connections.insert(user_id.clone(), sender);
        info!("👤 [WS] Added WebSocket connection for user: {}", user_id);
    }

    /// Remove WebSocket connection for a user
    pub async fn remove_connection(&self, user_id: &str) {
        let mut connections = self.connections.write().await;
        connections.remove(user_id);
        info!("👋 [WS] Removed WebSocket connection for user: {}", user_id);
    }

    /// Send token update to specific user
    pub async fn send_token_update(
        &self,
        user_id: &str,
        new_balance: u64,
        amount_minted: i64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let connections = self.connections.read().await;

        if let Some(sender) = connections.get(user_id) {
            let message = TokenUpdateMessage {
                user_id: user_id.to_string(),
                new_balance,
                amount_minted,
                timestamp: chrono::Utc::now().timestamp(),
            };

            let json_message = serde_json::to_string(&message)?;
            let ws_message = Message::Text(json_message);

            // Send to WebSocket connection
            let _ = sender.send(ws_message);

            info!("📡 [WS] Sent token update to user {}: balance={}, minted={}",
                  user_id, new_balance, amount_minted);
        } else {
            warn!("⚠️ [WS] No WebSocket connection found for user: {}", user_id);
        }

        Ok(())
    }

    /// Broadcast token update to all connected users (for global events)
    pub async fn broadcast_token_update(
        &self,
        message: TokenUpdateMessage,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let connections = self.connections.read().await;
        let json_message = serde_json::to_string(&message)?;
        let ws_message = Message::Text(json_message.clone());

        for (user_id, sender) in connections.iter() {
            let _ = sender.send(ws_message.clone());
        }

        info!("📢 [WS] Broadcasted token update to {} users", connections.len());
        Ok(())
    }

    /// Get connection count for monitoring
    pub async fn get_connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }
}

// WebSocket handler function (to be called by the WebSocket server)
pub async fn handle_token_websocket(
    websocket_manager: Arc<TokenWebSocketManager>,
    user_id: String,
    mut receiver: tokio::sync::mpsc::UnboundedReceiver<Message>,
) {
    // Create broadcast channel for this connection
    let (tx, _rx) = broadcast::channel(100);

    // Add connection to manager
    websocket_manager.add_connection(user_id.clone(), tx.clone()).await;

    // Handle incoming messages from client
    while let Some(msg) = receiver.recv().await {
        match msg {
            Message::Text(text) => {
                info!("📨 [WS] Received message from user {}: {}", user_id, text);
                // Handle client messages if needed (e.g., ping/pong)
            }
            Message::Close(_) => {
                info!("🔌 [WS] Connection closed for user: {}", user_id);
                break;
            }
            _ => {} // Handle other message types
        }
    }

    // Remove connection when done
    websocket_manager.remove_connection(&user_id).await;
}



