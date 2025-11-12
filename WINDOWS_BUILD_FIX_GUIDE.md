# 🚨 WINDOWS BUILD ENVIRONMENT FIX GUIDE

## ❌ Vấn đề gặp phải:
- `Can't get home directory path: environment variable not found`
- Không thể build file `.so` cho smart contract
- Rust/Cargo build tools gặp lỗi với environment variables

## 🔧 NGUYÊN NHÂN:
Trên Windows, biến môi trường `HOME` không được thiết lập, và PATH không có Solana CLI.

## ✅ CÁCH KHẮC PHỤC:

### Bước 1: Thiết lập biến môi trường HOME
```
1. Nhấn Win + R, gõ "sysdm.cpl" và Enter
2. Chọn tab "Advanced" → "Environment Variables"
3. Trong "System variables", nhấn "New"
4. Variable name: HOME
5. Variable value: C:\Users\[TÊN_USER_CỦA_BẠN]
6. Nhấn OK
```

### Bước 2: Thêm Solana CLI vào PATH
```
1. Trong cửa sổ Environment Variables, tìm "Path" trong System variables
2. Nhấn "Edit"
3. Nhấn "New"
4. Thêm đường dẫn: C:\Users\[TÊN_USER]\Downloads\eneegy-main\game_token\solana-release\bin
5. Nhấn OK để lưu
```

### Bước 3: Thiết lập CARGO_HOME (tùy chọn)
```
1. Trong System variables, nhấn "New"
2. Variable name: CARGO_HOME
3. Variable value: C:\Users\[TÊN_USER]\.cargo
4. Nhấn OK
```

### Bước 4: Khởi động lại Command Prompt
```
1. Đóng tất cả Command Prompt/PowerShell windows
2. Mở Command Prompt mới với quyền Administrator
3. Kiểm tra: echo %HOME%
```

## 🧪 KIỂM TRA BUILD:

### Test 1: Kiểm tra Solana CLI
```bash
solana --version
# Nên thấy: solana-cli 1.18.4
```

### Test 2: Kiểm tra Anchor
```bash
anchor --version
# Nên thấy: anchor-cli 0.32.1
```

### Test 3: Build Smart Contract
```bash
cd game_token/programs/game_token
anchor build
# Nên build thành công và tạo file .so
```

## 🚀 TRIỂN KHAI HOÀN CHỈNH:

Sau khi fix environment, chạy:
```bash
full_deployment_automated.bat
```

## 🔍 KIỂM TRA LỖI THƯỜNG GẶP:

### Nếu vẫn gặp lỗi "HOME not found":
```bash
# Trong Command Prompt, chạy:
set HOME=C:\Users\%USERNAME%
solana --version
```

### Nếu PATH không hoạt động:
```bash
# Thêm thủ công vào PATH mỗi session:
set PATH=%PATH%;C:\Users\%USERNAME%\Downloads\eneegy-main\game_token\solana-release\bin
```

### Nếu Cargo build lỗi:
```bash
# Cài đặt Rust nếu chưa có:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

## 📞 HỖ TRỢ:

Nếu vẫn gặp vấn đề:
1. Kiểm tra Windows version: `winver`
2. Kiểm tra quyền Administrator
3. Restart máy tính sau khi thay đổi environment variables
4. Kiểm tra antivirus không block Solana CLI

## ✅ KẾT QUẢ MONG ĐỢI:

- ✅ Smart contract build thành công
- ✅ File `game_token.so` được tạo
- ✅ Deploy lên Solana Devnet thành công
- ✅ Game có real blockchain transactions

---

**🎯 Script tự động (không cần quyền Admin):**

Nếu không thể set system variables, chạy từng command trong session:

```bash
# Thiết lập cho session hiện tại
set HOME=C:\Users\%USERNAME%
set PATH=%PATH%;C:\Users\%USERNAME%\Downloads\eneegy-main\game_token\solana-release\bin
set CARGO_HOME=C:\Users\%USERNAME%\.cargo

# Sau đó build
cd game_token/programs/game_token
anchor build
```










