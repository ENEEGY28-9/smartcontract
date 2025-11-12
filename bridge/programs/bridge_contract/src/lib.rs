use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, transfer_checked};
use wormhole_anchor_sdk::wormhole::{self, program::Wormhole, Account as WormholeAccount};

// Program ID của bridge contract
declare_id!("BridgeContract1111111111111111111111111111");

#[program]
pub mod bridge_contract {
    use super::*;

    // Initialize bridge
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        wormhole_bridge: Pubkey,
        wormhole_fee_collector: Pubkey,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.owner = ctx.accounts.owner.key();
        bridge.wormhole_bridge = wormhole_bridge;
        bridge.wormhole_fee_collector = wormhole_fee_collector;
        bridge.emergency_pause = false;
        bridge.bump = ctx.bumps.bridge;

        msg!("Bridge initialized with Wormhole integration");
        Ok(())
    }

    // Bridge tokens from Solana to target chain
    pub fn bridge_tokens_out(
        ctx: Context<BridgeTokensOut>,
        amount: u64,
        target_chain: u16,
        target_address: [u8; 32],
    ) -> Result<()> {
        let bridge = &ctx.accounts.bridge;
        let clock = Clock::get()?;

        // Check if bridge is paused
        require!(!bridge.emergency_pause, BridgeError::BridgePaused);

        // Check minimum bridge amount
        require!(amount >= 1_000_000, BridgeError::AmountTooSmall); // Minimum 1 token

        // Check user has enough tokens
        let user_balance = ctx.accounts.user_token_account.amount;
        require!(user_balance >= amount, BridgeError::InsufficientBalance);

        // Transfer tokens to bridge escrow
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.bridge_escrow.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                },
            ),
            amount,
            6, // decimals
        )?;

        // Create Wormhole message
        let wormhole_message = BridgeMessage {
            sender: ctx.accounts.user.key(),
            amount,
            target_chain,
            target_address,
            timestamp: clock.unix_timestamp,
        };

        // Post message to Wormhole
        wormhole::post_message(
            CpiContext::new(
                ctx.accounts.wormhole_program.to_account_info(),
                wormhole::PostMessage {
                    config: ctx.accounts.wormhole_config.to_account_info(),
                    message: ctx.accounts.wormhole_message.to_account_info(),
                    emitter: ctx.accounts.bridge_emitter.to_account_info(),
                    sequence: ctx.accounts.wormhole_sequence.to_account_info(),
                    payer: ctx.accounts.user.to_account_info(),
                    fee_collector: ctx.accounts.wormhole_fee_collector.to_account_info(),
                    clock: ctx.accounts.clock.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            0, // nonce
            wormhole_message.try_to_vec()?,
            0, // consistency_level
        )?;

        // Update bridge stats
        let bridge_stats = &mut ctx.accounts.bridge_stats;
        bridge_stats.total_bridged_out += amount;
        bridge_stats.total_bridged_tx += 1;

        emit!(TokensBridgedOutEvent {
            user: ctx.accounts.user.key(),
            amount,
            target_chain,
            tx_hash: ctx.accounts.wormhole_message.key(),
            timestamp: clock.unix_timestamp,
        });

        msg!("Bridged {} tokens to chain {} for user {}", amount, target_chain, ctx.accounts.user.key());
        Ok(())
    }

    // Complete bridge in (receive tokens from other chains)
    pub fn bridge_tokens_in(
        ctx: Context<BridgeTokensIn>,
        vaa_hash: [u8; 32],
    ) -> Result<()> {
        let bridge = &ctx.accounts.bridge;

        // Verify VAA with Wormhole
        wormhole::verify_message(
            CpiContext::new(
                ctx.accounts.wormhole_program.to_account_info(),
                wormhole::VerifyMessage {
                    config: ctx.accounts.wormhole_config.to_account_info(),
                    guardian_set: ctx.accounts.wormhole_guardian_set.to_account_info(),
                    message: ctx.accounts.wormhole_message.to_account_info(),
                    signature_set: ctx.accounts.wormhole_signature_set.to_account_info(),
                    clock: ctx.accounts.clock.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            vaa_hash,
        )?;

        // Parse bridge message from VAA
        let message_data = ctx.accounts.wormhole_message.data.as_ref();
        let bridge_message: BridgeMessage = BridgeMessage::try_from_slice(message_data)?;

        // Check if tokens are available in escrow
        require!(
            ctx.accounts.bridge_escrow.amount >= bridge_message.amount,
            BridgeError::InsufficientEscrowBalance
        );

        // Transfer tokens from escrow to user
        let bridge_seeds = &[
            b"bridge",
            &[bridge.bump],
        ];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.bridge_escrow.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bridge.to_account_info(),
                    mint: ctx.accounts.game_token_mint.to_account_info(),
                },
                &[bridge_seeds],
            ),
            bridge_message.amount,
            6, // decimals
        )?;

        // Update bridge stats
        let bridge_stats = &mut ctx.accounts.bridge_stats;
        bridge_stats.total_bridged_in += bridge_message.amount;
        bridge_stats.total_bridged_tx += 1;

        emit!(TokensBridgedInEvent {
            user: bridge_message.sender,
            amount: bridge_message.amount,
            source_chain: bridge_message.target_chain, // Note: chain IDs are reversed
            tx_hash: ctx.accounts.wormhole_message.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Bridged in {} tokens for user {}", bridge_message.amount, bridge_message.sender);
        Ok(())
    }

    // Emergency pause/unpause
    pub fn emergency_pause(ctx: Context<EmergencyControl>, pause: bool) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.emergency_pause = pause;

        emit!(BridgeEmergencyEvent {
            paused: pause,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Bridge emergency {} activated", if pause { "pause" } else { "unpause" });
        Ok(())
    }

    // Update bridge fees
    pub fn update_bridge_fees(ctx: Context<UpdateFees>, new_fee: u64) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.bridge_fee = new_fee;

        msg!("Bridge fee updated to {}", new_fee);
        Ok(())
    }
}

// Account Structures
#[account]
#[derive(Default)]
pub struct BridgeState {
    pub owner: Pubkey,
    pub wormhole_bridge: Pubkey,
    pub wormhole_fee_collector: Pubkey,
    pub emergency_pause: bool,
    pub bridge_fee: u64, // Fee in lamports
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct BridgeStats {
    pub total_bridged_out: u64,
    pub total_bridged_in: u64,
    pub total_bridged_tx: u64,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct BridgeEmitter {
    pub bump: u8,
}

// Bridge Message for Wormhole
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BridgeMessage {
    pub sender: Pubkey,
    pub amount: u64,
    pub target_chain: u16,
    pub target_address: [u8; 32],
    pub timestamp: i64,
}

// Events
#[event]
pub struct TokensBridgedOutEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub target_chain: u16,
    pub tx_hash: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokensBridgedInEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub source_chain: u16,
    pub tx_hash: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BridgeEmergencyEvent {
    pub paused: bool,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum BridgeError {
    #[msg("Bridge is currently paused")]
    BridgePaused,
    #[msg("Amount too small for bridging")]
    AmountTooSmall,
    #[msg("Insufficient user balance")]
    InsufficientBalance,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
}

// Context Structures
#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + BridgeState::INIT_SPACE,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge: Account<'info, BridgeState>,

    #[account(
        init,
        payer = owner,
        space = 8 + BridgeStats::INIT_SPACE,
        seeds = [b"bridge_stats"],
        bump
    )]
    pub bridge_stats: Account<'info, BridgeStats>,

    #[account(
        init,
        payer = owner,
        space = 8 + BridgeEmitter::INIT_SPACE,
        seeds = [b"bridge_emitter"],
        bump
    )]
    pub bridge_emitter: Account<'info, BridgeEmitter>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BridgeTokensOut<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump = bridge.bump
    )]
    pub bridge: Account<'info, BridgeState>,

    #[account(mut)]
    pub bridge_stats: Account<'info, BridgeStats>,

    #[account(
        mut,
        seeds = [b"bridge_emitter"],
        bump
    )]
    pub bridge_emitter: Account<'info, BridgeEmitter>,

    #[account(mut)]
    pub bridge_escrow: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    // Wormhole accounts
    pub wormhole_program: Program<'info, Wormhole>,
    pub wormhole_config: WormholeAccount<'info, wormhole::Config>,
    #[account(mut)]
    pub wormhole_message: WormholeAccount<'info, wormhole::Message>,
    #[account(mut)]
    pub wormhole_sequence: WormholeAccount<'info, wormhole::Sequence>,
    pub wormhole_fee_collector: WormholeAccount<'info, wormhole::FeeCollector>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BridgeTokensIn<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump = bridge.bump
    )]
    pub bridge: Account<'info, BridgeState>,

    #[account(mut)]
    pub bridge_stats: Account<'info, BridgeStats>,

    #[account(mut)]
    pub bridge_escrow: InterfaceAccount<'info, TokenAccount>,

    pub game_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    // Wormhole accounts for verification
    pub wormhole_program: Program<'info, Wormhole>,
    pub wormhole_config: WormholeAccount<'info, wormhole::Config>,
    pub wormhole_guardian_set: WormholeAccount<'info, wormhole::GuardianSet>,
    pub wormhole_message: WormholeAccount<'info, wormhole::Message>,
    pub wormhole_signature_set: WormholeAccount<'info, wormhole::SignatureSet>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pause: bool)]
pub struct EmergencyControl<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump = bridge.bump,
        constraint = bridge.owner == owner.key()
    )]
    pub bridge: Account<'info, BridgeState>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(new_fee: u64)]
pub struct UpdateFees<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump = bridge.bump,
        constraint = bridge.owner == owner.key()
    )]
    pub bridge: Account<'info, BridgeState>,

    pub owner: Signer<'info>,
}










