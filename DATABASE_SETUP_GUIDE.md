# PocketBase Database Setup Guide for Production

## Tổng quan

Hướng dẫn này sẽ giúp bạn cấu hình PocketBase database với collection rooms cho production và test các database operations của room manager.

## Điều kiện tiên quyết

1. PocketBase đang chạy trên port 8090
2. Room Manager service đang chạy
3. Có quyền admin access tới PocketBase

## Các Script Chính

### 1. Setup PocketBase Database (`setup-pocketbase-production.ps1`)

Script này sẽ:
- Kiểm tra kết nối tới PocketBase
- Tạo collections cần thiết (`rooms`, `players`) nếu chưa tồn tại
- Cấu hình schema phù hợp cho production

```powershell
.\scripts\setup-pocketbase-production.ps1 -PocketBaseUrl "http://localhost:8090"
```

**Parameters:**
- `PocketBaseUrl`: URL của PocketBase instance (default: http://localhost:8090)
- `AdminEmail`: Admin email (default: admin@pocketbase.com)
- `AdminPassword`: Admin password (default: admin123456)

### 2. Test Room Manager Database Operations (`test-room-manager-database.ps1`)

Script này sẽ test các operations cơ bản:
- Tạo phòng mới
- Liệt kê phòng
- Tham gia phòng
- Quản lý players

```powershell
.\scripts\test-room-manager-database.ps1 -TestMode "comprehensive"
```

**Test Modes:**
- `basic`: Test các chức năng cơ bản
- `comprehensive`: Test đầy đủ bao gồm filtering và multiple rooms
- `load`: Load test với nhiều rooms cùng lúc

**Parameters:**
- `RoomManagerUrl`: URL của Room Manager (default: http://localhost:3000)
- `PocketBaseUrl`: URL của PocketBase (default: http://localhost:8090)

### 3. Complete Setup and Test (`test-database-setup-complete.ps1`)

Script tổng hợp để chạy toàn bộ setup và test:

```powershell
.\scripts\test-database-setup-complete.ps1 -TestMode "comprehensive"
```

**Options:**
- `-SkipSetup`: Bỏ qua bước setup PocketBase
- `-SkipTests`: Bỏ qua bước chạy tests

## Cách sử dụng

### Setup lần đầu tiên

1. **Khởi động PocketBase:**
   ```bash
   cd pocketbase
   ./pocketbase serve
   ```

2. **Chạy setup script:**
   ```powershell
   .\scripts\test-database-setup-complete.ps1
   ```

3. **Kiểm tra kết quả:**
   - Mở trình duyệt và truy cập `http://localhost:8090/_/`
   - Đăng nhập với admin/admin123456
   - Kiểm tra collections `rooms` và `players` đã được tạo

### Test hàng ngày

Để đảm bảo database operations hoạt động đúng:

```powershell
.\scripts\test-room-manager-database.ps1 -TestMode "comprehensive"
```

### Troubleshooting

**Lỗi kết nối PocketBase:**
- Đảm bảo PocketBase đang chạy: `http://localhost:8090/api/health`
- Kiểm tra firewall và port accessibility

**Lỗi authentication:**
- Đảm bảo admin credentials đúng
- Reset admin password nếu cần

**Lỗi tạo collections:**
- Kiểm tra quyền admin
- Đảm bảo không có collections trùng tên

## Cấu trúc Database

### Rooms Collection

```javascript
{
  "id": "text (primary key, 15 chars)",
  "name": "text (1-100 chars)",
  "game_mode": "text (deathmatch/team_deathmatch/capture_the_flag)",
  "max_players": "number (2-16)",
  "current_players": "number (0+)",
  "spectator_count": "number (0+)",
  "status": "select (waiting/playing/finished)",
  "host_player_id": "text (player ID)",
  "worker_endpoint": "text (optional)",
  "settings": "json (game settings)",
  "created_at": "autodate",
  "updated_at": "autodate"
}
```

### Players Collection

```javascript
{
  "id": "text (primary key, 15 chars)",
  "username": "text (3-50 chars)",
  "email": "email",
  "score": "number (0+)",
  "is_online": "boolean",
  "created": "autodate",
  "updated": "autodate"
}
```

## Production Considerations

1. **Backup Database:**
   - Sao lưu `pb_data` directory thường xuyên
   - Cấu hình automated backups

2. **Security:**
   - Thay đổi admin credentials mặc định
   - Cấu hình HTTPS cho production
   - Set up proper firewall rules

3. **Monitoring:**
   - Monitor disk space cho `pb_data`
   - Set up alerts cho database operations
   - Log tất cả database activities

4. **Performance:**
   - Index các trường thường query
   - Monitor query performance
   - Scale PocketBase nếu cần thiết

## Commands Hữu ích

```bash
# Kiểm tra PocketBase health
curl http://localhost:8090/api/health

# Liệt kê collections
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8090/api/collections

# Backup database
cp -r pb_data pb_data_backup_$(date +%Y%m%d_%H%M%S)

# Restore từ backup
cp -r pb_data_backup_latest pb_data
```

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `tail -f pocketbase/pocketbase.log`
2. Verify database integrity: `http://localhost:8090/_/`
3. Test với basic operations trước khi chạy comprehensive tests
