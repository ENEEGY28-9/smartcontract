# 🚀 Solana CLI & Anchor Setup Guide for Game Token Deployment

## 📋 Prerequisites
- Windows 10/11
- Internet connection
- Administrator privileges for installation

## Step 1: Install Solana CLI

### Option A: Using Official Installer (Recommended)
```bash
# Download and run the installer
# Visit: https://docs.solana.com/cli/install-solana-cli-tools
# Download: solana-install-init-x86_64-pc-windows-msvc.exe

# After installation, restart your terminal/command prompt
```

### Option B: Manual Installation
```bash
# Download from GitHub releases
curl -sSfL https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2 -o solana-release.tar.bz2

# Extract (requires 7zip or similar tool)
# Add the bin folder to your PATH environment variable
```

### Verify Installation
```bash
solana --version
# Should show: solana-cli 1.18.4
```

## Step 2: Configure Solana for Devnet

```bash
# Set RPC endpoint to Devnet
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get

# Generate a new keypair (or use existing)
solana-keygen new --no-bip39-passphrase --silent

# Check your public key
solana address
```

## Step 3: Get Devnet SOL

```bash
# Request airdrop (2 SOL for deployment)
solana airdrop 2

# Check balance
solana balance

# If airdrop fails, use web faucet:
# https://faucet.solana.com
```

## Step 4: Install Anchor Framework

```bash
# Install Anchor Version Manager (AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify installation
anchor --version
# Should show: anchor-cli 0.30.1 or similar
```

## Step 5: Build Smart Contract

```bash
# Navigate to smart contract directory
cd blockchain-service/programs/game-token

# Install Node.js dependencies
npm install

# Build the program
anchor build

# Verify build output
dir target/deploy/
# Should see: game_token.so, game_token-keypair.json
```

## Step 6: Deploy to Devnet

```bash
# Deploy smart contract
anchor deploy --provider.cluster devnet

# This will show the program ID after successful deployment
# Example output: "Program Id: AbCdEfGhIjKlMnOpQrStUvWxYz..."

# Copy the program ID for the next step
```

## Step 7: Update Blockchain Service

After deployment, update the program ID in:
`blockchain-service/src/game_token_client.rs`

```rust
// Update this line with your deployed program ID
const GAME_TOKEN_PROGRAM_ID: &str = "YOUR_DEPLOYED_PROGRAM_ID_HERE";
```

## Step 8: Test Real Minting

```bash
# Start blockchain service
cd blockchain-service
cargo run

# In another terminal, start gateway
cd ../gateway
cargo run

# Test minting through the full stack
# Use the client to eat particles and verify real blockchain transactions
```

## 🔧 Troubleshooting

### Build Issues
```bash
# Clear build cache
anchor clean

# Rebuild
anchor build
```

### Deployment Issues
```bash
# Check balance
solana balance

# Request more SOL if needed
solana airdrop 1

# Check cluster
solana cluster-version
```

### Network Issues
```bash
# Try different RPC endpoint
solana config set --url https://devnet.helius-rpc.com/

# Or use GenesysGo
solana config set --url https://devnet.genesysgo.net/
```

## 📊 Expected Results

After successful deployment:
- ✅ Smart contract deployed on Solana Devnet
- ✅ Program ID available for client integration
- ✅ Real blockchain transactions enabled
- ✅ No more mock/placeholder responses

## 🎯 Success Indicators

- `anchor deploy` completes without errors
- Program ID is returned and valid
- `solana program show <PROGRAM_ID>` works
- Client can mint real tokens on blockchain

## 🚨 Important Notes

1. **Keep your keypair safe** - never commit private keys
2. **Devnet SOL is free** but limited - deploy wisely
3. **Program IDs are permanent** - choose carefully
4. **Test thoroughly** before mainnet deployment

---

## 📞 Support

If you encounter issues:
1. Check the official Solana docs: https://docs.solana.com
2. Anchor docs: https://www.anchor-lang.com
3. Community Discord: https://discord.com/invite/solana

---

**🎉 After completion, your game will have REAL blockchain token minting!**

