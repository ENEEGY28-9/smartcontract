#!/bin/bash

# DEPLOY FROM WSL SCRIPT
# Copy project to WSL and deploy smart contract

echo "🚀 Deploying from WSL Environment..."

# Source Rust environment
source $HOME/.cargo/env

# Set PATH for Solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Go to project directory (assuming mounted)
cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

echo "📂 Current directory: $(pwd)"
echo "📋 Files in directory:"
ls -la

# Configure Solana
echo "⚙️ Configuring Solana..."
solana config set --url https://api.devnet.solana.com

# Check wallet (copy from Windows)
# Note: Need to copy wallet keypair from Windows to WSL
echo "🔑 Checking wallet..."
# solana address

echo "🔨 Building smart contract..."
anchor build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🚀 Deploying to devnet..."
    anchor deploy --provider.cluster devnet

    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"

        echo "🎯 Next steps:"
        echo "1. Initialize PDAs"
        echo "2. Test auto-mint logic"
        echo "3. Verify 100 tokens/minute"

        # Get program ID
        PROGRAM_ID=$(solana program show --programs | grep game_token | awk '{print $1}')
        echo "📄 Program ID: $PROGRAM_ID"

    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

echo "🎉 WSL Deployment process complete!"
