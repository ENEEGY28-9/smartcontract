#!/bin/bash

echo "🚀 Building Smart Contract in WSL"
echo "=================================="

# Change to project directory
cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token
echo "Current directory: $(pwd)"

# Install Solana CLI if not installed
if ! command -v solana &> /dev/null; then
    echo "📦 Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# Install Rust if not installed
if ! command -v rustc &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Install Anchor if not installed
if ! command -v anchor &> /dev/null; then
    echo "📦 Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

echo "🔧 Checking versions..."
solana --version
rustc --version
anchor --version

echo "🏗️ Building smart contract..."
anchor build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🚀 Deploying to devnet..."
    anchor deploy --provider.cluster devnet

    if [ $? -eq 0 ]; then
        echo "✅ Deploy successful!"
        echo ""
        echo "🎮 Testing player claim..."
        echo "Run: node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 30"
    else
        echo "❌ Deploy failed!"
    fi
else
    echo "❌ Build failed!"
fi

echo "Done."



