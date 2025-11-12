# 📁 SOLANA PLAYGROUND - PROJECT STRUCTURE GUIDE

## 🎯 **CẤU TRÚC DỰ ÁN ANCHOR ĐÚNG:**

### **Cấu trúc hoàn chỉnh nên có:**

```
📁 your-project/
├── 📄 Anchor.toml          ← CẦN TẠO (thiếu)
├── 📄 Cargo.toml           ← Tự động tạo
├── 📄 package.json         ← Tự động tạo
├── 📁 src/
│   └── 📄 lib.rs           ← ĐÃ THAY THẾ ✓
├── 📁 tests/
│   └── 📄 anchor.test.ts   ← Có sẵn ✓
├── 📁 programs/
│   └── 📁 game_token/
│       └── 📁 src/
│           └── 📄 lib.rs   ← Có thể ẩn
└── 📁 node_modules/        ← Tự động
```

---

## 🔧 **NHỮNG GÌ BẠN CẦN LÀM:**

### **BƯỚC 1: TẠO FILE Anchor.toml** (THIẾU)

1. **Click chuột phải** vào vùng trống trong sidebar
2. **"New File"** → Đặt tên: `Anchor.toml`
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

### **BƯỚC 2: XÁC NHẬN CÁC FILE KHÁC**

**Những file nên có:**
- ✅ `src/lib.rs` - Đã thay thế code Rust
- ✅ `tests/anchor.test.ts` - Có sẵn
- ✅ `Cargo.toml` - Tự động tạo
- ✅ `package.json` - Tự động tạo
- ❌ `Anchor.toml` - **CẦN TẠO**

---

## 🚀 **SAU KHI TẠO Anchor.toml:**

### **BƯỚC 3: BUILD**
```bash
anchor build
```

### **BƯỚC 4: DEPLOY**
```bash
anchor deploy
```

### **BƯỚC 5: VERIFY**
```bash
ls -la  # Xem tất cả files
```

---

## 💡 **NẾU VẪN CÓ VẤN ĐỀ:**

### **Tùy chọn A: Tạo project mới**
1. Quay lại https://beta.solpg.io/
2. **"Create a new project"**
3. Chọn **"Anchor (Rust)"**
4. Làm lại từ đầu

### **Tùy chọn B: Kiểm tra kỹ**
1. **Refresh trang** (F5)
2. **Đóng/mở lại tab**
3. **Thử browser khác**

---

## 🎯 **THÀNH CÔNG KHI:**

```
✅ Anchor.toml - created
✅ anchor build - success
✅ anchor deploy - success
✅ Program ID - received
```

---

## 🔗 **URL PROJECT:**
**https://beta.solpg.io/6912f655f7f3d227e97ef809**

**🎯 TẠO FILE Anchor.toml NGAY ĐỂ TIẾP TỤC!** 🚀

