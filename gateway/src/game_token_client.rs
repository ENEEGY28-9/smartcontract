use anchor_client::{Client, Cluster, Program};
use anchor_lang::prelude::*;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
};
use std::sync::Arc;

// Game Token Program ID (same as in Anchor.toml)
pub const GAME_TOKEN_PROGRAM_ID: &str = "GAMETOKEN11111111111111111111111111111112";

#[derive(Clone)]
pub struct GameTokenClient {
    program: Program<Arc<Keypair>>,
    rpc_client: Arc<RpcClient>,
}

impl GameTokenClient {
    pub fn new(
        anchor_client: Arc<Client<Arc<Keypair>>>,
        rpc_client: RpcClient,
    ) -> anyhow::Result<Self> {
        let program_id = Pubkey::from_str(GAME_TOKEN_PROGRAM_ID)?;
        let program = anchor_client.program(program_id)?;

        Ok(Self {
            program,
            rpc_client: Arc::new(rpc_client),
        })
    }

    pub async fn initialize_program(&self) -> anyhow::Result<String> {
        let authority_keypair = Keypair::new();
        let authority_pubkey = authority_keypair.pubkey();

        // Derive PDA for authority
        let (authority_pda, _) = Pubkey::find_program_address(
            &[b"authority"],
            &self.program.id(),
        );

        // Create initialize instruction
        let tx = self.program
            .request()
            .accounts(game_token::accounts::Initialize {
                owner: self.program.payer(),
                authority: authority_pda,
                system_program: solana_sdk::system_program::id(),
            })
            .args(game_token::instruction::Initialize {})
            .send()
            .await?;

        tracing::info!("Program initialized with authority PDA: {}", authority_pda);
        Ok(tx.to_string())
    }

    pub async fn mint_token_on_eat_particle(
        &self,
        player_wallet: &str,
        particle_location: (i32, i32),
    ) -> anyhow::Result<String> {
        let player_pubkey = Pubkey::from_str(player_wallet)?;

        // Derive PDAs
        let (authority_pda, _) = Pubkey::find_program_address(
            &[b"authority"],
            &self.program.id(),
        );

        let (game_pools_pda, _) = Pubkey::find_program_address(
            &[b"game_pools"],
            &self.program.id(),
        );

        let (player_stats_pda, _) = Pubkey::find_program_address(
            &[b"player_stats", player_pubkey.as_ref()],
            &self.program.id(),
        );

        // Create associated token accounts for game pools and owner
        // This is simplified - in production you'd use proper ATA creation
        let game_token_mint = Pubkey::from_str(GAME_TOKEN_PROGRAM_ID)?;
        let game_pools_token_account = game_pools_pda; // Simplified
        let owner_token_account = self.program.payer(); // Simplified - should be proper ATA

        // Execute eat_energy_particle instruction
        let tx = self.program
            .request()
            .accounts(game_token::accounts::EatEnergyParticle {
                player: player_pubkey,
                authority: authority_pda,
                game_pools: game_pools_pda,
                game_pools_token_account,
                owner_token_account,
                game_token_mint,
                player_stats: player_stats_pda,
                token_program: spl_token::id(),
                associated_token_program: spl_associated_token_account::id(),
                system_program: solana_sdk::system_program::id(),
                clock: solana_sdk::sysvar::clock::id(),
            })
            .args(game_token::instruction::EatEnergyParticle {
                particle_location,
            })
            .send()
            .await?;

        tracing::info!(
            "Token minted for player {} at location {:?}, TX: {}",
            player_wallet,
            particle_location,
            tx
        );

        Ok(tx.to_string())
    }

    pub async fn transfer_tokens(
        &self,
        from_wallet: &str,
        to_wallet: &str,
        amount: u64,
    ) -> anyhow::Result<String> {
        let from_pubkey = Pubkey::from_str(from_wallet)?;
        let to_pubkey = Pubkey::from_str(to_wallet)?;

        // This would implement the transfer logic
        // For now, return mock - need to implement actual transfer instruction
        tracing::info!(
            "Transferring {} tokens from {} to {}",
            amount,
            from_wallet,
            to_wallet
        );

        // Mock implementation - replace with real transfer instruction
        Ok(format!("transfer_tx_{}_{}_{}", from_wallet, to_wallet, amount))
    }

