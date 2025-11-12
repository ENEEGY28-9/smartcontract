#!/bin/bash

# 🚀 VPS SETUP SCRIPT FOR SOLANA DEPLOYMENT
# =========================================
# Auto setup Ubuntu VPS for Solana smart contract deployment

set -e

echo "🖥️ VPS SETUP FOR SOLANA DEPLOYMENT"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential pkg-config libudev-dev libssl-dev

echo -e "${GREEN}✅ System updated${NC}"

# Install Rust
echo -e "${YELLOW}🦀 Installing Rust...${NC}"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

echo -e "${GREEN}✅ Rust installed${NC}"

# Install Solana CLI
echo -e "${YELLOW}⛓️ Installing Solana CLI...${NC}"
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo -e "${GREEN}✅ Solana CLI installed${NC}"

# Install Anchor
echo -e "${YELLOW}⚓ Installing Anchor...${NC}"
cargo install --git https://github.com/coral-xyz/anchor avm
avm install latest
avm use latest

echo -e "${GREEN}✅ Anchor installed${NC}"

# Install Node.js (for client testing)
echo -e "${YELLOW}📱 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo -e "${GREEN}✅ Node.js installed${NC}"

# Configure Solana
echo -e "${YELLOW}⚙️ Configuring Solana...${NC}"
solana config set --url devnet

echo -e "${GREEN}✅ Solana configured${NC}"

# Create deployment directory
mkdir -p ~/solana-deployments
cd ~/solana-deployments

# Download project
echo -e "${YELLOW}📥 Downloading project...${NC}"
# This would be replaced with actual git clone or file transfer

echo -e "${GREEN}✅ VPS setup completed!${NC}"
echo ""
echo -e "${BLUE}🚀 Ready for deployment!${NC}"
echo "Run: ./auto_deploy.sh"

