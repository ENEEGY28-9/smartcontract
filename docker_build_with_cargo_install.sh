#!/bin/bash

echo "🚀 BUILDING SMART CONTRACT WITH CARGO-BUILD-SBF"
echo "==============================================="

# Build smart contract trong Docker với cargo-build-sbf được cài đặt
docker run --rm \
  -v "$(pwd):/workdir" \
  -w /workdir/game_token/programs/game_token_v2 \
  rust:1.82-slim \
  sh -c '
    echo "📦 Setting up environment..."
    apt update && apt install -y curl pkg-config libssl-dev git

    echo "🔨 Installing cargo-build-sbf..."
    cargo install cargo-build-sbf

    echo "🔨 Building smart contract..."
    cargo build-sbf -- --release

    echo "✅ Build completed!"
  '

echo "🎉 SMART CONTRACT BUILD FINISHED!"



