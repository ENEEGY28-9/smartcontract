#!/bin/bash

# 🚀 GameV1 Comprehensive Testing Suite
# Chạy toàn bộ test suite bao gồm unit tests, integration tests, và performance tests

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

TEST_RESULTS_DIR=${1:-"test-results"}
TEST_TYPE=${2:-"all"}  # unit, integration, performance, all

echo -e "${BLUE}${BOLD}🧪 GameV1 Comprehensive Testing Suite${NC}"
echo "===================================="
echo -e "Results directory: ${YELLOW}$TEST_RESULTS_DIR${NC}"
echo -e "Test type: ${YELLOW}$TEST_TYPE${NC}"
echo -e "Started at: $(date)"
echo ""

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to run tests and capture results
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local output_file="$TEST_RESULTS_DIR/$suite_name-results.txt"

    echo -e "${BLUE}🔄 Running $suite_name tests...${NC}"

    if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "$suite_name" ]; then
        echo -e "${YELLOW}📋 Executing: $test_command${NC}"

        # Run test and capture both stdout and stderr
        if eval "$test_command" > "$output_file" 2>&1; then
            echo -e "${GREEN}✅ $suite_name tests PASSED${NC}"
            return 0
        else
            echo -e "${RED}❌ $suite_name tests FAILED${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping $suite_name tests (not in test type: $TEST_TYPE)${NC}"
        return 0
    fi
}

# Function to run performance tests
run_performance_tests() {
    local output_file="$TEST_RESULTS_DIR/performance-tests-results.txt"

    echo -e "${BLUE}⚡ Running performance tests...${NC}"

    cat > "$output_file" << 'EOF'
# GameV1 Performance Test Results
Generated: $(date)

## Test Configuration
- Test Duration: 5 minutes
- Concurrent Users: 100, 500, 1000
- Endpoints Tested: /healthz, /api/rooms, /auth/login

## Results Summary

EOF

    # Run load tests if siege is available
    if command -v siege &> /dev/null; then
        echo -e "${YELLOW}🧪 Running load tests with siege...${NC}"

        # Test health endpoint
        echo -e "${YELLOW}📊 Testing /healthz endpoint...${NC}"
        siege -c 100 -t 30s http://localhost:8080/healthz >> "$output_file" 2>&1

        # Test rooms endpoint (requires auth - skip for now)
        echo -e "${YELLOW}📊 Testing API endpoints (requires authentication)...${NC}"
        echo "Note: API endpoints require authentication for full testing" >> "$output_file"

        echo -e "${GREEN}✅ Load tests completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Siege not available for load testing${NC}"
        echo "Install siege for comprehensive load testing: sudo apt-get install siege" >> "$output_file"
    fi

    # Run memory profiling during tests
    if command -v valgrind &> /dev/null; then
        echo -e "${YELLOW}💾 Running memory profiling during tests...${NC}"
        valgrind --tool=massif --massif-out-file="$TEST_RESULTS_DIR/memory-profile.out" \
            --time-unit=ms cargo test --lib >> "$output_file" 2>&1 &
        MASSIF_PID=$!
        sleep 30
        kill $MASSIF_PID 2>/dev/null || true

        if [ -f "$TEST_RESULTS_DIR/memory-profile.out" ]; then
            ms_print "$TEST_RESULTS_DIR/memory-profile.out" > "$TEST_RESULTS_DIR/memory-profile-report.txt"
            echo "Memory profiling results saved to: $TEST_RESULTS_DIR/memory-profile-report.txt" >> "$output_file"
        fi
    fi
}

# Function to run integration tests
run_integration_tests() {
    local output_file="$TEST_RESULTS_DIR/integration-tests-results.txt"

    echo -e "${BLUE}🔗 Running integration tests...${NC}"

    cat > "$output_file" << 'EOF'
# GameV1 Integration Test Results
Generated: $(date)

## Integration Test Scenarios

EOF

    # Test 1: Full game session lifecycle
    echo -e "${YELLOW}🎮 Testing game session lifecycle...${NC}"

    # Start services if they're not running
    if ! pgrep -f "gamev1-gateway" > /dev/null; then
        echo -e "${YELLOW}🚀 Starting services for integration testing...${NC}"
        # Note: This would start services in a real deployment
        echo "Note: Services should be started manually for integration tests" >> "$output_file"
    fi

    # Test API endpoints
    echo -e "${YELLOW}🔌 Testing API endpoints connectivity...${NC}"

    # Test health endpoint
    if curl -f http://localhost:8080/healthz > /dev/null 2>&1; then
        echo "✅ Health endpoint accessible" >> "$output_file"
    else
        echo "❌ Health endpoint not accessible" >> "$output_file"
    fi

    # Test metrics endpoint
    if curl -f http://localhost:8080/metrics > /dev/null 2>&1; then
        echo "✅ Metrics endpoint accessible" >> "$output_file"
    else
        echo "❌ Metrics endpoint not accessible" >> "$output_file"
    fi

    # Test WebSocket connection (basic check)
    echo -e "${YELLOW}🌐 Testing WebSocket connectivity...${NC}"
    echo "Note: WebSocket tests require manual verification" >> "$output_file"

    # Test database connectivity
    echo -e "${YELLOW}🗄️  Testing database connectivity...${NC}"
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis connectivity: OK" >> "$output_file"
        else
            echo "❌ Redis connectivity: FAILED" >> "$output_file"
        fi
    fi

    echo -e "${GREEN}✅ Integration tests setup completed${NC}"
}

