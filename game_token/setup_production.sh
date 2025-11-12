#!/bin/bash
# PRODUCTION ENVIRONMENT SETUP SCRIPT
# Run this on Linux (Ubuntu 22.04+) for production deployment

set -e  # Exit on any error

echo "🚀 Setting up Production Environment for Game Token System..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    error "This script must be run on Linux. Use GitHub Codespaces, Ubuntu VM, or WSL2."
    exit 1
fi

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential dependencies
log "Installing build dependencies..."
sudo apt install -y curl build-essential pkg-config libssl-dev jq unzip

# Install Rust
log "Installing Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
    export PATH="$HOME/.cargo/bin:$PATH"
else
    log "Rust already installed: $(rustc --version)"
fi

# Install Node.js 18.x
log "Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log "Node.js already installed: $(node --version)"
fi

# Install Yarn (optional but recommended)
log "Installing Yarn..."
if ! command -v yarn &> /dev/null; then
    npm install -g yarn
fi

# Install Solana CLI
log "Installing Solana CLI..."
if ! command -v solana &> /dev/null; then
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
else
    log "Solana CLI already installed: $(solana --version)"
fi

# Install Anchor CLI
log "Installing Anchor CLI..."
if ! command -v anchor &> /dev/null; then
    npm install -g @coral-xyz/anchor-cli
else
    log "Anchor CLI already installed: $(anchor --version)"
fi

# Install PM2 for process management
log "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Configure Solana for devnet
log "Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com

# Create production directory structure
log "Setting up project structure..."
mkdir -p ~/game_token_project/{contracts,scripts,logs,backups}

# Install project dependencies
log "Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
fi

# Verify installations
log "Verifying installations..."
echo "Rust: $(rustc --version)"
echo "Cargo: $(cargo --version)"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Solana: $(solana --version)"
echo "Anchor: $(anchor --version)"
echo "PM2: $(pm2 --version)"

# Create environment file
log "Creating environment configuration..."
cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Auto-mint configuration
AUTO_MINT_INTERVAL=60000  # 1 minute in milliseconds
TOKENS_PER_MINT=100       # 100 tokens per minute
OWNER_SHARE_PERCENT=20    # 20% to owner
GAME_SHARE_PERCENT=80     # 80% to game pool

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true

# Security (set these in production)
# WALLET_PRIVATE_KEY=
# PROGRAM_ID=
EOF

# Create PM2 ecosystem file
log "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'game-token-scheduler',
    script: 'auto_mint_scheduler.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      SOLANA_CLUSTER: 'devnet'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create monitoring script
log "Creating monitoring script..."
cat > scripts/monitor_system.sh << 'EOF'
#!/bin/bash
# System Health Monitoring Script

echo "🔍 Checking system health..."

# Check Solana connection
echo "Solana ping:"
solana ping

# Check wallet balance
echo "Wallet balance:"
solana balance

# Check recent transactions
echo "Recent transactions:"
solana transaction-history --limit 5

# Check system resources
echo "System resources:"
echo "CPU: $(uptime)"
echo "Memory: $(free -h)"
echo "Disk: $(df -h)"

echo "✅ Health check complete"
EOF

chmod +x scripts/monitor_system.sh

# Setup cron jobs
log "Setting up cron jobs..."
(crontab -l ; echo "*/5 * * * * cd $(pwd) && ./scripts/monitor_system.sh") | crontab -

# Create deployment script
log "Creating deployment script..."
cat > scripts/deploy_production.sh << 'EOF'
#!/bin/bash
# Production Deployment Script

set -e

echo "🚀 Deploying to Production..."

# Build contracts
echo "Building smart contracts..."
anchor build

# Deploy to devnet
echo "Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Get program ID
PROGRAM_ID=$(solana program show --programs | grep game_token | awk '{print $1}')
echo "Program ID: $PROGRAM_ID"

# Update environment
echo "PROGRAM_ID=$PROGRAM_ID" >> .env

# Initialize PDAs
echo "Initializing PDAs..."
node scripts/initialize_pdas.js

# Start scheduler with PM2
echo "Starting auto-mint scheduler..."
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check Solana Explorer: https://explorer.solana.com/?cluster=devnet"
echo "🔍 Monitor with: pm2 monit"
EOF

chmod +x scripts/deploy_production.sh

# Success message
echo ""
echo "🎉 PRODUCTION ENVIRONMENT SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Configure your wallet: solana-keygen new"
echo "2. Fund devnet wallet: solana airdrop 2"
echo "3. Deploy contracts: ./scripts/deploy_production.sh"
echo "4. Monitor system: pm2 monit"
echo "5. Check logs: pm2 logs"
echo ""
echo "🔗 Useful Commands:"
echo "• Start scheduler: pm2 start ecosystem.config.js"
echo "• Stop scheduler: pm2 stop game-token-scheduler"
echo "• Restart: pm2 restart game-token-scheduler"
echo "• Check status: pm2 status"
echo ""
echo "📊 Monitoring:"
echo "• System health: ./scripts/monitor_system.sh"
echo "• PM2 dashboard: pm2 monit"
echo "• Logs: pm2 logs game-token-scheduler"
echo ""
echo "🚀 Ready for mainnet migration when testing is complete!"
echo ""
echo "💡 Remember: Test extensively on devnet before mainnet deployment"

# Final verification
log "Running final verification..."
solana config get
solana balance
pm2 list









