# 🌐 GITHUB CODESPACES - FREE DEPLOYMENT

## 🎯 **GIẢI PHÁP MIỄN PHÍ #3: GITHUB CODESPACES**

**URL:** https://github.com/codespaces

**Free Tier:** 120 hours/tháng cho personal accounts

---

## 📋 **CÁC BƯỚC THỰC HIỆN**

### **BƯỚC 1: UPLOAD PROJECT LÊN GITHUB**
```bash
# Tạo repository mới trên GitHub
# Upload toàn bộ thư mục eneegy-main

# Hoặc sử dụng Git
cd /path/to/eneegy-main
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/eneegy-main.git
git push -u origin main
```

### **BƯỚC 2: TẠO CODESPACE**
1. Truy cập GitHub repository
2. Click **"Code"** button
3. Chọn tab **"Codespaces"**
4. Click **"Create codespace on main"**
5. Chọn machine type: **4-core** (free tier)

### **BƯỚC 3: SETUP DEVELOPMENT ENVIRONMENT**
```bash
# Codespace tự động setup với Ubuntu Linux

# Cài đặt Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"

# Thêm Solana vào PATH
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Cài đặt Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Thêm Anchor vào PATH
echo 'export PATH="$HOME/.avm/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### **BƯỚC 4: SETUP WALLET & CONFIG**
```bash
# Cấu hình Solana
solana config set --url https://api.devnet.solana.com

# Tạo wallet mới hoặc import existing
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL cho testing
solana airdrop 2

# Kiểm tra balance
solana balance
```

### **BƯỚC 5: BUILD & DEPLOY**
```bash
# Di chuyển vào thư mục game_token
cd game_token

# Build smart contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Lưu Program ID
solana address -k target/deploy/game_token-keypair.json
```

### **BƯỚC 6: TEST FUNCTIONALITY**
```bash
# Chạy test scripts
node check_program_deployment.js

# Test player claims
node player_claim_real.js YOUR_TEST_ADDRESS 50
```

---

## ✅ **ƯU ĐIỂM**
- **120 hours free/tháng** ⏰
- **Pre-configured Ubuntu** environment
- **VS Code trong browser** - familiar IDE
- **GitHub integration** - auto-sync
- **High performance** - cloud resources

---

## ⚠️ **GIỚI HẠN FREE TIER**
- **120 hours/tháng** cho personal accounts
- **30 hours/tháng** cho organization accounts
- **Auto-shutdown** sau 30 phút idle
- **Storage limit** 15GB

---

## 💡 **MẸO TIẾT KIỆM FREE HOURS**
```bash
# Tự động shutdown khi không dùng
# Trong Codespace settings:
# Auto-shutdown: After 30 minutes of inactivity

# Manual shutdown khi xong
# Command Palette (Ctrl+Shift+P) > Codespaces: Stop Current Codespace
```

---

## 🎯 **KẾT QUẢ MONG ĐỢI**
```
✅ Codespace created
✅ Ubuntu environment ready
✅ Solana & Anchor installed
✅ Smart contract deployed
✅ Testing successful
```

---

## 🔄 **SYNC VỚI LOCAL PROJECT**
```bash
# Thay đổi trên Codespace sẽ auto-sync về GitHub
# Pull changes về local:
git pull origin main

# Push local changes lên Codespace:
git push origin main
```


