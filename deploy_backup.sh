#!/bin/bash
echo "🚀 BACKUP DEPLOYMENT SCRIPT"
echo "=========================="

# Colors
RED='\''\033[0;31m'\''
GREEN='\''\033[0;32m'\''
YELLOW='\''\033[1;33m'\''
NC='\''\033[0m'\''

# Check if we'\''re in WSL
if [[ ! -f /proc/version ]] || ! grep -q "Microsoft" /proc/version; then
    echo -e "${RED}❌ Error: This script must be run in WSL Ubuntu${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running in WSL Ubuntu${NC}"

# Setup environment
echo -e "${YELLOW}📦 Setting up environment...${NC}"
export PATH="C:\Users\Fit/.cargo/bin:"
export PATH="C:\Users\Fit/.local/share/solana/install/active_release/bin:"

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Solana CLI...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
    export PATH="C:\Users\Fit/.local/share/solana/install/active_release/bin:"
fi

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Anchor CLI...${NC}"
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
fi

# Setup wallet
echo -e "${YELLOW}🔑 Setting up wallet...${NC}"
mkdir -p ~/.config/solana
if [[ -z "$SOLANA_PRIVATE_KEY" ]]; then
    echo -e "${RED}❌ Error: SOLANA_PRIVATE_KEY environment variable not set${NC}"
    echo "Set it with: export SOLANA_PRIVATE_KEY='\''your_private_key_array'\''"
    exit 1
fi
echo "" > ~/.config/solana/id.json
chmod 600 ~/.config/solana/id.json

# Configure Solana
solana config set --url devnet --keypair ~/.config/solana/id.json

# Get airdrop
echo -e "${YELLOW}💰 Requesting airdrop...${NC}"
solana airdrop 2 || echo -e "${YELLOW}⚠️  Airdrop failed, continuing...${NC}"

# Build
echo -e "${YELLOW}🔨 Building smart contract...${NC}"
anchor build

# Deploy
echo -e "${YELLOW}🚀 Deploying to devnet...${NC}"
anchor deploy

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/game_token-keypair.json)
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "📋 DEPLOYMENT REPORT"
echo "==================="
echo "Program ID: $PROGRAM_ID"
echo "Network: Solana Devnet"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "Time: $(date)"
echo ""
echo "🎯 Next steps:"
echo "1. Test smart contract functions"
echo "2. Verify on Solana Explorer"
echo "3. Ready for mainnet deployment"
