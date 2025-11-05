#!/bin/bash

# 🚀 GameV1 Profiling Results Comparison Script
# So sánh kết quả profiling giữa các lần chạy khác nhau

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

BASELINE_DIR=${1:-"profiling-results/baseline"}
CURRENT_DIR=${2:-"profiling-results"}

if [ ! -d "$BASELINE_DIR" ]; then
    echo -e "${RED}❌ Baseline directory not found: $BASELINE_DIR${NC}"
    echo "Run profiling first to create baseline results"
    exit 1
fi

if [ ! -d "$CURRENT_DIR" ]; then
    echo -e "${RED}❌ Current directory not found: $CURRENT_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}${BOLD}📊 GameV1 Profiling Results Comparison${NC}"
echo "======================================"
echo -e "Baseline: ${YELLOW}$BASELINE_DIR${NC}"
echo -e "Current:  ${YELLOW}$CURRENT_DIR${NC}"
echo ""

# Function to extract metrics from profiling files
extract_metrics() {
    local dir=$1
    local metrics_file="$dir/metrics-summary.txt"

    # Initialize metrics
    local cpu_time=0
    local memory_peak=0
    local cache_misses=0
    local instructions=0

    # Extract from flamegraph (if exists)
    if [ -f "$dir/flamegraph.svg" ]; then
        echo "Found flamegraph: $dir/flamegraph.svg"
    fi

    # Extract from massif report
    if [ -f "$dir/memory-massif-report.txt" ]; then
        memory_peak=$(grep -o "mem_heap_B=[0-9]*" "$dir/memory-massif-report.txt" | head -1 | cut -d'=' -f2)
        echo "Memory peak: $memory_peak bytes"
    fi

    # Extract from cachegrind report
    if [ -f "$dir/cache-profile.txt" ]; then
        cache_misses=$(grep -o "I1  misses:[[:space:]]*[0-9]*" "$dir/cache-profile.txt" | head -1 | awk '{print $3}')
        instructions=$(grep -o "I  refs:[[:space:]]*[0-9]*" "$dir/cache-profile.txt" | head -1 | awk '{print $3}')
        echo "Cache misses: $cache_misses"
        echo "Instructions: $instructions"
    fi

    # Extract from perf report
    if [ -f "$dir/cpu-perf-report.txt" ]; then
        cpu_time=$(grep -o "seconds time elapsed" "$dir/cpu-perf-report.txt" | wc -l)
        echo "CPU time samples: $cpu_time"
    fi

    # Create metrics summary
    cat > "$metrics_file" << EOF
# Profiling Metrics Summary
Generated: $(date)

CPU Time Samples: $cpu_time
Memory Peak (B): $memory_peak
Cache Misses: $cache_misses
Instructions: $instructions

Files analyzed:
$(ls -la "$dir" | grep -E "\.(txt|out|svg|gz)$" | wc -l) profiling files
EOF

    echo "$cpu_time|$memory_peak|$cache_misses|$instructions"
}

echo -e "${BLUE}📋 Extracting metrics from baseline...${NC}"
BASELINE_METRICS=$(extract_metrics "$BASELINE_DIR")

echo -e "${BLUE}📋 Extracting metrics from current...${NC}"
CURRENT_METRICS=$(extract_metrics "$CURRENT_DIR")

# Parse metrics
IFS='|' read -r baseline_cpu baseline_memory baseline_cache baseline_instructions <<< "$BASELINE_METRICS"
IFS='|' read -r current_cpu current_memory current_cache current_instructions <<< "$CURRENT_METRICS"

echo ""
echo -e "${BLUE}${BOLD}📈 Comparison Results${NC}"
echo "===================="

# CPU comparison
echo -e "${YELLOW}🖥️  CPU Performance:${NC}"
if [ "$baseline_cpu" -gt 0 ] && [ "$current_cpu" -gt 0 ]; then
    cpu_change=$((current_cpu - baseline_cpu))
    cpu_percent=$((cpu_change * 100 / baseline_cpu))
    if [ $cpu_change -gt 0 ]; then
        echo -e "  ${RED}⬆️  CPU samples increased by $cpu_change (${cpu_percent}%)${NC}"
    elif [ $cpu_change -lt 0 ]; then
        echo -e "  ${GREEN}⬇️  CPU samples decreased by $cpu_change (${cpu_percent}%)${NC}"
    else
        echo -e "  ${GREEN}➡️  CPU samples unchanged${NC}"
    fi
else
    echo "  Insufficient CPU data for comparison"
fi

# Memory comparison
echo -e "${YELLOW}💾 Memory Usage:${NC}"
if [ "$baseline_memory" -gt 0 ] && [ "$current_memory" -gt 0 ]; then
    memory_change=$((current_memory - baseline_memory))
    memory_percent=$((memory_change * 100 / baseline_memory))
    memory_mb_baseline=$((baseline_memory / 1024 / 1024))
    memory_mb_current=$((current_memory / 1024 / 1024))

    echo "  Baseline: ${memory_mb_baseline} MB"
    echo "  Current:  ${memory_mb_current} MB"

    if [ $memory_change -gt 0 ]; then
        echo -e "  ${RED}⬆️  Memory usage increased by $memory_mb_current MB (${memory_percent}%)${NC}"
    elif [ $memory_change -lt 0 ]; then
        echo -e "  ${GREEN}⬇️  Memory usage decreased by $(( -memory_mb_current + memory_mb_baseline )) MB (${memory_percent}%)${NC}"
    else
        echo -e "  ${GREEN}➡️  Memory usage unchanged${NC}"
    fi
