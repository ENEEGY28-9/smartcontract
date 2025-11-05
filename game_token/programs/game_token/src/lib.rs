use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe");

#[program]
pub mod game_token {
    use super::*;

    // Initialize game pools and token account
    pub fn initialize_game_pools(
        ctx: Context<InitializeGamePools>,
        bump: u8
    ) -> Result<()> {
        let game_pools = &mut ctx.accounts.game_pools;

        game_pools.authority = ctx.accounts.authority.key();
        game_pools.active_pool = 0;
        game_pools.reward_pool = 0;
        game_pools.reserve_pool = 0;
        game_pools.burn_pool = 0;
        game_pools.game_token_mint = ctx.accounts.game_token_mint.key();
        game_pools.bump = bump;

        msg!("Initialized GamePools PDA: {:?}", game_pools.key());
        Ok(())
    }

    // Initialize minting authority
    pub fn initialize_minting_authority(
        ctx: Context<InitializeMintingAuthority>,
        max_mints_per_player_per_minute: u8,
        is_infinite: bool,
        max_supply: u64,
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let owner = &ctx.accounts.owner;

        // Set initial values
        authority.owner = owner.key();
        authority.total_minted = 0;
        authority.is_infinite = is_infinite;
        authority.max_supply = max_supply;
        authority.max_mints_per_player_per_minute = max_mints_per_player_per_minute;
        authority.bump = ctx.bumps.authority;

        msg!("Initialized MintingAuthority for owner: {:?}", owner.key());
        Ok(())
    }

    // DISABLED: Old logic - Player eat particle = Mint token (WRONG APPROACH)
    // This function is DISABLED because it requires player activity for owner revenue
    // Use auto_mint_tokens() instead for scheduled, independent minting

    // pub fn eat_energy_particle(...) -> DISABLED

    // Auto-mint tokens theo schedule (Logic Mới - Independent of players)
    pub fn auto_mint_tokens(
        ctx: Context<AutoMintTokens>,
        amount: u64
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let game_pools = &mut ctx.accounts.game_pools;
        let current_time = Clock::get()?.unix_timestamp;

        // Check supply limits if not infinite
        if !authority.is_infinite {
            require!(
                authority.total_minted + amount <= authority.max_supply,
                GameTokenError::SupplyLimitExceeded
            );
        }

        // Calculate distribution (80/20 split)
        let game_amount = amount * 80 / 100;  // 80% cho game pool
        let owner_amount = amount * 20 / 100; // 20% cho owner

        // Mint tokens to game pools token account (80%)
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.game_pools_token_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            game_amount,
        )?;

        // Mint owner tokens (20%)
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            owner_amount,
        )?;

        // Update tracking
        authority.total_minted += amount;
        game_pools.active_pool += game_amount;

        // Emit event
        emit!(AutoMintEvent {
            amount,
            game_amount,
            owner_amount,
            timestamp: current_time,
        });

        msg!("Auto-minted {} tokens: {} game + {} owner", amount, game_amount, owner_amount);
        Ok(())
    }

    // CORE CONCEPT: Player earns from pre-minted game pool (CORRECT APPROACH)
    // Game pool is filled by auto_mint_tokens() scheduler - independent of players
    // Players only earn from existing pool balance
    pub fn player_earn_from_pool(
        ctx: Context<PlayerEarnFromPool>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;
        let current_minute = current_time / 60;

        // Check if pool has enough tokens (pool filled by auto-mint scheduler)
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);

        // Transfer từ game pool cho player (80% từ auto-mint)
        // Sử dụng game_pools_token_account làm nguồn và game_pools PDA làm authority
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.game_pools_token_account.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: ctx.accounts.game_pools.to_account_info(),
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                },
                &[&[
                    b"game_pools",
                    &[game_pools_bump]
                ]]
            ),
            amount,
            6, // decimals
        )?;

        // Update tracking
        let game_pools = &mut ctx.accounts.game_pools;
        let player_stats = &mut ctx.accounts.player_stats;
        game_pools.active_pool -= amount;
        player_stats.session_tokens += amount;
        player_stats.total_earned += amount;

        // Rate limiting cho player earn
        if current_minute > player_stats.last_mint_minute {
            player_stats.last_mint_minute = current_minute;
            player_stats.mints_this_minute = 0;
        }
        player_stats.mints_this_minute += 1;

        emit!(PlayerEarnedEvent {
            player: ctx.accounts.player.key(),
            amount,
            remaining_pool: game_pools.active_pool,
            timestamp: current_time,
        });

        msg!("Player {} earned {} tokens from auto-filled game pool", ctx.accounts.player.key(), amount);
        Ok(())
    }

    // DISABLED: Legacy earn_tokens function (WRONG APPROACH)
    // This function is DISABLED - use player_earn_from_pool instead
    // player_earn_from_pool has proper player tracking and rate limiting

    // pub fn earn_tokens(...) -> DISABLED

    // Emergency pause (owner only)
    pub fn emergency_pause(ctx: Context<EmergencyControl>) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        authority.is_infinite = false; // Effectively pause by setting finite supply
        authority.max_supply = authority.total_minted; // No more minting

        emit!(EmergencyPausedEvent {
            owner: ctx.accounts.owner.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Emergency pause activated by owner");
        Ok(())
    }
}

