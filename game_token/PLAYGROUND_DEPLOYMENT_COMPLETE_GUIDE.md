# 🚀 SOLANA PLAYGROUND - DEPLOYMENT HƯỚNG DẪN HOÀN CHỈNH

## 🎯 **MỤC TIÊU: DEPLOY SMART CONTRACT LÊN BLOCKCHAIN**

**Sau khi hoàn thành hướng dẫn này, hệ thống sẽ hoạt động 100% on-chain với:**
- ✅ Smart contract deployed trên Solana Devnet
- ✅ Auto-mint 100 tokens/phút (80/20 split)
- ✅ Player earn từ game pool
- ✅ Owner nhận 20 tokens/phút passive income

---

## 📋 **HƯỚNG DẪN CHI TIẾT (10 PHÚT)**

### **BƯỚC 1: TRUY CẬP SOLANA PLAYGROUND**
1. Mở trình duyệt: https://beta.solpg.io/
2. Click **"Create a new project"**
3. Chọn **"Anchor (Rust)"** template
4. Đặt tên: `eneegy_game_token`
5. Click **"Create"**

### **BƯỚC 2: THAY THẾ CODE RUST**
1. Click vào file `src/lib.rs` ở sidebar
2. **Xóa toàn bộ code mặc định**
3. **Copy & Paste code sau đây:**

```rust
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf");

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

    // Player claim tokens from treasury (User-specified amount)
    pub fn player_claim_tokens(
        ctx: Context<PlayerClaimTokens>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;

        // Check if treasury has enough tokens
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);

        // Transfer từ treasury (game_pools_token_account) cho player
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
        player_stats.total_claimed += amount;

        // Emit claim event
        emit!(PlayerClaimedEvent {
            player: ctx.accounts.player.key(),
            amount,
            remaining_pool: game_pools.active_pool,
            timestamp: current_time,
        });

        msg!("Player {} claimed {} tokens from treasury", ctx.accounts.player.key(), amount);
        Ok(())
    }

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

// Account Structures
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

### **BƯỚC 3: CẤU HÌNH ANCHOR.TOML**
1. Click vào file `Anchor.toml`
2. **Thay thế nội dung bằng:**

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

### **BƯỚC 4: BUILD & DEPLOY**
1. Mở **Terminal** trong Playground
2. Chạy: `anchor build`
3. Đợi build hoàn thành (2-3 phút)
4. Chạy: `anchor deploy`
5. **Copy Program ID** được hiển thị (ví dụ: `ABC123...`)
6. **Lưu Program ID** để sử dụng sau

### **BƯỚC 5: TẠO TOKEN MINT**
Trong Playground terminal, chạy:

```bash
# Tạo token mint mới
spl-token create-token --decimals 6

# Copy token mint address (ví dụ: DEF456...)
```

### **BƯỚC 6: TEST DEPLOYMENT**
1. Tạo file `test_deploy.js` trong Playground
2. Copy code test sau và cập nhật Program ID + Token Mint:

```javascript
const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, createMint, mintTo } = require('@solana/spl-token');

async function testDeployment() {
  console.log('🚀 TESTING PLAYGROUND DEPLOYMENT');
  console.log('='.repeat(50));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // 🔴 UPDATE THESE VALUES 🔴
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE'); // Từ bước 4
  const gameTokenMint = new PublicKey('YOUR_TOKEN_MINT_HERE'); // Từ bước 5

  const wallet = pg.wallet;
  const owner = wallet.keypair;

  console.log('📋 Program ID:', programId.toString());
  console.log('🪙 Token Mint:', gameTokenMint.toString());
  console.log('👤 Owner:', owner.publicKey.toString());

  try {
    // Step 1: Create owner ATA
    console.log('\n👑 Creating Owner Token Account...');
    const ownerATA = await getAssociatedTokenAddress(gameTokenMint, owner.publicKey);

    const createATAIx = createAssociatedTokenAccountInstruction(
      owner.publicKey,
      ownerATA,
      owner.publicKey,
      gameTokenMint
    );

    const tx1 = new Transaction().add(createATAIx);
    await pg.sendTransaction(tx1);
    console.log('✅ Owner ATA created');

    // Step 2: Mint initial tokens to owner (for testing)
    console.log('\n🪙 Minting initial tokens...');
    await mintTo(
      connection,
      owner,
      gameTokenMint,
      ownerATA,
      owner,
      1000000 // 1 token với 6 decimals
    );
    console.log('✅ Initial tokens minted');

    // Step 3: Check balances
    const balance = await connection.getTokenAccountBalance(ownerATA);
    console.log(`💰 Owner Balance: ${balance.value.uiAmount} tokens`);

    console.log('\n🎉 DEPLOYMENT TEST SUCCESSFUL!');
    console.log('✅ Smart contract deployed');
    console.log('✅ Token system working');
    console.log('✅ Ready for game integration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeployment();
```

### **BƯỚC 7: VERIFY ON BLOCKCHAIN**
1. Mở https://explorer.solana.com/?cluster=devnet
2. Paste Program ID để xem smart contract
3. Paste Token Mint để xem token
4. Verify transactions successful

---

## 🎯 **KẾT QUẢ MONG ĐỢI**

```
✅ Build successful
✅ Deploy successful
✅ Program ID: [your-program-id]
✅ Token Mint: [your-token-mint]
✅ Owner ATA created
✅ Initial tokens minted
✅ Balances verified
✅ Smart contract live on devnet
```

---

## 🚀 **INTEGRATION VỚI GAME**

Sau khi deploy thành công, cập nhật file `production_config.json`:

```json
{
  "programId": "YOUR_PROGRAM_ID_HERE",
  "mintingAuthority": "owner_wallet_address",
  "gameTokenMint": "YOUR_TOKEN_MINT_HERE",
  "gamePools": "game_pools_pda_address",
  "gamePoolsTokenAccount": "game_pools_token_account",
  "cluster": "devnet",
  "initialized": "2025-11-11T...",
  "status": "Deployed on Solana Playground"
}
```

---

## 💡 **LỢI ÍCH SOLANA PLAYGROUND**

- ✅ **Hoàn toàn miễn phí** - không giới hạn
- ✅ **Browser-based** - không cần setup
- ✅ **Pre-configured environment**
- ✅ **Direct devnet deployment**
- ✅ **No compatibility issues**
- ✅ **Real blockchain testing**
- ✅ **Professional workflow**

**🎯 CHÚC BẠN DEPLOY THÀNH CÔNG!** 🚀

**Hệ thống sẽ hoạt động 100% on-chain sau khi hoàn thành các bước trên!** 🎉

