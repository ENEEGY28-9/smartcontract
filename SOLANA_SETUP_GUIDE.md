# 🚀 Hướng Dẫn Setup Solana Real Token Transfer

## 📋 Yêu Cầu

### 1. Solana CLI Tools
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

### 2. Generate Game Pool Owner Wallet
```bash
# Create new keypair for game pool owner
solana-keygen new --outfile game-pool-owner.json

# Get public key (this will be GAME_POOL_ACCOUNT)
solana-keygen pubkey game-pool-owner.json

# Get private key (this will be GAME_POOL_OWNER_PRIVATE_KEY)
solana-keygen grind --ignore-case --ends-with <DESIRED_SUFFIX>:1 --output game-pool-owner.json
```

### 3. Fund Game Pool Account (Devnet)
```bash
# Airdrop SOL to game pool account
solana airdrop 2 <GAME_POOL_ACCOUNT_PUBKEY>

# Check balance
solana balance <GAME_POOL_ACCOUNT_PUBKEY>
```

### 4. Setup Game Token
```bash
# Create token mint (if not exists)
spl-token create-token --decimals 9

# Note: Use existing token mint: 2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK
GAME_TOKEN_MINT=2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK

# Create associated token account for game pool
spl-token create-account $GAME_TOKEN_MINT --owner game-pool-owner.json

# Mint initial tokens to game pool (10,000 tokens)
spl-token mint $GAME_TOKEN_MINT 10000000000000 <GAME_POOL_TOKEN_ACCOUNT> --owner game-pool-owner.json

# Check game pool token balance
spl-token balance $GAME_TOKEN_MINT --owner <GAME_POOL_ACCOUNT>
```

### 5. Environment Variables

Tạo file `gateway/.env`:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Game Token Configuration
GAME_TOKEN_MINT=2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK
GAME_POOL_ACCOUNT=<YOUR_GAME_POOL_PUBKEY>

# Game Pool Owner Private Key (base58 format)
GAME_POOL_OWNER_PRIVATE_KEY=<YOUR_GAME_POOL_PRIVATE_KEY>

# Token Configuration
TOKEN_DECIMALS=9

# Other configurations...
SERVICES_URL=http://localhost:3001
```

## 🔧 Build và Test

### 1. Build Gateway
```bash
cd gateway
cargo build --release
```

### 2. Run Gateway
```bash
cargo run
```

### 3. Test Real Transfer

**Test với Postman/cURL:**
```bash
curl -X POST "http://localhost:8080/api/energies/claim-to-wallet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -d '{
    "amount": 100,
    "user_wallet": "<USER_SOLANA_WALLET_ADDRESS>"
  }'
```

**Kiểm tra transaction trên Solana Explorer:**
```
https://explorer.solana.com/address/<GAME_POOL_ACCOUNT>?cluster=devnet
https://explorer.solana.com/address/<USER_WALLET>?cluster=devnet
```

## 🛡️ Security Notes

1. **Private Key Management**: Không bao giờ hardcode private key trong code
2. **Environment Variables**: Sử dụng secret management service (AWS KMS, HashiCorp Vault)
3. **Network Isolation**: Game pool owner key chỉ dùng cho transfer, không dùng cho signing user transactions
4. **Balance Monitoring**: Theo dõi balance của game pool account
5. **Rate Limiting**: Giới hạn số lượng claim per user/time

## 🎯 Flow Hoạt Động

1. **User Claim**: Gửi request với Solana wallet address
2. **Validation**: Check wallet format và connectivity
3. **Balance Check**: Verify game pool có đủ tokens
4. **Transfer**: Tạo Solana transaction transfer từ game pool → user wallet
5. **Auto-create ATA**: Tự động tạo associated token account nếu chưa có
6. **Confirmation**: Đợi transaction confirmation
7. **Database Update**: Trừ energy từ user account
8. **Response**: Trả về transaction signature

## 🚨 Troubleshooting

### Lỗi: "Invalid Solana address format"
- Đảm bảo wallet address là base58 encoded, 32-44 characters

### Lỗi: "Insufficient game pool balance"
- Mint thêm tokens vào game pool account

### Lỗi: "Transaction failed"
- Check SOL balance của game pool owner
- Verify network connectivity
- Check transaction logs

### Lỗi: "Associated token account not found"
- System sẽ tự động tạo ATA, nhưng cần SOL để pay rent

## ✅ Checklist Before Production

- [ ] Solana CLI installed and configured
- [ ] Game pool owner keypair generated securely
- [ ] Game pool account funded with SOL
- [ ] Game token minted to game pool
- [ ] Environment variables configured
- [ ] Gateway builds without errors
- [ ] Test transactions work on devnet
- [ ] Balance monitoring setup
- [ ] Error handling tested
- [ ] Rate limiting implemented
