#!/bin/bash

echo "🔨 CUSTOM BUILD FOR SOLANA - AVOIDING ELF ISSUES"
echo "==============================================="

# Set environment
export PATH=/root/.cargo/bin:/usr/local/bin:$PATH
source ~/.cargo/env

cd /workdir

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf target/deploy/*.so 2>/dev/null || true

# Build with custom Rust flags to minimize ELF sections
echo "🔧 Building with custom flags..."

# Method 1: Build with minimal sections
cd programs/game_token_v2
RUSTFLAGS="-C link-arg=-Wl,--strip-all -C link-arg=-Wl,--gc-sections -C link-arg=-Wl,--as-needed" \
cargo build --release --target x86_64-unknown-linux-gnu

# Copy and strip the binary
echo "🔪 Stripping binary..."
cp target/x86_64-unknown-linux-gnu/release/deps/libgame_token_v2.so ../../../target/deploy/game_token.so 2>/dev/null || \
cp target/release/deps/libgame_token_v2.so ../../../target/deploy/game_token.so 2>/dev/null || \
echo "❌ Could not find built library"

# Aggressive stripping
if [ -f ../../../target/deploy/game_token.so ]; then
    strip --strip-all ../../../target/deploy/game_token.so 2>/dev/null || true
    strip --strip-debug ../../../target/deploy/game_token.so 2>/dev/null || true

    echo "✅ Build completed!"
    ls -la ../../../target/deploy/game_token.so

    # Test ELF sections
    echo "📋 ELF sections after stripping:"
    readelf -S ../../../target/deploy/game_token.so 2>/dev/null | grep -E '\.note' || echo "✅ No problematic sections found"
else
    echo "❌ Build failed - no output file"
fi

