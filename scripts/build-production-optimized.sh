#!/bin/bash

# 🚀 Production-Optimized Build Script
# Tối ưu tối đa performance cho game server

set -e

echo "🚀 Building production-optimized GameV1 binaries..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BUILD_DIR="target/production-release"
JOBS=$(nproc 2>/dev/null || echo 4)

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
cargo clean

# Update dependencies
echo -e "${YELLOW}📦 Updating dependencies...${NC}"
cargo update

# Build with maximum optimization
echo -e "${YELLOW}🔨 Building with maximum optimization...${NC}"

# Gateway build
echo -e "${BLUE}🏗️  Building Gateway...${NC}"
RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
cargo build --release --target x86_64-unknown-linux-gnu -p gateway

# Worker build
echo -e "${BLUE}🏗️  Building Worker...${NC}"
RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
cargo build --release --target x86_64-unknown-linux-gnu -p worker

# Room Manager build
echo -e "${BLUE}🏗️  Building Room Manager...${NC}"
RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
cargo build --release --target x86_64-unknown-linux-gnu -p room-manager

# Services build
echo -e "${BLUE}🏗️  Building Services...${NC}"
RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
cargo build --release --target x86_64-unknown-linux-gnu -p services

# PocketBase build
echo -e "${BLUE}🏗️  Building PocketBase...${NC}"
RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
cargo build --release --target x86_64-unknown-linux-gnu -p pocketbase

# Create production directory
mkdir -p "$BUILD_DIR"
echo -e "${YELLOW}📋 Copying optimized binaries...${NC}"

# Copy binaries
cp target/x86_64-unknown-linux-gnu/release/gateway "$BUILD_DIR/"
cp target/x86_64-unknown-linux-gnu/release/worker "$BUILD_DIR/"
cp target/x86_64-unknown-linux-gnu/release/room-manager "$BUILD_DIR/"
cp target/x86_64-unknown-linux-gnu/release/services "$BUILD_DIR/"
cp target/x86_64-unknown-linux-gnu/release/pocketbase "$BUILD_DIR/"

# Strip binaries for minimal size
echo -e "${YELLOW}⚡ Stripping binaries for minimal size...${NC}"
for binary in "$BUILD_DIR"/*; do
    if [ -f "$binary" ] && [ -x "$binary" ]; then
        echo "  Stripping $(basename "$binary")..."
        strip "$binary"
    fi
done

# Create static builds với musl (nếu có)
if command -v musl-gcc &> /dev/null; then
    echo -e "${YELLOW}🏗️  Building static binaries (musl)...${NC}"

    STATIC_DIR="$BUILD_DIR/static"
    mkdir -p "$STATIC_DIR"

    # Gateway static
    echo -e "${BLUE}🏗️  Building static Gateway...${NC}"
    cargo build --release --target x86_64-unknown-linux-musl -p gateway
    cp target/x86_64-unknown-linux-musl/release/gateway "$STATIC_DIR/gateway-static"
    strip "$STATIC_DIR/gateway-static"

    # Worker static
    echo -e "${BLUE}🏗️  Building static Worker...${NC}"
    cargo build --release --target x86_64-unknown-linux-musl -p worker
    cp target/x86_64-unknown-linux-musl/release/worker "$STATIC_DIR/worker-static"
    strip "$STATIC_DIR/worker-static"

    echo -e "${GREEN}✅ Static binaries built${NC}"
fi

# Generate build info
cat > "$BUILD_DIR/build-info.txt" << EOF
GameV1 Production Build
=======================
Build Date: $(date)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Rust Version: $(rustc --version)
Build Profile: Production Optimized

Optimization Flags:
- target-cpu=native
- opt-level=3
- lto=fat
- codegen-units=1
- panic=abort

Binary Sizes:
$(ls -lh "$BUILD_DIR" | grep -v "^total")
$(if [ -d "$STATIC_DIR" ]; then echo -e "\nStatic Binary Sizes:"; ls -lh "$STATIC_DIR" | grep -v "^total"; fi)
EOF

# Create deployment script
cat > "$BUILD_DIR/deploy.sh" << 'EOF'
#!/bin/bash
# Quick deployment script

echo "🚀 Deploying GameV1 production binaries..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Copy binaries to system
cp gateway worker room-manager services pocketbase /opt/gamev1/bin/

# Set permissions
chown gamev1:gamev1 /opt/gamev1/bin/*
chmod +x /opt/gamev1/bin/*

echo "✅ Binaries deployed to /opt/gamev1/bin/"
echo ""
echo "🔧 Start services:"
echo "   systemctl start gamev1-gateway"
echo "   systemctl start gamev1-worker"
echo "   systemctl start gamev1-pocketbase"
EOF

chmod +x "$BUILD_DIR/deploy.sh"

# Display results
echo -e "${GREEN}✅ Production build completed!${NC}"
echo ""
echo "📊 Build Summary:"
echo "================="
cat "$BUILD_DIR/build-info.txt"
echo ""
echo "📦 Production binaries in: $BUILD_DIR/"
echo "📋 Quick deployment: $BUILD_DIR/deploy.sh"
echo ""
echo -e "${YELLOW}💡 Optimization Benefits:${NC}"
echo "  • Native CPU instructions for maximum performance"
echo "  • Aggressive optimizations (opt-level=3)"
echo "  • Link-time optimization (LTO) for cross-crate optimization"
echo "  • Minimal binary size (stripped)"
echo "  • Panic abort for smaller binaries and better performance"
echo ""
echo -e "${YELLOW}🎯 Expected Performance Gains:${NC}"
echo "  • 20-40% faster execution compared to debug builds"
echo "  • 30-50% smaller memory footprint"
echo "  • Better cache locality"
echo "  • Reduced startup time"
