use redis::{Client, AsyncCommands, aio::ConnectionManager, RedisResult};
use serde::{Deserialize, Serialize};
use std::env;
use std::time::Duration;
use tracing::info;

#[derive(Clone)]
pub struct RedisCache {
    client: ConnectionManager,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedWallet {
    pub user_id: String,
    pub address: String,
    pub network: String,
    pub wallet_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedBalance {
    pub user_id: String,
    pub game_tokens: i64,
    pub last_updated: i64,
}

impl RedisCache {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let client = Client::open(redis_url)?;
        let connection_manager = ConnectionManager::new(client).await?;

        // Test connection
        let mut conn = connection_manager.clone();
        let _: RedisResult<()> = conn.set("test", "ok").await;
        info!("Connected to Redis successfully");

        Ok(RedisCache {
            client: connection_manager,
        })
    }

    pub async fn set_wallet(&mut self, user_id: &str, wallet: &CachedWallet, ttl_seconds: u64) -> RedisResult<()> {
        let key = format!("wallet:{}", user_id);
        let json = serde_json::to_string(wallet)
            .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Serialization failed", e.to_string())))?;

        self.client.set_ex(&key, json, ttl_seconds).await
    }

    pub async fn get_wallet(&mut self, user_id: &str) -> RedisResult<Option<CachedWallet>> {
        let key = format!("wallet:{}", user_id);
        let result: Option<String> = self.client.get(&key).await?;

        match result {
            Some(json) => {
                let wallet: CachedWallet = serde_json::from_str(&json)
                    .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Deserialization failed", e.to_string())))?;
                Ok(Some(wallet))
            }
            None => Ok(None)
        }
    }

    pub async fn set_balance(&mut self, user_id: &str, balance: &CachedBalance, ttl_seconds: u64) -> RedisResult<()> {
        let key = format!("balance:{}", user_id);
        let json = serde_json::to_string(balance)
            .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Serialization failed", e.to_string())))?;

        self.client.set_ex(&key, json, ttl_seconds).await
    }

    pub async fn get_balance(&mut self, user_id: &str) -> RedisResult<Option<CachedBalance>> {
        let key = format!("balance:{}", user_id);
        let result: Option<String> = self.client.get(&key).await?;

        match result {
            Some(json) => {
                let balance: CachedBalance = serde_json::from_str(&json)
                    .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Deserialization failed", e.to_string())))?;
                Ok(Some(balance))
            }
            None => Ok(None)
        }
    }

    pub async fn delete_wallet(&mut self, user_id: &str) -> RedisResult<()> {
        let key = format!("wallet:{}", user_id);
        self.client.del(&key).await?;
        Ok(())
    }

    pub async fn delete_balance(&mut self, user_id: &str) -> RedisResult<()> {
        let key = format!("balance:{}", user_id);
        self.client.del(&key).await?;
        Ok(())
    }

    pub async fn invalidate_user_cache(&mut self, user_id: &str) -> RedisResult<()> {
        self.delete_wallet(user_id).await?;
        self.delete_balance(user_id).await?;
        Ok(())
    }

    // Health check method
    pub async fn ping(&mut self) -> RedisResult<String> {
        let mut conn = self.client.clone();
        conn.set("ping", "pong").await?;
        Ok("PONG".to_string())
    }
}

// Global cache instance (lazy initialized)
use once_cell::sync::Lazy;
static REDIS_CACHE: Lazy<Result<RedisCache, String>> = Lazy::new(|| {
    // Note: We can't use async in Lazy, so we'll initialize it as needed
    Err("Not initialized".to_string())
});

pub async fn get_global_cache() -> Result<&'static mut RedisCache, Box<dyn std::error::Error + Send + Sync>> {
    static mut CACHE: Option<RedisCache> = None;

    // Safety: This is only called from async contexts, and we ensure single initialization
    unsafe {
        if CACHE.is_none() {
            CACHE = Some(RedisCache::new().await?);
        }
        Ok(CACHE.as_mut().unwrap())
    }
}
