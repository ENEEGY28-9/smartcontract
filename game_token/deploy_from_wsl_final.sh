#!/bin/bash

echo "🚀 DEPLOYMENT FROM WSL - FINAL ATTEMPT"
echo "====================================="

cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

# Use the original .so file from WSL build
echo "📁 Using WSL-built .so file..."
ls -la programs/game_token_v2/target/release/libgame_token_v2.so

# Copy to deploy directory
cp programs/game_token_v2/target/release/libgame_token_v2.so target/deploy/game_token.so

echo "🔑 Program ID: DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq"

# Try to install Solana CLI if needed
if ! command -v solana &> /dev/null; then
    echo "📦 Installing Solana CLI..."
    curl -sSfL https://release.solana.com/v1.18.26/install | bash
    source ~/.bashrc
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# Configure
solana config set --url devnet

# Check balance
echo "💰 Checking balance..."
solana balance

# Deploy
echo "🚀 Deploying..."
solana program deploy target/deploy/game_token.so --program-id DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq --url devnet

if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "🔍 Verifying..."
    sleep 10
    solana program show DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq --url devnet
else
    echo "❌ DEPLOYMENT FAILED!"
fi


