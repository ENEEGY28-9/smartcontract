use std::sync::Arc;
use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    commitment_config::CommitmentConfig,
};
use spl_token::instruction as token_instruction;
use spl_associated_token_account::instruction as associated_token_instruction;

/// Direct Solana client for token operations
#[derive(Clone)]
pub struct SolanaTransferClient {
    rpc_client: RpcClient,
    game_token_mint: Pubkey,
    game_pool_account: Pubkey,
    owner_keypair: Keypair,
    token_decimals: u8,
}

impl SolanaTransferClient {
    pub fn new(
        rpc_url: &str,
        game_token_mint: &str,
        game_pool_account: &str,
        owner_private_key: &str,
        token_decimals: u8,
    ) -> Result<Self> {
        let rpc_client = RpcClient::new_with_commitment(
            rpc_url.to_string(),
            CommitmentConfig::confirmed()
        );

        Ok(Self {
            rpc_client,
            game_token_mint: game_token_mint.parse().map_err(|_| anyhow::anyhow!("Invalid game token mint address"))?,
            game_pool_account: game_pool_account.parse().map_err(|_| anyhow::anyhow!("Invalid game pool account address"))?,
            owner_keypair: Keypair::from_base58_string(owner_private_key),
            token_decimals,
        })
    }

    /// Get game pool token balance
    pub async fn get_game_pool_balance(&self) -> Result<u64> {
        let game_pool_token_account = spl_associated_token_account::get_associated_token_address(
            &self.game_pool_account,
            &self.game_token_mint,
        );

        match self.rpc_client.get_token_account_balance(&game_pool_token_account) {
            Ok(balance) => {
                let amount = balance.ui_amount
                    .ok_or_else(|| anyhow::anyhow!("Invalid balance format"))?;
                Ok((amount * 10_f64.powi(self.token_decimals as i32)) as u64)
            }
            Err(_) => Ok(0), // Account doesn't exist or is empty
        }
    }

    /// Transfer tokens from game pool to user wallet
    pub async fn transfer_from_game_pool(&self, user_wallet: &str, amount: u64) -> Result<String> {
        let user_pubkey: Pubkey = user_wallet.parse()
            .map_err(|_| anyhow::anyhow!("Invalid user wallet address"))?;

        // Get associated token accounts
        let game_pool_token_account = spl_associated_token_account::get_associated_token_address(
            &self.game_pool_account,
            &self.game_token_mint,
        );

        let user_token_account = spl_associated_token_account::get_associated_token_address(
            &user_pubkey,
            &self.game_token_mint,
        );

        let mut instructions = vec![];

        // Check if user token account exists, create if not
        if let Err(_) = self.rpc_client.get_account(&user_token_account) {
            instructions.push(
                associated_token_instruction::create_associated_token_account(
                    &self.owner_keypair.pubkey(),
                    &user_pubkey,
                    &self.game_token_mint,
                )
            );
        }

        // Transfer instruction
        instructions.push(
            token_instruction::transfer_checked(
                &spl_token::id(),
                &game_pool_token_account,
                &self.game_token_mint,
                &user_token_account,
                &self.game_pool_account,
                &[],
                amount,
                self.token_decimals,
            )?
        );

        // Get recent blockhash and create transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let mut transaction = Transaction::new_with_payer(
            &instructions,
            Some(&self.owner_keypair.pubkey())
        );

        // Sign transaction
        transaction.sign(&[&self.owner_keypair], recent_blockhash);

        // Send and confirm transaction
        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)?;

        tracing::info!("✅ Successfully transferred {} tokens from game pool to {} - TX: {}",
            amount, user_wallet, signature);

        Ok(signature.to_string())
    }

    /// Transfer SOL (not tokens) from game pool to user wallet
    pub async fn transfer_sol_from_game_pool(&self, user_wallet: &str, amount_lamports: u64) -> Result<String> {
        let user_pubkey: Pubkey = user_wallet.parse()
            .map_err(|_| anyhow::anyhow!("Invalid user wallet address"))?;

        // Create transfer instruction for SOL (native transfer)
        let transfer_instruction = solana_sdk::system_instruction::transfer(
            &self.game_pool_account,
            &user_pubkey,
            amount_lamports,
        );

        // Get recent blockhash and create transaction
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        let mut transaction = Transaction::new_with_payer(
            &[transfer_instruction],
            Some(&self.game_pool_account)
        );

        // Sign transaction with game pool account (owner keypair)
        transaction.sign(&[&self.owner_keypair], recent_blockhash);

        // Send and confirm transaction
        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)?;

        tracing::info!("✅ Successfully transferred {} lamports ({} SOL) from game pool to {} - TX: {}",
            amount_lamports, amount_lamports as f64 / 1_000_000_000.0, user_wallet, signature);

        Ok(signature.to_string())
    }

    /// Get SOL balance of an account
    pub async fn get_sol_balance(&self, wallet_address: &str) -> Result<u64> {
        let pubkey: Pubkey = wallet_address.parse()
            .map_err(|_| anyhow::anyhow!("Invalid wallet address"))?;

        let balance = self.rpc_client.get_balance(&pubkey)?;
        Ok(balance)
    }
}
