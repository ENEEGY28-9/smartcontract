# 🚀 SOLANA PLAYGROUND - FREE DEPLOYMENT

## 🎯 **GIẢI PHÁP MIỄN PHÍ #1: SOLANA PLAYGROUND**

**URL:** https://beta.solpg.io/

---

## 📋 **CÁC BƯỚC THỰC HIỆN (10 PHÚT)**

### **BƯỚC 1: TẠO PROJECT**
1. Truy cập: https://beta.solpg.io/
2. Click **"Create a new project"**
3. Chọn template **"Anchor (Rust)"**
4. Đặt tên: `game_token`

### **BƯỚC 2: IMPORT CODE**
1. Xóa toàn bộ code mặc định
2. Copy file `programs/game_token/src/lib.rs` từ local
3. Paste vào file `src/lib.rs` trên Playground
4. Copy file `Anchor.toml` và paste
5. Copy các file test nếu cần

### **BƯỚC 3: CẤU HÌNH WALLET**
```javascript
// Trong Playground, wallet được tạo tự động
// Copy wallet address để airdrop SOL
solana airdrop 2 [YOUR_WALLET_ADDRESS]
```

### **BƯỚC 4: BUILD & DEPLOY**
```bash
# Trong terminal của Playground
anchor build
anchor deploy
```

### **BƯỚC 5: TEST FUNCTIONALITY**
```javascript
// Tạo file test.js trong Playground
const { Connection, PublicKey } = require('@solana/web3.js');

async function test() {
  const connection = new Connection('https://api.devnet.solana.com');
  const programId = new PublicKey('YOUR_PROGRAM_ID');

  // Test code here
}

test();
```

---

## ✅ **ƯU ĐIỂM**
- **Hoàn toàn miễn phí** 🚀
- **Không cần setup** gì
- **Browser-based** - chạy trực tiếp
- **Pre-configured environment**
- **Test ngay lập tức**

---

## ⚠️ **GIỚI HẠN**
- Code phải public (nếu private repo)
- Không thể chạy local tests đầy đủ
- Phụ thuộc vào internet
- Thời gian build có thể lâu

---

## 🎯 **KẾT QUẢ MONG ĐỢI**
```
✅ Build successful
✅ Deploy successful
✅ Program ID: [generated-id]
✅ Ready for testing
```


