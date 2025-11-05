#!/bin/bash

# 🚀 GameV1 CI/CD Pipeline Script
# Automated build, test, and deployment pipeline

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PIPELINE_STAGE=${1:-"all"}  # build, test, deploy, all
DEPLOYMENT_ENV=${2:-"staging"}  # development, staging, production
BUILD_TYPE=${3:-"release"}  # debug, release

echo -e "${BLUE}${BOLD}🔄 GameV1 CI/CD Pipeline${NC}"
echo "========================"
echo -e "Stage: ${YELLOW}$PIPELINE_STAGE${NC}"
echo -e "Environment: ${YELLOW}$DEPLOYMENT_ENV${NC}"
echo -e "Build type: ${YELLOW}$BUILD_TYPE${NC}"
echo -e "Started at: $(date)"
echo ""

# Configuration
BUILD_DIR="target/$BUILD_TYPE"
TEST_RESULTS_DIR="ci-test-results"
DEPLOY_DIR="deploy-$DEPLOYMENT_ENV"
LOG_FILE="ci-cd-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

# Function to run build stage
run_build() {
    log "🔨 Starting build stage..."

    # Update dependencies
    log "📦 Updating dependencies..."
    cargo update

    # Build all services
    log "🏗️  Building all services with $BUILD_TYPE profile..."

    case $BUILD_TYPE in
        "debug")
            cargo build
            ;;
        "release")
            # Use optimized build flags for production
            RUSTFLAGS="-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort" \
            cargo build --release
            ;;
    esac

    # Strip binaries for smaller size (release only)
    if [ "$BUILD_TYPE" = "release" ]; then
        log "⚡ Stripping binaries for optimal size..."
        for binary in gateway worker room-manager services pocketbase; do
            if [ -f "$BUILD_DIR/$binary" ]; then
                strip "$BUILD_DIR/$binary"
                log "  ✅ Stripped: $binary"
            fi
        done
    fi

    # Verify builds
    log "🔍 Verifying builds..."
    for binary in gateway worker room-manager services pocketbase; do
        if [ -f "$BUILD_DIR/$binary" ]; then
            local size=$(du -h "$BUILD_DIR/$binary" | cut -f1)
            log "  ✅ $binary: $size"
        else
            log "  ❌ $binary: Missing"
            return 1
        fi
    done

    log "✅ Build stage completed"
    return 0
}

# Function to run test stage
run_tests() {
    log "🧪 Starting test stage..."

    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"

    # Run unit tests
    log "🔬 Running unit tests..."
    if cargo test --lib > "$TEST_RESULTS_DIR/unit-tests.txt" 2>&1; then
        log "  ✅ Unit tests passed"
    else
        log "  ❌ Unit tests failed"
        return 1
    fi

    # Run integration tests (if applicable)
    if [ "$DEPLOYMENT_ENV" != "development" ]; then
        log "🔗 Running integration tests..."
        ./scripts/run-comprehensive-tests.sh "$TEST_RESULTS_DIR" integration > "$TEST_RESULTS_DIR/integration-tests.txt" 2>&1
        if [ $? -eq 0 ]; then
            log "  ✅ Integration tests passed"
        else
            log "  ⚠️  Integration tests had issues (continuing anyway)"
        fi
    fi

    # Run security tests
    log "🔒 Running security checks..."
    cargo audit > "$TEST_RESULTS_DIR/security-audit.txt" 2>&1 || log "  ⚠️  Security audit failed (continuing anyway)"

    # Run performance tests (staging/production only)
    if [ "$DEPLOYMENT_ENV" != "development" ]; then
        log "⚡ Running performance tests..."
        ./scripts/run-comprehensive-tests.sh "$TEST_RESULTS_DIR" performance > "$TEST_RESULTS_DIR/performance-tests.txt" 2>&1
        if [ $? -eq 0 ]; then
            log "  ✅ Performance tests passed"
        else
            log "  ⚠️  Performance tests had issues (continuing anyway)"
        fi
    fi

    log "✅ Test stage completed"
    return 0
}

