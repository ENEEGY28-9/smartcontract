# Tích Hợp Ví Solana Vào Game

## Thông tin ví của bạn
**Địa chỉ ví:** `57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB`

## Các bước tích hợp

### 1. Kiểm tra ví (Chạy ngay)
```powershell
# Chạy script test
.\test-wallet-real.ps1
```

### 2. Nạp SOL vào ví (Nếu cần)
- Truy cập: https://faucet.solana.com/
- Hoặc nhận từ bạn bè/cá exchange
- Minimum: 0.01 SOL để test

### 3. Test wallet connection
```bash
# Frontend testing
cd client
npm run dev

# Backend testing
cd gateway
cargo run
```

### 4. Wallet Authentication Flow
1. **Connect Phantom** → Nhấn nút "Connect Phantom"
2. **Sign Message** → Phê duyệt transaction trong Phantom
3. **Auto Create Account** → Tạo user từ wallet address
4. **Game Integration** → Sử dụng SOL cho in-game purchases

### 5. In-Game Currency System
- **SOL Balance** → Hiển thị số dư thực
- **Game Rewards** → Nhận SOL khi thắng
- **Purchases** → Mua items bằng SOL
- **Leaderboard** → Ranking theo wallet balance

## Testing với ví thực

### Frontend Tests
```javascript
// Test wallet connection
const walletAddress = '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB';

// Test balance fetch
const balance = await getWalletBalance(walletAddress);

// Test authentication
const signature = await signMessage('Login to ENEEGY game');
```

### Backend Tests
```bash
# Test wallet API endpoints
curl -X POST http://localhost:8080/api/wallet/auth \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB",
    "signature": "...",
    "message": "Test message"
  }'
```

## Game Features với Wallet

### 1. Player Profile
- **Wallet Address:** `57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB`
- **SOL Balance:** Real-time từ blockchain
- **Game Stats:** Liên kết với wallet

### 2. Reward System
- **Win Rewards:** Nhận SOL khi thắng trận
- **Daily Bonus:** SOL rewards hàng ngày
- **Achievement:** Unlock SOL rewards

### 3. Marketplace
- **Buy Items:** Mua skin, weapons bằng SOL
- **Sell Items:** Đăng bán items với giá SOL
- **Trading:** Exchange giữa players

### 4. Tournament System
- **Entry Fee:** Đóng SOL để tham gia
- **Prize Pool:** Chia SOL cho winners
- **Ranking:** Leaderboard theo wallet balance

## Security Checklist
- ✅ **Signature Verification:** Xác thực owner của wallet
- ✅ **Rate Limiting:** Giới hạn requests
- ✅ **Address Validation:** Kiểm tra format Solana
- ✅ **Balance Check:** Verify SOL availability

## Next Steps
1. **Run Test Scripts** → Kiểm tra connectivity
2. **Implement UI** → Tạo wallet components
3. **Backend APIs** → Wallet authentication endpoints
4. **Game Integration** → Connect wallet to gameplay
5. **Testing** → End-to-end testing với ví thực

## Troubleshooting
- **"Wallet not found"** → Nạp SOL vào ví
- **"Signature failed"** → Kiểm tra Phantom extension
- **"Network error"** → Test internet connection
- **"Balance 0"** → Verify wallet address

---

**🎯 Mục tiêu:** Tạo game giống STEPN nhưng với wallet integration hoàn chỉnh và gameplay hấp dẫn!


