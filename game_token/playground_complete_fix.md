# 🚨 SOLANA PLAYGROUND - COMPLETE FIX FOR ALL ERRORS

## ❌ **CÁC LỖI GẶP PHẢI:**

### **Lỗi 1: Test Fail**
```
TypeError: Cannot read properties of undefined (reading 'methods')
```

### **Lỗi 2: Wallet Connection Fail**
```
Warning: Wallet is not connected.
Connecting...
Setup rejected.
Process error: Wallet must be connected.
```

### **Lỗi 3: Build Error**
```
Build error: InvalidFile
```

---

## 🚀 **GIẢI PHÁP HOÀN CHỈNH:**

### **BƯỚC 1: TẠO PROJECT MỚI (KHUYẾN NGHỊ)**

**Cách tốt nhất là tạo project mới:**

1. **Vào:** https://beta.solpg.io/
2. **Click:** "Create a new project"
3. **Chọn:** "Anchor (Rust)" template
4. **Đặt tên:** `eneegy_game_token_deploy`

### **BƯỚC 2: THAY THẾ CODE NGAY**

**Ngay sau khi tạo project:**

#### **2A: Thay thế `src/lib.rs`**
```rust
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf");

#[program]
pub mod game_token {
    use super::*;

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

    pub fn initialize_minting_authority(
        ctx: Context<InitializeMintingAuthority>,
        max_mints_per_player_per_minute: u8,
        is_infinite: bool,
        max_supply: u64,
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let owner = &ctx.accounts.owner;
        authority.owner = owner.key();
        authority.total_minted = 0;
        authority.is_infinite = is_infinite;
        authority.max_supply = max_supply;
        authority.max_mints_per_player_per_minute = max_mints_per_player_per_minute;
        authority.bump = ctx.bumps.authority;
        msg!("Initialized MintingAuthority for owner: {:?}", owner.key());
        Ok(())
    }

    pub fn auto_mint_tokens(
        ctx: Context<AutoMintTokens>,
        amount: u64
    ) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let game_pools = &mut ctx.accounts.game_pools;
        let current_time = Clock::get()?.unix_timestamp;
        if !authority.is_infinite {
            require!(
                authority.total_minted + amount <= authority.max_supply,
                GameTokenError::SupplyLimitExceeded
            );
        }
        let game_amount = amount * 80 / 100;
        let owner_amount = amount * 20 / 100;
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
        authority.total_minted += amount;
        game_pools.active_pool += game_amount;
        emit!(AutoMintEvent {
            amount,
            game_amount,
            owner_amount,
            timestamp: current_time,
        });
        msg!("Auto-minted {} tokens: {} game + {} owner", amount, game_amount, owner_amount);
        Ok(())
    }

    pub fn player_earn_from_pool(
        ctx: Context<PlayerEarnFromPool>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;
        let current_minute = current_time / 60;
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);
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
            6,
        )?;
        let game_pools = &mut ctx.accounts.game_pools;
        let player_stats = &mut ctx.accounts.player_stats;
        game_pools.active_pool -= amount;
        player_stats.session_tokens += amount;
        player_stats.total_earned += amount;
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

    pub fn player_claim_tokens(
        ctx: Context<PlayerClaimTokens>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);
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
            6,
        )?;
        let game_pools = &mut ctx.accounts.game_pools;
        let player_stats = &mut ctx.accounts.player_stats;
        game_pools.active_pool -= amount;
        player_stats.total_claimed += amount;
        emit!(PlayerClaimedEvent {
            player: ctx.accounts.player.key(),
            amount,
            remaining_pool: game_pools.active_pool,
            timestamp: current_time,
        });
        msg!("Player {} claimed {} tokens from treasury", ctx.accounts.player.key(), amount);
        Ok(())
    }

    pub fn emergency_pause(ctx: Context<EmergencyControl>) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        authority.is_infinite = false;
        authority.max_supply = authority.total_minted;
        emit!(EmergencyPausedEvent {
            owner: ctx.accounts.owner.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        msg!("Emergency pause activated by owner");
        Ok(())
    }
}

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
    pub total_claimed: u64,
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

#[event]
pub struct PlayerClaimedEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub remaining_pool: u64,
    pub timestamp: i64,
}

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

#[error_code]
pub enum GameTokenError {
    #[msg("Supply limit exceeded")]
    SupplyLimitExceeded,
    #[msg("Player rate limit exceeded")]
    PlayerRateLimitExceeded,
    #[msg("Insufficient pool balance")]
    InsufficientPool,
}

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
pub struct PlayerClaimTokens<'info> {
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
        init_if_needed,
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
```

#### **2B: Tạo `Anchor.toml`**
1. **Click chuột phải** trong sidebar
2. **"New File"** → `Anchor.toml`
3. **Paste:**

```toml
[toolchain]
anchor_version = "0.31.2"

[features]
resolution = true
skip-lint = false

[programs.devnet]
game_token = "Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf"

[programs.mainnet]
game_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[workspace]
members = ["programs/*"]

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## 🎯 **BƯỚC 3: ĐỢI WALLET CONNECT**

**Quan trọng:** Đợi wallet kết nối hoàn toàn trước khi build!

1. **Nhìn góc phải trên** - thấy wallet address
2. **Nếu chưa connect:** Click "Connect Wallet"
3. **Đợi vài giây** cho wallet load

---

## 🚀 **BƯỚC 4: BUILD & DEPLOY**

```bash
# Build
anchor build

# Deploy  
anchor deploy
```

---

## ✅ **NẾU THÀNH CÔNG:**

**Bạn sẽ thấy:**
```
✅ Build successful
✅ Deploy successful  
✅ Program ID: [mã hex dài]
```

---

## 🎉 **SAU ĐÓ CHÚNG TA CÓ THỂ TEST!**

**🎯 TẠO PROJECT MỚI NGAY VÀ LÀM THEO CÁC BƯỚC TRÊN!** 🚀

**Tôi tin chúng ta sẽ thành công lần này!** 🤩

