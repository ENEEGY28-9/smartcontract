#!/bin/bash

echo "🚀 BUILDING SMART CONTRACT IN DOCKER"
echo "===================================="

# Build smart contract trong Docker
docker run --rm \
  -v "$(pwd):/workdir" \
  -w /workdir/game_token/programs/game_token_v2 \
  rust:1.82-slim \
  sh -c '
    echo "📦 Setting up environment..."
    apt update && apt install -y curl pkg-config libssl-dev

    echo "⬇️ Installing Solana CLI..."
    curl -sSfL https://install.solana.com | sh

    echo "🔨 Building smart contract..."
    export PATH=/root/.local/share/solana/install/active_release/bin:$PATH
    cargo build-sbf -- --release

    echo "✅ Build completed!"
  '

echo "🎉 SMART CONTRACT BUILD FINISHED!"




