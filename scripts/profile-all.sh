#!/bin/bash

# 🚀 Comprehensive Performance Profiling Script for GameV1
# Tối ưu profiling tools cho game server production

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
BUILD_DIR="target/release"
PROFILE_DIR="profiling-results"
SERVICE_NAME=${1:-gateway}  # Default to gateway, or specify service name

echo -e "${BLUE}${BOLD}🔍 GameV1 Comprehensive Performance Profiling${NC}"
echo "=============================================="
echo -e "Service: ${YELLOW}$SERVICE_NAME${NC}"
echo -e "Started at: $(date)"
echo ""

# Create profiling directory
mkdir -p "$PROFILE_DIR"

echo -e "${BLUE}📋 Phase 1: Prerequisites Check${NC}"

# Check if binary exists
BINARY_PATH="$BUILD_DIR/$SERVICE_NAME"
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${YELLOW}⚠️  Binary not found: $BINARY_PATH${NC}"
    echo -e "${YELLOW}📦 Building $SERVICE_NAME...${NC}"
    cargo build --release --bin "$SERVICE_NAME"
fi

echo -e "${GREEN}✅ Binary ready: $BINARY_PATH${NC}"

# Check required tools
REQUIRED_TOOLS=("valgrind" "perf")
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${YELLOW}⚠️  $tool not found. Install for full profiling.${NC}"
    else
        echo -e "${GREEN}✅ $tool available${NC}"
    fi
done

echo ""
echo -e "${BLUE}📊 Phase 2: CPU Profiling${NC}"

# Flamegraph CPU profiling
if command -v cargo-flamegraph &> /dev/null; then
    echo -e "${YELLOW}🔥 Generating flamegraph...${NC}"
    cargo flamegraph --bin "$SERVICE_NAME" --output "$PROFILE_DIR/flamegraph.svg"
    echo -e "${GREEN}✅ Flamegraph saved to: $PROFILE_DIR/flamegraph.svg${NC}"
else
    echo -e "${YELLOW}⚠️  cargo-flamegraph not installed. Install with: cargo install cargo-flamegraph${NC}"
fi

echo ""
echo -e "${BLUE}💾 Phase 3: Memory Profiling${NC}"

# DHAT memory profiling (Rust-optimized)
if command -v cargo-dhat &> /dev/null; then
    echo -e "${YELLOW}🧠 Running DHAT memory profiling...${NC}"
    cargo dhat --bin "$SERVICE_NAME"
    if [ -d "dhat-out" ]; then
        cp -r dhat-out "$PROFILE_DIR/"
        echo -e "${GREEN}✅ DHAT results saved to: $PROFILE_DIR/dhat-out/${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  cargo-dhat not installed. Install with: cargo install cargo-dhat${NC}"
fi

# Traditional massif profiling
echo -e "${YELLOW}📊 Running Massif memory profiling...${NC}"
valgrind --tool=massif --massif-out-file="$PROFILE_DIR/massif.out" "$BINARY_PATH" &
MASSIF_PID=$!
sleep 10  # Let it run for 10 seconds
kill $MASSIF_PID 2>/dev/null || true
if [ -f "$PROFILE_DIR/massif.out" ]; then
    ms_print "$PROFILE_DIR/massif.out" > "$PROFILE_DIR/massif-report.txt"
    echo -e "${GREEN}✅ Massif results saved to: $PROFILE_DIR/massif-report.txt${NC}"
fi

echo ""
echo -e "${BLUE}⚡ Phase 4: Cache & Performance Profiling${NC}"

# Cache profiling
echo -e "${YELLOW}💨 Running cache profiling...${NC}"
valgrind --tool=cachegrind --cachegrind-out-file="$PROFILE_DIR/cachegrind.out" "$BINARY_PATH" &
CACHE_PID=$!
sleep 10
kill $CACHE_PID 2>/dev/null || true
if [ -f "$PROFILE_DIR/cachegrind.out" ]; then
    cg_annotate "$PROFILE_DIR/cachegrind.out" > "$PROFILE_DIR/cache-profile.txt"
    echo -e "${GREEN}✅ Cache profile saved to: $PROFILE_DIR/cache-profile.txt${NC}"
