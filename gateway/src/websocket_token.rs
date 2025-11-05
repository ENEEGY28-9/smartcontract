use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;

pub type TokenWebSocketRegistry = Arc<RwLock<HashMap<String, TokenWebSocketConnection>>>;

#[derive(Debug, Clone)]
pub struct TokenWebSocketConnection {
    pub user_id: String,
    pub sender: tokio::sync::mpsc::UnboundedSender<Message>,
}

impl TokenWebSocketConnection {
    pub fn new(user_id: String, sender: tokio::sync::mpsc::UnboundedSender<Message>) -> Self {
        Self { user_id, sender }
    }
}

pub struct TokenWebSocketManager {
    registry: TokenWebSocketRegistry,
}

impl TokenWebSocketManager {
    pub fn new() -> Self {
        Self {
            registry: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn get_registry(&self) -> TokenWebSocketRegistry {
        self.registry.clone()
    }

    pub async fn add_connection(&self, user_id: String, sender: tokio::sync::mpsc::UnboundedSender<Message>) {
        let connection = TokenWebSocketConnection::new(user_id.clone(), sender);
        let mut registry = self.registry.write().await;
        registry.insert(user_id, connection);
        tracing::info!("Added token WebSocket connection for user: {}", user_id);
    }

    pub async fn remove_connection(&self, user_id: &str) {
        let mut registry = self.registry.write().await;
        if registry.remove(user_id).is_some() {
            tracing::info!("Removed token WebSocket connection for user: {}", user_id);
        }
    }

    pub async fn send_token_update(&self, user_id: &str, new_balance: u64, amount_minted: i64) -> anyhow::Result<()> {
        let registry = self.registry.read().await;

        if let Some(connection) = registry.get(user_id) {
            let message = json!({
                "type": "token_update",
                "user_id": user_id,
                "new_balance": new_balance,
                "amount_minted": amount_minted,
                "timestamp": chrono::Utc::now().timestamp()
            });

            let msg = Message::Text(message.to_string());
            if let Err(e) = connection.sender.send(msg) {
                tracing::warn!("Failed to send token update to user {}: {:?}", user_id, e);
                // Connection might be dead, but we'll handle cleanup elsewhere
            } else {
                tracing::info!("Sent token update to user {}: balance={}, minted={}", user_id, new_balance, amount_minted);
            }
        } else {
            tracing::debug!("No active WebSocket connection for user {}", user_id);
        }

        Ok(())
    }

    pub async fn broadcast_token_stats(&self, stats: serde_json::Value) -> anyhow::Result<()> {
        let registry = self.registry.read().await;
        let message = json!({
            "type": "token_stats",
            "stats": stats,
            "timestamp": chrono::Utc::now().timestamp()
        });

        let msg = Message::Text(message.to_string());
        let mut dead_connections = Vec::new();

        for (user_id, connection) in registry.iter() {
            if let Err(_) = connection.sender.send(msg.clone()) {
                dead_connections.push(user_id.clone());
            }
        }

        // Clean up dead connections
        if !dead_connections.is_empty() {
            let mut registry = self.registry.write().await;
            for user_id in dead_connections {
                registry.remove(&user_id);
                tracing::info!("Cleaned up dead token WebSocket connection for user: {}", user_id);
            }
        }

        Ok(())
    }

    pub async fn get_connection_count(&self) -> usize {
        let registry = self.registry.read().await;
        registry.len()
    }
}

pub async fn handle_token_websocket(
    websocket: WebSocket,
    user_id: String,
    ws_manager: Arc<TokenWebSocketManager>,
) {
    let (sender, mut receiver) = websocket.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

    // Add connection to registry
    ws_manager.add_connection(user_id.clone(), tx).await;

    // Spawn task to forward messages from channel to WebSocket
    let user_id_clone = user_id.clone();
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if sender.send(message).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages (ping/pong, etc.)
    while let Some(result) = receiver.next().await {
        match result {
            Ok(Message::Close(_)) => {
                tracing::info!("Token WebSocket closed for user: {}", user_id);
                break;
            }
            Ok(Message::Ping(data)) => {
                // Respond with pong
                let _ = ws_manager.send_token_update(&user_id, 0, 0).await; // Keep connection alive
            }
            Ok(Message::Pong(_)) => {
                // Pong received, connection is alive
            }
            Ok(Message::Text(text)) => {
                tracing::debug!("Received text message from {}: {}", user_id, text);
            }
            Err(e) => {
                tracing::warn!("Token WebSocket error for user {}: {:?}", user_id, e);
                break;
            }
        }
    }

    // Remove connection when done
    ws_manager.remove_connection(&user_id).await;
}



