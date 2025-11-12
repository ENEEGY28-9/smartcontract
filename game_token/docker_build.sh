#!/bin/bash

echo "Installing system dependencies..."
apt-get update && apt-get install -y pkg-config libudev-dev build-essential

echo "Setting up Rust toolchain..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | /bin/bash -s -- -y
export PATH=$HOME/.cargo/bin:$PATH

echo "Using stable Rust (already set to 1.76.0)"

echo "Installing Anchor v0.29.0 (compatible with Rust 1.76)..."
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked --force
export PATH=$HOME/.cargo/bin:$PATH

echo "Installing Solana CLI from Agave..."
curl -sSfL https://release.anza.xyz/v1.18.26/install | /bin/bash
export PATH=$HOME/.local/share/solana/install/active_release/bin:$PATH

echo "Building SBF with Anchor..."
cd /workdir
anchor build

echo "Build completed!"
