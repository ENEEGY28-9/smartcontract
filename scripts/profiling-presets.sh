#!/bin/bash

# 🚀 GameV1 Profiling Presets Script
# Các preset profiling cho các scenarios khác nhau

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PRESET=$1
SERVICE_NAME=${2:-gateway}
BUILD_DIR="target/release"
PROFILE_DIR="profiling-results"

if [ -z "$PRESET" ]; then
    echo -e "${BLUE}${BOLD}🎯 GameV1 Profiling Presets${NC}"
    echo "=========================="
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <preset> [service_name]"
    echo ""
    echo -e "${YELLOW}Available presets:${NC}"
    echo "  ${GREEN}cpu-intensive${NC}    - CPU bound workloads (game logic, calculations)"
    echo "  ${GREEN}memory-intensive${NC} - Memory allocation heavy (large worlds, caching)"
    echo "  ${GREEN}io-intensive${NC}     - I/O operations (database, file operations)"
    echo "  ${GREEN}network-intensive${NC}- Network operations (WebSocket, API calls)"
    echo "  ${GREEN}thread-safety${NC}    - Concurrency and thread safety analysis"
    echo "  ${GREEN}startup${NC}         - Application startup performance"
    echo "  ${GREEN}comprehensive${NC}   - All profiling tools combined"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 cpu-intensive gateway"
    echo "  $0 memory-intensive worker"
    echo "  $0 comprehensive"
    exit 1
fi

echo -e "${BLUE}${BOLD}🔍 Running profiling preset: $PRESET${NC}"
echo "===================================="

# Create profiling directory
mkdir -p "$PROFILE_DIR"

# Check binary exists
BINARY_PATH="$BUILD_DIR/$SERVICE_NAME"
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${YELLOW}⚠️  Binary not found: $BINARY_PATH${NC}"
    echo -e "${YELLOW}📦 Building $SERVICE_NAME...${NC}"
    cargo build --release --bin "$SERVICE_NAME"
fi

