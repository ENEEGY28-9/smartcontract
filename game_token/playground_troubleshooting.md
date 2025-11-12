# 🔧 SOLANA PLAYGROUND - TROUBLESHOOTING GUIDE

## ❌ **VẤN ĐỀ: KHÔNG THẤY FILE Anchor.toml**

### **NGUYÊN NHÂN:**
- File Anchor.toml có thể bị ẩn trong sidebar
- Hoặc chưa được tạo tự động
- Hoặc nằm trong thư mục con

### **GIẢI PHÁP:**

#### **Cách 1: Tìm file Anchor.toml**
1. Nhìn vào **sidebar bên trái** (file explorer)
2. Click vào **mũi tên >** để mở rộng các thư mục
3. Tìm file `Anchor.toml` ở **root directory**
4. Nếu không thấy, thử **refresh trang** (F5)

#### **Cách 2: Tạo file Anchor.toml thủ công**
Nếu không tìm thấy file, tạo mới:

1. **Click chuột phải** vào vùng trống trong sidebar
2. Chọn **"New File"**
3. Đặt tên: `Anchor.toml`
4. **Copy & Paste** nội dung sau:

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

#### **Cách 3: Kiểm tra Project Structure**
Project structure đúng phải như sau:

```
your-project/
├── src/
│   └── lib.rs          ← Đã thay thế
├── Anchor.toml         ← File này cần có
├── Cargo.toml          ← Tự động tạo
├── package.json        ← Tự động tạo
└── tests/              ← Tự động tạo
```

### **THỬ LẠI CÁC BƯỚC:**

1. **Tạo project mới** nếu cần
2. **Thay thế `src/lib.rs`** (Bước 2)
3. **Tạo/cập nhật `Anchor.toml`** (Bước 3)
4. **Build:** `anchor build`
5. **Deploy:** `anchor deploy`

---

## 🔍 **KIỂM TRA THÊM:**

### **Nếu vẫn không hoạt động:**
1. **Mở Developer Console** (F12)
2. **Kiểm tra lỗi** trong Console tab
3. **Thử tạo project mới** và làm lại từ đầu

### **Verify Project:**
Trong terminal, chạy:
```bash
ls -la          # Xem tất cả files
cat Anchor.toml # Kiểm tra nội dung
```

---

## 🎯 **THÀNH CÔNG KHI:**
- ✅ Thấy file `Anchor.toml` trong sidebar
- ✅ Build thành công: `anchor build`
- ✅ Deploy thành công: `anchor deploy`
- ✅ Nhận được Program ID

---

## 💡 **MẸO:**
- **Refresh trang** nếu cần (F5)
- **Đóng/mở lại tab** browser
- **Thử browser khác** (Chrome, Firefox, Edge)
- **Clear cache** nếu cần

**Nếu vẫn gặp vấn đề, hãy chụp màn hình và mô tả lỗi cụ thể!** 🤔

