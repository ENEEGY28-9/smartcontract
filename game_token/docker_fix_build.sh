#!/bin/bash

echo "🔧 FIXING ELF COMPATIBILITY ISSUE"
echo "================================"

# Install dependencies
apt-get update && apt-get install -y curl build-essential pkg-config libudev-dev libssl-dev sed

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH=$HOME/.cargo/bin:$PATH

# Install Solana CLI
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH=$HOME/.local/share/solana/install/active_release/bin:$PATH

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked
export PATH=$HOME/.cargo/bin:$PATH

# Fix lock file version
cd /workdir/programs/game_token_v2
sed -i 's/version = 4/version = 3/' Cargo.lock

# Build
cd /workdir
anchor build

echo "✅ BUILD COMPLETED!"

# Apply strip to fix ELF compatibility
strip --strip-all target/deploy/game_token.so

echo "🔧 ELF COMPATIBILITY FIXED!"