case $PRESET in
    "cpu-intensive")
        echo -e "${BLUE}📊 CPU Intensive Profiling${NC}"
        echo "Focus: CPU hotspots, call graphs, function analysis"

        # Flamegraph for CPU visualization
        if command -v cargo-flamegraph &> /dev/null; then
            echo -e "${YELLOW}🔥 Generating flamegraph...${NC}"
            cargo flamegraph --bin "$SERVICE_NAME" --output "$PROFILE_DIR/cpu-flamegraph.svg"
        fi

        # Callgrind for detailed function analysis
        echo -e "${YELLOW}📞 Running callgrind...${NC}"
        valgrind --tool=callgrind --callgrind-out-file="$PROFILE_DIR/cpu-callgrind.out" "$BINARY_PATH" &
        CPID=$!
        sleep 10
        kill $CPID 2>/dev/null || true
        if [ -f "$PROFILE_DIR/cpu-callgrind.out" ]; then
            callgrind_annotate "$PROFILE_DIR/cpu-callgrind.out" > "$PROFILE_DIR/cpu-callgrind-report.txt"
        fi

        # Perf profiling
        if command -v perf &> /dev/null; then
            echo -e "${YELLOW}🎯 Running perf...${NC}"
            timeout 10s perf record -g -o "$PROFILE_DIR/cpu-perf.data" "$BINARY_PATH" &
            PPID=$!
            sleep 12
            kill $PPID 2>/dev/null || true
            if [ -f "$PROFILE_DIR/cpu-perf.data" ]; then
                perf report --stdio -i "$PROFILE_DIR/cpu-perf.data" > "$PROFILE_DIR/cpu-perf-report.txt"
            fi
        fi
        ;;

    "memory-intensive")
        echo -e "${BLUE}💾 Memory Intensive Profiling${NC}"
        echo "Focus: Memory allocation, leaks, heap usage"

        # DHAT for Rust memory profiling
        if command -v cargo-dhat &> /dev/null; then
            echo -e "${YELLOW}🧠 Running DHAT...${NC}"
            cargo dhat --bin "$SERVICE_NAME"
            if [ -d "dhat-out" ]; then
                cp -r dhat-out "$PROFILE_DIR/memory-dhat-out"
            fi
        fi

        # Massif for heap profiling
        echo -e "${YELLOW}📊 Running massif...${NC}"
        valgrind --tool=massif --massif-out-file="$PROFILE_DIR/memory-massif.out" "$BINARY_PATH" &
        MPID=$!
        sleep 10
        kill $MPID 2>/dev/null || true
        if [ -f "$PROFILE_DIR/memory-massif.out" ]; then
            ms_print "$PROFILE_DIR/memory-massif.out" > "$PROFILE_DIR/memory-massif-report.txt"
        fi

        # Heaptrack for alternative memory profiling
        if command -v heaptrack &> /dev/null; then
            echo -e "${YELLOW}🏔️  Running heaptrack...${NC}"
            heaptrack "$BINARY_PATH" -o "$PROFILE_DIR/memory-heaptrack.gz" &
            HPID=$!
            sleep 10
            kill $HPID 2>/dev/null || true
        fi

        # Jemalloc profiling
        echo -e "${YELLOW}💎 Running jemalloc profiling...${NC}"
        MALLOC_CONF=prof:true,prof_active:true "$BINARY_PATH" &
        JPID=$!
        sleep 10
        kill $JPID 2>/dev/null || true
        ;;

    "io-intensive")
        echo -e "${BLUE}💿 I/O Intensive Profiling${NC}"
        echo "Focus: File I/O, database operations, disk usage"

        # Strace for system call profiling
        echo -e "${YELLOW}🔍 Running strace...${NC}"
        strace -tt -e trace=file,network,desc -o "$PROFILE_DIR/io-strace.txt" "$BINARY_PATH" &
        SPID=$!
        sleep 10
        kill $SPID 2>/dev/null || true

        # I/O profiling with iotop (background monitoring)
        echo -e "${YELLOW}📈 Running I/O monitoring...${NC}"
        timeout 10s iotop -b -o -t > "$PROFILE_DIR/io-iotop.txt" &

        # Cache profiling for I/O patterns
        echo -e "${YELLOW}⚡ Running cache profiling for I/O...${NC}"
        valgrind --tool=cachegrind --cachegrind-out-file="$PROFILE_DIR/io-cachegrind.out" "$BINARY_PATH" &
        CIPID=$!
        sleep 10
        kill $CIPID 2>/dev/null || true
        if [ -f "$PROFILE_DIR/io-cachegrind.out" ]; then
            cg_annotate "$PROFILE_DIR/io-cachegrind.out" > "$PROFILE_DIR/io-cache-report.txt"
        fi
        ;;

    "network-intensive")
        echo -e "${BLUE}🌐 Network Intensive Profiling${NC}"
        echo "Focus: Network I/O, WebSocket, API calls"

        # Strace with network focus
        echo -e "${YELLOW}🔍 Running network strace...${NC}"
        strace -tt -e trace=network -o "$PROFILE_DIR/network-strace.txt" "$BINARY_PATH" &
        NPID=$!
        sleep 10
        kill $NPID 2>/dev/null || true

        # Network traffic monitoring
        echo -e "${YELLOW}📡 Running network monitoring...${NC}"
        timeout 10s tcpdump -i lo -w "$PROFILE_DIR/network-traffic.pcap" port 8080 or port 50051 &
        TPID=$!
        sleep 12
        kill $TPID 2>/dev/null || true

        # Cache profiling for network patterns
        echo -e "${YELLOW}⚡ Running cache profiling for network...${NC}"
        valgrind --tool=cachegrind --cachegrind-out-file="$PROFILE_DIR/network-cachegrind.out" "$BINARY_PATH" &
        NCPID=$!
        sleep 10
        kill $NCPID 2>/dev/null || true
        if [ -f "$PROFILE_DIR/network-cachegrind.out" ]; then
            cg_annotate "$PROFILE_DIR/network-cachegrind.out" > "$PROFILE_DIR/network-cache-report.txt"
        fi
        ;;

    "thread-safety")
        echo -e "${BLUE}🔒 Thread Safety Profiling${NC}"
        echo "Focus: Race conditions, deadlocks, thread contention"

        # DRD for race condition detection
        echo -e "${YELLOW}🔍 Running DRD (Data Race Detection)...${NC}"
        valgrind --tool=drd --log-file="$PROFILE_DIR/thread-drd.txt" "$BINARY_PATH" &
        DPID=$!
        sleep 10
        kill $DPID 2>/dev/null || true

        # Helgrind for lock order violations
        echo -e "${YELLOW}🔒 Running Helgrind (Lock Analysis)...${NC}"
        valgrind --tool=helgrind --log-file="$PROFILE_DIR/thread-helgrind.txt" "$BINARY_PATH" &
        HPID=$!
        sleep 10
        kill $HPID 2>/dev/null || true

        # Thread contention analysis
        echo -e "${YELLOW}🧵 Running thread profiling with perf...${NC}"
        if command -v perf &> /dev/null; then
            timeout 10s perf record -g -o "$PROFILE_DIR/thread-perf.data" "$BINARY_PATH" &
            TPPID=$!
            sleep 12
            kill $TPPID 2>/dev/null || true
            if [ -f "$PROFILE_DIR/thread-perf.data" ]; then
                perf report --stdio -i "$PROFILE_DIR/thread-perf.data" > "$PROFILE_DIR/thread-perf-report.txt"
            fi
        fi
        ;;

    "startup")
        echo -e "${BLUE}🚀 Startup Performance Profiling${NC}"
        echo "Focus: Application startup time and initialization"

        # Strace for startup system calls
        echo -e "${YELLOW}🔍 Running startup strace...${NC}"
        strace -tt -o "$PROFILE_DIR/startup-strace.txt" "$BINARY_PATH" --help &
        SPID=$!
        sleep 2
        kill $SPID 2>/dev/null || true

        # Time profiling
        echo -e "${YELLOW}⏱️  Running time profiling...${NC}"
        /usr/bin/time -v "$BINARY_PATH" --help 2> "$PROFILE_DIR/startup-time.txt" &
        TPID=$!
        sleep 2
        kill $TPID 2>/dev/null || true

        # Perf for startup profiling
        if command -v perf &> /dev/null; then
            echo -e "${YELLOW}🎯 Running startup perf...${NC}"
            perf record -o "$PROFILE_DIR/startup-perf.data" "$BINARY_PATH" --help &
            SPPID=$!
            sleep 2
            kill $SPPID 2>/dev/null || true
        fi
        ;;

    "comprehensive")
        echo -e "${BLUE}🔬 Comprehensive Profiling${NC}"
        echo "Running all profiling tools for complete analysis"

        # Run CPU profiling
        $0 cpu-intensive "$SERVICE_NAME"

        # Run memory profiling
        $0 memory-intensive "$SERVICE_NAME"

        # Run I/O profiling
        $0 io-intensive "$SERVICE_NAME"

        # Run network profiling
        $0 network-intensive "$SERVICE_NAME"

        # Run thread safety profiling
        $0 thread-safety "$SERVICE_NAME"
        ;;

    *)
        echo -e "${RED}❌ Unknown preset: $PRESET${NC}"
        echo "Use one of: cpu-intensive, memory-intensive, io-intensive, network-intensive, thread-safety, startup, comprehensive"
        exit 1
        ;;
