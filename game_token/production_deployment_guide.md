# 🚀 PRODUCTION DEPLOYMENT GUIDE - Devnet → Mainnet

## 🎯 MỤC TIÊU: Production-Ready Setup Từ Devnet Đến Mainnet

---

## 📋 CURRENT STATUS

### ✅ COMPLETED
- ✅ **Logic**: 100 tokens/minute Auto-mint verified
- ✅ **Code**: Production-ready smart contracts
- ✅ **Testing**: Comprehensive verification suite
- ✅ **Business Model**: Play-to-Hold-to-Earn perfected

### ⚠️ ENVIRONMENT CHALLENGE
- ⚠️ **Windows/WSL**: Development conflicts
- ⚠️ **Network Issues**: Download restrictions
- ⚠️ **Tool Compatibility**: Mixed environments

---

## 🎯 CORRECT SOLUTION: Linux Production Environment

### Tại Sao Linux?
```
✅ Production Standard: 90% blockchain infra chạy Linux
✅ Tool Compatibility: Solana/Rust/Anchor native support
✅ Scalability: Easy migrate từ devnet → mainnet
✅ Reliability: Stable environment cho 24/7 operation
✅ Cost Effective: Free options available
```

### Option 1: GitHub Codespaces ⭐⭐⭐ (RECOMMENDED - 5 minutes)
```bash
# 1. Create Codespace
Go to: https://github.com/codespaces
→ New codespace → Ubuntu

# 2. Clone & Setup (Auto-run)
git clone <your-repo>
cd game_token
chmod +x setup_production.sh
./setup_production.sh

# 3. Deploy to Devnet
anchor build
anchor deploy --provider.cluster devnet

# 4. Test & Monitor
node auto_mint_scheduler.js
# Check Solana Explorer
```

### Option 2: DigitalOcean Droplet (Production-Grade)
```bash
# 1. Create Ubuntu 22.04 droplet ($6/month)
# 2. SSH access
# 3. Run setup script
wget <setup-script-url>
bash setup_production.sh

# 4. Deploy & configure
```

### Option 3: AWS EC2 Free Tier
```bash
# 1. Launch Ubuntu t2.micro (free tier)
# 2. Configure security groups
# 3. Setup environment
# 4. Deploy production
```

---

## 🔧 PRODUCTION SETUP SCRIPT

### `setup_production.sh`
```bash
#!/bin/bash
# Production Environment Setup

echo "🚀 Setting up Production Environment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl build-essential pkg-config libssl-dev jq

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Install PM2 for process management
sudo npm install -g pm2

# Configure Solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url https://api.devnet.solana.com

# Create production wallet
# Note: Use proper key management in production
solana-keygen new --no-bip39-passphrase

echo "✅ Production Environment Ready!"
echo "🪄 Next: Deploy smart contract"
```

---

## 🚀 DEPLOYMENT WORKFLOW

### Phase 1: Devnet Deployment
```bash
# 1. Build contracts
anchor build

# 2. Deploy to devnet
anchor deploy --provider.cluster devnet

# 3. Get program ID
PROGRAM_ID=$(solana program show --programs | grep game_token | awk '{print $1}')
echo "Program ID: $PROGRAM_ID"

# 4. Initialize PDAs
node scripts/initialize_pdas.js

# 5. Test auto-mint
node auto_mint_scheduler.js

# 6. Verify on explorer
echo "Check: https://explorer.solana.com/?cluster=devnet"
```

### Phase 2: Production Monitoring
```bash
# Setup PM2 for auto-restart
pm2 start auto_mint_scheduler.js --name "game-token-scheduler"
pm2 startup
pm2 save

# Setup logs
pm2 logs game-token-scheduler

# Monitor resources
pm2 monit
```

### Phase 3: Mainnet Migration Plan
```bash
# 1. Audit smart contracts
# 2. Test on devnet extensively
# 3. Prepare mainnet wallet with SOL
# 4. Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# 5. Setup production monitoring
# 6. Configure backup systems
# 7. Setup emergency pause mechanisms
```

---

## 📊 MONITORING & ALERTS

### Health Checks
```bash
# Create monitoring script
#!/bin/bash
# check_system_health.sh

# Check Solana connection
solana ping

# Check program status
solana program show $PROGRAM_ID

# Check wallet balance
solana balance

# Check recent transactions
solana transaction-history

# Send alerts if issues
```

