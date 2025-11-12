#!/bin/bash

echo "🚀 BUILDING SMART CONTRACT WITH CARGO BUILD"
echo "==========================================="

# Build smart contract trong Docker với cargo build
docker run --rm \
  -v "$(pwd):/workdir" \
  -w /workdir/game_token/programs/game_token_v2 \
  rust:1.82-slim \
  sh -c '
    echo "📦 Setting up environment..."
    apt update && apt install -y pkg-config libssl-dev

    echo "🔨 Building smart contract..."
    cargo build --release

    echo "📂 Checking build output..."
    ls -la target/release/

    echo "✅ Build completed!"
  '

echo "🎉 SMART CONTRACT BUILD FINISHED!"



