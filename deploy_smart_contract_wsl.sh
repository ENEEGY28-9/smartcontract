#!/bin/bash

# Script to deploy smart contract using WSL

echo "🚀 DEPLOYING SMART CONTRACT VIA WSL"
echo "==================================="

# Navigate to project directory
cd /mnt/c/Users/Fit/Downloads/eneegy-main

echo "📍 Current directory: $(pwd)"

# Install Solana CLI if not installed
if ! command -v solana &> /dev/null; then
    echo "📦 Installing Solana CLI..."
    curl -sSfL https://release.solana.com/v1.18.4/install | sh
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# Verify Solana installation
echo "🔍 Solana version: $(solana --version)"

# Configure Solana for devnet
echo "🔧 Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com

# Check if keypair exists, if not generate one
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "🔑 Generating new keypair..."
    solana-keygen new --no-bip39-passphrase --silent
fi

echo "📍 Wallet address: $(solana address)"

# Get devnet SOL if needed
echo "💰 Checking balance..."
BALANCE=$(solana balance | grep -o '[0-9.]*')
if (( $(echo "$BALANCE < 1.0" | bc -l) )); then
    echo "💰 Requesting airdrop..."
    solana airdrop 2
fi

echo "💰 Current balance: $(solana balance)"

# Install Anchor if not installed
if ! command -v anchor &> /dev/null; then
    echo "📦 Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

echo "🔗 Anchor version: $(anchor --version)"

# Navigate to smart contract directory
cd blockchain-service/programs/game-token

echo "🏗️ Building smart contract..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Smart contract built successfully"

# Deploy to devnet
echo "📡 Deploying to Solana devnet..."
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Smart contract deployed successfully!"

# Extract program ID
PROGRAM_ID=$(anchor deploy --provider.cluster devnet 2>&1 | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    echo "⚠️ Could not extract program ID automatically"
    echo "📝 Please check the deployment output above for the Program ID"
else
    echo "📋 Deployed Program ID: $PROGRAM_ID"

    # Update program ID in Anchor.toml files
    echo "🔄 Updating program IDs..."

    # Update main Anchor.toml
    sed -i "s|game_token = \".*\"|game_token = \"$PROGRAM_ID\"|g" ../../../game_token/Anchor.toml

    # Update blockchain-service Anchor.toml
    sed -i "s|game_token = \".*\"|game_token = \"$PROGRAM_ID\"|g" Anchor.toml

    echo "✅ Program IDs updated"
fi

echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 View your contract on: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"