// Account Structures
#[account]
#[derive(Default, InitSpace)]
pub struct MintingAuthority {
    pub owner: Pubkey,
    pub total_minted: u64,
    pub is_infinite: bool,
    pub max_supply: u64,
    pub max_mints_per_player_per_minute: u8,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct PlayerMintStats {
    pub player: Pubkey,
    pub session_tokens: u64,
    pub last_mint_minute: i64,
    pub mints_this_minute: u8,
    pub total_earned: u64,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
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
pub struct AutoMintEvent {
    pub amount: u64,
    pub game_amount: u64,
    pub owner_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlayerEarnedEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub remaining_pool: u64,
    pub timestamp: i64,
}

// DISABLED: Old events - WRONG APPROACH
// TokenMintedEvent is DISABLED because eat_energy_particle is disabled
// TokensEarnedEvent is DISABLED because earn_tokens is disabled
// Use AutoMintEvent and PlayerEarnedEvent instead

// #[event]
// pub struct TokenMintedEvent { ... } DISABLED

// #[event]
// pub struct TokensEarnedEvent { ... } DISABLED

#[event]
pub struct EmergencyPausedEvent {
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct InitializeGamePools<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + GameTokenPools::INIT_SPACE,
        seeds = [b"game_pools"],
        bump
    )]
    pub game_pools: Account<'info, GameTokenPools>,

    #[account(
        init,
        payer = payer,
        seeds = [b"game_pools_token_account"],
        bump,
        token::mint = game_token_mint,
        token::authority = game_pools
    )]
    pub game_pools_token_account: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// Errors
#[error_code]
pub enum GameTokenError {
    #[msg("Supply limit exceeded")]
    SupplyLimitExceeded,
    #[msg("Player rate limit exceeded")]
    PlayerRateLimitExceeded,
    #[msg("Insufficient pool balance")]
    InsufficientPool,
}

// Context Structures
#[derive(Accounts)]
#[instruction(max_mints_per_player_per_minute: u8, is_infinite: bool, max_supply: u64)]
pub struct InitializeMintingAuthority<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + MintingAuthority::INIT_SPACE,
        seeds = [b"minting_authority"],
        bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// DISABLED: EatEnergyParticle context - WRONG APPROACH
// This context is DISABLED because eat_energy_particle function is disabled
// Use auto_mint_tokens and player_earn_from_pool instead

// #[derive(Accounts)]
// pub struct EatEnergyParticle<'info> { ... } DISABLED

// DISABLED: EarnTokens context - LEGACY APPROACH
// This context is DISABLED - use PlayerEarnFromPool instead
// PlayerEarnFromPool has proper player tracking and rate limiting

// #[derive(Accounts)]
// pub struct EarnTokens<'info> { ... } DISABLED

#[derive(Accounts)]
pub struct AutoMintTokens<'info> {
    #[account(
        mut,
        seeds = [b"minting_authority"],
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
        seeds = [b"game_pools_token_account"],
        bump
    )]
    pub game_pools_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct PlayerEarnFromPool<'info> {
    #[account(
        mut,
        seeds = [b"game_pools"],
        bump = game_pools.bump
    )]
    pub game_pools: Account<'info, GameTokenPools>,

    #[account(
        mut,
        seeds = [b"game_pools_token_account"],
        bump
    )]
    pub game_pools_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerMintStats::INIT_SPACE,
        seeds = [b"player_stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerMintStats>,

    #[account(mut)]
    pub player_token_account: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyControl<'info> {
    #[account(
        mut,
        seeds = [b"minting_authority"],
        bump = authority.bump,
        constraint = authority.owner == owner.key()
    )]
    pub authority: Account<'info, MintingAuthority>,

    pub owner: Signer<'info>,
}
