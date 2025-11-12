#!/bin/bash

# 🚀 ENEEGY SMART CONTRACT AUTO DEPLOY SCRIPT
# ============================================
# Deploy Solana smart contract to devnet automatically
# Usage: ./auto_deploy.sh

set -e

echo "🚀 ENEEGY SMART CONTRACT AUTO DEPLOY"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRAM_NAME="game_token_v2"
SOLANA_NETWORK="devnet"
EXPECTED_PROGRAM_ID="Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf"

echo -e "${BLUE}📁 Project Directory:${NC} $PROJECT_DIR"
echo -e "${BLUE}🎯 Program Name:${NC} $PROGRAM_NAME"
echo -e "${BLUE}🌐 Network:${NC} $SOLANA_NETWORK"
echo ""

# Function to check command success
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Check environment
echo -e "${YELLOW}🔍 STEP 1: CHECKING ENVIRONMENT${NC}"

# Check if we're in the right directory
if [ ! -f "programs/game_token_v2/src/lib.rs" ]; then
    echo -e "${RED}❌ Error: Not in correct project directory${NC}"
    echo "Please run this script from the game_token project root"
    exit 1
fi

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Installing...${NC}"

    # Install Solana CLI
    curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    source ~/.bashrc 2>/dev/null || true
fi

solana --version
check_command "Solana CLI check"

# Step 2: Configure Solana
echo -e "${YELLOW}⚙️ STEP 2: CONFIGURING SOLANA${NC}"

# Set network
solana config set --url $SOLANA_NETWORK
check_command "Network configuration"

# Check wallet
WALLET_BALANCE=$(solana balance | grep -o '[0-9.]* SOL' | head -1)
echo -e "${BLUE}💰 Wallet Balance:${NC} $WALLET_BALANCE"

if (( $(echo "$WALLET_BALANCE < 0.1" | bc -l 2>/dev/null || echo "1") )); then
    echo -e "${YELLOW}⚠️ Low balance. Requesting airdrop...${NC}"
    solana airdrop 1
    sleep 5
fi

check_command "Wallet check"

# Step 3: Install dependencies
echo -e "${YELLOW}📦 STEP 3: INSTALLING DEPENDENCIES${NC}"

# Install Rust if not present
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

cargo --version
check_command "Rust installation"

# Install Anchor if not present
if ! command -v anchor &> /dev/null; then
    echo "Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor avm
    avm install latest
    avm use latest
fi

anchor --version
check_command "Anchor installation"

# Step 4: Clean and build
echo -e "${YELLOW}🔨 STEP 4: BUILDING SMART CONTRACT${NC}"

# Clean previous builds
anchor clean 2>/dev/null || true

# Build smart contract
echo "Building smart contract..."
anchor build
check_command "Smart contract build"

# Check build output
if [ ! -f "target/deploy/game_token.so" ]; then
    echo -e "${RED}❌ Build failed - no .so file found${NC}"
    exit 1
fi

FILE_SIZE=$(stat -c%s "target/deploy/game_token.so" 2>/dev/null || echo "0")
echo -e "${BLUE}📦 Build Size:${NC} $((FILE_SIZE/1024)) KB"

# Step 5: Deploy to devnet
echo -e "${YELLOW}🚀 STEP 5: DEPLOYING TO DEVNET${NC}"

echo "Deploying smart contract..."
DEPLOY_OUTPUT=$(anchor deploy 2>&1)

if echo "$DEPLOY_OUTPUT" | grep -q "success"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Extract Program ID from output
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -o 'Program Id: [A-Za-z0-9]*' | cut -d' ' -f3 || echo "")

if [ -z "$PROGRAM_ID" ]; then
    # Try alternative extraction
    PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -o '[A-Za-z0-9]\{32,\}' | head -1 || echo "")
fi

echo -e "${BLUE}🎯 Deployed Program ID:${NC} $PROGRAM_ID"

# Step 6: Verify deployment
echo -e "${YELLOW}🔍 STEP 6: VERIFYING DEPLOYMENT${NC}"

if [ -n "$PROGRAM_ID" ]; then
    # Check program on chain
    echo "Checking program on devnet..."
    VERIFY_OUTPUT=$(solana program show "$PROGRAM_ID" 2>/dev/null || echo "failed")

    if echo "$VERIFY_OUTPUT" | grep -q "Program Id"; then
        echo -e "${GREEN}✅ Program verified on chain${NC}"

        # Check if executable
        if echo "$VERIFY_OUTPUT" | grep -q "Executable: true"; then
            echo -e "${GREEN}✅ Program is executable${NC}"
        else
            echo -e "${YELLOW}⚠️ Program not yet executable${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Could not verify program on chain${NC}"
    fi

    # Generate explorer link
    EXPLORER_URL="https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    echo -e "${BLUE}🔗 Explorer Link:${NC} $EXPLORER_URL"
else
    echo -e "${YELLOW}⚠️ Could not extract Program ID${NC}"
fi

# Step 7: Generate deployment report
echo -e "${YELLOW}📊 STEP 7: GENERATING DEPLOYMENT REPORT${NC}"

DEPLOYMENT_REPORT="deployment_report_$(date +%Y%m%d_%H%M%S).txt"

cat > "$DEPLOYMENT_REPORT" << EOF
🚀 ENEEGY SMART CONTRACT DEPLOYMENT REPORT
==========================================

📅 Deployment Time: $(date)
🌐 Network: $SOLANA_NETWORK
💰 Wallet Balance: $WALLET_BALANCE

📦 Build Information:
- Project: $PROGRAM_NAME
- Build Size: $((FILE_SIZE/1024)) KB
- Expected Program ID: $EXPECTED_PROGRAM_ID

🎯 Deployment Results:
- Program ID: ${PROGRAM_ID:-"Not extracted"}
- Status: ${PROGRAM_ID:+SUCCESS ✅}${PROGRAM_ID:-FAILED ❌}
- Explorer: ${EXPLORER_URL:-"N/A"}

🔗 Important Links:
- Solana Explorer: ${EXPLORER_URL:-"N/A"}
- Devnet Faucet: https://faucet.solana.com/

📋 Next Steps:
1. Test smart contract functionality
2. Update client code with new Program ID
3. Deploy to mainnet when ready

⚠️ Security Notes:
- Backup your wallet keypair securely
- Test thoroughly on devnet before mainnet
- Consider code audit for production

EOF

echo -e "${GREEN}✅ Deployment report saved: $DEPLOYMENT_REPORT${NC}"

# Step 8: Final summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "========================================"
echo -e "${BLUE}🎯 Program ID:${NC} ${PROGRAM_ID:-'Check deployment output'}"
echo -e "${BLUE}🔗 Explorer:${NC} ${EXPLORER_URL:-'Check deployment output'}"
echo -e "${BLUE}📊 Report:${NC} $DEPLOYMENT_REPORT"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test smart contract với client code"
echo "2. Update Program ID trong ứng dụng"
echo "3. Deploy lên mainnet khi sẵn sàng"
echo ""
echo -e "${GREEN}🚀 Happy coding!${NC}"

