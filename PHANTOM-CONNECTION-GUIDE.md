# 🚀 HƯỚNG DẪN KẾT NỐI PHANTOM WALLET

## 📊 TRẠNG THÁI HIỆN TẠI

✅ **Development Server**: Đang chạy trên `http://localhost:5176`
✅ **Phantom Extension**: Đã được cài đặt và detect thành công
❌ **Connection Status**: Chưa kết nối (Not connected)
❌ **Auto-connect**: Đã thử 10 lần và thất bại

## 🔧 CÁC BƯỚC CẦN THỰC HIỆN

### **Bước 1: Cấu hình Phantom Wallet**
1. **Click vào Phantom extension** trong Chrome (biểu tượng cáo)
2. **Đảm bảo wallet đã unlock** (nhập password nếu cần)
3. **Chuyển sang Devnet**:
   - Click vào dropdown network (thường hiển thị "Mainnet")
   - Chọn **"Devnet"** (không phải Mainnet)
   - Nếu không thấy Devnet, vào Settings > Developer > Testnet Mode: ON

### **Bước 2: Truy cập đúng URL**
```
🌐 URL chính xác: http://localhost:5176/wallet-test
```
**Lưu ý**: Server đang chạy trên port 5176, không phải 5173

### **Bước 3: Kết nối Wallet**
1. **Click nút "Connect Wallet"** màu xanh
2. **Một popup sẽ xuất hiện** từ Phantom
3. **Click "Approve"** hoặc "Connect" trong popup
4. **Đợi connection hoàn tất**

### **Bước 4: Kiểm tra kết quả**
- Connection Status sẽ chuyển thành ✅ **Connected**
- Balance sẽ hiển thị số SOL (có thể là 0 nếu chưa có)
- Address sẽ hiển thị public key của wallet

## 🔍 TROUBLESHOOTING

### **"Connection rejected by user"**
- ✅ Click "Connect Wallet" lần nữa
- ✅ Approve trong Phantom popup
- ✅ Đảm bảo popup không bị chặn

### **"Wallet is locked"**
- ✅ Unlock Phantom wallet trước
- ✅ Nhập password để mở khóa

### **"Network error"**
- ✅ Đảm bảo Phantom đang ở Devnet
- ✅ Kiểm tra internet connection

### **"Phantom wallet not ready"**
- ✅ Restart Phantom extension
- ✅ Refresh trang web
- ✅ Try lại

## 🧪 TEST URLs

1. **Main Wallet Test**: http://localhost:5176/wallet-test
2. **Phantom Connection Test**: http://localhost:5176/test-phantom-connection.html
3. **Debug Console**: http://localhost:5176/debug-wallet.js

## 💡 DEBUGGING TOOLS

### **Browser Console**
- Press F12 → Console tab
- Tìm các log messages bắt đầu với 🔗, ✅, ❌
- Copy error messages để debug

### **Phantom Debug Info**
- Click nút **"Debug Info"** trên trang test
- Click nút **"Diagnose Wallet"** để kiểm tra chi tiết

## ⚠️ LƯU Ý QUAN TRỌNG

1. **HTTPS vs HTTP**: Một số wallet features yêu cầu HTTPS
2. **Network Mismatch**: Phải cùng ở Devnet
3. **Multiple Wallets**: Disable other wallet extensions nếu có
4. **Browser Cache**: Clear cache nếu có vấn đề persistent

## 🚨 KIỂM TRA PHANTOM WALLET

**Trong Phantom Extension:**
1. Wallet phải **unlock** ✅
2. Network phải là **Devnet** ✅
3. Balance hiển thị **0 SOL** (normal cho devnet)
4. Public key hiển thị đầy đủ ✅

**Nếu vẫn không được:**
1. Restart Chrome browser
2. Disable other wallet extensions
3. Clear browser cache
4. Try với incognito mode

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi kết nối thành công:
- ✅ Connection Status: Connected
- ✅ Balance: 0.0000 SOL (devnet)
- ✅ Address: Hiển thị public key đầy đủ
- ✅ Network: Solana Devnet
- ✅ All tests: PASS

---

**Bắt đầu từ Bước 1 và làm theo thứ tự nhé!** 🚀