    pub async fn get_player_balance(&self, player_wallet: &str) -> anyhow::Result<u64> {
        let player_pubkey = Pubkey::from_str(player_wallet)?;

        let (player_stats_pda, _) = Pubkey::find_program_address(
            &[b"player_stats", player_pubkey.as_ref()],
            &self.program.id(),
        );

        // Try to fetch player stats account
        match self.program.account::<game_token::PlayerMintStats>(player_stats_pda).await {
            Ok(stats) => Ok(stats.total_earned),
            Err(_) => Ok(0), // Player hasn't minted any tokens yet
        }
    }

    pub async fn get_program_stats(&self) -> anyhow::Result<game_token::MintingAuthority> {
        let (authority_pda, _) = Pubkey::find_program_address(
            &[b"authority"],
            &self.program.id(),
        );

        let authority = self.program
            .account::<game_token::MintingAuthority>(authority_pda)
            .await?;

        Ok(authority)
    }
}

// Module declarations for game_token program types
// These should match the Anchor program
pub mod game_token {
    use super::*;

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct Initialize {}

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct EatEnergyParticle {
        pub particle_location: (i32, i32),
    }

    #[derive(Accounts)]
    pub struct InitializeAccounts<'info> {
        #[account(mut)]
        pub owner: Signer<'info>,

        #[account(
            init,
            payer = owner,
            space = 8 + 73, // Size of MintingAuthority
            seeds = [b"authority"],
            bump
        )]
        pub authority: Account<'info, MintingAuthority>,

        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct EatEnergyParticleAccounts<'info> {
        #[account(mut)]
        pub player: Signer<'info>,

        #[account(mut, seeds = [b"authority"], bump = authority.bump)]
        pub authority: Account<'info, MintingAuthority>,

        #[account(mut, seeds = [b"game_pools"], bump = game_pools.bump)]
        pub game_pools: Account<'info, GameTokenPools>,

        #[account(mut)]
        pub game_pools_token_account: Account<'info, TokenAccount>,

        #[account(mut)]
        pub owner_token_account: Account<'info, TokenAccount>,

        #[account(mut)]
        pub game_token_mint: Account<'info, Mint>,

        #[account(
            init_if_needed,
            payer = player,
            space = 8 + 73, // Size of PlayerMintStats
            seeds = [b"player_stats", player.key().as_ref()],
            bump
        )]
        pub player_stats: Account<'info, PlayerMintStats>,

        pub token_program: Program<'info, Token>,
        pub associated_token_program: Program<'info, AssociatedToken>,
        pub system_program: Program<'info, System>,
        pub clock: Sysvar<'info, Clock>,
    }

    // Account structs (simplified versions for client)
    #[account]
    #[derive(Default, Debug)]
    pub struct MintingAuthority {
        pub owner: Pubkey,
        pub total_minted: u64,
        pub is_infinite: bool,
        pub max_supply: u64,
        pub max_mints_per_player_per_minute: u8,
        pub bump: u8,
    }

    #[account]
    #[derive(Default, Debug)]
    pub struct PlayerMintStats {
        pub player: Pubkey,
        pub session_tokens: u64,
        pub last_mint_minute: i64,
        pub mints_this_minute: u8,
        pub total_earned: u64,
        pub bump: u8,
    }

    #[account]
    #[derive(Default, Debug)]
    pub struct GameTokenPools {
        pub authority: Pubkey,
        pub active_pool: u64,
        pub reward_pool: u64,
        pub reserve_pool: u64,
        pub burn_pool: u64,
        pub game_token_mint: Pubkey,
        pub bump: u8,
    }

    // Re-export necessary modules
    pub mod accounts {
        pub use super::InitializeAccounts as Initialize;
        pub use super::EatEnergyParticleAccounts as EatEnergyParticle;
    }

    pub mod instruction {
        pub use super::Initialize;
        pub use super::EatEnergyParticle;
    }
}



