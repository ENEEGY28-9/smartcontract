# Ethereum Wallet Test Tool

## Mục đích
Tool này được tạo để test kết nối với ví Ethereum (MetaMask) thay vì Solana như tool cũ.

## Vấn đề đã giải quyết
- **Trước đây**: Tool chỉ hỗ trợ Solana wallet với format địa chỉ base58
- **Bây giờ**: Tool hỗ trợ Ethereum wallet với format địa chỉ 0x...

## Tính năng
- ✅ Kết nối với MetaMask wallet
- ✅ Kiểm tra balance ETH
- ✅ Test địa chỉ Ethereum tùy chỉnh
- ✅ Validation format địa chỉ Ethereum (0x...)
- ✅ Hiển thị thông tin network (Mainnet, Testnet)
- ✅ Kiểm tra loại tài khoản (External/Smart Contract)

## Cách sử dụng

### 1. Mở file
```
file://C:/Users/Fit/Downloads/eneegy-main/client/ethereum-wallet-test.html
```

Hoặc chạy local server:
```bash
cd client
python3 -m http.server 8000
# Sau đó mở: http://localhost:8000/ethereum-wallet-test.html
```

### 2. Cài đặt MetaMask
- Tải từ: https://metamask.io/
- Tạo hoặc import ví Ethereum

### 3. Test với địa chỉ của bạn
- Mở tool trong browser
- Địa chỉ của bạn đã được điền sẵn: `0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2`
- Click "🔍 Test Address" để kiểm tra

### 4. Kết nối ví đầy đủ
- Click "🔗 Connect MetaMask"
- Phê duyệt kết nối
- Kiểm tra balance và thông tin

## So sánh với Solana Tool

| Tính năng | Solana Tool | Ethereum Tool |
|-----------|-------------|---------------|
| Wallet | Phantom | MetaMask |
| Address Format | Base58 | 0x... (Hex) |
| Currency | SOL | ETH |
| Network | Solana | Ethereum |
| Validation | Base58 regex | 0x[a-fA-F0-9]{40} |

## Địa chỉ test của bạn
```
0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
```

**Format**: ✅ Hợp lệ (42 ký tự, bắt đầu bằng 0x)
**Network**: Ethereum Mainnet
**Validation**: Đã pass format check

## Troubleshooting

### Lỗi "MetaMask not found"
- Cài đặt MetaMask extension
- Refresh trang
- Kiểm tra extension đã enable

### Lỗi "Invalid address format"
- Đảm bảo địa chỉ bắt đầu bằng "0x"
- Đảm bảo đúng 42 ký tự
- Chỉ chứa các ký tự hex (0-9, a-f, A-F)

### Lỗi kết nối
- Kiểm tra MetaMask đã unlock
- Thử refresh trang
- Kiểm tra network connection

## Technical Details

- **Web3.js**: Version 1.8.1
- **Network**: Ethereum Mainnet (ID: 1)
- **Address Length**: 42 characters (including 0x)
- **Checksum**: EIP-55 validation

## Support
Nếu vẫn gặp vấn đề, thử:
1. Clear browser cache
2. Restart MetaMask
3. Use different browser (Chrome recommended)
4. Check console for detailed errors
