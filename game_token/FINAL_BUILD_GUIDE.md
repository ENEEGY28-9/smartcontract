# 🚀 HƯỚNG DẪN BUILD & DEPLOY SMART CONTRACT - PLAYER CLAIM SYSTEM

## 📋 Tình trạng hiện tại

✅ **Smart contract code đã sẵn sàng** với instruction `PlayerClaimTokens` (tag 3)  
✅ **Client JavaScript đã sẵn sàng** để test  
❌ **Build thất bại** trên Windows do environment setup  

## 🎯 3 Cách để Build & Deploy

### **PHƯƠNG PHÁP 1: Docker (Khuyên dùng)**

```bash
# Build smart contract
docker run --rm -v "$(pwd)":/workdir -w /workdir projectserum/build:latest anchor build

# Deploy to devnet
docker run --rm -v "$(pwd)":/workdir -w /workdir -v ~/.config/solana:/root/.config/solana projectserum/build:latest anchor deploy --provider.cluster devnet
```

### **PHƯƠNG PHÁP 2: Linux/Mac Environment**

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build and deploy
cd game_token
anchor build
anchor deploy --provider.cluster devnet
```

### **PHƯƠNG PHÁP 3: WSL (Windows Subsystem for Linux)**

```bash
# Install WSL
wsl --install

# Trong WSL terminal:
cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token
anchor build
anchor deploy --provider.cluster devnet
```

## ✅ Kiểm tra Build thành công

Sau khi build, kiểm tra:
```bash
ls -la target/deploy/
# Should see: game_token_v2.so
```

## 🚀 Deploy lên Devnet

```bash
anchor deploy --provider.cluster devnet
```

**Expected output:**
```
Deploying workspace: https://api.devnet.solana.com
Upgrade authority: <your_wallet>
Deploy success
Program ID: Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf
```

## 🎮 Test Player Claim System

Sau khi deploy thành công:

```bash
# Test claim 25 tokens
node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 25

# Test claim 50 tokens
node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 50
```

## 📊 Kết quả mong đợi

```
🏦 Game Pool: 6519 → 6494 tokens (-25) ✅
🎮 Player: 860 → 885 tokens (+25) ✅
💸 Network Fee: ~0.000005 SOL ✅
```

## 🔧 Troubleshooting

### Build thất bại:
```bash
# Clean and retry
anchor clean
anchor build
```

### Deploy thất bại:
```bash
# Check wallet balance
solana balance

# Airdrop nếu cần
solana airdrop 1
```

### Claim thất bại:
- Kiểm tra game pool balance > claim amount
- Kiểm tra player có SOL để trả gas
- Verify smart contract deployed correctly

## 📋 Files đã tạo:

1. **`programs/game_token_v2/src/lib.rs`** - Smart contract với PlayerClaimTokens
2. **`player_claim_real.js`** - Client để claim tokens
3. **`BUILD_AND_DEPLOY_GUIDE.md`** - Hướng dẫn chi tiết
4. **`simple_build_deploy.bat`** - Script build cho Windows

## 🎯 Next Steps:

1. **Build smart contract** bằng một trong 3 phương pháp trên
2. **Deploy lên devnet**
3. **Test player claim** với số lượng tùy ý
4. **Verify** game pool balance thực sự giảm
5. **Deploy lên mainnet** khi ready

---

## 🎉 KẾT QUẢ CUỐI CÙNG

Sau khi hoàn thành, hệ thống sẽ có:

✅ **Player claim tokens** với số lượng tùy ý  
✅ **Game pool balance giảm** thực sự  
✅ **Player balance tăng** thực sự  
✅ **Player trả gas fee**  
✅ **Transactions on-chain** và verifiable  

**Smart contract hoàn chỉnh với player claim system! 🎮✨**



