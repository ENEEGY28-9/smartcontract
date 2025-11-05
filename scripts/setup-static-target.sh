#!/bin/bash

# 🚀 Setup Static Target cho Rust
# Chuẩn bị môi trường để build static binaries

set -e

echo "🔧 Setting up static target for optimized builds..."

# Cài đặt musl target để build static binaries
rustup target add x86_64-unknown-linux-musl

# Cài đặt musl-gcc để link static
if ! command -v musl-gcc &> /dev/null; then
    echo "📦 Installing musl-gcc..."
    sudo apt-get update
    sudo apt-get install -y musl-tools musl-dev
fi

# Verify installation
echo "✅ Static target setup completed!"
echo "🔍 Verifying setup:"
musl-gcc --version | head -1
echo "✅ musl-gcc installed"

echo ""
echo "🚀 Ready to build static binaries!"
echo "   Run: ./scripts/build-static-binaries.sh"
