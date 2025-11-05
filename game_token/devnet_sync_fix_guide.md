# 🚀 DEVNET SYNC FIX GUIDE

## 🎯 Vấn đề hiện tại:
- ❌ Smart contract chưa deploy lên devnet
- ❌ PDA accounts missing
- ❌ Không thể test logic mới (100 tokens/phút)

## 🔧 Giải pháp từng bước:

### Bước 1: Fix Build Environment

#### Option A: Fix Rust/Cargo Environment
```bash
# Check current environment
echo $HOME
echo $USERPROFILE

# Set environment variables
export HOME=/c/Users/YourUsername
export USERPROFILE=/c/Users/YourUsername

# Try build again
anchor build
```

#### Option B: Use WSL (Recommended)
```bash
# Install WSL2
wsl --install

# In WSL, install Solana tools
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Anchor
npm i -g @coral-xyz/anchor-cli

# Clone and build in WSL
git clone <your-repo>
cd game_token
anchor build
anchor deploy --provider.cluster devnet
```

### Bước 2: Deploy Smart Contract

#### Method 1: Anchor CLI (Sau khi fix environment)
```bash
cd game_token
anchor build
anchor deploy --provider.cluster devnet
```

#### Method 2: Manual Deploy (Nếu Anchor không work)
```javascript
// Chạy script deploy manual
node manual_deploy_devnet.js
```

### Bước 3: Initialize PDA Accounts

Sau khi deploy thành công, chạy:
```javascript
// Initialize PDAs
node deploy_new_logic_devnet.js
```

### Bước 4: Test New Logic

```javascript
// Test 100 tokens per minute
node auto_mint_scheduler.js
```

### Bước 5: Verify Results

Check trên Solana Explorer:
```
https://explorer.solana.com/?cluster=devnet

Verify:
✅ Mint 100 tokens
✅ Owner: +20 tokens
✅ Game Pool: +80 tokens
✅ 80/20 distribution
```

## 🎯 Expected Results After Sync:

### Logic Mới (100 tokens/phút):
```
⏰ Mỗi phút:
   🎲 Mint: 100 tokens
   👤 Owner: +20 tokens (20%)
   🏦 Game Pool: +80 tokens (80%)

💰 Revenue:
   📈 Per minute: 20 tokens
   📈 Per hour: 1,200 tokens
   📈 Per day: 28,800 tokens
   📈 Per month: 864,000 tokens
```

### Devnet Status:
```
✅ Smart contract: Deployed
✅ PDA accounts: Initialized
✅ Token accounts: Ready
✅ Logic: 100 tokens/minute
✅ Distribution: 80/20 verified
```

## 🚨 Troubleshooting:

### Nếu build vẫn fail:
1. Check Rust version: `rustc --version`
2. Update Cargo: `cargo update`
3. Clean build: `anchor clean && anchor build`

### Nếu deploy fail:
1. Check SOL balance: `solana balance`
2. Airdrop nếu cần: `solana airdrop 2`
3. Check network: `solana config get`

### Nếu PDA init fail:
1. Verify program ID đúng
2. Check PDA addresses
3. Manual PDA creation nếu cần

## 🎉 Success Criteria:

- ✅ `anchor build` thành công
- ✅ `anchor deploy --provider.cluster devnet` thành công
- ✅ PDA accounts tồn tại
- ✅ `auto_mint_scheduler.js` chạy được
- ✅ Balance thay đổi: Owner +20, Game Pool +80
- ✅ Transaction trên Solana Explorer confirm 80/20 split

## 💡 Quick Test Commands:

```bash
# 1. Build
anchor build

# 2. Deploy
anchor deploy --provider.cluster devnet

# 3. Check program
solana program show Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe

# 4. Test mint
node auto_mint_scheduler.js

# 5. Check balances
spl-token balance [OWNER_TOKEN_ACCOUNT]
spl-token balance [GAME_POOL_TOKEN_ACCOUNT]
```

## 🎯 Final Goal:
**Devnet hoàn toàn sync với logic mới: 100 tokens/phút, 80/20 distribution, Owner nhận 20 tokens mỗi phút!** 🚀💎
