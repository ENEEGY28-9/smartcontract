# 🚀 LINUX DEPLOYMENT GUIDE - SOLANA SMART CONTRACT

## 🎯 PROBLEM SOLVED: ELF Compatibility Issue

**Windows + Linux build = ❌ ELF Error**
**Linux + Linux build = ✅ Perfect Compatibility**

---

## 📋 QUICK START (5 Minutes)

### Option 1: DigitalOcean Droplet (Recommended)
```bash
# 1. Create Ubuntu 22.04 VPS ($6/month)
# 2. Connect via SSH
ssh root@your-droplet-ip

# 3. Run setup script
wget https://raw.githubusercontent.com/your-repo/setup_linux_vps.sh
chmod +x setup_linux_vps.sh
./setup_linux_vps.sh
```

### Option 2: AWS Lightsail
```bash
# 1. Create Ubuntu instance ($3.50/month)
# 2. Connect via SSH
ssh ubuntu@your-instance-ip

# 3. Manual setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential pkg-config libudev-dev libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install Solana CLI
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

---

## 🛠️ MANUAL SETUP STEPS

### Step 1: Create Linux VPS
- **DigitalOcean**: Ubuntu 22.04, 1GB RAM, $6/month
- **AWS Lightsail**: Ubuntu 22.04, 512MB RAM, $3.50/month
- **Linode**: Ubuntu 22.04, 1GB RAM, $5/month

### Step 2: Connect & Update
```bash
ssh root@your-server-ip
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Dependencies
```bash
# Essential tools
sudo apt install -y curl wget git build-essential pkg-config libudev-dev libssl-dev

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4: Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
rustc --version  # Verify installation
```

### Step 5: Install Solana CLI
```bash
curl -sSfL https://release.anza.xyz/v1.18.26/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version  # Verify installation
```

### Step 6: Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
export PATH="$HOME/.avm/bin:$PATH"
anchor --version  # Verify installation
```

---

## 📦 DEPLOY YOUR PROJECT

### Step 1: Upload Project
```bash
# From your local machine
scp -r game_token/ root@your-server-ip:~

# Or clone from git
git clone https://github.com/your-username/eneegy-main.git
cd eneegy-main/game_token
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Solana
```bash
# Set to devnet
solana config set --url devnet

# Generate new wallet (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Check balance
solana balance
```

### Step 4: Build & Deploy
```bash
# Build smart contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/game_token-keypair.json
```

### Step 5: Fund Wallet & Test
```bash
# Get devnet SOL
solana airdrop 1

# Test player claims
node player_claim_real.js YOUR_PLAYER_ADDRESS 30
```

---

## 🎯 EXPECTED RESULTS

After successful deployment:
```
✅ Smart contract deployed to devnet
✅ Program ID: [your-program-id]
✅ Player claims working
✅ Token transfers functional
```

---

## 🚨 TROUBLESHOOTING

### Low Balance Error
```bash
solana airdrop 1
# Wait 30 seconds, then check
solana balance
```

### Build Errors
```bash
# Clean and rebuild
anchor clean
anchor build
```

### Permission Issues
```bash
chmod +x ~/.local/share/solana/install/active_release/bin/solana
chmod +x ~/.cargo/bin/anchor
```

---

## 💰 COST BREAKDOWN

- **DigitalOcean**: $6/month = ~$0.20/day
- **AWS Lightsail**: $3.50/month = ~$0.12/day
- **Development time saved**: Priceless! 🚀

---

## 🎉 SUCCESS METRICS

After setup, you should have:
- ✅ Working Solana development environment
- ✅ Deployed smart contract on devnet
- ✅ Functional player claim system
- ✅ Token transfer capabilities

**No more ELF compatibility issues! 🎯**


