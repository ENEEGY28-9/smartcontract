# 🐧 LOCAL LINUX ENVIRONMENT SETUP - FOR MAINNET DEPLOYMENT

## 🎯 **TÙY CHỌN 2: LOCAL LINUX ENVIRONMENT**

**✅ Free forever, ✅ Full control, ✅ Same as production servers**

---

## 📋 **CHỌN LINUX DISTRIBUTION**

### **RECOMMENDED: Ubuntu 24.04 LTS**
```bash
# Tại sao Ubuntu 24.04?
✅ GLIBC 2.39 (compatible với latest Anchor)
✅ LTS (Long Term Support)
✅ Rich ecosystem
✅ Easy to setup
```

### **Alternatives:**
- **Ubuntu 22.04:** GLIBC 2.35 (có thể gặp compatibility issues)
- **Fedora 40:** Modern, nhưng khác package management
- **Arch Linux:** Bleeding edge, nhưng không stable cho production

---

## 🚀 **SETUP OPTIONS CHO WINDOWS USERS**

### **OPTION A: WSL2 (Recommended - Already available)**
```bash
# Bạn đã có WSL2 Ubuntu 22.04
# Chúng ta sẽ upgrade lên Ubuntu 24.04
```

### **OPTION B: VirtualBox (Alternative)**
```bash
# Download VirtualBox
# Create Ubuntu 24.04 VM
# 4GB RAM, 2 CPU cores, 50GB disk
```

### **OPTION C: Dual Boot (Advanced)**
```bash
# Partition disk
# Install Ubuntu 24.04 alongside Windows
# Best performance, full hardware access
```

---

## 📋 **DETAILED SETUP GUIDE**

### **STEP 1: UPGRADE WSL TO UBUNTU 24.04**

```powershell
# PowerShell với quyền Administrator
wsl --shutdown
wsl --export Ubuntu-22.04 ubuntu_backup.tar
wsl --unregister Ubuntu-22.04
wsl --import Ubuntu-24.04 "$env:USERPROFILE\WSL\Ubuntu24" ubuntu_backup.tar --version 2
wsl -d Ubuntu-24.04
```

```bash
# Trong WSL Ubuntu 24.04
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

### **STEP 2: INSTALL DEVELOPMENT TOOLS**

```bash
# Install essential build tools
sudo apt install -y curl wget git build-essential pkg-config libudev-dev

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

### **STEP 3: INSTALL RUST**

```bash
# Install Rust stable
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Add Rust to PATH permanently
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc

# Update Rust
rustup update stable
rustup default stable

# Verify
rustc --version  # Should be 1.81.0 or later
cargo --version  # Should be 1.81.0 or later
```

### **STEP 4: INSTALL SOLANA CLI**

```bash
# Install Solana CLI v1.18.26 (stable)
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"

# Add to PATH permanently
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
solana --version  # Should be solana-cli 1.18.26
```

### **STEP 5: INSTALL ANCHOR FRAMEWORK**

```bash
# Install Anchor Version Manager (AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Add Anchor to PATH
echo 'export PATH="$HOME/.avm/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
anchor --version  # Should be anchor-cli 0.32.1
```

### **STEP 6: SETUP SOLANA CONFIG FOR MAINNET**

```bash
# Configure for mainnet-beta
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/.config/solana/mainnet-wallet.json

# Create production wallet (IMPORTANT!)
solana-keygen new --outfile ~/.config/solana/mainnet-wallet.json

# Get wallet address
solana address

# Check balance (should be 0 initially)
solana balance
```

---

## 📁 **IMPORT PROJECT FROM SOLANA PLAYGROUND**

### **STEP 1: CREATE PROJECT STRUCTURE**

```bash
# Create Anchor project
mkdir ~/solana-projects
cd ~/solana-projects
anchor init game_token_mainnet
cd game_token_mainnet
```

### **STEP 2: IMPORT CODE FROM PLAYGROUND**

Copy the following files from your Solana Playground project:

**`src/lib.rs`:**
```rust
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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

    // Player earns from pre-minted game pool
    pub fn player_earn_from_pool(
        ctx: Context<PlayerEarnFromPool>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;
        let current_minute = current_time / 60;

        // Check if pool has enough tokens
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);

        // Transfer từ game pool cho player
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

        // Rate limiting
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

        msg!("Player {} earned {} tokens from game pool", ctx.accounts.player.key(), amount);
        Ok(())
    }

    // Player claim tokens from treasury
    pub fn player_claim_tokens(
        ctx: Context<PlayerClaimTokens>,
        amount: u64
    ) -> Result<()> {
        let game_pools_bump = ctx.accounts.game_pools.bump;
        let current_time = Clock::get()?.unix_timestamp;

        // Check if treasury has enough tokens
        require!(ctx.accounts.game_pools.active_pool >= amount, GameTokenError::InsufficientPool);

        // Transfer từ treasury cho player
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

        emit!(PlayerClaimedEvent {
            player: ctx.accounts.player.key(),
            amount,
            remaining_pool: game_pools.active_pool,
            timestamp: current_time,
        });

        msg!("Player {} claimed {} tokens from treasury", ctx.accounts.player.key(), amount);
        Ok(())
    }

    // Emergency pause
    pub fn emergency_pause(ctx: Context<EmergencyControl>) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        authority.is_infinite = false;
        authority.max_supply = authority.total_minted;

        emit!(EmergencyPausedEvent {
            owner: ctx.accounts.owner.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Emergency pause activated");
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

**`Anchor.toml`:**
```toml
[toolchain]
anchor_version = "0.32.1"

