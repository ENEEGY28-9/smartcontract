#!/bin/bash

echo "🚀 DEPLOYING SMART CONTRACT V2 IN WSL"
echo "====================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt install -y pkg-config build-essential libudev-dev libssl-dev

# Install Solana CLI
echo "⬇️ Installing Solana CLI..."
curl -sSfL https://release.solana.com/v1.18.4/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Setup Solana
echo "⚙️ Setting up Solana..."
solana config set --url https://api.devnet.solana.com

# Generate keypair if needed
if [ ! -f ~/.config/solana/id.json ]; then
    echo "🔑 Generating Solana keypair..."
    solana-keygen new --no-passphrase
fi

echo "💰 Solana address: $(solana address)"

# Build smart contract
echo "🔨 Building smart contract V2..."
cd ~/game_token
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Deploy to devnet
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed!"
    exit 1
fi

echo "✅ Deploy successful!"

# Initialize PDAs
echo "🔧 Initializing PDAs..."
node deploy_v2_contract.js

if [ $? -ne 0 ]; then
    echo "❌ PDA initialization failed!"
    exit 1
fi

echo "✅ PDA initialization successful!"

# Test auto-mint
echo "🧪 Testing auto-mint..."
node test_auto_mint_v2.js

if [ $? -ne 0 ]; then
    echo "❌ Test failed!"
    exit 1
fi

echo ""
echo "🎉 SMART CONTRACT V2 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "✅ Build: Successful"
echo "✅ Deploy: Successful"
echo "✅ PDA Init: Successful"
echo "✅ Testing: Successful"
echo ""
echo "🚀 Auto-mint scheduler can now use real smart contract!"




