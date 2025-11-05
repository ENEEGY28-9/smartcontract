#!/bin/bash

# 🚀 GameV1 Native Deployment Setup for Linux
# Complete setup for native deployment without Docker

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
POCKETBASE_VERSION="0.22.0"
POCKETBASE_URL="https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip"
REDIS_VERSION="7.2.3"
REDIS_URL="https://download.redis.io/releases/redis-${REDIS_VERSION}.tar.gz"

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

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"

    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi

    # Check Rust
    if ! command -v rustc &> /dev/null; then
        log_error "Rust not found. Please install Rust."
        log_info "Run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    log_success "Rust found: $(rustc --version)"

    # Check Cargo
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo not found. Please install Rust."
        exit 1
    fi
    log_success "Cargo found: $(cargo --version)"

    # Check systemd
    if ! command -v systemctl &> /dev/null; then
        log_warning "systemctl not found. You may be on a system without systemd."
        log_info "Services will need to be managed manually or with alternative init system."
    fi

    log_success "Prerequisites check completed"
}

# Setup directories
setup_directories() {
    log_header "Setting up Directories"

    local dirs=("/opt/gamev1" "/opt/gamev1/bin" "/opt/gamev1/config" "/opt/gamev1/logs" "/opt/gamev1/data")

    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_success "Created directory: $dir"
        else
            log_info "Directory already exists: $dir"
        fi
    done
}

# Setup PocketBase
setup_pocketbase() {
    log_header "Setting up PocketBase"

    local pb_dir="/opt/gamev1/pocketbase"
    local pb_config="/opt/gamev1/config/pocketbase-config.json"

    # Check if already installed
    if [[ -f "$pb_dir/pocketbase" ]]; then
        log_info "PocketBase already installed"
        return
    fi

    # Download PocketBase
    log_progress "Downloading PocketBase..."
    local temp_zip="/tmp/pocketbase.zip"
    wget -q "$POCKETBASE_URL" -O "$temp_zip"

    # Extract
    log_progress "Extracting PocketBase..."
    mkdir -p "$pb_dir"
    unzip -q "$temp_zip" -d "$pb_dir"
    chmod +x "$pb_dir/pocketbase"
    rm "$temp_zip"

    # Create configuration
    log_progress "Creating PocketBase configuration..."
    cat > "$pb_config" << EOF
{
  "database": {
    "path": "/opt/gamev1/data/pb_data"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 8090,
    "cors": {
      "origins": ["*"]
    }
  },
  "admin": {
    "email": "admin@gamev1.com",
    "password": "gamev1_admin_2024"
  }
}
EOF

    log_success "PocketBase setup completed"
    log_info "Admin: admin@gamev1.com / gamev1_admin_2024"
}

# Setup Redis
setup_redis() {
    log_header "Setting up Redis"

    local redis_dir="/opt/gamev1/redis"
    local redis_config="/opt/gamev1/config/redis.conf"

    # Check if already installed
    if [[ -f "$redis_dir/src/redis-server" ]]; then
        log_info "Redis already installed"
        return
    fi

    # Download Redis
    log_progress "Downloading Redis..."
    local temp_tar="/tmp/redis.tar.gz"
    wget -q "$REDIS_URL" -O "$temp_tar"

    # Extract
    log_progress "Extracting Redis..."
    mkdir -p "$redis_dir"
    tar -xzf "$temp_tar" -C "$redis_dir" --strip-components=1
    rm "$temp_tar"

    # Build Redis
    log_progress "Building Redis..."
    cd "$redis_dir"
    make > /dev/null 2>&1

    # Create configuration
    log_progress "Creating Redis configuration..."
    cat > "$redis_config" << EOF
# Redis configuration for GameV1
bind 127.0.0.1
port 6379
daemonize no
logfile /opt/gamev1/logs/redis.log
save 900 1
save 300 10
save 60 10000
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename appendonly.aof
appendfsync everysec
EOF

    log_success "Redis setup completed"
}