else
    echo "  Insufficient memory data for comparison"
fi

# Cache comparison
echo -e "${YELLOW}⚡ Cache Performance:${NC}"
if [ "$baseline_cache" -gt 0 ] && [ "$current_cache" -gt 0 ]; then
    cache_change=$((current_cache - baseline_cache))
    cache_percent=$((cache_change * 100 / baseline_cache))

    if [ $cache_change -gt 0 ]; then
        echo -e "  ${RED}⬆️  Cache misses increased by $cache_change (${cache_percent}%)${NC}"
    elif [ $cache_change -lt 0 ]; then
        echo -e "  ${GREEN}⬇️  Cache misses decreased by $cache_change (${cache_percent}%)${NC}"
    else
        echo -e "  ${GREEN}➡️  Cache misses unchanged${NC}"
    fi
else
    echo "  Insufficient cache data for comparison"
fi

# Instructions comparison
echo -e "${YELLOW}📊 Instructions:${NC}"
if [ "$baseline_instructions" -gt 0 ] && [ "$current_instructions" -gt 0 ]; then
    instructions_change=$((current_instructions - baseline_instructions))
    instructions_percent=$((instructions_change * 100 / baseline_instructions))

    if [ $instructions_change -gt 0 ]; then
        echo -e "  ${YELLOW}⬆️  Instructions increased by $instructions_change (${instructions_percent}%)${NC}"
    elif [ $instructions_change -lt 0 ]; then
        echo -e "  ${GREEN}⬇️  Instructions decreased by $instructions_change (${instructions_percent}%)${NC}"
    else
        echo -e "  ${GREEN}➡️  Instructions unchanged${NC}"
    fi
else
    echo "  Insufficient instructions data for comparison"
fi

echo ""
echo -e "${BLUE}📁 File Comparison:${NC}"

# Compare number of profiling files
baseline_files=$(find "$BASELINE_DIR" -type f \( -name "*.txt" -o -name "*.out" -o -name "*.svg" -o -name "*.gz" \) | wc -l)
current_files=$(find "$CURRENT_DIR" -type f \( -name "*.txt" -o -name "*.out" -o -name "*.svg" -o -name "*.gz" \) | wc -l)

echo "  Baseline profiling files: $baseline_files"
echo "  Current profiling files:  $current_files"

if [ "$current_files" -gt "$baseline_files" ]; then
    echo -e "  ${GREEN}✅ More comprehensive profiling data available${NC}"
elif [ "$current_files" -lt "$baseline_files" ]; then
    echo -e "  ${YELLOW}⚠️  Less profiling data compared to baseline${NC}"
else
    echo -e "  ${GREEN}✅ Same number of profiling files${NC}"
fi

# Generate recommendations
echo ""
echo -e "${BLUE}${BOLD}💡 Recommendations${NC}"
echo "================="

if [ "$baseline_memory" -gt 0 ] && [ "$current_memory" -gt 0 ] && [ $memory_change -gt 0 ]; then
    echo -e "${YELLOW}🔧 Memory Optimization Needed:${NC}"
    echo "  • Review memory allocations in dhat-out/ directory"
    echo "  • Check for memory leaks in massif-report.txt"
    echo "  • Consider object pooling for frequently allocated objects"
fi

if [ "$baseline_cpu" -gt 0 ] && [ "$current_cpu" -gt 0 ] && [ $cpu_change -gt 0 ]; then
    echo -e "${YELLOW}⚡ CPU Optimization Needed:${NC}"
    echo "  • Analyze flamegraph.svg for CPU hotspots"
    echo "  • Review callgrind-report.txt for expensive function calls"
    echo "  • Consider algorithm optimization or caching"
fi

if [ "$baseline_cache" -gt 0 ] && [ "$current_cache" -gt 0 ] && [ $cache_change -gt 0 ]; then
    echo -e "${YELLOW}💨 Cache Optimization Needed:${NC}"
    echo "  • Review cache-profile.txt for cache miss patterns"
    echo "  • Consider data structure changes for better cache locality"
    echo "  • Check memory access patterns"
fi

echo ""
echo -e "${GREEN}✅ Profiling comparison completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary Reports:${NC}"
echo "  Baseline metrics: $BASELINE_DIR/metrics-summary.txt"
echo "  Current metrics:  $CURRENT_DIR/metrics-summary.txt"
echo ""
echo -e "${YELLOW}🔍 Next Steps:${NC}"
echo "  • Review detailed profiling files for specific optimizations"
echo "  • Run additional profiling with different presets as needed"
echo "  • Implement optimizations based on findings"
echo "  • Re-run comparison after optimizations"
