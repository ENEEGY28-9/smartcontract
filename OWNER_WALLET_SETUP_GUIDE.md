# Hướng Dẫn Thiết Lập Ví Owner Mới

## 📋 Tổng Quan
Đã tạo ví owner mới cho dự án auto-mint token. Ví mới sẽ nhận 20% token từ việc mint tự động.

## 🏦 Thông Tin Ví Mới
- **Địa chỉ**: `5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN`
- **Mục đích**: Nhận 20% token từ auto-mint scheduler
- **Thời gian tạo**: 2025-11-10

## 🔐 Private Key
Private key được lưu trong file `new_owner_private_key.json`. **QUAN TRỌNG:**
- Không chia sẻ file này với ai
- Sao lưu file này ở nơi an toàn (USB drive, encrypted storage)
- Sử dụng private key này để ký các giao dịch
- Auto-mint scheduler sẽ tự động load private key từ file này

## 💾 Sao Lưu Private Key
```bash
# Sao chép file private key ra ngoài dự án
cp new_owner_private_key.json ~/backup/
# Hoặc copy thủ công file new_owner_private_key.json
```

## 📄 Files Đã Được Cập Nhật
Tất cả file sau đã được cập nhật để sử dụng địa chỉ ví mới:
- game_token/auto_mint_scheduler.js
- game_token/auto_mint_scheduler_simple.js
- game_token/mint_additional_tokens.js
- game_token/deploy_new_logic_devnet.js
- game_token/test_end_to_end.js
- game_token/test_owner_revenue.js
- game_token/80_20_LOGIC_COMPLETION_REPORT.md
- game_token/test_devnet_integration.js
- client/src/lib/services/tokenService.ts
- test_complete_system_verification.js
- game_token/devnet_deployment_updated.json
- Và nhiều file khác...

## 🚀 Cách Sử Dụng

### 1. Chạy Auto-Mint Scheduler
```bash
cd game_token
node auto_mint_scheduler.js
```

### 2. Kiểm tra số dư token
```bash
node check_wallet_balance.js
```

### 3. Funding Ví (nếu cần)
```bash
node fund_owner_wallet_complete.js
```

## ⚠️ Lưu Ý Bảo Mật
- **KHÔNG** commit file `new_owner_private_key.json` lên Git
- **KHÔNG** chia sẻ private key với ai
- **KHÔNG** lưu private key trong code

## 🔗 Link Explorer
Xem ví trên Solana Explorer: https://explorer.solana.com/address/5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN?cluster=devnet
