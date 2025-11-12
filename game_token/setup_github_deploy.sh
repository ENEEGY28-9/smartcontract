#!/bin/bash

# 🚀 GITHUB ACTIONS AUTO DEPLOY SETUP
# ===================================
# Setup GitHub repository với auto deploy hoàn toàn tự động

set -e

echo "🚀 GITHUB ACTIONS AUTO DEPLOY SETUP"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Installing...${NC}"
    # Install git if needed
    apt update && apt install -y git
fi

echo -e "${GREEN}✅ Git available${NC}"

# Step 1: Create GitHub repository (manual step for user)
echo -e "${YELLOW}📝 STEP 1: CREATE GITHUB REPOSITORY${NC}"
echo ""
echo "Bạn cần tạo GitHub repository:"
echo "1. 🌐 Truy cập: https://github.com/new"
echo "2. 📝 Repository name: eneegy-game-token"
echo "3. 👀 Public repository"
echo "4. ❌ Không check 'Add README' hoặc '.gitignore'"
echo "5. 🔧 Không check 'Add .gitignore'"
echo ""
read -p "Nhấn Enter sau khi tạo xong repository và copy HTTPS URL: " GITHUB_URL

if [ -z "$GITHUB_URL" ]; then
    echo -e "${RED}❌ GitHub URL required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub URL: $GITHUB_URL${NC}"

# Step 2: Setup local git repository
echo -e "${YELLOW}🔧 STEP 2: SETUP LOCAL GIT REPOSITORY${NC}"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${BLUE}ℹ️ Git repository already exists${NC}"
fi

# Configure git
git config user.name "Eneegy Deploy Bot"
git config user.email "deploy@eneegy.com"

# Add all files
git add .

# Commit
git commit -m "🚀 Initial commit: Eneegy Game Token Smart Contract

- Smart contract with 80/20 distribution logic
- Player claim functionality
- Game token minting system
- Anchor framework integration

Ready for automated deployment!"

echo -e "${GREEN}✅ Code committed${NC}"

# Step 3: Setup remote and push
echo -e "${YELLOW}📤 STEP 3: PUSH TO GITHUB${NC}"

# Add remote
git remote add origin "$GITHUB_URL"

# Push to main branch
echo "Pushing to GitHub..."
git push -u origin master

echo -e "${GREEN}✅ Code pushed to GitHub${NC}"

# Step 4: Setup deployment wallet
echo -e "${YELLOW}🔑 STEP 4: SETUP DEPLOYMENT WALLET${NC}"

# Create deployment wallet
if [ ! -f "~/.config/solana/id.json" ]; then
    echo "Creating deployment wallet..."
    mkdir -p ~/.config/solana
    solana-keygen new --no-passphrase --outfile ~/.config/solana/id.json
    echo -e "${GREEN}✅ Deployment wallet created${NC}"
else
    echo -e "${BLUE}ℹ️ Deployment wallet already exists${NC}"
fi

# Fund wallet
echo "Funding wallet with devnet SOL..."
solana config set --url devnet
solana airdrop 2

BALANCE=$(solana balance)
echo -e "${GREEN}✅ Wallet balance: $BALANCE${NC}"

# Step 5: Create secrets for GitHub Actions
echo -e "${YELLOW}🔐 STEP 5: SETUP GITHUB SECRETS${NC}"
echo ""
echo "Bạn cần thêm secret vào GitHub repository:"
echo ""
echo "1. 🌐 Vào GitHub repository settings: $GITHUB_URL/settings/secrets/actions"
echo "2. ➕ New repository secret"
echo "3. 🔑 Secret name: SOLANA_PRIVATE_KEY"
echo "4. 📝 Secret value (copy từ file bên dưới):"
echo ""

# Show wallet private key
if [ -f "~/.config/solana/id.json" ]; then
    echo "=================================================="
    echo "SOLANA_PRIVATE_KEY (copy this to GitHub secret):"
    echo "=================================================="
    cat ~/.config/solana/id.json
    echo ""
    echo "=================================================="
else
    echo -e "${RED}❌ Wallet file not found${NC}"
    exit 1
fi

echo ""
echo "Sau khi thêm secret, GitHub Actions sẽ tự động deploy!"

# Step 6: Trigger first deployment
echo -e "${YELLOW}🚀 STEP 6: TRIGGER FIRST DEPLOYMENT${NC}"
echo ""
echo "Để trigger deployment:"
echo "1. 🌐 Vào GitHub repository: $GITHUB_URL"
echo "2. 📁 Vào tab 'Actions'"
echo "3. ▶️ Click 'Deploy Solana Smart Contract'"
echo "4. 🚀 Click 'Run workflow'"
echo ""

echo -e "${GREEN}🎉 SETUP COMPLETED!${NC}"
echo "========================"
echo ""
echo -e "${BLUE}📊 What happens next:${NC}"
echo "1. GitHub Actions sẽ build smart contract"
echo "2. Auto deploy lên Solana devnet"
echo "3. Tạo deployment report"
echo "4. Bạn nhận Program ID qua email/GitHub notifications"
echo ""
echo -e "${BLUE}⏱️ Timeline:${NC}"
echo "- Setup: Đã hoàn thành ✅"
echo "- Build: ~5 phút"
echo "- Deploy: ~2 phút"
echo "- Total: ~7 phút"
echo ""
echo -e "${GREEN}🚀 Enjoy automated deployments!${NC}"

