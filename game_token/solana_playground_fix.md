# 🔧 SOLANA PLAYGROUND - FIX FOR MISSING Anchor.toml

## ❌ **VẤN ĐỀ: CHỈ THẤY anchor.test.ts**

**Điều này có nghĩa là:**
- File `Anchor.toml` chưa được tạo
- Hoặc bị ẩn
- Hoặc project structure khác với dự kiến

---

## 🚀 **GIẢI PHÁP NHANH:**

### **BƯỚC 1: TẠO FILE Anchor.toml**

1. **Click chuột phải** vào vùng trống trong **file explorer sidebar**
2. Chọn **"New File"** hoặc **"Create New File"**
3. Đặt tên: `Anchor.toml` (viết hoa A)
4. **Copy & paste** nội dung sau:

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

### **BƯỚC 2: XÁC NHẬN CẤU TRÚC**

Sau khi tạo, project nên có:

```
📁 your-project/
├── 📄 Anchor.toml          ← Mới tạo
├── 📄 Cargo.toml           ← Tự động
├── 📄 package.json         ← Tự động
├── 📁 src/
│   └── 📄 lib.rs           ← Đã thay thế
├── 📁 tests/
│   └── 📄 anchor.test.ts   ← File bạn thấy
└── 📁 programs/            ← Có thể ẩn
```

---

## 🎯 **BƯỚC TIẾP THEO:**

### **BƯỚC 3: BUILD & DEPLOY**

1. **Mở Terminal** trong Solana Playground
2. Chạy: `anchor build`
3. Đợi build hoàn thành (2-3 phút)
4. Chạy: `anchor deploy`
5. **Copy Program ID** được hiển thị

### **BƯỚC 4: TEST DEPLOYMENT**

Tạo file `test_deploy.js` và copy code sau:

```javascript
const { Connection, PublicKey } = require('@solana/web3.js');

async function testDeployment() {
  console.log('🚀 TESTING DEPLOYMENT');

  const connection = new Connection('https://api.devnet.solana.com');

  // 🔴 THAY ĐỔI GIÁ TRỊ NÀY 🔴
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');

  try {
    const programInfo = await connection.getAccountInfo(programId);
    if (programInfo) {
      console.log('✅ Program deployed successfully!');
      console.log('📋 Program ID:', programId.toString());
    } else {
      console.log('❌ Program not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDeployment();
```

---

## 💡 **MẸO:**

- **Nếu không thể tạo file:** Thử refresh trang (F5)
- **Nếu vẫn không thấy:** Đóng tab và tạo project mới
- **Verify:** Chạy `ls -la` trong terminal để xem tất cả files

---

## 🎉 **THÀNH CÔNG KHI:**

```
✅ File Anchor.toml created
✅ anchor build - success
✅ anchor deploy - success
✅ Program ID received
✅ Test script works
```

**🎯 BẮT ĐẦU TẠO FILE Anchor.toml NGAY!** 🚀

