# gamev1

## Khởi động nhanh

### Các tùy chọn khởi động:

#### 1. **Khởi động toàn bộ hệ thống (Khuyến nghị)**
```bash
# Cách nhanh nhất - một lệnh duy nhất
.\restart-all-services-simple.ps1

# Hoặc sử dụng batch file
run-gamev1.bat
```

#### 2. **Khởi động từng phần để debug**
```bash
# Chỉ backend services (gateway + pocketbase)
.\restart-all-services.ps1

# Chỉ game worker + client (integration test)
.\run-game-client-integration.ps1
```

### Truy cập hệ thống:
- **Game Client**: http://localhost:5173
- **Game trực tiếp**: http://localhost:5173/game
- **Gateway API**: http://localhost:8080
- **PocketBase Admin**: http://localhost:8090/_/
- **Health Check**: http://localhost:8080/healthz

### Thông tin đăng nhập:
- **PocketBase Admin**: admin@pocketbase.local / 123456789

### Cách chơi game:
1. **Khởi động hệ thống** bằng một trong các lệnh ở trên
2. **Mở trình duyệt** và truy cập http://localhost:5173/game
3. **Nhấn phím bất kỳ** để bắt đầu game
4. **Điều khiển**:
   - **WASD** hoặc **Arrow Keys**: Di chuyển nhân vật
   - **Space**: Nhảy qua chướng ngại vật
   - **A/D** hoặc **←/→**: Đổi lane
   - **S** hoặc **↓**: Trượt dưới chướng ngại vật
   - **R**: Reset game
5. **Mục tiêu**: Chạy càng xa càng tốt, thu thập điểm và tránh chướng ngại vật

## Tài liệu chi tiết
- [Quick Start Guide](QUICK-START-GUIDE.md) - Hướng dẫn đầy đủ
- [Client Setup](CLIENT-SETUP-GUIDE.md) - Thiết lập client
- [Node.js Install](NODEJS-INSTALL-GUIDE.md) - Cài đặt Node.js

## Kiến trúc hệ thống
- **Frontend**: SvelteKit + TypeScript
- **Backend**: Rust (Axum) + PocketBase
- **Database**: PocketBase (SQLite)
- **Authentication**: JWT + PocketBase

## Phát triển
```bash
# Setup lần đầu
npm install

# Chạy development
npm run dev

# Build production
npm run build
```

## Ghi chú
- Đăng nhập thành công hiển thị user info và nút Logout
- Không còn lỗi "Failed to fetch" nhờ Vite Proxy
- Tự động xử lý CORS giữa client và gateway

## Tính năng Game đã triển khai

### Tính năng đã triển khai:
- **Complete Endless Runner Game** với physics simulation
- **Dynamic Track Generation** với obstacles và power-ups
- **Real-time Input Processing** với keyboard controls
- **Game State Management** với score và statistics
- **Collision Detection** và physics simulation
- **Audio System** với sound effects và background music
- **Power-up System** với temporary effects

## Chạy Tests

```bash
# Chạy tất cả tests
cargo test

# Chạy test cụ thể cho worker
cargo test --package worker

# Chạy integration tests
cargo test test_end_to_end_client_worker_integration
```

## Trang thái phát triển

**HOAN THANH!** Dự án GameV1 đã hoàn thiện với:

### Cac thanh phần hoàn chỉnh:
- **Backend Services**: Gateway (HTTP API), Worker (Game Logic), PocketBase (Database)
- **Frontend Client**: SvelteKit với giao diện người dùng hiện đại
- **Game Engine**: Endless Runner 3D với physics simulation
- **Network Layer**: gRPC communication giữa client và worker
- **Database**: PocketBase với admin UI và collections

### Cac tính năng chính:
- **Real-time 3D Rendering** với Canvas 2D (Three.js-style graphics)
- **Complete Input System** với keyboard controls (WASD, Space, Arrow keys)
- **Dynamic Track Generation** với obstacles, power-ups, và lane switching
- **Game State Management** với score, speed, distance tracking
- **Collision Detection** và physics simulation
- **Audio System** với sound effects và background music
- **Power-up System** với temporary effects (speed boost, jump boost, invincibility)

### Sẵn sàng sử dụng:
```powershell
# Khởi động toàn bộ hệ thống (khuyến nghị)
.\restart-all-services-simple.ps1

# Hoặc chỉ worker + client để test nhanh
.\run-game-client-integration.ps1

# Truy cập game: http://localhost:5173/game
```

## Kien trúc hệ thống

### Backend Services (Rust)
- **Gateway**: HTTP API server với Axum framework và WebSocket support
- **Worker**: Game logic với gRPC server và physics simulation
- **PocketBase**: Database với admin UI và authentication

### Frontend Client (SvelteKit + TypeScript)
- **Real-time 3D Rendering** với Canvas 2D (Three.js-style graphics)
- **Input Processing** với keyboard và mouse event handling
- **State Management** với Svelte stores và reactive updates
- **Network Communication** với gRPC client và WebSocket

### Game Engine Features
- **Physics Simulation** với collision detection và movement
- **Entity Management** với spawn/despawn và lifecycle management
- **Input Buffering** để xử lý độ trễ mạng và sequence numbers
- **Game State Synchronization** giữa client và worker với snapshots

Hệ thống đã sẵn sàng để mở rộng thêm tính năng multiplayer, nâng cấp graphics, hoặc phát triển gameplay nâng cao hơn!