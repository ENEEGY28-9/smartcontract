#!/bin/bash

# 🚀 GameV1 Static Binary Builder
# Tối ưu performance cho game server

set -e

echo "🎯 Building optimized static binaries for GameV1..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build directory
BUILD_DIR="target/static-release"
mkdir -p "$BUILD_DIR"

# Build each service với static linking tối ưu
echo -e "${YELLOW}🔨 Building Gateway...${NC}"
cargo build --release --target x86_64-unknown-linux-gnu --bin gateway
cp target/x86_64-unknown-linux-gnu/release/gateway "$BUILD_DIR/"

echo -e "${YELLOW}🔨 Building Worker...${NC}"
cargo build --release --target x86_64-unknown-linux-gnu --bin worker
cp target/x86_64-unknown-linux-gnu/release/worker "$BUILD_DIR/"

echo -e "${YELLOW}🔨 Building Room Manager...${NC}"
cargo build --release --target x86_64-unknown-linux-gnu --bin room-manager
cp target/x86_64-unknown-linux-gnu/release/room-manager "$BUILD_DIR/"

echo -e "${YELLOW}🔨 Building Services...${NC}"
cargo build --release --target x86_64-unknown-linux-gnu --bin services
cp target/x86_64-unknown-linux-gnu/release/services "$BUILD_DIR/"

echo -e "${YELLOW}🔨 Building PocketBase...${NC}"
cargo build --release --target x86_64-unknown-linux-gnu --bin pocketbase
cp target/x86_64-unknown-linux-gnu/release/pocketbase "$BUILD_DIR/"

# Strip binaries để giảm size và tối ưu performance
echo -e "${YELLOW}⚡ Stripping binaries...${NC}"
for binary in "$BUILD_DIR"/*; do
    if [ -f "$binary" ] && [ -x "$binary" ]; then
        strip "$binary"
        echo "  ✓ Stripped $(basename "$binary")"
    fi
done

# Tạo archive để dễ distribute
echo -e "${YELLOW}📦 Creating distribution archive...${NC}"
cd "$BUILD_DIR"
tar -czf "../gamev1-binaries-$(date +%Y%m%d-%H%M%S).tar.gz" *
cd - > /dev/null

# Display results
echo -e "${GREEN}✅ Build completed!${NC}"
echo "📊 Binary sizes:"
ls -lh "$BUILD_DIR"
echo ""
echo "📦 Distribution archive created in target/"
echo ""
echo "🚀 To run services:"
echo "   cd $BUILD_DIR"
echo "   ./gateway --help"
echo "   ./worker --help"
echo "   ./room-manager --help"