[features]
resolution = true
skip-lint = false

[programs.mainnet-beta]
game_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "mainnet-beta"
wallet = "~/.config/solana/mainnet-wallet.json"

[workspace]
members = ["programs/*"]

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## 🚀 **MAINNET DEPLOYMENT STEPS**

### **STEP 1: FUND PRODUCTION WALLET**

```bash
# Check current balance
solana balance

# You need ~2-3 SOL for deployment
# Buy SOL from:
# - Binance, Coinbase, KuCoin
# - Bridge from other chains
# - DEX: Raydium, Orca

# Send SOL to your mainnet wallet address
solana address
```

### **STEP 2: BUILD FOR MAINNET**

```bash
cd ~/solana-projects/game_token_mainnet

# Install dependencies
npm install

# Build smart contract
anchor build

# Verify build
ls -la target/deploy/
```

### **STEP 3: TEST ON DEVNET FIRST (RECOMMENDED)**

```bash
# Switch to devnet for testing
solana config set --url devnet

# Create devnet wallet for testing
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json
solana config set --keypair ~/.config/solana/devnet-wallet.json

# Airdrop devnet SOL
solana airdrop 2

# Deploy to devnet for testing
anchor deploy --provider.cluster devnet

# Test functionality
npm test
```

### **STEP 4: DEPLOY TO MAINNET**

```bash
# Switch back to mainnet
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/mainnet-wallet.json

# Final deployment to mainnet
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show [PROGRAM_ID]

# Save program ID for future use
echo "Program ID: [PROGRAM_ID]" > program_info.txt
```

---

## 🔒 **MAINNET SECURITY SETUP**

### **STEP 1: SECURE WALLET MANAGEMENT**

```bash
# Create separate keys for different purposes
mkdir ~/.config/solana/keys

# Deployer key (for deployment only)
solana-keygen new --outfile ~/.config/solana/keys/deployer.json

# Upgrade authority key (separate from deployer)
solana-keygen new --outfile ~/.config/solana/keys/upgrade_authority.json

# Backup encrypted keys
# Use password encryption
solana-keygen pubkey ~/.config/solana/keys/deployer.json
```

### **STEP 2: ENVIRONMENT VARIABLES**

```bash
# Create .env file for sensitive data
cat > .env << EOF
MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
MAINNET_WALLET_PATH=~/.config/solana/mainnet-wallet.json
PROGRAM_ID=your_program_id_here
EOF

# Add to .gitignore
echo ".env" >> .gitignore
echo "*.json" >> .gitignore
```

---

## 📊 **MONITORING & MAINTENANCE**

### **POST-DEPLOYMENT CHECKS**

```bash
# Check program status
solana program show [PROGRAM_ID]

# Monitor SOL balance
solana balance

# Check recent transactions
solana transaction-history [PROGRAM_ID]

# View program logs
solana logs [PROGRAM_ID]
```

### **BACKUP STRATEGY**

```bash
# Backup entire project
tar -czf solana_project_backup_$(date +%Y%m%d).tar.gz ~/solana-projects/

# Backup wallets (encrypted)
# Store in secure location (hardware wallet recommended)
```

---

## 🚀 **PRODUCTION WORKFLOW**

### **Development Cycle:**
1. **Develop on devnet** (Solana Playground)
2. **Test on devnet** (Local Linux)
3. **Deploy to mainnet** (Local Linux)
4. **Monitor & maintain** (Local Linux)

### **Version Control:**
```bash
# Use Git for all changes
git init
git add .
git commit -m "Initial mainnet deployment"
git remote add origin https://github.com/your-repo/game-token-mainnet.git
git push -u origin main
```

---

## ✅ **ADVANTAGES OF LOCAL LINUX ENVIRONMENT**

### **For Mainnet Deployment:**
- ✅ **Free forever** - No monthly costs
- ✅ **Full control** - Modify anything
- ✅ **Production-like** - Same as real servers
- ✅ **Secure** - Local wallet management
- ✅ **Version control** - Git integration
- ✅ **CI/CD ready** - Easy automation

### **For Development:**
- ✅ **Fast iteration** - No network delays
- ✅ **Offline development** - Work without internet
- ✅ **Custom tooling** - Install any tools needed
- ✅ **Resource control** - Use full system resources

---

## 🎯 **SUCCESS CRITERIA**

After setup, you should have:
```
✅ Ubuntu 24.04 with GLIBC 2.39
✅ Rust 1.81+, Solana CLI 1.18.26, Anchor 0.32.1
✅ Production wallet with SOL balance
✅ Smart contract built and tested on devnet
✅ Successfully deployed to mainnet
✅ Monitoring and backup systems in place
```

---

## 💡 **NEXT STEPS**

1. **Start with WSL2 upgrade** to Ubuntu 24.04
2. **Setup development environment** (Rust, Solana, Anchor)
3. **Import code** from Solana Playground
4. **Fund mainnet wallet** with SOL
5. **Test on devnet** thoroughly
6. **Deploy to mainnet** when ready

**Bạn muốn bắt đầu với việc upgrade WSL2 lên Ubuntu 24.04 không?** 🤔

Tôi sẽ hướng dẫn từng bước chi tiết! 🚀


