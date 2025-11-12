#!/bin/bash

echo "🚀 BUILDING SMART CONTRACT WITH ANCHOR IN DOCKER"
echo "==============================================="

# Build smart contract trong Docker với Anchor
docker run --rm \
  -v "$(pwd):/workdir" \
  -w /workdir/game_token \
  --user $(id -u):$(id -g) \
  rust:1.82-slim \
  sh -c '
    echo "📦 Setting up environment..."
    apt update && apt install -y curl pkg-config libssl-dev git

    echo "⬇️ Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

    echo "🔗 Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    ~/.avm/bin/avm install latest
    ~/.avm/bin/avm use latest

    echo "🔨 Building smart contract with Anchor..."
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    export PATH="$HOME/.avm/bin:$PATH"
    anchor build

    echo "✅ Build completed!"
  '

echo "🎉 SMART CONTRACT BUILD FINISHED!"



