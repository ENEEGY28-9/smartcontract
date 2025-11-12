# 🎮 Player Token Claim System

Hệ thống cho phép người chơi claim tokens từ game pool với số lượng tùy ý, và tự trả phí gas.

## 📋 Tổng quan

- **Game Pool**: https://explorer.solana.com/address/HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq?cluster=devnet
- **Player Token Account**: `qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki`
- **Smart Contract Behavior**: Mint tokens trực tiếp cho player (simulation)
- **Fees**: Player tự trả phí network (~0.000005 SOL per claim)

## 🚀 Cách sử dụng

### 1. Claim Tokens qua Command Line

```bash
# Claim 50 tokens
node player_claim_tokens.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 50

# Claim 100 tokens
node player_claim_tokens.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 100

# Claim 10 tokens
node player_claim_tokens.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 10
```

### 2. Demo Multiple Claims

```bash
node claim_demo.js
```

Demo sẽ claim: 10 → 50 → 100 → 5 tokens

### 3. Game Integration API

```javascript
const { createClaimAPI } = require('./claim_demo');

const claimAPI = createClaimAPI();

// Claim tokens
const result = await claimAPI.claimTokens(playerPublicKey, amount);
if (result.success) {
    console.log('Claimed:', result.data.amount, 'tokens');
    console.log('New balance:', result.data.newBalance, 'tokens');
    console.log('Fee paid:', result.data.fee, 'SOL');
}

// Get claim history
const history = claimAPI.getClaimHistory(playerPublicKey);
console.log('Claim history:', history);
```

## 📊 Kết quả Demo

```
🎯 CLAIMING 10 TOKENS...
✅ SUCCESS: Claimed 10 tokens
💰 New Balance: 675 tokens
💸 Network Fee: ~0.000005 SOL

🎯 CLAIMING 50 TOKENS...
✅ SUCCESS: Claimed 50 tokens
💰 New Balance: 725 tokens
💸 Network Fee: ~0.000005 SOL

🎯 CLAIMING 100 TOKENS...
✅ SUCCESS: Claimed 100 tokens
💰 New Balance: 825 tokens
💸 Network Fee: ~0.000005 SOL

🎯 CLAIMING 5 TOKENS...
✅ SUCCESS: Claimed 5 tokens
💰 New Balance: 830 tokens
💸 Network Fee: ~0.000005 SOL
```

## 🔧 Smart Contract Logic

1. **Verify Player**: Kiểm tra player token account tồn tại
2. **Check Balance**: Đảm bảo game pool có đủ tokens
3. **Mint Tokens**: Mint trực tiếp cho player (smart contract simulation)
4. **Record Transaction**: Lưu lịch sử claim
5. **Fee Payment**: Player trả phí network

## 💰 Balance Tracking

- **Game Pool**: Luôn giữ nguyên (6519 tokens) - reserve pool
- **Player Balance**: Tăng theo số tokens claim
- **Total Supply**: Tăng khi mint tokens mới

## 📋 Claim Records

Tất cả claims được lưu trong `player_claim_records.json`:

```json
{
  "player": "qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki",
  "claimAmount": 100,
  "balances": {
    "before": {"gamePool": 6519, "player": 725},
    "after": {"gamePool": 6519, "player": 825}
  },
  "signature": "transaction_signature",
  "fee": 0.000005,
  "timestamp": "2025-11-10T08:16:00.000Z",
  "method": "Smart Contract Claim Simulation"
}
```

## 🌐 Explorer Links

- **Game Pool**: https://explorer.solana.com/address/HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq?cluster=devnet
- **Player Account**: https://explorer.solana.com/address/qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki?cluster=devnet
- **Token Mint**: https://explorer.solana.com/address/ANzKnYDd7BpiPEykuHxrfAsiox19aWzLbZrmQbL8J8Qk?cluster=devnet

## ⚠️ Lưu ý

- Player phải có SOL trong ví để trả phí gas
- Game pool balance được check trước mỗi claim
- Tất cả transactions được confirm trên Solana Devnet
- Claim history được lưu trữ local

## 🎯 Next Steps

1. **Deploy Real Smart Contract**: Tạo smart contract Rust thật sự
2. **Multi-Player Support**: Hỗ trợ nhiều player khác nhau
3. **Claim Limits**: Thêm rate limiting và daily limits
4. **UI Integration**: Tích hợp vào game frontend
5. **Mainnet Deployment**: Chuyển lên mainnet khi ready



