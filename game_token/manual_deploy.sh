#!/bin/bash

echo "🚀 MANUAL DEPLOYMENT TO DEVNET"
echo "================================"

# Change to project directory
cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token
echo "Current directory: $(pwd)"

# Set PATH for Solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "🔧 Checking tools..."
solana --version
rustc --version

# Check if Anchor is available
if command -v anchor &> /dev/null; then
    echo "Anchor found: $(anchor --version)"
else
    echo "⚠️ Anchor not found, trying to install..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

echo "🏗️ Building smart contract..."
anchor build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🚀 Deploying to devnet..."
    anchor deploy --provider.cluster devnet

    if [ $? -eq 0 ]; then
        echo "✅ Deploy successful!"
        echo "🎉 Smart contract is now live on devnet!"
    else
        echo "❌ Deploy failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

echo "Done."


