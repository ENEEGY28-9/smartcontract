use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount};

declare_id!("GAMETOKEN11111111111111111111111111111112");

#[program]
pub mod game_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        authority.owner = ctx.accounts.owner.key();
        authority.total_minted = 0;
        authority.is_infinite = true; // Start with infinite supply
        authority.max_supply = 0; // Not used when infinite
        authority.max_mints_per_player_per_minute = 10; // Allow 10 mints per minute per player
        authority.bump = ctx.bumps.authority;

        msg!("Game Token Program initialized by: {:?}", authority.owner);
        Ok(())
    }

    pub fn create_game_token_mint(ctx: Context<CreateGameTokenMint>) -> Result<()> {
        msg!("Created Game Token Mint Account: {:?}", ctx.accounts.mint.key());
        Ok(())
    }

    pub fn eat_energy_particle(
        ctx: Context<EatEnergyParticle>,
        particle_location: (i32, i32)
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let game_pools = &mut ctx.accounts.game_pools;
        let player_stats = &mut ctx.accounts.player_stats;
        let current_time = ctx.accounts.clock.unix_timestamp;
        let current_minute = current_time / 60;

        // Check supply limits if not infinite
        if !authority.is_infinite {
            require!(
                authority.total_minted + 2 <= authority.max_supply,
                GameTokenError::SupplyLimitExceeded
            );
        }

        // Check per-player rate limiting (anti-spam)
        if current_minute > player_stats.last_mint_minute {
            // Reset counter for new minute
            player_stats.last_mint_minute = current_minute;
            player_stats.mints_this_minute = 0;
        }
        require!(
            player_stats.mints_this_minute < authority.max_mints_per_player_per_minute,
            GameTokenError::PlayerRateLimitExceeded
        );

        // Calculate distribution (80/20 split) - Each particle = 1 token total
        let game_amount = 1;  // 80% goes to game pool
        let owner_amount = 1; // 20% goes to owner

        // Mint tokens to game pools
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.game_pools_token_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            game_amount,
        )?;

        // Mint owner tokens
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            owner_amount,
        )?;

        // Update tracking
        authority.total_minted += 2; // 1 for game + 1 for owner
        game_pools.active_pool += game_amount;
        player_stats.session_tokens += game_amount;
        player_stats.total_earned += game_amount;
        player_stats.mints_this_minute += 1;

        // Emit event with detailed information
        emit!(TokenMintedEvent {
            player: ctx.accounts.player.key(),
            game_amount,
            owner_amount,
            particle_location,
            timestamp: current_time,
            session_tokens: player_stats.session_tokens,
        });

        msg!("Token minted for player: {:?}, location: {:?}", ctx.accounts.player.key(), particle_location);
        Ok(())
    }

    pub fn convert_to_real_tokens(
        ctx: Context<ConvertToRealTokens>,
        amount: u64
    ) -> Result<()> {
        // Implementation for converting game tokens to real tokens
        msg!("Converting {} game tokens to real tokens", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + MintingAuthority::INIT_SPACE,
        seeds = [b"authority"],
        bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGameTokenMint<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"authority"],
        bump = authority.bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EatEnergyParticle<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"authority"],
        bump = authority.bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    #[account(
        mut,
        seeds = [b"game_pools"],
        bump = game_pools.bump
    )]
    pub game_pools: Account<'info, GameTokenPools>,

    #[account(
        mut,
        associated_token::mint = game_token_mint,
        associated_token::authority = game_pools
    )]
    pub game_pools_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerMintStats::INIT_SPACE,
        seeds = [b"player_stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerMintStats>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct ConvertToRealTokens<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    // Add other accounts as needed
}

// Account structs
#[account]
#[derive(Default)]
pub struct MintingAuthority {
    pub owner: Pubkey,
    pub total_minted: u64,
    pub is_infinite: bool,
    pub max_supply: u64,
    pub max_mints_per_player_per_minute: u8,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct PlayerMintStats {
    pub player: Pubkey,
    pub session_tokens: u64,
    pub last_mint_minute: i64,
    pub mints_this_minute: u8,
    pub total_earned: u64,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct GameTokenPools {
    pub authority: Pubkey,
    pub active_pool: u64,
    pub reward_pool: u64,
    pub reserve_pool: u64,
    pub burn_pool: u64,
    pub game_token_mint: Pubkey,
    pub bump: u8,
}

// Events
#[event]
pub struct TokenMintedEvent {
    pub player: Pubkey,
    pub game_amount: u64,
    pub owner_amount: u64,
    pub particle_location: (i32, i32),
    pub timestamp: i64,
    pub session_tokens: u64,
}

// Errors
#[error_code]
pub enum GameTokenError {
    #[msg("Supply limit exceeded")]
    SupplyLimitExceeded,
    #[msg("Player rate limit exceeded")]
    PlayerRateLimitExceeded,
}












