#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.avm/bin:$PATH"
source ~/.cargo/env

echo "🚀 DEPLOYING FROM WSL TO SOLANA DEVNET"
echo "========================================"

# Setup Solana config
echo "⚙️ Setting up Solana config..."
solana config set --url devnet

# Check wallet
echo "💰 Checking wallet..."
solana balance

# Go to project directory
cd ~/game_token

# Deploy smart contract
echo "🚀 Deploying smart contract..."
solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json --url devnet

if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "📄 Program ID:"
    solana address -k target/deploy/game_token-keypair.json

    echo "🎮 Testing player claims..."
    node player_claim_real.js $(solana address) 50
else
    echo "❌ DEPLOYMENT FAILED!"
    exit 1
fi

echo "🎉 DEPLOYMENT COMPLETE!"


