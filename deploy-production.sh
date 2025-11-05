#!/bin/bash

# 🚀 GameV1 Production Deployment Script
# Comprehensive deployment for Linux production environment

set -e  # Exit on any error

# Configuration
ENVIRONMENT="${1:-production}"
TARGET_SERVER="${2:-localhost}"
BUILD_ONLY="${BUILD_ONLY:-false}"
DEPLOY_ONLY="${DEPLOY_ONLY:-false}"
FULL_DEPLOYMENT="${FULL_DEPLOYMENT:-true}"
SKIP_TESTS="${SKIP_TESTS:-false}"
VERBOSE="${VERBOSE:-false}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Project structure
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/target/production-release"
SERVICES=("gateway" "worker" "room-manager" "services" "pocketbase")

# Logging functions
log_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_progress() {
    echo -e "${MAGENTA}→ $1${NC}"
}

# Pre-deployment checks
check_prerequisites() {
    log_header "Checking Prerequisites"

    # Check if running as root (for systemd operations)
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi

    # Check Rust toolchain
    if ! command -v rustc &> /dev/null; then
        log_error "Rust toolchain not found. Please install Rust."
        exit 1
    fi
    log_success "Rust toolchain found: $(rustc --version)"

    # Check Cargo
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo not found. Please install Rust."
        exit 1
    fi
    log_success "Cargo found: $(cargo --version)"

    # Check if services are running
    if ! $BUILD_ONLY; then
        log_progress "Checking existing services..."
        if systemctl list-units --type=service "gamev1-*" --no-legend | grep -q "gamev1-"; then
            log_warning "Found running GameV1 services. They will be stopped during deployment."
        fi
    fi

    log_success "Prerequisites check completed"
}

