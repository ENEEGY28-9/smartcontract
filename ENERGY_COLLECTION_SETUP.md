# ⚡ Energy Collection Setup Guide

## Tổng quan
Collection `energies` được sử dụng để lưu trữ điểm Energy (E) của từng user trong hệ thống PocketBase.

## Cách tạo Collection

### Bước 1: Truy cập PocketBase Admin
1. Mở trình duyệt và truy cập: `http://localhost:8090/_/`
2. Đăng nhập với tài khoản admin

### Bước 2: Tạo Collection mới
1. Click vào **"Collections"** ở sidebar
2. Click **"New collection"**
3. Điền thông tin:
   - **Name**: `energies`
   - **Type**: `Base` (để trống)
   - **System**: Uncheck

### Bước 3: Thêm Fields

Thêm các fields sau theo thứ tự:

#### 1. user_id (Relation)
- **Name**: `user_id`
- **Type**: `Relation`
- **Collection**: `_pb_users_auth_` (chọn users collection)
- **Required**: ✅ Check
- **Options**:
  - **Cascade delete**: ✅ Check
  - **Min select**: 1
  - **Max select**: 1
  - **Display fields**: `email`

#### 2. points (Number)
- **Name**: `points`
- **Type**: `Number`
- **Required**: ✅ Check
- **Options**:
  - **Min**: 0

#### 3. last_updated (Date)
- **Name**: `last_updated`
- **Type**: `Date`
- **Required**: ❌ Uncheck

### Bước 4: Thêm Index
1. Scroll xuống phần **"Indexes"**
2. Click **"Add Index"**
3. Điền:
   - **Name**: `idx_energies_user_id`
   - **Type**: `Unique index`
   - **Fields**: `user_id`
4. Click **"Create"**

### Bước 5: Thiết lập Rules (Quan trọng!)
Scroll xuống phần **"API Rules"** và thiết lập:

- **List rule**: `user_id = @request.auth.id`
- **View rule**: `user_id = @request.auth.id`
- **Create rule**: `user_id = @request.auth.id`
- **Update rule**: `user_id = @request.auth.id`
- **Delete rule**: `@request.auth.id != "" && user_id = @request.auth.id`

Điều này đảm bảo user chỉ có thể truy cập Energy data của chính mình.

### Bước 6: Lưu Collection
1. Click **"Save"** ở cuối trang
2. Collection `energies` sẽ xuất hiện trong danh sách

## Kiểm tra hoạt động

Sau khi tạo xong, bạn có thể:

1. **Test trong browser**: Truy cập `http://localhost:5173/wallet-test`
2. **Đăng nhập** với tài khoản user
3. **Vào tab ⚡ Energy**: Sẽ thấy Energy balance được load từ database
4. **Sử dụng nút "+100 Energy" hoặc "+1000 Energy"** trong Admin Controls để test

## Cấu trúc Database

```
Collection: energies
├── user_id: relation to _pb_users_auth_
├── points: number (min: 0)
├── last_updated: date (optional)
└── created/updated: timestamps (auto)
```

## API Endpoints

- `GET /api/collections/energies/records` - List energy records (chỉ của user hiện tại)
- `POST /api/collections/energies/records` - Create energy record
- `PATCH /api/collections/energies/records/{id}` - Update energy record
- `DELETE /api/collections/energies/records/{id}` - Delete energy record

## Lưu ý

- Mỗi user chỉ có **1 energy record**
- Points không thể âm (min: 0)
- User chỉ có thể truy cập energy data của chính mình
- Collection tự động tạo record mới khi user đăng nhập lần đầu

---

🎮 **Energy system đã được tích hợp hoàn toàn với PocketBase!**