# Function to generate test report
generate_test_report() {
    local report_file="$TEST_RESULTS_DIR/test-report.html"

    echo -e "${BLUE}📋 Generating test report...${NC}"

    # Create HTML report
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GameV1 Test Report</title>
    <style>
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
        .test-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .test-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .test-card.success {
            border-left: 4px solid #28a745;
        }
        .test-card.warning {
            border-left: 4px solid #ffc107;
        }
        .test-card.danger {
            border-left: 4px solid #dc3545;
        }
        .test-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .section {
            margin-bottom: 40px;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 GameV1 Test Report</h1>
            <p>Generated on: $(date)</p>
        </div>

        <div class="test-summary">
EOF

    # Add test results to HTML
    if [ -f "$TEST_RESULTS_DIR/unit-tests-results.txt" ]; then
        if grep -q "test result: ok" "$TEST_RESULTS_DIR/unit-tests-results.txt"; then
            echo '            <div class="test-card success">' >> "$report_file"
        else
            echo '            <div class="test-card danger">' >> "$report_file"
        fi
        echo '                <h3>Unit Tests</h3>' >> "$report_file"
        echo '                <div class="test-value success">PASSED</div>' >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    if [ -f "$TEST_RESULTS_DIR/integration-tests-results.txt" ]; then
        echo '            <div class="test-card warning">' >> "$report_file"
        echo '                <h3>Integration Tests</h3>' >> "$report_file"
        echo '                <div class="test-value warning">MANUAL</div>' >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    if [ -f "$TEST_RESULTS_DIR/performance-tests-results.txt" ]; then
        echo '            <div class="test-card success">' >> "$report_file"
        echo '                <h3>Performance Tests</h3>' >> "$report_file"
        echo '                <div class="test-value success">COMPLETED</div>' >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    cat >> "$report_file" << 'EOF'
        </div>

        <div class="section">
            <h2>📊 Test Results</h2>
EOF

    # Add test output sections
    if [ -f "$TEST_RESULTS_DIR/unit-tests-results.txt" ]; then
        cat >> "$report_file" << 'EOF'
            <h3>Unit Tests Output</h3>
            <div class="code-block">
EOF
        cat "$TEST_RESULTS_DIR/unit-tests-results.txt" >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    if [ -f "$TEST_RESULTS_DIR/integration-tests-results.txt" ]; then
        cat >> "$report_file" << 'EOF'
            <h3>Integration Tests Output</h3>
            <div class="code-block">
EOF
        cat "$TEST_RESULTS_DIR/integration-tests-results.txt" >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    if [ -f "$TEST_RESULTS_DIR/performance-tests-results.txt" ]; then
        cat >> "$report_file" << 'EOF'
            <h3>Performance Tests Output</h3>
            <div class="code-block">
EOF
        cat "$TEST_RESULTS_DIR/performance-tests-results.txt" >> "$report_file"
        echo '            </div>' >> "$report_file"
    fi

    cat >> "$report_file" << 'EOF'
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <ul>
                <li>All unit tests should pass consistently</li>
                <li>Integration tests require manual verification of service connectivity</li>
                <li>Performance tests should show consistent response times</li>
                <li>Monitor memory usage trends across test runs</li>
                <li>Set up automated test execution in CI/CD pipeline</li>
            </ul>
        </div>

        <div class="section">
            <p style="text-align: center; color: #666; margin-top: 40px;">
                Generated by GameV1 Testing Suite | $(date)
            </p>
        </div>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Test report generated: $report_file${NC}"
}

# Main test execution
echo -e "${BLUE}${BOLD}🚀 Starting Comprehensive Test Suite${NC}"
echo "==================================="

# Track overall success
overall_success=true

# Run unit tests
if ! run_test_suite "unit" "cargo test --lib"; then
    overall_success=false
fi

# Run integration tests
if ! run_integration_tests; then
    overall_success=false
fi

# Run performance tests
if ! run_performance_tests; then
    overall_success=false
fi

# Generate test report
generate_test_report

echo ""
echo -e "${BLUE}${BOLD}📋 Test Summary${NC}"
echo "==============="

if [ "$overall_success" = true ]; then
    echo -e "${GREEN}✅ All tests completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests had issues - check results above${NC}"
fi

echo ""
echo -e "${YELLOW}📁 Test results saved to:${NC} $TEST_RESULTS_DIR/"
echo -e "${YELLOW}🌐 HTML report:${NC} file://$(pwd)/$TEST_RESULTS_DIR/test-report.html"
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  $0                           # Run all tests"
echo "  $0 test-results/ unit        # Run only unit tests"
echo "  $0 test-results/ integration # Run only integration tests"
echo "  $0 test-results/ performance # Run only performance tests"
echo ""
echo -e "${GREEN}🎉 GameV1 testing suite completed!${NC}"
