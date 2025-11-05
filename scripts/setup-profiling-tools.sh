#!/bin/bash

# 🚀 Setup Performance Profiling Tools for GameV1
# Cài đặt tất cả công cụ profiling cần thiết cho tối ưu performance

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}🔧 Setting up Performance Profiling Tools${NC}"
echo "========================================"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}❌ This script is designed for Linux systems${NC}"
    echo "For macOS/Windows, install tools manually as needed"
    exit 1
fi

echo -e "${BLUE}📦 Installing Rust profiling tools...${NC}"

# Install cargo tools
echo -e "${YELLOW}📦 Installing cargo-flamegraph...${NC}"
cargo install cargo-flamegraph

echo -e "${YELLOW}📦 Installing cargo-dhat...${NC}"
cargo install cargo-dhat

echo -e "${YELLOW}📦 Installing cargo-profdata...${NC}"
cargo install cargo-profdata

echo ""
echo -e "${BLUE}🔧 Installing system profiling tools...${NC}"

# Update package manager
echo -e "${YELLOW}🔄 Updating package manager...${NC}"
sudo apt-get update

# Install valgrind (for massif, cachegrind, callgrind, drd, helgrind)
echo -e "${YELLOW}📦 Installing valgrind...${NC}"
sudo apt-get install -y valgrind

# Install perf (Linux performance profiler)
echo -e "${YELLOW}📦 Installing perf...${NC}"
sudo apt-get install -y linux-tools-common linux-tools-generic

# Install graphviz for flamegraph visualization
echo -e "${YELLOW}📦 Installing graphviz...${NC}"
sudo apt-get install -y graphviz

# Install jemalloc development files for profiling
echo -e "${YELLOW}📦 Installing jemalloc dev files...${NC}"
sudo apt-get install -y libjemalloc-dev

echo ""
echo -e "${BLUE}✅ Installing additional development tools...${NC}"

# Install htop for system monitoring
echo -e "${YELLOW}📦 Installing htop...${NC}"
sudo apt-get install -y htop iotop iftop nethogs

# Install development utilities
echo -e "${YELLOW}📦 Installing development utilities...${NC}"
sudo apt-get install -y curl wget git build-essential

# Install additional profiling tools
echo -e "${YELLOW}📦 Installing heaptrack (alternative memory profiler)...${NC}"
sudo apt-get install -y heaptrack heaptrack-gui

# Install strace for system call profiling
echo -e "${YELLOW}📦 Installing strace...${NC}"
sudo apt-get install -y strace

# Install gdb for debugging and profiling
echo -e "${YELLOW}📦 Installing gdb...${NC}"
sudo apt-get install -y gdb

# Install hotspot (GUI for perf)
echo -e "${YELLOW}📦 Installing hotspot (GUI for perf)...${NC}"
sudo apt-get install -y hotspot

echo ""
echo -e "${BLUE}🔍 Verifying installations...${NC}"

# Verify installations
echo -e "${YELLOW}🔍 Checking cargo tools...${NC}"
cargo flamegraph --version || echo -e "${RED}❌ cargo-flamegraph not working${NC}"
cargo dhat --version || echo -e "${RED}❌ cargo-dhat not working${NC}"

echo -e "${YELLOW}🔍 Checking system tools...${NC}"
valgrind --version || echo -e "${RED}❌ valgrind not working${NC}"
perf --version || echo -e "${YELLOW}⚠️  perf not available (may need kernel headers)${NC}"
cg_annotate --version || echo -e "${YELLOW}⚠️  cg_annotate not available${NC}"
heaptrack --version || echo -e "${YELLOW}⚠️  heaptrack not available${NC}"
strace --version || echo -e "${YELLOW}⚠️  strace not available${NC}"
gdb --version || echo -e "${YELLOW}⚠️  gdb not available${NC}"
hotspot --version || echo -e "${YELLOW}⚠️  hotspot not available${NC}"

echo ""
echo -e "${BLUE}📋 Setup complete!${NC}"
echo ""
echo -e "${GREEN}✅ Installed profiling tools:${NC}"
echo "  • cargo-flamegraph - CPU profiling visualization"
echo "  • cargo-dhat - Rust-optimized memory profiling"
echo "  • cargo-profdata - Profile data processing"
echo "  • valgrind (massif, cachegrind, callgrind, drd, helgrind)"
echo "  • perf - Linux kernel-level profiling"
echo "  • heaptrack - Alternative memory profiler with GUI"
echo "  • strace - System call profiling"
echo "  • gdb - Debugging and profiling"
echo "  • hotspot - GUI for perf visualization"
echo "  • graphviz - Flamegraph visualization"
echo "  • jemalloc - Advanced memory allocation profiling"
echo "  • htop, iotop, iftop, nethogs - System monitoring"
echo ""

echo -e "${YELLOW}💡 Usage:${NC}"
echo "  ./scripts/profile-all.sh [service_name]  # Run comprehensive profiling"
echo "  ./scripts/benchmark-docker-vs-native.sh  # Compare performance"
echo ""

echo -e "${GREEN}🎉 GameV1 profiling environment ready!${NC}"

# Make script executable
chmod +x "$0"
