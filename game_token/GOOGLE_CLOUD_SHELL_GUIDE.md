# ☁️ GOOGLE CLOUD SHELL - FREE DEPLOYMENT

## 🎯 **GIẢI PHÁP MIỄN PHÍ #4: GOOGLE CLOUD SHELL**

**URL:** https://shell.cloud.google.com/

**Free Tier:** 5GB storage, 50 hours/tháng

---

## 📋 **CÁC BƯỚC THỰC HIỆN**

### **BƯỚC 1: TRUY CẬP GOOGLE CLOUD SHELL**
1. Truy cập: https://shell.cloud.google.com/
2. Đăng nhập với Google account
3. Cloud Shell sẽ tự động khởi động (Ubuntu environment)

### **BƯỚC 2: UPLOAD PROJECT**
```bash
# Upload files từ local lên Cloud Shell
# Click icon "Upload file" hoặc dùng wget

# Hoặc clone từ GitHub
git clone https://github.com/YOUR_USERNAME/eneegy-main.git
cd eneegy-main/game_token
```

### **BƯỚC 3: SETUP DEVELOPMENT ENVIRONMENT**
```bash
# Cloud Shell đã có sẵn Ubuntu Linux
# Cài đặt dependencies

# Update system
sudo apt update

# Cài đặt Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

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

### **BƯỚC 4: SETUP WALLET**
```bash
# Cấu hình Solana cho devnet
solana config set --url https://api.devnet.solana.com

# Tạo wallet mới
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL cho testing
solana airdrop 2

# Kiểm tra balance
solana balance
```

### **BƯỚC 5: BUILD & DEPLOY**
```bash
# Di chuyển vào thư mục project
cd eneegy-main/game_token

# Build smart contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Lưu Program ID
solana address -k target/deploy/game_token-keypair.json
```

### **BƯỚC 6: TEST FUNCTIONALITY**
```bash
# Cài đặt Node.js dependencies
npm install

# Kiểm tra deployment
node check_program_deployment.js

# Test player claims
node player_claim_real.js YOUR_TEST_ADDRESS 30
```

---

## ✅ **ƯU ĐIỂM**
- **Hoàn toàn miễn phí** (50 hours/tháng) 🚀
- **Pre-configured Ubuntu** environment
- **Google Cloud integration**
- **Persistent storage** 5GB
- **Web-based terminal**

---

## ⚠️ **GIỚI HẠN FREE TIER**
- **50 hours/tháng** compute time
- **5GB** persistent storage
- **Session timeout** sau 1 giờ idle
- **Không thể chạy 24/7**

---

## 💡 **MẸO SỬ DỤNG**
```bash
# Kiểm tra remaining hours
# Trong Cloud Shell, xem "Compute time remaining"

# Tự động shutdown khi không dùng
# Session sẽ auto-terminate sau 1 giờ idle

# Backup important files
# Download keypair và program info về local
```

---

## 🎯 **KẾT QUẢ MONG ĐỢI**
```
✅ Cloud Shell ready
✅ Ubuntu environment configured
✅ Solana & Anchor installed
✅ Smart contract deployed
✅ Player claims working
```

---

## 📁 **FILE MANAGEMENT**
```bash
# Upload files:
# Click "Upload" icon trong Cloud Shell

# Download files:
# Click "Download" icon hoặc dùng:
curl -o local_file.txt <cloud-shell-url>

# Persistent storage:
# Files trong $HOME được lưu trữ vĩnh viễn
```


