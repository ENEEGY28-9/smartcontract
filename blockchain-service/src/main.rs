use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::transport::Server;
use tracing::{info, error};

// Import generated protobuf code - temporarily using manual definitions
pub mod blockchain;

use blockchain::blockchain_service_server::{BlockchainService, BlockchainServiceServer};
use blockchain::{MintTokenRequest, TransferRequest, BalanceRequest, TokenUpdateRequest, TransactionResponse, BalanceResponse};

mod game_token_client;
mod websocket_token;

// Blockchain service implementation
#[derive(Clone)]
pub struct MyBlockchainService {
    pub game_token_client: Arc<game_token_client::GameTokenClient>,
    pub websocket_manager: Arc<RwLock<websocket_token::TokenWebSocketManager>>,
}

#[tonic::async_trait]
impl BlockchainService for MyBlockchainService {
    async fn mint_token_on_eat_particle(
        &self,
        request: tonic::Request<MintTokenRequest>,
    ) -> Result<tonic::Response<TransactionResponse>, tonic::Status> {
        let req = request.into_inner();

        // Call real Solana/Anchor implementation
        match self.game_token_client.mint_token_on_eat_particle(
            &req.player_wallet,
            (req.particle_x, req.particle_z),
        ).await {
            Ok(tx_signature) => {
                Ok(tonic::Response::new(TransactionResponse {
                    success: true,
                    transaction_signature: tx_signature,
                    error_message: "".to_string(),
                }))
            }
            Err(e) => {
                error!("Mint token failed: {:?}", e);
                Ok(tonic::Response::new(TransactionResponse {
                    success: false,
                    transaction_signature: "".to_string(),
                    error_message: e.to_string(),
                }))
            }
        }
    }

    async fn transfer_tokens(
        &self,
        request: tonic::Request<TransferRequest>,
    ) -> Result<tonic::Response<TransactionResponse>, tonic::Status> {
        let req = request.into_inner();

        // Call real Solana/Anchor implementation
        match self.game_token_client.transfer_tokens(
            &req.from_wallet,
            &req.to_wallet,
            req.amount,
        ).await {
            Ok(tx_signature) => {
                Ok(tonic::Response::new(TransactionResponse {
                    success: true,
                    transaction_signature: tx_signature,
                    error_message: "".to_string(),
                }))
            }
            Err(e) => {
                error!("Transfer tokens failed: {:?}", e);
                Ok(tonic::Response::new(TransactionResponse {
                    success: false,
                    transaction_signature: "".to_string(),
                    error_message: e.to_string(),
                }))
            }
        }
    }

    async fn get_player_balance(
        &self,
        request: tonic::Request<BalanceRequest>,
    ) -> Result<tonic::Response<BalanceResponse>, tonic::Status> {
        let req = request.into_inner();

        // Call real Solana/Anchor implementation
        match self.game_token_client.get_player_balance(&req.player_wallet).await {
            Ok(balance) => {
                Ok(tonic::Response::new(BalanceResponse {
                    balance,
                    wallet_address: req.player_wallet,
                }))
            }
            Err(e) => {
                error!("Get balance failed: {:?}", e);
                Err(tonic::Status::internal(e.to_string()))
            }
        }
    }

    async fn emit_token_update(
        &self,
        request: tonic::Request<TokenUpdateRequest>,
    ) -> Result<tonic::Response<blockchain::Empty>, tonic::Status> {
        let req = request.into_inner();

        // Call real WebSocket implementation
        match self.game_token_client.emit_token_update(&req.user_id, req.amount_minted).await {
            Ok(_) => {
                // Also emit via WebSocket manager for real-time updates
                let websocket_manager = self.websocket_manager.read().await;
                if let Err(e) = websocket_manager.send_token_update(&req.user_id, 0, req.amount_minted).await {
                    error!("WebSocket emit failed: {:?}", e);
                }
                Ok(tonic::Response::new(blockchain::Empty {}))
            }
            Err(e) => {
                error!("Emit token update failed: {:?}", e);
                Err(tonic::Status::internal(e.to_string()))
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("🚀 Starting Blockchain Service for Eneegy Game");

    // Initialize real Solana client and Anchor program
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    // Load keypair from environment or create new one for development
    let keypair_path = std::env::var("SOLANA_KEYPAIR_PATH")
        .unwrap_or_else(|_| "~/.config/solana/id.json".to_string());

    let keypair = if std::path::Path::new(&keypair_path).exists() {
        solana_sdk::signature::read_keypair_file(&keypair_path)
            .map_err(|e| anyhow::anyhow!("Failed to load keypair: {}", e))?
    } else {
        info!("⚠️  No keypair found, creating new one for development");
        solana_sdk::signature::Keypair::new()
    };

    let keypair = Arc::new(keypair);

    // Initialize game token client with real Solana connection
    let game_token_client = Arc::new(
        game_token_client::GameTokenClient::new(keypair, &rpc_url)
            .unwrap_or_else(|e| {
                error!("Failed to initialize GameTokenClient: {}", e);
                info!("🔄 Falling back to placeholder client");
                game_token_client::GameTokenClient::new_placeholder()
            })
    );

    info!("🎯 Initialized GameTokenClient with RPC: {}", rpc_url);

    // Initialize WebSocket manager
    let websocket_manager = Arc::new(RwLock::new(websocket_token::TokenWebSocketManager::new()));

    let blockchain_service = MyBlockchainService {
        game_token_client,
        websocket_manager,
    };

    // Start gRPC server
    let addr = "0.0.0.0:50051".parse()?;
    info!("🎯 Blockchain gRPC server listening on {}", addr);

    Server::builder()
        .add_service(BlockchainServiceServer::new(blockchain_service))
        .serve(addr)
        .await?;

    Ok(())
}
