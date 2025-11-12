#!/bin/bash

# WSL DEPLOYMENT SCRIPT
# Setup Solana environment and deploy smart contract from WSL

echo "🚀 Setting up Solana environment in WSL..."

# Install Solana CLI
echo "📦 Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Add Solana to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Check installation
echo "🔍 Checking Solana installation..."
solana --version

# Configure for devnet
echo "⚙️ Configuring for devnet..."
solana config set --url https://api.devnet.solana.com

# Install Anchor
echo "🔧 Installing Anchor CLI..."
npm install -g @coral-xyz/anchor-cli

# Check Anchor
echo "🔍 Checking Anchor installation..."
anchor --version

# Install Rust if not present
echo "🦀 Checking Rust..."
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

rustc --version
cargo --version

echo "📂 Setting up project..."
# Copy project files to WSL (assuming they're accessible)
# In practice, you would mount or copy the files

echo "🔨 Building smart contract..."
# anchor build

echo "🚀 Deploying to devnet..."
# anchor deploy --provider.cluster devnet

echo "✅ WSL Environment setup complete!"
echo "💡 Next steps:"
echo "   1. Copy project files to WSL"
echo "   2. Run: anchor build"
echo "   3. Run: anchor deploy --provider.cluster devnet"
echo "   4. Initialize PDAs"
echo "   5. Test logic"