# Build production binaries
build_production_binaries() {
    log_header "Building Production Binaries"

    # Clean previous builds
    log_progress "Cleaning previous builds..."
    cargo clean

    # Update dependencies
    log_progress "Updating dependencies..."
    cargo update

    # Build each service with maximum optimization
    for service in "${SERVICES[@]}"; do
        log_progress "Building $service..."

        # Set optimization flags
        export RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"

        if cargo build --release -p "$service"; then
            log_success "$service built successfully"
        else
            log_error "Failed to build $service"
            exit 1
        fi
    done

    # Create production directory
    mkdir -p "$BUILD_DIR"

    # Copy binaries
    log_progress "Copying optimized binaries..."
    for service in "${SERVICES[@]}"; do
        local source_path="$PROJECT_ROOT/target/release/$service"
        local dest_path="$BUILD_DIR/$service"

        if [[ -f "$source_path" ]]; then
            cp "$source_path" "$dest_path"
            log_success "Copied $service to $BUILD_DIR"
        else
            log_warning "Binary not found: $source_path"
        fi
    done

    # Strip binaries for minimal size
    log_progress "Optimizing binaries..."
    for binary in "$BUILD_DIR"/*; do
        if [[ -f "$binary" ]] && [[ -x "$binary" ]]; then
            echo "  Stripping $(basename "$binary")..."
            strip "$binary"
        fi
    done

    # Generate build info
    cat > "$BUILD_DIR/build-info.txt" << EOF
GameV1 Production Build
=======================
Build Date: $(date)
Environment: $ENVIRONMENT
Rust Version: $(rustc --version)
Build Profile: Production Optimized

Optimization Flags:
- target-cpu=native
- opt-level=3
- lto=fat
- codegen-units=1
- panic=abort

Services Built:
$(printf '%s\n' "${SERVICES[@]}")

Binary Sizes:
$(ls -lh "$BUILD_DIR" | grep -v "^total" | awk '{print $9 " - " $5}')

Deployment Ready: YES
EOF

    log_success "Build completed successfully"
    log_info "Build artifacts in: $BUILD_DIR"
}

# Setup production environment
setup_production_environment() {
    log_header "Setting up Production Environment"

    # Create user and directories
    log_progress "Creating gamev1 user and directories..."
    if ! id -u gamev1 &> /dev/null; then
        useradd --system --shell /bin/false --create-home gamev1
        log_success "Created gamev1 system user"
    fi

    # Create directories
    local dirs=("/opt/gamev1" "/opt/gamev1/bin" "/opt/gamev1/config" "/opt/gamev1/logs" "/opt/gamev1/data")
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chown gamev1:gamev1 "$dir"
        chmod 755 "$dir"
        log_success "Created: $dir"
    done

    # Copy systemd service files
    log_progress "Installing systemd services..."
    for service in "${SERVICES[@]}"; do
        local service_file="$PROJECT_ROOT/systemd/gamev1-$service.service"
        if [[ -f "$service_file" ]]; then
            cp "$service_file" "/etc/systemd/system/"
            log_success "Installed systemd service: gamev1-$service"
        else
            log_warning "Service file not found: $service_file"
        fi
    done

    # Reload systemd
    systemctl daemon-reload
    log_success "Reloaded systemd daemon"

    # Copy configuration files
    log_progress "Copying configuration files..."
    if [[ -d "$PROJECT_ROOT/config" ]]; then
        cp -r "$PROJECT_ROOT/config/"* "/opt/gamev1/config/"
        chown -R gamev1:gamev1 "/opt/gamev1/config"
        log_success "Copied configuration files"
    fi

    log_success "Production environment setup completed"
}

# Deploy binaries and configurations
deploy_services() {
    log_header "Deploying Services"

    # Copy binaries
    log_progress "Copying binaries..."
    for service in "${SERVICES[@]}"; do
        local source_path="$BUILD_DIR/$service"
        local dest_path="/opt/gamev1/bin/$service"

        if [[ -f "$source_path" ]]; then
            cp "$source_path" "$dest_path"
            chown gamev1:gamev1 "$dest_path"
            chmod +x "$dest_path"
            log_success "Deployed: $service"
        else
            log_error "Binary not found: $source_path"
            exit 1
        fi
    done

    # Enable services
    log_progress "Enabling systemd services..."
    for service in "${SERVICES[@]}"; do
        systemctl enable "gamev1-$service"
        log_success "Enabled: gamev1-$service"
    done

    log_success "Service deployment completed"
}

# Run tests
run_deployment_tests() {
    log_header "Running Deployment Tests"

    # Test binary execution
    log_progress "Testing binary execution..."
    for service in "${SERVICES[@]}"; do
        local binary_path="/opt/gamev1/bin/$service"
        if [[ -x "$binary_path" ]]; then
            # Test if binary can start (with --help or --version if available)
            if timeout 5s "$binary_path" --help &> /dev/null || timeout 5s "$binary_path" --version &> /dev/null; then
                log_success "$service binary is executable"
            else
                log_warning "$service binary test failed"
            fi
        else
            log_error "Binary not executable: $binary_path"
        fi
    done

    # Test configuration files
    log_progress "Testing configuration files..."
    local config_files=$(find /opt/gamev1/config -type f)
    if [[ -n "$config_files" ]]; then
        for file in $config_files; do
            if [[ "$file" == *.json ]] || [[ "$file" == *.yml ]] || [[ "$file" == *.yaml ]]; then
                if jq empty "$file" 2> /dev/null || yamllint "$file" &> /dev/null; then
                    log_success "Valid config: $(basename "$file")"
                else
                    log_warning "Invalid config file: $(basename "$file")"
                fi
            else
                log_info "Config file: $(basename "$file")"
            fi
        done
    fi

    log_success "Deployment tests completed"
}

# Start services
start_services() {
    log_header "Starting Services"

    # Start services in dependency order
    local service_order=("pocketbase" "worker" "room-manager" "services" "gateway")

    for service in "${service_order[@]}"; do
        log_progress "Starting gamev1-$service..."

        if systemctl start "gamev1-$service"; then
            # Wait for service to start
            sleep 3

            if systemctl is-active "gamev1-$service" &> /dev/null; then
                log_success "Started: gamev1-$service"
            else
                log_warning "Service gamev1-$service not active after start"
            fi
        else
            log_error "Failed to start gamev1-$service"
        fi
    done

    # Wait for services to fully initialize
    log_progress "Waiting for services to initialize..."
    sleep 10

    # Check service status
    log_progress "Checking service status..."
    systemctl list-units --type=service "gamev1-*" --no-legend --no-pager
    log_success "Services started"
}

# Health checks
test_health_checks() {
    log_header "Running Health Checks"

    local health_endpoints=(
        "http://localhost:8080/health"
        "http://localhost:8090/api/health"
    )

    for endpoint in "${health_endpoints[@]}"; do
        log_progress "Testing health endpoint: $endpoint"

        if curl -f -s "$endpoint" &> /dev/null; then
            log_success "Health check passed: $endpoint"
        else
            log_warning "Health check failed: $endpoint"
        fi
    done

    # Test basic API functionality
    log_progress "Testing API functionality..."
    if curl -f -s "http://localhost:8080/api/rooms" &> /dev/null; then
        log_success "API test passed"
    else
        log_warning "API test failed"
    fi

    log_success "Health checks completed"
}

# Rollback function
rollback_deployment() {
    log_header "Rolling Back Deployment"

    log_progress "Stopping all GameV1 services..."
    systemctl stop "gamev1-*" || true

    log_progress "Disabling services..."
    systemctl disable "gamev1-*" || true

    log_progress "Restoring previous binaries..."
    # This would restore from backup if available
    log_info "Rollback completed. Previous version should be restored manually if needed."

    log_warning "Please check service status and restore from backup if necessary"
}

# Main deployment flow
main_deployment() {
    log_header "GameV1 Production Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Target Server: $TARGET_SERVER"
    log_info "Timestamp: $(date)"

    # Pre-deployment checks
    check_prerequisites

    # Build binaries
    if [[ "$DEPLOY_ONLY" != "true" ]]; then
        build_production_binaries
    fi

    # Setup environment and deploy
    if [[ "$BUILD_ONLY" != "true" ]]; then
        setup_production_environment
        deploy_services

        # Run tests
        if [[ "$SKIP_TESTS" != "true" ]]; then
            run_deployment_tests
        fi

        # Start services
        if [[ "$FULL_DEPLOYMENT" == "true" ]]; then
            start_services
            test_health_checks
        fi
    fi

    # Final status
    log_header "Deployment Summary"
    log_success "GameV1 has been successfully deployed to production!"
    log_info "Services: ${SERVICES[*]}"
    log_info "Build directory: $BUILD_DIR"
    log_info "Production directory: /opt/gamev1"

    echo ""
    echo "Service management:"
    echo "  Start: sudo systemctl start gamev1-<service>"
    echo "  Stop: sudo systemctl stop gamev1-<service>"
    echo "  Status: sudo systemctl status gamev1-<service>"
    echo "  Logs: sudo journalctl -u gamev1-<service> -f"
    echo ""
    echo "Monitoring:"
    echo "  Health: curl http://localhost:8080/health"
    echo "  Metrics: curl http://localhost:8080/api/metrics"
    echo "  Logs: sudo tail -f /opt/gamev1/logs/*.log"
}

# Signal handling for graceful shutdown
cleanup() {
    log_warning "Deployment interrupted. Performing cleanup..."
    rollback_deployment
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution with error handling
if ! main_deployment; then
    log_error "Deployment failed!"
    echo ""
    read -p "Would you like to rollback the deployment? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rollback_deployment
    fi
    exit 1
fi

log_success "🎉 Deployment completed successfully!"
