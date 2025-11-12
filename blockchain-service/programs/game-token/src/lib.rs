use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, transfer_checked};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Program ID
pub const GAME_TOKEN_PROGRAM_ID: Pubkey = pubkey!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants
pub const DECIMALS: u8 = 6;
pub const MAX_MINTS_PER_PLAYER_PER_MINUTE: u8 = 10;

#[program]
pub mod game_token {
    use super::*;

    /// Initialize the minting authority
    pub fn initialize_minting_authority(
        ctx: Context<InitializeMintingAuthority>,
        max_supply: Option<u64>,
        is_infinite: bool,
        max_mints_per_player_per_minute: u8,
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let clock = Clock::get()?;

        authority.owner = ctx.accounts.owner.key();
        authority.total_minted = 0;
        authority.is_infinite = is_infinite;
        authority.max_supply = max_supply.unwrap_or(0);
        authority.max_mints_per_player_per_minute = max_mints_per_player_per_minute;
        authority.bump = ctx.bumps.authority;

        // Initialize game pools
        let game_pools = &mut ctx.accounts.game_pools;
        game_pools.authority = authority.key();
        game_pools.active_pool = 0;
        game_pools.reward_pool = 0;
        game_pools.reserve_pool = 0;
        game_pools.burn_pool = 0;
        game_pools.game_token_mint = ctx.accounts.game_token_mint.key();
        game_pools.bump = ctx.bumps.game_pools;

        msg!("Initialized minting authority for owner: {}", authority.owner);
        Ok(())
    }

    /// Eat energy particle and mint tokens (CORE FUNCTION)
    pub fn eat_energy_particle(
        ctx: Context<EatEnergyParticle>,
        particle_location: (i32, i32),
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let game_pools = &mut ctx.accounts.game_pools;
        let player_stats = &mut ctx.accounts.player_stats;
        let clock = Clock::get()?;

        let current_time = clock.unix_timestamp;
        let current_minute = current_time / 60;

        // Check supply limits if not infinite
        if !authority.is_infinite {
            require!(
                authority.total_minted + 2 <= authority.max_supply,
                GameTokenError::SupplyLimitExceeded
            );
        }

        // Check per-player rate limiting
        if current_minute > player_stats.last_mint_minute {
            player_stats.last_mint_minute = current_minute;
            player_stats.mints_this_minute = 0;
        }
        require!(
            player_stats.mints_this_minute < authority.max_mints_per_player_per_minute,
            GameTokenError::PlayerRateLimitExceeded
        );

        // Calculate distribution (80/20 split) - Each particle = 1 token
        let game_amount: u64 = 1;  // 80% for game
        let owner_amount: u64 = 1; // 20% for owner

        // Mint tokens to game pools (80%)
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.game_pools_ata.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            game_amount,
        )?;

        // Mint tokens to owner (20%)
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::MintTo {
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                    to: ctx.accounts.owner_ata.to_account_info(),
                    authority: authority.to_account_info(),
                },
            ),
            owner_amount,
        )?;

        // Update tracking
        authority.total_minted += 2;
        game_pools.active_pool += game_amount;
        player_stats.session_tokens += game_amount;
        player_stats.total_earned += game_amount;
        player_stats.mints_this_minute += 1;

        // Emit event
        emit!(TokenMintedEvent {
            player: ctx.accounts.player.key(),
            game_amount,
            owner_amount,
            particle_location,
            timestamp: current_time,
            session_tokens: player_stats.session_tokens,
        });

        msg!("Minted {} game tokens and {} owner tokens for particle at location {:?}", game_amount, owner_amount, particle_location);
        Ok(())
    }

    /// Earn tokens from game pool
    pub fn earn_tokens(ctx: Context<EarnTokens>, amount: u64) -> Result<()> {
        let game_pools = &mut ctx.accounts.game_pools;

        // Check if pool has enough tokens
        require!(game_pools.active_pool >= amount, GameTokenError::InsufficientPool);

        // Transfer from game pool to player
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.game_pools_ata.to_account_info(),
                    to: ctx.accounts.player_ata.to_account_info(),
                    authority: game_pools.to_account_info(),
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                },
            ),
            amount,
            DECIMALS,
        )?;

        // Update pool
        game_pools.active_pool -= amount;

        emit!(TokensEarnedEvent {
            player: ctx.accounts.player.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Convert game tokens to real tokens (withdraw)
    pub fn convert_to_real_tokens(ctx: Context<ConvertToRealTokens>) -> Result<()> {
        let game_token = &ctx.accounts.game_token;

        // Validate it's a game token
        require!(
            matches!(game_token.token_type, TokenType::GameToken),
            GameTokenError::AlreadyRealToken
        );

        // Mint equivalent real tokens
        anchor_spl::token_interface::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::MintTo {
                    mint: ctx.accounts.real_token_mint.to_account_info(),
                    to: ctx.accounts.player_real_ata.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            game_token.amount,
        )?;

        // Close game token account (burn it)
        **ctx.accounts.game_token.to_account_info().try_borrow_mut_lamports()? -= game_token.amount;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += game_token.amount;

        emit!(TokensConvertedEvent {
            player: ctx.accounts.player.key(),
            amount: game_token.amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// Account structs
#[derive(Accounts)]
pub struct InitializeMintingAuthority<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + MintingAuthority::INIT_SPACE,
        seeds = [b"minting_authority"],
        bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    #[account(
        init,
        payer = owner,
        space = 8 + GameTokenPools::INIT_SPACE,
        seeds = [b"game_pools"],
        bump
    )]
    pub game_pools: Account<'info, GameTokenPools>,

    #[account(
        init,
        payer = owner,
        mint::decimals = DECIMALS,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub game_token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EatEnergyParticle<'info> {
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
        init_if_needed,
        payer = player,
        space = 8 + PlayerMintStats::INIT_SPACE,
        seeds = [b"player_stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerMintStats>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = game_token_mint,
        associated_token::authority = game_pools,
    )]
    pub game_pools_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = game_token_mint,
        associated_token::authority = authority.owner,
    )]
    pub owner_ata: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EarnTokens<'info> {
    #[account(
        mut,
        seeds = [b"game_pools"],
        bump = game_pools.bump
    )]
    pub game_pools: Account<'info, GameTokenPools>,

    #[account(
        mut,
        associated_token::mint = game_token_mint,
        associated_token::authority = player,
    )]
    pub player_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = game_token_mint,
        associated_token::authority = game_pools,
    )]
    pub game_pools_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct ConvertToRealTokens<'info> {
    #[account(
        mut,
        seeds = [b"minting_authority"],
        bump = authority.bump
    )]
    pub authority: Account<'info, MintingAuthority>,

    #[account(
        mut,
        close = player,
        constraint = game_token.owner == player.key()
    )]
    pub game_token: Account<'info, GameToken>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = real_token_mint,
        associated_token::authority = player,
    )]
    pub player_real_ata: InterfaceAccount<'info, TokenAccount>,

    pub real_token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// Data structs
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

#[account]
#[derive(Default, InitSpace)]
pub struct GameToken {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub token_type: TokenType,
    pub expiration: i64,
    pub metadata: TokenMetadata,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TokenMetadata {
    pub level: u8,
    pub rarity: u8,
    pub source: TokenSource,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum TokenType {
    GameToken,
    RealToken,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum TokenSource {
    Minted,
    Collected,
    BotReward,
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

#[event]
pub struct TokensEarnedEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensConvertedEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
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
    #[msg("Token is already real token")]
    AlreadyRealToken,
}












