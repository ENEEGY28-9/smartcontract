# Ethereum Wallet Test - Hướng Dẫn Tiếng Việt

## 🚨 VẤN ĐỀ CỦA BẠN
- Tool cũ chỉ hỗ trợ **Solana** wallet
- Địa chỉ Ethereum `0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2` bị báo **INVALID**
- Lỗi: "Solana addresses use alphanumeric characters only"

## ✅ GIẢI PHÁP
Đã tạo tool mới **chuyên cho Ethereum**!

## 📁 FILE CẦN MỞ
```
C:\Users\Fit\Downloads\eneegy-main\client\ethereum-wallet-test.html
```

## 🚀 CÁCH MỞ (3 cách)

### Cách 1: Click file batch (Dễ nhất)
```cmd
# Double-click file này:
client\open-ethereum-test-simple.bat
```

### Cách 2: Copy URL vào browser
```
file://C:/Users/Fit/Downloads/eneegy-main/client/ethereum-wallet-test.html
```

### Cách 3: Local server (Nếu cách 2 không hoạt động)
```cmd
cd client
python3 -m http.server 8000
# Mở: http://localhost:8000/ethereum-wallet-test.html
```

## 🎯 TEST ĐỊA CHỈ CỦA BẠN

1. **Mở tool** theo hướng dẫn trên
2. **Địa chỉ đã được điền sẵn**: `0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2`
3. **Click "🔍 Test Address"** để kiểm tra
4. **Kết quả sẽ hiển thị**:
   - ✅ Validation: Valid Ethereum Address
   - 💰 Balance: ... ETH
   - 🌐 Network: Ethereum Mainnet

## 📋 SO SÁNH

| | Tool Cũ (Solana) | Tool Mới (Ethereum) |
|---|---|---|
| **Wallet** | Phantom | MetaMask |
| **Địa chỉ** | Base58 (không có 0x) | 0x... (42 ký tự) |
| **Tiền tệ** | SOL | ETH |
| **Network** | Solana | Ethereum |

## 🔧 CÀI ĐẶT METAMASK
1. Tải: https://metamask.io/
2. Tạo hoặc import ví
3. Connect với tool để kiểm tra balance

## ❓ KHẮC PHỤC LỖI

### "MetaMask not found"
- Cài MetaMask extension
- Refresh trang

### "Invalid format"
- Đảm bảo địa chỉ bắt đầu bằng "0x"
- Đúng 42 ký tự
- Chỉ chứa 0-9, a-f, A-F

### Không mở được file
- Copy URL vào Chrome/Firefox
- Hoặc dùng local server

## 📞 ĐỊA CHỈ TEST
```
0x47F0350df3E06c1bBD1Fd1dc86ab12ae772BF2A2
```

**✅ Format**: Hợp lệ cho Ethereum
**❌ Format**: Không hợp lệ cho Solana (vì có "0x" và ký tự hex)

Tool mới sẽ hoạt động hoàn hảo với địa chỉ này! 🎉
