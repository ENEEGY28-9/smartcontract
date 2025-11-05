use std::sync::Arc;
use anyhow::Result;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    commitment_config::CommitmentConfig,
    system_instruction,
    instruction::Instruction,
};
use solana_client::rpc_client::RpcClient;
use anchor_client::{Client, Cluster, Program};
use anchor_lang::prelude::*;

// Import game token program types - temporarily disabled
// TODO: Re-enable when Anchor program is properly integrated
// use game_token::{
//     accounts::*,
//     instruction::*,
//     GameToken as GameTokenProgram,
// };

// Program constants
const GAME_TOKEN_PROGRAM_ID: &str = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
const DECIMALS: u8 = 6;

pub struct GameTokenClient {
    client: Client<Arc<Keypair>>,
    rpc_client: Arc<RpcClient>,
    program: Program<Arc<Keypair>>,
    program_id: Pubkey,
    payer_keypair: Arc<Keypair>,
}

impl GameTokenClient {
    pub fn new(
        payer_keypair: Arc<Keypair>,
        rpc_url: &str,
    ) -> Result<Self> {
        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            rpc_url.to_string(),
            CommitmentConfig::confirmed(),
        ));

        let client = Client::new_with_options(
            Cluster::Custom(rpc_url.to_string(), rpc_url.to_string()),
            payer_keypair.clone(),
            CommitmentConfig::confirmed(),
        );

        let program_id = GAME_TOKEN_PROGRAM_ID.parse::<Pubkey>()?;
        let program = client.program(program_id)?;

        Ok(Self {
            client,
            rpc_client,
            program,
            program_id,
            payer_keypair: payer_keypair.clone(),
        })
    }

    // Placeholder constructor for development - will be replaced with real Solana integration
    pub fn new_placeholder() -> Self {
        // Create dummy values for placeholder
        let dummy_keypair = Arc::new(Keypair::new());
        let dummy_program_id = GAME_TOKEN_PROGRAM_ID.parse().unwrap();

        let client = Client::new_with_options(
            Cluster::Devnet,
            dummy_keypair.clone(),
            CommitmentConfig::confirmed(),
        );

        let program = client.program(dummy_program_id).unwrap();

        Self {
            client,
            rpc_client: Arc::new(RpcClient::new("https://api.devnet.solana.com")),
            program,
            program_id: dummy_program_id,
            payer_keypair: dummy_keypair,
        }
    }

    /// Mint tokens when player eats energy particle - REAL SOLANA/ANCHOR CALL
    pub async fn mint_token_on_eat_particle(
        &self,
        player_wallet: &str,
        particle_location: (i32, i32),
    ) -> Result<String> {
        let player_pubkey = player_wallet.parse::<Pubkey>()?;

        // Get PDAs
        let (minting_authority_pda, _authority_bump) = Pubkey::find_program_address(
            &[b"minting_authority"],
            &self.program_id,
        );

        let (game_pools_pda, _pools_bump) = Pubkey::find_program_address(
            &[b"game_pools"],
            &self.program_id,
        );

        let (player_stats_pda, _stats_bump) = Pubkey::find_program_address(
            &[b"player_stats", player_pubkey.as_ref()],
            &self.program_id,
        );

        // Get game token mint (this would be stored in game_pools account)
        let game_token_mint = self.get_game_token_mint().await?;

        // Build instruction manually for now
        // TODO: Use proper Anchor instruction when program is integrated
        let mut instruction_data = vec![1u8]; // EatEnergyParticle instruction discriminator
        instruction_data.extend_from_slice(&(particle_location.0 as i32).to_le_bytes());
        instruction_data.extend_from_slice(&(particle_location.1 as i32).to_le_bytes());


        let ix = solana_sdk::instruction::Instruction {
            program_id: self.program_id,
            accounts: vec![
                solana_sdk::instruction::AccountMeta::new(minting_authority_pda, false),
                solana_sdk::instruction::AccountMeta::new(game_pools_pda, false),
                solana_sdk::instruction::AccountMeta::new(player_stats_pda, false),
                solana_sdk::instruction::AccountMeta::new(player_pubkey, true),
                solana_sdk::instruction::AccountMeta::new(anchor_spl::associated_token::get_associated_token_address(
                    &game_pools_pda,
                    &game_token_mint,
                ), false),
                // For now, use a placeholder authority - in production this would be from MintingAuthority account
                solana_sdk::instruction::AccountMeta::new(anchor_spl::associated_token::get_associated_token_address(
                    &Pubkey::new_unique(), // Placeholder - should be MintingAuthority.owner
                    &game_token_mint,
                ), false),
                solana_sdk::instruction::AccountMeta::new(game_token_mint, false),
            ],
            data: instruction_data,
        };

        // Send transaction manually for now
        // TODO: Use proper Anchor client when program is integrated
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let transaction = solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[ix],
            Some(&self.payer_keypair.pubkey()),
            &[self.payer_keypair.as_ref()],
            recent_blockhash,
        );

        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)?;

        tracing::info!("🎯 [REAL SOLANA] Minted tokens for player {} at location {:?}, tx: {}", player_wallet, particle_location, signature);
        Ok(signature.to_string())
    }

    /// Helper method to get game token mint address
    async fn get_game_token_mint(&self) -> Result<Pubkey> {
        // In production, this would query the game_pools account to get the mint
        // For now, derive it from program ID
        let (mint_pda, _bump) = Pubkey::find_program_address(
            &[b"game_token_mint"],
            &self.program_id,
        );
        Ok(mint_pda)
    }

    /// Transfer tokens between players
    pub async fn transfer_tokens(
        &self,
        from_wallet: &str,
        to_wallet: &str,
        amount: u64,
    ) -> Result<String> {
        let from_pubkey = from_wallet.parse::<Pubkey>()?;
        let to_pubkey = to_wallet.parse::<Pubkey>()?;
        let game_token_mint = self.get_game_token_mint().await?;

        // Get associated token accounts
        let from_ata = anchor_spl::associated_token::get_associated_token_address(
            &from_pubkey,
            &game_token_mint,
        );
        let to_ata = anchor_spl::associated_token::get_associated_token_address(
            &to_pubkey,
            &game_token_mint,
        );

        // Build transfer instruction manually
        let transfer_ix = spl_token::instruction::transfer(
            &game_token_mint,
            &from_ata,
            &to_ata,
            &from_pubkey,
            &[],
            amount,
        )?;

        // Send transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let transaction = solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&from_pubkey),
            &[self.payer_keypair.as_ref()],
            recent_blockhash,
        );

        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)?;

        tracing::info!("💸 [REAL] Transferred {} tokens from {} to {}, tx: {}", amount, from_wallet, to_wallet, signature);
        Ok(signature.to_string())
    }

    /// Get player token balance
    pub async fn get_player_balance(&self, player_wallet: &str) -> Result<u64> {
        let player_pubkey = player_wallet.parse::<Pubkey>()?;
        let game_token_mint = self.get_game_token_mint().await?;

        // Get associated token account
        let ata = anchor_spl::associated_token::get_associated_token_address(
            &player_pubkey,
            &game_token_mint,
        );

        // Query token account balance
        let balance = self.rpc_client.get_token_account_balance(&ata)?;

        let amount = balance.ui_amount
            .unwrap_or(0.0)
            .to_string()
            .parse::<u64>()?;

        tracing::info!("💰 [REAL] Player {} balance: {} tokens", player_wallet, amount);
        Ok(amount)
    }

    /// Emit real-time token update via WebSocket
    pub async fn emit_token_update(
        &self,
        user_id: &str,
        amount_minted: i64,
    ) -> Result<()> {
        // Get updated balance
        let wallet_address = self.get_wallet_from_user_id(user_id).await?;
        let new_balance = self.get_player_balance(&wallet_address).await?;

        // Emit WebSocket update via the websocket manager
        // This will be called from main.rs where websocket_manager is available
        tracing::info!("🎯 Token update emitted for user {}: +{} tokens, balance: {}", user_id, amount_minted, new_balance);

        Ok(())
    }

    /// Helper: Get wallet address from user ID (placeholder)
    async fn get_wallet_from_user_id(&self, user_id: &str) -> Result<String> {
        // TODO: Query database or cache to get wallet address for user_id
        // For now, return placeholder - in production this would query PocketBase or cache
        Ok(format!("wallet_for_user_{}", user_id))
    }
}
