#!/bin/bash

# QUICK DEPLOYMENT SCRIPT FOR LINUX
# Run this after setting up Linux VPS

echo "🚀 QUICK DEPLOYMENT TO LINUX"
echo "============================"

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is for Linux only!"
    echo "Use WSL or a Linux VPS"
    exit 1
fi

# Check if project exists
if [ ! -d "programs" ]; then
    echo "❌ Project not found! Please upload your game_token project first"
    exit 1
fi

# Configure Solana for devnet
echo "⚙️ Configuring Solana..."
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url devnet

# Check wallet
echo "👛 Checking wallet..."
WALLET_BALANCE=$(solana balance 2>/dev/null || echo "0")
echo "💰 Current balance: $WALLET_BALANCE SOL"

if [[ "$WALLET_BALANCE" == "0 SOL" ]]; then
    echo "🪂 Requesting devnet SOL..."
    solana airdrop 1
    sleep 10
    NEW_BALANCE=$(solana balance)
    echo "💰 New balance: $NEW_BALANCE SOL"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build smart contract
echo "🏗️ Building smart contract..."
if ! anchor build; then
    echo "❌ Build failed! Check errors above"
    exit 1
fi

# Deploy to devnet
echo "🚀 Deploying to devnet..."
if ! anchor deploy --provider.cluster devnet; then
    echo "❌ Deployment failed! Check errors above"
    exit 1
fi

# Get program info
echo "📋 Getting deployment info..."
PROGRAM_ID=$(solana address -k target/deploy/game_token-keypair.json)
echo "✅ Program ID: $PROGRAM_ID"

# Test deployment
echo "🔍 Testing deployment..."
node check_program_deployment.js

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo "📄 Program ID: $PROGRAM_ID"
echo "🌐 Network: Solana Devnet"
echo ""
echo "🧪 TEST COMMANDS:"
echo "node player_claim_real.js [player_address] 30"
echo "node transfer_100_tokens.js"
echo ""
echo "📊 MONITOR:"
echo "solana balance"
echo "solana logs $PROGRAM_ID"