# Build services
build_services() {
    log_header "Building GameV1 Services"

    # Set optimization flags
    export RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"

    # Update dependencies
    log_progress "Updating dependencies..."
    cargo update

    # Clean and build
    log_progress "Building services..."
    cargo clean
    cargo build --release

    # Copy binaries
    log_progress "Copying binaries..."
    local services=("gateway" "worker" "room-manager" "services")

    for service in "${services[@]}"; do
        if [[ -f "target/release/$service" ]]; then
            cp "target/release/$service" "/opt/gamev1/bin/"
            log_success "Installed $service"
        else
            log_warning "Binary not found: $service"
        fi
    done

    # Make binaries executable
    chmod +x /opt/gamev1/bin/*
}

# Setup systemd services
setup_systemd() {
    log_header "Setting up Systemd Services"

    # Check if systemd is available
    if ! command -v systemctl &> /dev/null; then
        log_warning "systemctl not available. Skipping systemd setup."
        log_info "You will need to manage services manually or use alternative init system."
        return
    fi

    # Copy service files
    log_progress "Installing systemd service files..."
    sudo cp systemd/*.service /etc/systemd/system/

    # Reload systemd
    log_progress "Reloading systemd..."
    sudo systemctl daemon-reload

    # Enable services
    local services=("gamev1-pocketbase" "gamev1-redis" "gamev1-worker" "gamev1-room-manager" "gamev1-gateway")

    for service in "${services[@]}"; do
        sudo systemctl enable "$service"
        log_success "Enabled $service"
    done
}

# Create startup scripts
create_startup_scripts() {
    log_header "Creating Startup Scripts"

    # Create main startup script
    cat > "/opt/gamev1/start-all.sh" << 'EOF'
#!/bin/bash
# Start all GameV1 services

echo "🚀 Starting GameV1 Native Services..."

# Start services in dependency order
echo "Starting PocketBase..."
systemctl start gamev1-pocketbase

echo "Starting Redis..."
systemctl start gamev1-redis

echo "Waiting for databases..."
sleep 5

echo "Starting Worker..."
systemctl start gamev1-worker

echo "Starting Room Manager..."
systemctl start gamev1-room-manager

echo "Starting Gateway..."
systemctl start gamev1-gateway

echo "✅ All services started!"
echo ""
echo "Service management:"
echo "  Status: sudo systemctl status gamev1-*"
echo "  Logs: sudo journalctl -u gamev1-* -f"
echo "  Stop: sudo systemctl stop gamev1-*"
echo ""
echo "Access points:"
echo "  Gateway API: http://localhost:8080"
echo "  PocketBase: http://localhost:8090"
echo "  Health: http://localhost:8080/health"
EOF

    chmod +x "/opt/gamev1/start-all.sh"

    # Create stop script
    cat > "/opt/gamev1/stop-all.sh" << 'EOF'
#!/bin/bash
# Stop all GameV1 services

echo "🛑 Stopping GameV1 Native Services..."

sudo systemctl stop gamev1-gateway
sudo systemctl stop gamev1-room-manager
sudo systemctl stop gamev1-worker
sudo systemctl stop gamev1-redis
sudo systemctl stop gamev1-pocketbase

echo "✅ All services stopped!"
EOF

    chmod +x "/opt/gamev1/stop-all.sh"

    # Create status script
    cat > "/opt/gamev1/status.sh" << 'EOF'
#!/bin/bash
# Check status of all GameV1 services

echo "📊 GameV1 Services Status:"
echo ""

sudo systemctl status gamev1-pocketbase --no-pager -l
echo ""
sudo systemctl status gamev1-redis --no-pager -l
echo ""
sudo systemctl status gamev1-worker --no-pager -l
echo ""
sudo systemctl status gamev1-room-manager --no-pager -l
echo ""
sudo systemctl status gamev1-gateway --no-pager -l

echo ""
echo "Health checks:"
curl -s http://localhost:8080/health || echo "Gateway health check failed"
curl -s http://localhost:8090/api/health || echo "PocketBase health check failed"
EOF

    chmod +x "/opt/gamev1/status.sh"

    log_success "Startup scripts created"
}

# Setup environment
setup_environment() {
    log_header "Setting up Environment"

    # Create environment file
    cat > "/opt/gamev1/.env" << EOF
# GameV1 Environment Configuration

# Database
POCKETBASE_URL=http://localhost:8090
REDIS_URL=redis://localhost:6379

# Services
WORKER_ENDPOINT=http://localhost:50051
GATEWAY_PORT=8080

# Logging
RUST_LOG=info
LOG_LEVEL=info

# Security
JWT_SECRET=your-secret-key-here
RATE_LIMIT_IP=10000
RATE_LIMIT_USER=5000
EOF

    log_success "Environment configuration created"
}

# Main setup function
main() {
    log_header "GameV1 Native Deployment Setup"
    log_info "This will setup GameV1 for native deployment without Docker"
    log_info "Estimated time: 10-15 minutes"

    # Confirm
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    # Run setup steps
    check_prerequisites
    setup_directories
    setup_pocketbase
    setup_redis
    build_services
    setup_systemd
    create_startup_scripts
    setup_environment

    # Final instructions
    log_header "Setup Complete!"
    echo ""
    log_success "GameV1 native deployment setup completed!"
    echo ""
    log_info "To start all services:"
    echo "  sudo /opt/gamev1/start-all.sh"
    echo ""
    log_info "To check status:"
    echo "  /opt/gamev1/status.sh"
    echo ""
    log_info "To stop services:"
    echo "  sudo /opt/gamev1/stop-all.sh"
    echo ""
    log_info "Access points:"
    echo "  Gateway API: http://localhost:8080"
    echo "  PocketBase Admin: http://localhost:8090/_/"
    echo "  Health Check: http://localhost:8080/health"
    echo ""
    log_info "Admin credentials:"
    echo "  PocketBase: admin@gamev1.com / gamev1_admin_2024"
    echo ""
    log_info "Service management:"
    echo "  sudo systemctl start/stop/status gamev1-*"
    echo "  sudo journalctl -u gamev1-* -f"
}

# Run main function
main "$@"
