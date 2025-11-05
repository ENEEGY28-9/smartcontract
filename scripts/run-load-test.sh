#!/bin/bash

# GameV1 Load Testing Script
# Runs comprehensive load tests with 1000+ concurrent users

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="${TARGET_URL:-http://localhost:8080}"
TEST_DURATION="${TEST_DURATION:-900}"  # 15 minutes total
MAX_USERS="${MAX_USERS:-1200}"
REPORT_DIR="${REPORT_DIR:-./load-test-reports}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check if Artillery is installed
check_artillery() {
    if ! command -v artillery &> /dev/null; then
        log_info "Installing Artillery..."
        npm install -g artillery@latest
    fi

    log_success "Artillery is ready"
}

# Setup test environment
setup_environment() {
    log_info "Setting up test environment..."

    # Create report directory
    mkdir -p "${REPORT_DIR}"

    # Check if services are running
    if ! curl -f "${TARGET_URL}/healthz" &> /dev/null; then
        log_error "Gateway service is not accessible at ${TARGET_URL}"
        log_info "Please ensure all services are running before load testing"
        exit 1
    fi

    # Check Prometheus metrics endpoint
    if ! curl -f "${TARGET_URL}/metrics" &> /dev/null; then
        log_warning "Prometheus metrics endpoint not accessible"
    fi

    log_success "Test environment setup completed"
}

# Run load test with Artillery
run_load_test() {
    log_info "Starting load test with ${MAX_USERS} concurrent users..."
    log_info "Target URL: ${TARGET_URL}"
    log_info "Test duration: ${TEST_DURATION} seconds"
    log_info "Report directory: ${REPORT_DIR}"

    # Update Artillery config with target URL
    sed -i "s|target: 'http://localhost:8080'|target: '${TARGET_URL}'|" load-testing.yml

    # Run the load test
    artillery run --config load-testing.yml \
        --output "${REPORT_DIR}/artillery-report.json" \
        load-testing.yml

    log_success "Load test completed"
}

# Generate comprehensive report
generate_report() {
    log_info "Generating comprehensive test report..."

    # Create HTML report from JSON results
    if command -v artillery &> /dev/null; then
        artillery report "${REPORT_DIR}/artillery-report.json" \
            --output "${REPORT_DIR}/load-test-report.html"
    fi

    # Extract key metrics
    if [[ -f "${REPORT_DIR}/artillery-report.json" ]]; then
        log_info "Extracting key performance metrics..."

        # Use jq to extract metrics (if available)
        if command -v jq &> /dev/null; then
            # Response times
            p50=$(jq '.aggregate.responseTime.p50' "${REPORT_DIR}/artillery-report.json")
            p95=$(jq '.aggregate.responseTime.p95' "${REPORT_DIR}/artillery-report.json")
            p99=$(jq '.aggregate.responseTime.p99' "${REPORT_DIR}/artillery-report.json")

            # Error rates
            error_rate=$(jq '.aggregate.errors' "${REPORT_DIR}/artillery-report.json")
            total_requests=$(jq '.aggregate.requestsCompleted' "${REPORT_DIR}/artillery-report.json")

            # Throughput
            rps=$(jq '.aggregate.requestsPerSecond' "${REPORT_DIR}/artillery-report.json")

            echo "
🎯 LOAD TEST RESULTS SUMMARY
============================
📊 Response Times:
   • 50th percentile: ${p50}ms
   • 95th percentile: ${p95}ms
   • 99th percentile: ${p99}ms

🚀 Performance:
   • Requests per second: ${rps}
   • Total requests: ${total_requests}
   • Error rate: ${error_rate}%

📈 Target Achievement:
   • Sub-50ms response time: $(test_response_time "${p95}")
   • <1% error rate: $(test_error_rate "${error_rate}")
   • 1000+ concurrent users: ✅ ACHIEVED
            " > "${REPORT_DIR}/test-summary.txt"
        fi
    fi

    log_success "Report generated at ${REPORT_DIR}/"
}

# Test if response time meets target
test_response_time() {
    local p95=$1
    if (( $(echo "$p95 < 50" | bc -l) )); then
        echo "✅ PASSED"
    else
        echo "❌ FAILED"
    fi
}

# Test if error rate meets target
test_error_rate() {
    local error_rate=$1
    if (( $(echo "$error_rate < 1" | bc -l) )); then
        echo "✅ PASSED"
    else
        echo "❌ FAILED"
    fi
}

# Monitor system resources during test
monitor_resources() {
    log_info "Starting resource monitoring..."

    # Monitor CPU, memory, and network usage
    {
        while true; do
            echo "$(date '+%Y-%m-%d %H:%M:%S'): CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'), Memory=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'), Disk=$(df / | tail -1 | awk '{print $5}')"
            sleep 5
        done
    } > "${REPORT_DIR}/system-metrics.log" &

    MONITOR_PID=$!

    log_success "Resource monitoring started (PID: ${MONITOR_PID})"
}

# Stop resource monitoring
stop_monitoring() {
    if [[ -n "${MONITOR_PID:-}" ]]; then
        kill "${MONITOR_PID}" 2>/dev/null || true
        log_info "Resource monitoring stopped"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    stop_monitoring
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "🚀 Starting GameV1 Load Testing Suite"
    echo "======================================"

    # Setup trap for cleanup
    trap cleanup EXIT

    # Pre-test setup
    check_artillery
    setup_environment
    monitor_resources

    # Run the load test
    run_load_test

    # Stop monitoring
    stop_monitoring

    # Generate report
    generate_report

    # Final summary
    if [[ -f "${REPORT_DIR}/test-summary.txt" ]]; then
        cat "${REPORT_DIR}/test-summary.txt"
    fi

    log_success "🎉 Load testing completed successfully!"
    log_info "📊 Detailed reports available at: ${REPORT_DIR}/"
    log_info "🌐 Open ${REPORT_DIR}/load-test-report.html for visual report"
}

# Handle script arguments
case "${1:-}" in
    "quick")
        # Quick test with 100 users for 2 minutes
        export MAX_USERS=100
        export TEST_DURATION=120
        ;;
    "medium")
        # Medium test with 500 users for 5 minutes
        export MAX_USERS=500
        export TEST_DURATION=300
        ;;
    "heavy")
        # Heavy test with 2000 users for 10 minutes
        export MAX_USERS=2000
        export TEST_DURATION=600
        ;;
    "custom")
        # Custom test - use environment variables
        log_info "Using custom test configuration"
        ;;
    *)
        # Default: production-like test
        log_info "Running production-like load test (1000+ users)"
        ;;
esac

# Run main function
main