fi

# Perf profiling (Linux)
if command -v perf &> /dev/null; then
    echo -e "${YELLOW}🎯 Running perf profiling...${NC}"
    timeout 10s perf record -g -o "$PROFILE_DIR/perf.data" "$BINARY_PATH" &
    PERF_PID=$!
    sleep 12
    kill $PERF_PID 2>/dev/null || true
    if [ -f "$PROFILE_DIR/perf.data" ]; then
        perf report --stdio -i "$PROFILE_DIR/perf.data" > "$PROFILE_DIR/perf-report.txt"
        echo -e "${GREEN}✅ Perf report saved to: $PROFILE_DIR/perf-report.txt${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🔒 Phase 5: Thread Safety Analysis${NC}"

# Thread safety analysis
echo -e "${YELLOW}🔍 Running thread safety analysis...${NC}"
valgrind --tool=drd --log-file="$PROFILE_DIR/drd-output.txt" "$BINARY_PATH" &
DRD_PID=$!
sleep 10
kill $DRD_PID 2>/dev/null || true
echo -e "${GREEN}✅ Thread safety analysis saved to: $PROFILE_DIR/drd-output.txt${NC}"

echo ""
echo -e "${BLUE}📋 Phase 6: Generate Summary Report${NC}"

# Generate comprehensive report
cat > "$PROFILE_DIR/README.md" << EOF
# GameV1 Performance Profiling Report

Generated on: $(date)
Service: $SERVICE_NAME

## Profiling Results Summary

### 🔥 CPU Profiling
- **Flamegraph**: \`flamegraph.svg\` - Visual CPU usage breakdown
- **Call Graph**: \`perf-report.txt\` - Detailed function call analysis

### 💾 Memory Profiling
- **DHAT**: \`dhat-out/\` - Rust-optimized memory allocation analysis
- **Massif**: \`massif-report.txt\` - Traditional memory usage profiling

### ⚡ Cache Performance
- **Cachegrind**: \`cache-profile.txt\` - Cache miss analysis and optimization opportunities

### 🔒 Thread Safety
- **DRD**: \`drd-output.txt\` - Data race and thread safety analysis

## Key Findings
$(if [ -f "flamegraph.svg" ]; then echo "- CPU hotspots identified in flamegraph visualization"; fi)
$(if [ -d "dhat-out" ]; then echo "- Memory allocation patterns analyzed with DHAT"; fi)
$(if [ -f "cache-profile.txt" ]; then echo "- Cache performance metrics available"; fi)
$(if [ -f "drd-output.txt" ]; then echo "- Thread safety validation completed"; fi)

## Next Steps
1. Review flamegraph.svg for CPU optimization opportunities
2. Analyze DHAT results for memory leak detection
3. Check cache-profile.txt for memory access pattern improvements
4. Address any thread safety issues found in DRD output

## Tools Used
- cargo-flamegraph (CPU visualization)
- cargo-dhat (Memory profiling)
- valgrind (cachegrind, massif, drd)
- perf (Linux performance profiling)

EOF

echo -e "${GREEN}✅ Profiling report generated: $PROFILE_DIR/README.md${NC}"

echo ""
echo -e "${BLUE}${BOLD}🎉 Profiling Complete!${NC}"
echo "===================="
echo -e "Results saved to: ${YELLOW}$PROFILE_DIR/${NC}"
echo ""
echo -e "📊 Files generated:"
ls -la "$PROFILE_DIR/" | grep -v "^total"

echo ""
echo -e "${YELLOW}💡 Quick Analysis Tips:${NC}"
echo "  • Open flamegraph.svg in browser for interactive CPU analysis"
echo "  • Check dhat-out/ directory for detailed memory insights"
echo "  • Review cache-profile.txt for cache optimization opportunities"
echo "  • Examine drd-output.txt for thread safety issues"
echo ""
echo -e "${GREEN}✅ GameV1 profiling suite completed successfully!${NC}"
