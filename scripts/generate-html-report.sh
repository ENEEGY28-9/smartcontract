#!/bin/bash

# 🚀 GameV1 HTML Report Generator
# Tạo báo cáo HTML từ kết quả profiling

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PROFILE_DIR=${1:-"profiling-results"}
OUTPUT_DIR=${2:-"profiling-report"}

if [ ! -d "$PROFILE_DIR" ]; then
    echo -e "${RED}❌ Profiling directory not found: $PROFILE_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}${BOLD}📊 Generating HTML Profiling Report${NC}"
echo "=================================="
echo -e "Source: ${YELLOW}$PROFILE_DIR${NC}"
echo -e "Output: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate CSS for the report
cat > "$OUTPUT_DIR/style.css" << 'EOF'
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header {
    text-align: center;
    margin-bottom: 40px;
    border-bottom: 2px solid #eee;
    padding-bottom: 20px;
}

.metric-card {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    margin: 10px 0;
}

.metric-value {
    font-size: 2em;
    font-weight: bold;
    color: #007bff;
}

.chart-container {
    margin: 20px 0;
    text-align: center;
}

img {
    max-width: 100%;
    height: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 10px 0;
}

.code-block {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 15px;
    font-family: 'Courier New', monospace;
    overflow-x: auto;
    margin: 10px 0;
}

.nav {
    margin-bottom: 30px;
}

.nav a {
    color: #007bff;
    text-decoration: none;
    margin-right: 20px;
    padding: 5px 10px;
    border-radius: 4px;
}

.nav a:hover {
    background-color: #007bff;
    color: white;
}

.section {
    margin-bottom: 40px;
}

h1, h2, h3 {
    color: #333;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background-color: #f8f9fa;
    font-weight: bold;
}

.alert {
    padding: 15px;
    margin: 20px 0;
    border: 1px solid transparent;
    border-radius: 4px;
}

.alert-info {
    color: #0c5460;
    background-color: #d1ecf1;
    border-color: #bee5eb;
}

.alert-warning {
    color: #856404;
    background-color: #fff3cd;
    border-color: #ffeaa7;
}

.alert-danger {
    color: #721c24;
    background-color: #f8d7da;
    border-color: #f5c6cb;
}
EOF

# Generate main HTML report
cat > "$OUTPUT_DIR/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GameV1 Performance Profiling Report</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GameV1 Performance Profiling Report</h1>
            <p>Generated on: $(date)</p>
            <p>Source directory: <code>$PROFILE_DIR</code></p>
        </div>

        <div class="nav">
            <a href="#overview">Overview</a>
            <a href="#cpu">CPU Profiling</a>
            <a href="#memory">Memory Profiling</a>
            <a href="#cache">Cache Profiling</a>
            <a href="#thread">Thread Safety</a>
            <a href="#recommendations">Recommendations</a>
        </div>

        <div id="overview" class="section">
            <h2>📊 Overview</h2>
            <div class="metric-card">
                <h3>Profiling Summary</h3>
                <p>This report provides a comprehensive analysis of GameV1's performance characteristics based on multiple profiling runs.</p>

                <div class="chart-container">
                    $(if [ -f "$PROFILE_DIR/flamegraph.svg" ]; then
                        echo '<img src="../profiling-results/flamegraph.svg" alt="CPU Flamegraph" style="max-height: 400px;">'
                    fi)
                </div>
            </div>
        </div>

        <div id="cpu" class="section">
            <h2>🖥️ CPU Profiling</h2>
            <div class="metric-card">
                <h3>CPU Performance Analysis</h3>

                $(if [ -f "$PROFILE_DIR/cpu-perf-report.txt" ]; then
                    echo '<h4>Top Functions by CPU Usage:</h4>'
                    echo '<div class="code-block">'
                    head -20 "$PROFILE_DIR/cpu-perf-report.txt"
                    echo '</div>'
                fi)

                $(if [ -f "$PROFILE_DIR/cpu-callgrind-report.txt" ]; then
                    echo '<h4>Function Call Analysis:</h4>'
                    echo '<div class="code-block">'
                    head -20 "$PROFILE_DIR/cpu-callgrind-report.txt"
                    echo '</div>'
                fi)
            </div>
        </div>

        <div id="memory" class="section">
            <h2>💾 Memory Profiling</h2>
            <div class="metric-card">
                <h3>Memory Usage Analysis</h3>

                $(if [ -d "$PROFILE_DIR/memory-dhat-out" ]; then
                    echo '<h4>DHAT Memory Analysis:</h4>'
                    echo '<p>Rust-optimized memory profiling results available in memory-dhat-out/ directory</p>'
                fi)

                $(if [ -f "$PROFILE_DIR/memory-massif-report.txt" ]; then
                    echo '<h4>Massif Memory Report:</h4>'
                    echo '<div class="code-block">'
                    head -30 "$PROFILE_DIR/memory-massif-report.txt"
                    echo '</div>'
                fi)
            </div>
        </div>

        <div id="cache" class="section">
            <h2>⚡ Cache Profiling</h2>
            <div class="metric-card">
                <h3>Cache Performance Analysis</h3>

                $(if [ -f "$PROFILE_DIR/cache-profile.txt" ]; then
                    echo '<h4>Cache Miss Analysis:</h4>'
                    echo '<div class="code-block">'
                    head -30 "$PROFILE_DIR/cache-profile.txt"
                    echo '</div>'
                fi)

                $(if [ -f "$PROFILE_DIR/io-cache-report.txt" ]; then
                    echo '<h4>I/O Cache Analysis:</h4>'
                    echo '<div class="code-block">'
                    head -20 "$PROFILE_DIR/io-cache-report.txt"
                    echo '</div>'
                fi)
            </div>
        </div>

        <div id="thread" class="section">
            <h2>🔒 Thread Safety</h2>
            <div class="metric-card">
                <h3>Concurrency Analysis</h3>

                $(if [ -f "$PROFILE_DIR/thread-drd.txt" ]; then
                    echo '<h4>Data Race Detection (DRD):</h4>'
                    echo '<div class="code-block">'
                    head -20 "$PROFILE_DIR/thread-drd.txt"
                    echo '</div>'
                fi)

                $(if [ -f "$PROFILE_DIR/thread-helgrind.txt" ]; then
                    echo '<h4>Lock Order Analysis (Helgrind):</h4>'
                    echo '<div class="code-block">'
                    head -20 "$PROFILE_DIR/thread-helgrind.txt"
                    echo '</div>'
                fi)
            </div>
        </div>

        <div id="recommendations" class="section">
            <h2>💡 Recommendations</h2>

            <div class="alert alert-info">
                <h3>🚀 Performance Optimization Opportunities</h3>
                <ul>
                    <li>Review flamegraph.svg for CPU hotspots</li>
                    <li>Analyze memory allocation patterns in DHAT output</li>
                    <li>Check cache miss patterns for memory access optimization</li>
                    <li>Address any thread safety issues found in DRD/Helgrind output</li>
                    <li>Consider algorithm optimization based on callgrind results</li>
                </ul>
            </div>

            <div class="alert alert-warning">
                <h3>⚠️ Areas for Attention</h3>
                <ul>
                    <li>Monitor memory usage trends across profiling runs</li>
                    <li>Watch for increasing cache miss rates</li>
                    <li>Ensure thread safety in multi-player scenarios</li>
                    <li>Profile different game scenarios (startup, gameplay, cleanup)</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>📁 Available Profiling Data</h2>
            <table>
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
EOF

