# 🔧 FIX: Build error: InvalidFile

## ❌ **LỖI: InvalidFile VẪN XUẤT HIỆN**

**Ngay cả dùng GUI button vẫn lỗi. Nguyên nhân: file Anchor.toml không đúng định dạng TOML.**

---

## 🚀 **GIẢI PHÁP:**

### **BƯỚC 1: XÓA VÀ TẠO LẠI Anchor.toml**

1. **Trong file explorer, click chuột phải** vào `Anchor.toml`
2. **Chọn "Delete"** để xóa file cũ
3. **Tạo file mới:**
   - Click chuột phải vào vùng trống
   - "New File" → Đặt tên `Anchor.toml`
   - **Copy chính xác** nội dung sau:

```toml
[toolchain]
anchor_version = "0.31.2"

[features]
resolution = true
skip-lint = false

[programs.devnet]
game_token = "3ykyYQXoQLLV3a5VfX3ocvMrJA7Go4GXkkJatd7iYUfT"

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

### **BƯỚC 2: VERIFY FILE**

**Click vào file `Anchor.toml` vừa tạo:**
- Đảm bảo **không có lỗi syntax highlighting**
- Nội dung **đầy đủ và chính xác**

### **BƯỚC 3: REFRESH BROWSER**

1. **Nhấn F5** để refresh
2. **Đợi wallet reconnect**
3. **Thử build lại**

---

## 🎯 **NẾU VẪN LỖI:**

### **TÙY CHỌN A: TẠO PROJECT MỚI**

1. **Vào:** https://beta.solpg.io/
2. **"Create a new project"**
3. **"Anchor (Rust)"**
4. **Đặt tên:** `game_token_final`
5. **Thay thế code Rust**
6. **Tạo Anchor.toml**

### **TÙY CHỌN B: CHECK BROWSER CONSOLE**

1. **F12** → **Console tab**
2. **Xem lỗi chi tiết** về InvalidFile
3. **Báo lại lỗi** cho tôi

---

## 💡 **NGUYÊN NHÂN LỖI InvalidFile:**

- **Anchor.toml malformed** - TOML syntax error
- **Missing required fields** - thiếu toolchain, programs, etc.
- **Wrong indentation** - TOML cần indentation chính xác
- **Special characters** - có ký tự lạ

---

## ✅ **FILE Anchor.toml ĐÚNG PHẢI CÓ:**

```toml
[toolchain]              ← Bắt buộc
anchor_version = "0.31.2"

[features]               ← Bắt buộc
resolution = true
skip-lint = false

[programs.devnet]        ← Bắt buộc
game_token = "3ykyYQXoQLLV3a5VfX3ocvMrJA7Go4GXkkJatd7iYUfT"

[programs.mainnet]       ← Bắt buộc
game_token = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]               ← Bắt buộc
url = "https://api.apr.dev"

[provider]               ← Bắt buộc
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[workspace]              ← Bắt buộc
members = ["programs/*"]

[scripts]                ← Bắt buộc
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## 🎯 **THỰC HIỆN NGAY:**

1. **Xóa Anchor.toml cũ**
2. **Tạo Anchor.toml mới** với nội dung chính xác
3. **Refresh browser (F5)**
4. **Click Build lại**

---

## 🎉 **SAU KHI FIX:**

```
✅ Build successful
✅ Deploy successful
✅ Program live trên blockchain
```

---

**🎯 XÓA VÀ TẠO LẠI Anchor.toml NGAY!** 🚀

**Đảm bảo copy chính xác từng dòng!** 🤩

