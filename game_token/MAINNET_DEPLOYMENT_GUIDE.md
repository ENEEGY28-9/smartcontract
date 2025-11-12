# 🚀 MAINNET DEPLOYMENT GUIDE - FROM SOLANA PLAYGROUND

## 🎯 **CHUYỂN TỪ DEVNET (PLAYGROUND) SANG MAINNET PRODUCTION**

**Quan trọng:** Solana Playground chỉ phù hợp cho **development & testing**. Cho **production mainnet**, bạn cần **local development environment**.

---

## 📊 **SO SÁNH DEVNET vs MAINNET DEPLOYMENT**

| **Aspect** | **Solana Playground (Devnet)** | **Mainnet Production** |
|---|---|---|
| **Environment** | Browser-based, temporary | Local machine, persistent |
| **Security** | Test keys, public | Production keys, secure |
| **Cost** | Free | Transaction fees required |
| **Persistence** | Session-based | Permanent blockchain |
| **Testing** | Limited | Full integration tests |
| **CI/CD** | Không có | Professional deployment |

---

## 🎯 **GIẢI PHÁP MAINNET PRODUCTION**

### **TÙY CHỌN 1: GITHUB CODESPACES (KHUYẾN NGHỊ)**
```bash
# 120 hours free/tháng cho personal accounts
# Professional development environment
# Git integration tự động
```

### **TÙY CHỌN 2: LOCAL LINUX ENVIRONMENT**
```bash
# Ubuntu 24.04 với GLIBC 2.39
# Full control với development environment
# Không giới hạn thời gian
```

### **TÙY CHỌN 3: VPS LINUX (ĐÁNG TIN CẬY NHẤT)**
```bash
# DigitalOcean, AWS Lightsail
# Production-ready environment
# 24/7 availability
```

---

## 📋 **WORKFLOW CHUYỂN TỪ DEVNET SANG MAINNET**

### **BƯỚC 1: EXPORT CODE TỪ PLAYGROUND**
```javascript
// Trong Solana Playground terminal
cat src/lib.rs > game_token_mainnet.rs
cat Anchor.toml > Anchor_mainnet.toml
```

### **BƯỚC 2: SETUP LOCAL ENVIRONMENT**
```bash
# Sử dụng GitHub Codespaces (recommended)
1. Tạo GitHub repository
2. Upload code từ Playground
3. Mở Codespace
4. Setup Solana CLI + Anchor
```

### **BƯỚC 3: CẤU HÌNH MAINNET**
```toml
# Anchor.toml - Mainnet config
[toolchain]
anchor_version = "0.30.1"

[features]
resolution = true
skip-lint = false

[programs.mainnet-beta]
game_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "mainnet-beta"
wallet = "~/.config/solana/id.json"

[workspace]
members = ["programs/*"]
```

### **BƯỚC 4: SETUP PRODUCTION WALLET**
```bash
# Tạo production wallet (KHÔNG DÙNG TEST WALLET)
solana-keygen new --outfile ~/.config/solana/mainnet-wallet.json

# Fund wallet với SOL (cần ~2-3 SOL cho deployment)
# Buy SOL từ exchange hoặc bridge từ devnet

# Set wallet
solana config set --keypair ~/.config/solana/mainnet-wallet.json
```

### **BƯỚC 5: BUILD & TEST TRÊN DEVNET**
```bash
# Test lại trên devnet trước khi deploy mainnet
solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet
anchor test
```

### **BƯỚC 6: DEPLOY MAINNET**
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Final build for mainnet
anchor build

# Deploy to mainnet (CẨN THẬN!)
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show [PROGRAM_ID]
```

---

## 💰 **MAINNET DEPLOYMENT COSTS**

### **Estimated Costs:**
- **SOL Balance Required:** ~2-3 SOL
  - Program deployment: ~1.4 SOL
  - Rent exemption: ~0.5 SOL
  - Transaction fees: ~0.1-0.2 SOL

- **Ongoing Costs:**
  - Program upgrades: ~0.014 SOL per upgrade
  - Transaction fees: ~0.000005 SOL per signature

### **Where to get SOL:**
1. **Crypto Exchanges:** Binance, Coinbase, KuCoin
2. **Bridge từ Devnet:** Không khuyến nghị cho production
3. **DEX:** Raydium, Orca (swap từ other tokens)

---

## 🔒 **MAINNET SECURITY BEST PRACTICES**

### **Wallet Security:**
```bash
# Sử dụng hardware wallet (Ledger/Trezor)
# Không store private keys trong code
# Use environment variables cho sensitive data
```

### **Program Security:**
```bash
# Audit code trước khi deploy
# Test extensively trên devnet
# Use multisig cho critical operations
# Implement upgrade authority properly
```

### **Key Management:**
```bash
# Separate deployer và upgrade authority keys
# Use different wallets cho different roles
# Backup keys securely (encrypted)
```

---

## 🚀 **PROFESSIONAL DEPLOYMENT WORKFLOW**

### **Recommended Setup: GitHub Codespaces**
```bash
# 1. Create GitHub repo
# 2. Push code from Playground
# 3. Open Codespace
# 4. Setup environment (auto via devcontainer)
# 5. Deploy to mainnet
# 6. Setup monitoring và alerts
```

### **DevContainer Configuration (.devcontainer/devcontainer.json)**
```json
{
  "name": "Solana Development",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/rust:1": {},
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "postCreateCommand": "curl -sSfL https://release.anza.xyz/v1.18.26/install | sh && cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest",
  "customizations": {
    "vscode": {
      "extensions": [
        "anchor-labs.anchor-ide",
        "rust-lang.rust-analyzer"
      ]
    }
  }
}
```

---

## 📊 **MAINNET MONITORING & MAINTENANCE**

### **Post-Deployment:**
```bash
# Monitor program health
solana program show [PROGRAM_ID]

# Check transaction logs
solana logs [PROGRAM_ID]

# Monitor SOL balance
solana balance
```

### **Upgrade Process:**
```bash
# Build new version
anchor build

# Upgrade program
anchor upgrade target/deploy/game_token.so --program-id [PROGRAM_ID]
```

---

## ⚠️ **MAINNET RISKS & MITIGATION**

### **Common Risks:**
- **Lost private keys** → Use multisig, backup properly
- **Buggy code** → Audit thoroughly, extensive testing
- **Insufficient funds** → Monitor SOL balance
- **Network congestion** → Use appropriate priority fees

### **Risk Mitigation:**
```bash
# Use timelock cho critical upgrades
# Implement emergency pause functionality
# Setup monitoring và alerting
# Have recovery plans ready
```

---

## 🎯 **KẾT LUẬN: MAINNET STRATEGY**

### **PHASE 1: Development (Solana Playground)**
- ✅ Rapid prototyping
- ✅ Feature development
- ✅ Initial testing

### **PHASE 2: Pre-Production (GitHub Codespaces)**
- ✅ Full testing suite
- ✅ Integration testing
- ✅ Performance testing

### **PHASE 3: Production (VPS/Cloud)**
- ✅ Secure deployment
- ✅ Monitoring & maintenance
- ✅ User support

---

## 💡 **RECOMMENDATION**

**Start with GitHub Codespaces for mainnet deployment:**

```bash
# 120 hours free/tháng
# Professional environment
# Git integration
# Scalable cho team development
```

**Upgrade to VPS khi:**
- Production traffic cao
- Cần 24/7 monitoring
- Team collaboration lớn

**Bạn muốn setup GitHub Codespaces cho mainnet deployment không?** 🤔