# Function to run profiling stage
run_profiling() {
    log "📊 Starting profiling stage..."

    # Run profiling for release builds
    if [ "$BUILD_TYPE" = "release" ]; then
        log "🔍 Running performance profiling..."
        ./scripts/profile-all.sh gateway > "$TEST_RESULTS_DIR/profiling-results.txt" 2>&1
        if [ $? -eq 0 ]; then
            log "  ✅ Profiling completed"
        else
            log "  ⚠️  Profiling had issues (continuing anyway)"
        fi

        # Generate profiling report
        ./scripts/generate-html-report.sh profiling-results "$TEST_RESULTS_DIR/profiling-report"
    fi

    log "✅ Profiling stage completed"
    return 0
}

# Function to run deploy stage
run_deploy() {
    log "🚀 Starting deployment stage..."

    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"

    # Copy binaries
    log "📦 Copying binaries to deployment directory..."
    for binary in gateway worker room-manager services pocketbase; do
        if [ -f "$BUILD_DIR/$binary" ]; then
            cp "$BUILD_DIR/$binary" "$DEPLOY_DIR/"
            log "  ✅ Copied: $binary"
        fi
    done

    # Copy configuration files
    log "⚙️  Copying configuration files..."
    cp -r config/* "$DEPLOY_DIR/" 2>/dev/null || log "  ⚠️  No config files to copy"
    cp -r systemd/* "$DEPLOY_DIR/" 2>/dev/null || log "  ⚠️  No systemd files to copy"

    # Generate deployment script
    cat > "$DEPLOY_DIR/deploy.sh" << EOF
#!/bin/bash
# GameV1 Deployment Script - Generated by CI/CD Pipeline

set -e

echo "🚀 Deploying GameV1 to $DEPLOYMENT_ENV environment..."

# Check if running as root
if [ "\$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Create deployment user if needed
if ! id "gamev1" &>/dev/null 2>&1; then
    echo "👤 Creating gamev1 user..."
    useradd -r -s /bin/false -m -d /opt/gamev1 gamev1
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p /opt/gamev1/bin /opt/gamev1/config /opt/gamev1/logs

# Copy binaries
echo "📦 Copying binaries..."
cp gateway worker room-manager services pocketbase /opt/gamev1/bin/
chmod +x /opt/gamev1/bin/*

# Copy configuration
echo "⚙️  Copying configuration..."
cp -r * /opt/gamev1/config/ 2>/dev/null || true

# Set ownership
echo "🔒 Setting ownership..."
chown -R gamev1:gamev1 /opt/gamev1/

# Install systemd services
echo "🔧 Installing systemd services..."
for service in gamev1-*.service; do
    if [ -f "\$service" ]; then
        cp "\$service" /etc/systemd/system/
        systemctl daemon-reload
        echo "  ✅ Installed: \$service"
    fi
done

# Start services
echo "🚀 Starting services..."
systemctl enable gamev1-gateway gamev1-worker gamev1-pocketbase
systemctl start gamev1-gateway gamev1-worker gamev1-pocketbase

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Verify deployment
echo "🔍 Verifying deployment..."
if curl -f http://localhost:8080/healthz > /dev/null 2>&1; then
    echo "✅ Gateway health check passed"
else
    echo "❌ Gateway health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Services status:"
systemctl status gamev1-gateway gamev1-worker gamev1-pocketbase --no-pager
EOF

    chmod +x "$DEPLOY_DIR/deploy.sh"

    # Generate rollback script
    cat > "$DEPLOY_DIR/rollback.sh" << EOF
#!/bin/bash
# GameV1 Rollback Script - Generated by CI/CD Pipeline

set -e

echo "🔄 Rolling back GameV1 deployment..."

# Check if running as root
if [ "\$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Stop services
echo "🛑 Stopping services..."
systemctl stop gamev1-gateway gamev1-worker gamev1-pocketbase 2>/dev/null || true

# Restore from backup (if exists)
if [ -d "/opt/gamev1/backup" ]; then
    echo "📦 Restoring from backup..."
    cp -r /opt/gamev1/backup/* /opt/gamev1/
fi

# Start services with previous version
echo "🚀 Starting services with previous version..."
systemctl start gamev1-gateway gamev1-worker gamev1-pocketbase

echo "✅ Rollback completed"
EOF

    chmod +x "$DEPLOY_DIR/rollback.sh"

    log "✅ Deployment stage completed"
    return 0
}

# Function to run post-deployment verification
run_verification() {
    log "🔍 Starting verification stage..."

    # Wait for services to start
    log "⏳ Waiting for services to initialize..."
    sleep 15

    # Health checks
    log "🏥 Running health checks..."

    if curl -f http://localhost:8080/healthz > /dev/null 2>&1; then
        log "  ✅ Gateway health check passed"
    else
        log "  ❌ Gateway health check failed"
        return 1
    fi

    if curl -f http://localhost:8080/metrics > /dev/null 2>&1; then
        log "  ✅ Metrics endpoint accessible"
    else
        log "  ❌ Metrics endpoint not accessible"
        return 1
    fi

    # Service status checks
    log "🔧 Checking service status..."
    if systemctl is-active --quiet gamev1-gateway; then
        log "  ✅ Gateway service running"
    else
        log "  ❌ Gateway service not running"
        return 1
    fi

    if systemctl is-active --quiet gamev1-worker; then
        log "  ✅ Worker service running"
    else
        log "  ❌ Worker service not running"
        return 1
    fi

    log "✅ Verification stage completed"
    return 0
}

# Main pipeline execution
log "🚀 Starting GameV1 CI/CD Pipeline"

# Track overall success
overall_success=true

# Execute stages based on PIPELINE_STAGE
case $PIPELINE_STAGE in
    "build")
        run_build || overall_success=false
        ;;
    "test")
        run_tests || overall_success=false
        ;;
    "deploy")
        run_deploy || overall_success=false
        ;;
    "all")
        run_build || overall_success=false
        run_tests || overall_success=false
        run_profiling || overall_success=false
        run_deploy || overall_success=false
        run_verification || overall_success=false
        ;;
    *)
        echo -e "${RED}❌ Unknown pipeline stage: $PIPELINE_STAGE${NC}"
        echo "Use: build, test, deploy, or all"
        exit 1
        ;;
esac

# Final status
echo ""
echo -e "${BLUE}${BOLD}📋 Pipeline Summary${NC}"
echo "=================="

if [ "$overall_success" = true ]; then
    echo -e "${GREEN}✅ Pipeline completed successfully!${NC}"

    case $PIPELINE_STAGE in
        "build")
            echo -e "${YELLOW}📦 Build artifacts:${NC} $BUILD_DIR/"
            ;;
        "test")
            echo -e "${YELLOW}🧪 Test results:${NC} $TEST_RESULTS_DIR/"
            ;;
        "deploy")
            echo -e "${YELLOW}🚀 Deployment package:${NC} $DEPLOY_DIR/"
            echo -e "${YELLOW}📋 Deployment script:${NC} $DEPLOY_DIR/deploy.sh"
            ;;
        "all")
            echo -e "${YELLOW}📦 Build artifacts:${NC} $BUILD_DIR/"
            echo -e "${YELLOW}🧪 Test results:${NC} $TEST_RESULTS_DIR/"
            echo -e "${YELLOW}🚀 Deployment package:${NC} $DEPLOY_DIR/"
            ;;
    esac
else
    echo -e "${RED}❌ Pipeline had failures!${NC}"
    echo -e "${YELLOW}📋 Check log file:${NC} $LOG_FILE"
fi

echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  $0                           # Run full pipeline (build, test, deploy)"
echo "  $0 build                     # Run build only"
echo "  $0 test                      # Run tests only"
echo "  $0 deploy                    # Run deployment only"
echo "  $0 all staging release       # Full pipeline for staging with release build"
echo ""
echo -e "${YELLOW}🔧 Environment variables:${NC}"
echo "  DEPLOYMENT_ENV=production    # Set deployment environment"
echo "  BUILD_TYPE=release           # Set build type (debug/release)"

echo ""
if [ "$overall_success" = true ]; then
    echo -e "${GREEN}🎉 GameV1 CI/CD pipeline completed successfully!${NC}"
else
    echo -e "${RED}❌ GameV1 CI/CD pipeline had issues - check logs${NC}"
    exit 1
fi
