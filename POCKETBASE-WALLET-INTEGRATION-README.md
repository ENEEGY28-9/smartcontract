# PocketBase Wallet Integration

Tính năng tích hợp PocketBase đã được thêm vào trang wallet test để lưu trữ và quản lý thông tin wallet.

## 🚀 Cài đặt và Chạy

### 1. Khởi động PocketBase Server

PocketBase server đã được cấu hình và sẵn sàng chạy:

```bash
# Từ thư mục gốc của dự án
cd pocketbase
./pocketbase serve --http="0.0.0.0:8090"
```

Hoặc sử dụng script có sẵn:
```bash
./start-pocketbase.bat
```

### 2. Khởi động Wallet Test

```bash
# Từ thư mục gốc của dự án
npm run dev:client
```

Mở trình duyệt và truy cập: http://localhost:5173/wallet-test

## 📋 Tính năng đã tích hợp

### ✅ Đã hoàn thành:

1. **PocketBase Service** - Service để kết nối và quản lý dữ liệu wallet
2. **Database Schema** - Schema cho wallet và user collections
3. **Authentication** - Đăng nhập/đăng ký người dùng
4. **Wallet Storage** - Lưu thông tin wallet vào database
5. **Wallet History UI** - Giao diện hiển thị lịch sử wallet
6. **Auto-save** - Tự động lưu wallet khi kết nối hoặc tạo mới

## 🎯 Cách sử dụng

### 1. Đăng nhập/Đăng ký

- Sử dụng component **PocketBase Authentication** ở đầu trang
- Đăng ký tài khoản mới hoặc đăng nhập với tài khoản có sẵn
- Admin user mặc định: `admin@example.com` / `admin123456`

### 2. Kết nối Wallet

Khi kết nối wallet (MetaMask, Phantom, Bitcoin), thông tin sẽ được tự động lưu vào PocketBase:

```javascript
// Ví dụ: Kết nối MetaMask
await connectToWallet(); // Tự động lưu vào PocketBase
```

### 3. Tạo Wallet mới

Khi tạo wallet mới, tất cả thông tin (private key, mnemonic, addresses) sẽ được lưu:

```javascript
// Tạo multi-network wallet
await createNewWallet(); // Tự động lưu vào PocketBase
```

### 4. Xem lịch sử Wallet

- Click nút **"Show History"** trong section "Wallet History"
- Xem danh sách tất cả wallet đã lưu
- Click **"Select"** để chọn wallet
- Click **"Delete"** để xóa wallet

## 🗄️ Database Structure

### Users Collection
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "avatar": "file",
  "created": "datetime",
  "updated": "datetime"
}
```

### Wallets Collection
```json
{
  "id": "string",
  "user_id": "relation to users",
  "address": "string (required)",
  "private_key": "string (encrypted)",
  "mnemonic": "string (encrypted)",
  "wallet_type": "select (metamask, phantom, generated, bitcoin, other)",
  "network": "select (ethereum, solana, bitcoin)",
  "balance": "number",
  "balance_last_updated": "datetime",
  "is_connected": "boolean",
  "notes": "string",
  "created": "datetime",
  "updated": "datetime"
}
```

## 🔐 Bảo mật

- **Authentication**: Chỉ user đã đăng nhập mới xem được wallet của mình
- **Encryption**: Private keys và mnemonics được lưu encrypted
- **Access Control**: Rules đảm bảo user chỉ truy cập được data của mình
- **Validation**: Address validation cho từng network

## 🛠️ API Endpoints

PocketBase service cung cấp các methods sau:

```javascript
// Authentication
await pocketbaseService.authenticate(email, password);
await pocketbaseService.register(email, password, userData);

// Wallet Management
await pocketbaseService.createWallet(walletData);
await pocketbaseService.getUserWallets();
await pocketbaseService.getWalletByAddress(address, network);
await pocketbaseService.updateWalletBalance(id, balance);
await pocketbaseService.deleteWallet(id);
```

## 🧪 Testing

### Test Database Connection
```bash
# Kiểm tra kết nối
curl http://localhost:8090/api/health
```

### Test Collections
```bash
# List collections
curl http://localhost:8090/api/collections

# Test wallet creation (cần auth)
curl -X POST http://localhost:8090/api/collections/wallets/records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123...", "network":"ethereum", "wallet_type":"metamask"}'
```

## 🔧 Troubleshooting

### PocketBase không chạy
```bash
# Kiểm tra process
ps aux | grep pocketbase

# Restart server
pkill pocketbase
./pocketbase serve --http="0.0.0.0:8090"
```

### Lỗi Authentication
- Kiểm tra email/password
- Reset password trong admin panel
- Tạo user mới

### Lỗi Database Connection
- Kiểm tra PocketBase có chạy không: http://localhost:8090/_/
- Kiểm tra firewall settings
- Thử restart cả client và server

### Collections không tồn tại
- Chạy lại script tạo collections: `node create-collections.js`
- Hoặc tạo manual trong admin panel

## 📁 File Structure

```
client/src/lib/
├── services/
│   ├── pocketbaseService.ts      # PocketBase API service
│   └── createWalletCollection.js # Script tạo collections
├── components/
│   └── PocketBaseAuth.svelte     # Authentication component
└── config/
    └── pocketbase-config.ts      # Configuration

wallet-collection-schema.json     # Database schema
setup-wallet-collection.ps1      # PowerShell setup script
create-collections.js            # Node.js setup script
```

## 🎉 Tính năng đã sẵn sàng!

PocketBase integration đã hoàn thành và sẵn sàng sử dụng:

1. ✅ PocketBase server chạy trên port 8090
2. ✅ Collections đã được tạo (users, wallets)
3. ✅ Authentication system hoạt động
4. ✅ Wallet data được lưu tự động
5. ✅ UI hiển thị lịch sử wallet
6. ✅ Multi-network support (ETH, SOL, BTC)

Bây giờ bạn có thể:
- Đăng nhập vào hệ thống
- Kết nối wallet (sẽ được lưu)
- Tạo wallet mới (sẽ được lưu)
- Xem lịch sử tất cả wallet
- Quản lý wallet (select, delete)
