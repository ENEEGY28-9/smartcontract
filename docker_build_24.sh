#!/bin/bash

echo "🚀 Building Solana Smart Contract with Ubuntu 24.04 (GLIBC 2.39)"
echo "================================================================="

# Build with Ubuntu 24.04 (has GLIBC 2.39)
docker run --rm -v "$(pwd)":/workdir -w /workdir ubuntu:24.04 /bin/bash -c "
echo '📦 Installing system dependencies...'
apt-get update -qq && apt-get install -y -qq \
    curl build-essential pkg-config libudev-dev git

echo '🦀 Installing Rust...'
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH=\"\$HOME/.cargo/bin:\$PATH\"
source ~/.cargo/env

echo '☀️ Installing Solana CLI...'
sh -c \"\$(curl -sSfL https://release.anza.xyz/v1.18.26/install)\"

echo '⚓ Installing Anchor CLI...'
export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\"
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

echo '🏗️ Building smart contract...'
export PATH=\"\$HOME/.cargo/bin:\$PATH\"
export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\"
export PATH=\"\$HOME/.avm/bin:\$PATH\"
anchor build

echo '✅ Build completed successfully!'
"

echo "🎉 Docker build process finished!"


