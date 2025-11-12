#!/bin/bash

echo "🚀 BUILDING SMART CONTRACT IN DOCKER WITH NEW SOLANA CLI"
echo "======================================================="

echo "📦 Installing system dependencies..."
apt-get update && apt-get install -y curl build-essential pkg-config libudev-dev libssl-dev

echo "🦀 Installing Rust toolchain..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH=$HOME/.cargo/bin:$PATH

echo "⛓️ Installing Solana CLI from Agave..."
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH=$HOME/.local/share/solana/install/active_release/bin:$PATH

echo "⚓ Installing Anchor CLI v0.31.1..."
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked
export PATH=$HOME/.cargo/bin:$PATH

echo "🔨 Building smart contract..."
cd /workdir
anchor build

echo "✅ BUILD COMPLETED SUCCESSFULLY!"