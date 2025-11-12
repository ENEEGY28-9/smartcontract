#!/bin/bash

# SETUP LINUX VPS FOR SOLANA DEVELOPMENT
echo "🚀 SETTING UP LINUX VPS FOR SOLANA DEVELOPMENT"
echo "=============================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo "🛠️ Installing essential tools..."
sudo apt install -y curl wget git build-essential pkg-config libudev-dev libssl-dev

# Install Rust
echo "🦀 Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install Solana CLI
echo "⛓️ Installing Solana CLI..."
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Node.js and npm
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Anchor
echo "⚓ Installing Anchor..."
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
export PATH="$HOME/.avm/bin:$PATH"

# Clone project (replace with your actual repo)
echo "📥 Cloning project..."
git clone https://github.com/your-username/eneegy-main.git
cd eneegy-main/game_token

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Configure Solana
echo "⚙️ Configuring Solana..."
solana config set --url devnet

# Build and deploy
echo "🏗️ Building smart contract..."
anchor build

echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

echo "✅ SETUP COMPLETE!"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Fund your wallet: solana airdrop 1"
echo "2. Test player claims: node player_claim_real.js [player_address] 30"
echo ""
echo "📋 IMPORTANT:"
echo "- Save your program ID for future deployments"
echo "- Backup your wallet keypair"
echo "- Monitor your SOL balance"