esac

# Generate summary report
echo ""
echo -e "${BLUE}📋 Generating profiling report...${NC}"

cat > "$PROFILE_DIR/README-$PRESET.md" << EOF
# GameV1 Profiling Report - $PRESET Preset

Generated on: $(date)
Service: $SERVICE_NAME
Preset: $PRESET

## Profiling Results Summary

### Focus Area: ${PRESET//-/ }

EOF

# Add specific findings based on preset
case $PRESET in
    "cpu-intensive")
        echo "- **CPU Hotspots**: flamegraph.svg, cpu-callgrind-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Function Analysis**: cpu-perf-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
    "memory-intensive")
        echo "- **Memory Allocation**: dhat-out/, memory-massif-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Heap Usage**: memory-heaptrack.gz" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
    "io-intensive")
        echo "- **System Calls**: io-strace.txt, io-iotop.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Cache Performance**: io-cache-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
    "network-intensive")
        echo "- **Network Calls**: network-strace.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Traffic Analysis**: network-traffic.pcap" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Network Cache**: network-cache-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
    "thread-safety")
        echo "- **Race Detection**: thread-drd.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Lock Analysis**: thread-helgrind.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Thread Contention**: thread-perf-report.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
    "startup")
        echo "- **System Calls**: startup-strace.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        echo "- **Timing**: startup-time.txt" >> "$PROFILE_DIR/README-$PRESET.md"
        ;;
esac

echo ""
echo "## Key Files Generated"
ls -la "$PROFILE_DIR" | grep -E "\.(svg|txt|out|gz|pcap)$" | sed 's/^/- /' >> "$PROFILE_DIR/README-$PRESET.md"

echo ""
echo "## Next Steps"
echo "1. Review the generated files for performance insights" >> "$PROFILE_DIR/README-$PRESET.md"
echo "2. Identify bottlenecks and optimization opportunities" >> "$PROFILE_DIR/README-$PRESET.md"
echo "3. Compare results with previous profiling runs" >> "$PROFILE_DIR/README-$PRESET.md"
echo "4. Implement optimizations based on findings" >> "$PROFILE_DIR/README-$PRESET.md"

echo ""
echo -e "${GREEN}✅ Profiling preset '$PRESET' completed!${NC}"
echo -e "📋 Report: ${YELLOW}$PROFILE_DIR/README-$PRESET.md${NC}"
echo -e "📁 Results: ${YELLOW}$PROFILE_DIR/${NC}"
