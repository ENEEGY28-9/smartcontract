# 🚀 Hướng Dẫn Build và Deploy Smart Contract với Player Claim

## 📋 Tổng quan

Smart contract đã được cập nhật với instruction mới `PlayerClaimTokens` cho phép player claim tokens trực tiếp từ game pool.

## 🔧 Bước 1: Build Smart Contract

### Trên Linux/Mac (Recommended):
```bash
cd game_token
anchor build
```

### Trên Windows (Alternative):
```bash
# Nếu anchor build không hoạt động, thử:
cargo build-sbf --manifest-path programs/game_token_v2/Cargo.toml
```

## 🚀 Bước 2: Deploy Smart Contract

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Hoặc specify program ID
anchor deploy --provider.cluster devnet --program-id Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf
```

## ✅ Bước 3: Verify Deployment

Sau khi deploy thành công, smart contract sẽ có instruction mới:

```rust
PlayerClaimTokens { amount: u64 } // Tag = 3
```

## 🎮 Bước 4: Test Player Claim

```bash
# Test claim 25 tokens
node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 25

# Test claim 50 tokens
node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 50
```

## 🔍 Chi Tiết Instruction Mới

### PlayerClaimTokens (Tag 3)

**Accounts Required:**
1. `game_pools_info` - PDA (readonly)
2. `game_pools_token_account_info` - Game pool token account (writable)
3. `player_token_account_info` - Player token account (writable)
4. `game_token_mint_info` - Token mint (readonly)
5. `token_program_info` - Token program (readonly)
6. `player_info` - Player wallet (signer)

**Logic:**
1. ✅ Verify player signature
2. ✅ Verify PDA ownership
3. ✅ Transfer tokens from game pool to player using PDA authority
4. ✅ Game pool balance decreases
5. ✅ Player balance increases
6. ✅ Player pays gas fee

## 🎯 Kết Quả Mong Đợi

```
🏦 Game Pool: 6519 → 6494 tokens (-25)
🎮 Player: 860 → 885 tokens (+25)
💸 Network Fee: ~0.000005 SOL (paid by player)
```

## ⚠️ Lưu ý Quan Trọng

1. **Smart contract phải được deploy lại** để có instruction PlayerClaimTokens
2. **Player phải có SOL** để trả gas fee
3. **Game pool phải có đủ tokens** để transfer
4. **PDA authority** được sử dụng để sign transfer

## 🛠️ Troubleshooting

### Nếu build thất bại:
```bash
# Clean and rebuild
anchor clean
anchor build
```

### Nếu deploy thất bại:
```bash
# Check wallet balance
solana balance

# Airdrop nếu cần
solana airdrop 1
```

### Nếu claim thất bại:
- Kiểm tra game pool balance
- Kiểm tra player SOL balance
- Verify smart contract deployed correctly

## 🎉 Thành Công!

Sau khi hoàn thành các bước trên, player sẽ có thể:

✅ **Claim bất kỳ số lượng tokens nào** từ game pool  
✅ **Game pool balance thực sự giảm**  
✅ **Player tự trả phí gas**  
✅ **Transactions được verify on-chain**

**Chúc mừng! Hệ thống player claim hoàn chỉnh! 🎮✨**



