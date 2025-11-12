# 🔧 WSL2 FIX - FREE DEPLOYMENT SOLUTION

## 🎯 **GIẢI PHÁP MIỄN PHÍ #2: WSL2 VỚI SETUP ĐÚNG**

**Vấn đề trước:** WSL không hoạt động đúng → "Catastrophic failure"
**Giải pháp:** Setup WSL2 đúng cách từ đầu

---

## 📋 **CÁC BƯỚC THỰC HIỆN**

### **BƯỚC 1: RESET WSL (QUAN TRỌNG)**
```powershell
# Chạy PowerShell với quyền Administrator

# Dừng WSL
wsl --shutdown

# Hủy đăng ký distribution hiện tại
wsl --unregister Ubuntu

# Cài đặt lại Ubuntu 22.04
wsl --install -d Ubuntu-22.04

# Khởi động WSL
wsl
```

### **BƯỚC 2: SETUP UBUNTU TRONG WSL**
```bash
# Cập nhật system
sudo apt update && sudo apt upgrade -y

# Cài đặt dependencies cần thiết
sudo apt install -y curl wget git build-essential pkg-config libudev-dev

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

### **BƯỚC 3: COPY PROJECT VÀO WSL**
```bash
# Từ Windows PowerShell, copy project vào WSL
# (thay YOUR_USERNAME bằng username WSL của bạn)
cp -r /mnt/c/Users/Fit/Downloads/eneegy-main/game_token /home/YOUR_USERNAME/

# Hoặc từ trong WSL
cp -r /mnt/c/Users/Fit/Downloads/eneegy-main/game_token ~/
```

### **BƯỚC 4: SETUP WALLET**
```bash
# Cấu hình Solana cho devnet
solana config set --url https://api.devnet.solana.com

# Copy wallet từ Windows
cp /mnt/c/Users/Fit/.config/solana/id.json ~/.config/solana/

# Kiểm tra balance
solana balance
```

### **BƯỚC 5: BUILD & DEPLOY TỪ WSL**
```bash
# Di chuyển vào thư mục project
cd ~/game_token

# Build smart contract
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Kiểm tra deployment
node check_program_deployment.js
```

---

## ✅ **ƯU ĐIỂM**
- **Hoàn toàn miễn phí** 🚀
- **Không cần cài đặt gì thêm**
- **Same machine** - không cần upload
- **Full control** với local environment

---

## 🔧 **XỬ LÝ LỖI THƯỜNG GẶP**

### **Lỗi: "Catastrophic failure"**
```bash
# Reset WSL hoàn toàn
wsl --shutdown
wsl --unregister Ubuntu
wsl --install -d Ubuntu-22.04
```

### **Lỗi: "command not found"**
```bash
# Source lại PATH
source ~/.bashrc
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.avm/bin:$PATH"
```

### **Lỗi: Network connection**
```bash
# Thử khác RPC endpoint
solana config set --url https://devnet.solana.com
```

---

## 🎯 **KẾT QUẢ MONG ĐỢI**
```
✅ WSL Ubuntu 22.04 working
✅ Solana CLI installed
✅ Anchor installed
✅ Smart contract deployed
✅ Player claims working
```