### Cron Jobs Setup
```bash
# System monitoring every 5 minutes
*/5 * * * * /path/to/check_system_health.sh

# Auto-mint scheduler (if not using PM2)
*/1 * * * * cd /path/to/game_token && node auto_mint_scheduler.js
```

### Log Management
```bash
# PM2 logs
pm2 logs

# System logs
tail -f /var/log/syslog

# Application logs
tail -f ~/game_token/logs/auto_mint.log
```

---

## 🔒 SECURITY & BACKUP

### Wallet Security
```bash
# Use hardware wallet in production
# solana-keygen new --no-outfile

# Backup private keys securely
# Use encrypted storage

# Multi-sig for critical operations
```

### Backup Strategy
```bash
# Code backup
git push origin main

# Configuration backup
cp Anchor.toml Anchor.toml.backup
cp .env .env.backup

# Database backup (if any)
```

### Emergency Procedures
```bash
# Emergency pause
echo "PAUSE_AUTO_MINT=true" >> .env

# Wallet transfer
solana transfer <recipient> <amount>

# Contract upgrade
anchor deploy --provider.cluster devnet
```

---

## 📈 SCALING STRATEGY

### Performance Optimization
```bash
# Optimize compute units
# Monitor transaction fees
# Batch operations when possible
# Use priority fees for urgent tx
```

### Load Balancing
```bash
# Multiple RPC endpoints
solana config set --url <backup-rpc>

# Multiple wallets for distribution
# Round-robin transaction sending
```

### Monitoring Dashboard
```bash
# Setup Grafana + Prometheus
# Monitor:
# - Transaction success rate
# - Token distribution balance
# - System resource usage
# - Revenue metrics
```

---

## 🌐 MAINNET MIGRATION CHECKLIST

### Pre-Migration
- [ ] Smart contract audit completed
- [ ] Extensive devnet testing (1+ months)
- [ ] Security review passed
- [ ] Mainnet wallet funded
- [ ] Backup systems ready
- [ ] Emergency procedures documented

### Migration Steps
- [ ] Deploy to mainnet-beta
- [ ] Initialize production PDAs
- [ ] Test with small amounts
- [ ] Setup production monitoring
- [ ] Configure auto-restart systems
- [ ] Enable revenue tracking

### Post-Migration
- [ ] Monitor 24/7 for first week
- [ ] Setup alerts for anomalies
- [ ] Document all procedures
- [ ] Prepare upgrade mechanisms

---

## 🎯 RECOMMENDED ARCHITECTURE

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Smart Contract│    │     Database    │
│   (Node.js)     │◄──►│   (Solana)      │◄──►│   (Optional)    │
│                 │    │                 │    │                 │
│ • API Server    │    │ • Auto-mint     │    │ • User stats    │
│ • Game Logic    │    │ • Token dist    │    │ • Analytics     │
│ • UI/UX         │    │ • PDA mgmt      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Monitoring    │
                    │   & Alerts      │
                    └─────────────────┘
```

---

## 💰 COST ANALYSIS

### Devnet (Testing)
```
• Solana Devnet: Free
• Compute: Minimal
• Storage: Minimal
• Transactions: Free
```

### Mainnet (Production)
```
• SOL for deployment: ~1 SOL ($200)
• SOL for transactions: ~0.000005 SOL/tx ($0.001)
• SOL for rent: ~0.002 SOL/day ($0.4)
• Total monthly: ~$50 + gas fees
```

---

## 🎊 FINAL RECOMMENDATION

### **GitHub Codespaces** ⭐⭐⭐⭐⭐
```
✅ Fastest setup (5 minutes)
✅ Free tier available
✅ Pre-configured Linux
✅ Direct GitHub integration
✅ Easy collaboration
✅ Production-like environment
```

### Deployment Commands:
```bash
# In Codespaces terminal:
git clone <your-repo>
cd game_token

# Setup environment
chmod +x setup_production.sh
./setup_production.sh

# Deploy & test
anchor build
anchor deploy --provider.cluster devnet
node auto_mint_scheduler.js

# Verify on explorer
```

**🎯 Result: Production-ready system từ devnet, easy migrate to mainnet!** 🚀💎