# Add file listing
find "$PROFILE_DIR" -type f \( -name "*.txt" -o -name "*.out" -o -name "*.svg" -o -name "*.gz" -o -name "*.pcap" \) | while read file; do
    filename=$(basename "$file")
    extension="${filename##*.}"

    case $extension in
        "svg") type="CPU Visualization" ;;
        "txt") type="Text Report" ;;
        "out") type="Valgrind Output" ;;
        "gz") type="Compressed Data" ;;
        "pcap") type="Network Capture" ;;
        *) type="Other" ;;
    esac

    echo "                    <tr>"
    echo "                        <td><code>$filename</code></td>"
    echo "                        <td>$type</td>"
    echo "                        <td>Profiling data file</td>"
    echo "                    </tr>"
done >> "$OUTPUT_DIR/index.html"

cat >> "$OUTPUT_DIR/index.html" << 'EOF'
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🔧 Profiling Tools Used</h2>
            <div class="metric-card">
                <ul>
                    <li><strong>cargo-flamegraph</strong> - CPU profiling visualization</li>
                    <li><strong>cargo-dhat</strong> - Rust memory profiling</li>
                    <li><strong>valgrind</strong> - Multiple profiling tools (massif, cachegrind, callgrind, drd, helgrind)</li>
                    <li><strong>perf</strong> - Linux kernel profiling</li>
                    <li><strong>heaptrack</strong> - Alternative memory profiling</li>
                    <li><strong>strace</strong> - System call profiling</li>
                    <li><strong>hotspot</strong> - GUI for perf visualization</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <p style="text-align: center; color: #666; margin-top: 40px;">
                Generated by GameV1 Profiling Suite | $(date)
            </p>
        </div>
    </div>
</body>
</html>
EOF

# Copy additional files if they exist
if [ -f "$PROFILE_DIR/flamegraph.svg" ]; then
    cp "$PROFILE_DIR/flamegraph.svg" "$OUTPUT_DIR/"
fi

if [ -d "$PROFILE_DIR/dhat-out" ]; then
    cp -r "$PROFILE_DIR/dhat-out" "$OUTPUT_DIR/"
fi

echo -e "${GREEN}✅ HTML report generated successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Report location:${NC} $OUTPUT_DIR/"
echo ""
echo -e "${YELLOW}📁 Files created:${NC}"
ls -la "$OUTPUT_DIR/"

echo ""
echo -e "${YELLOW}🌐 Open in browser:${NC}"
echo "  file://$(pwd)/$OUTPUT_DIR/index.html"
echo ""
echo -e "${YELLOW}💡 Features:${NC}"
echo "  • Interactive navigation between sections"
echo "  • Embedded flamegraph visualization"
echo "  • Comprehensive profiling data summary"
echo "  • Optimization recommendations"
echo "  • Professional styling and layout"
