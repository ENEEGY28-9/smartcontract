# 🔧 SOLANA PLAYGROUND - FIX TERMINAL & CLIENT ISSUES

## ❌ **LỖI GẶP PHẢI:**

### **Lỗi 1: Command `ls` not found**
```
Process error: Command `ls` not found.
```

### **Lỗi 2: Client wallet error**
```
Uncaught error: Cannot read properties of undefined (reading 'publicKey')
```

---

## 🚀 **GIẢI PHÁP:**

### **BƯỚC 1: KIỂM TRA CẤU TRÚC THÔNG QUA FILE EXPLORER**

**Thay vì dùng terminal, dùng file explorer:**

1. **Nhìn vào sidebar bên trái** (file explorer)
2. **Click vào mũi tên >** để mở rộng tất cả thư mục
3. **Xem có những file nào:**
   - ✅ `Anchor.toml` - Có/Không?
   - ✅ `Cargo.toml` - Có/Không?
   - ✅ `package.json` - Có/Không?
   - ✅ `src/` folder - Có/Không?
   - ✅ `tests/` folder - Có/Không?

### **BƯỚC 2: TẠO FILE Anchor.toml NẾU THIẾU**

Nếu không thấy `Anchor.toml` trong file explorer:

1. **Click chuột phải** vào vùng trống trong sidebar
2. **"New File"** → Đặt tên `Anchor.toml`
3. **Copy & paste:**

```toml
[toolchain]
anchor_version = "0.31.2"

[features]
resolution = true
skip-lint = false

[programs.devnet]
game_token = "Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf"

[programs.mainnet]
game_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[workspace]
members = ["programs/*"]

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### **BƯỚC 3: FIX WALLET/CLIENT ISSUE**

**Lỗi client.ts có thể do:**
- Wallet chưa được setup đúng
- Client code có vấn đề

**Giải pháp:**
1. **Refresh trang** (F5)
2. **Đợi wallet load** (có thể mất vài giây)
3. **Nếu vẫn lỗi, thử tạo project mới**

---

## 🎯 **THỬ LẠI DEPLOYMENT:**

### **Sau khi có đủ files:**

1. **Mở Terminal tab**
2. **Chạy:** `anchor build`
3. **Chạy:** `anchor deploy`

### **Nếu terminal vẫn lỗi:**
- Dùng **file explorer** để verify files đã tạo
- **Refresh browser** và thử lại

---

## 💡 **ALTERNATIVE: DÙNG BROWSER CONSOLE**

Nếu terminal không hoạt động, có thể dùng browser console:

1. **F12** → **Console tab**
2. Có thể thấy thêm thông tin lỗi chi tiết

---

## 📋 **BÁO LẠI CHO TÔI:**

**Kết quả kiểm tra file explorer:**

```
✅ Anchor.toml - Có/Không?
✅ Cargo.toml - Có/Không?
✅ src/lib.rs - Có/Không?
✅ tests/anchor.test.ts - Có/Không?
```

**🎯 GỬI KẾT QUẢ ĐỂ TIẾP TỤC!** 🚀

