// Script giải thích schema database cho wallet system
console.log('🔍 CẤU TRÚC DATABASE POCKETBASE CHO WALLET SYSTEM\n');

console.log('📊 COLLECTIONS QUAN TRỌNG:\n');

// 1. Users Collection
console.log('1️⃣  USERS Collection:');
console.log('   - id: string (Primary Key)');
console.log('   - email: string (Email đăng nhập)');
console.log('   - name: string (Tên hiển thị)');
console.log('   - avatar: file (Hình đại diện)');
console.log('   - created: datetime');
console.log('   - updated: datetime\n');

// 2. Wallets Collection
console.log('2️⃣  WALLETS Collection:');
console.log('   - id: string (Primary Key)');
console.log('   - user_id: string (🔗 Liên kết với Users.id)');
console.log('   - address: string (Địa chỉ ví blockchain)');
console.log('   - private_key: string (🔐 Khóa riêng - Encrypted)');
console.log('   - mnemonic: string (🔐 Cụm từ khôi phục - Encrypted)');
console.log('   - wallet_type: string (Loại ví: metamask, phantom, generated, bitcoin)');
console.log('   - network: string (Network: ethereum, solana, bitcoin)');
console.log('   - balance: number (💰 SỐ DƯ VÍ - CHÍNH)');
console.log('   - balance_last_updated: datetime (⏰ Lần cập nhật cuối)');
console.log('   - is_connected: boolean (🔌 Trạng thái kết nối)');
console.log('   - notes: string (Ghi chú)');
console.log('   - created: datetime');
console.log('   - updated: datetime\n');

console.log('🌟 FIELD QUAN TRỌNG LƯU SỐ DƯ VÍ:\n');

console.log('💰 FIELD "balance":');
console.log('   - Type: number (số thập phân)');
console.log('   - Đơn vị: Native token (ETH, SOL, BTC)');
console.log('   - Ví dụ:');
console.log('     * Ethereum: 1.5 (ETH)');
console.log('     * Solana: 2.3 (SOL)');
console.log('     * Bitcoin: 0.0001 (BTC)');
console.log('   - Nơi lưu: wallets.balance');
console.log('   - Cập nhật: Tự động khi connect wallet\n');

console.log('🔗 FIELD "user_id":');
console.log('   - Type: string (Foreign Key)');
console.log('   - Liên kết: wallets.user_id → users.id');
console.log('   - Mục đích: Mỗi user chỉ thấy wallets của mình');
console.log('   - Bảo mật: User isolation\n');

console.log('⏰ FIELD "balance_last_updated":');
console.log('   - Type: datetime');
console.log('   - Lưu thời gian cập nhật balance cuối');
console.log('   - Dùng cho: Tracking freshness của data\n');

console.log('🔌 FIELD "is_connected":');
console.log('   - Type: boolean');
console.log('   - true: Wallet đang kết nối và active');
console.log('   - false: Wallet không kết nối');
console.log('   - Ảnh hưởng: Balance chỉ update khi connected\n');

console.log('📋 CÁCH HOẠT ĐỘNG:\n');

console.log('1️⃣  User đăng nhập → Tạo session');
console.log('2️⃣  Connect/Tạo wallet → Lưu vào wallets collection');
console.log('3️⃣  Fetch balance từ blockchain → Lưu vào balance field');
console.log('4️⃣  Auto-refresh mỗi 30s → Cập nhật balance');
console.log('5️⃣  Hiển thị trong UI → Đọc từ database\n');

console.log('🔒 BẢO MẬT:\n');
console.log('✅ Private keys & mnemonics được mã hóa');
console.log('✅ User chỉ truy cập wallets của mình (qua user_id)');
console.log('✅ API endpoints có authentication');
console.log('✅ CORS protection\n');

console.log('📱 MULTI-NETWORK SUPPORT:');
console.log('   • Ethereum (MetaMask)');
console.log('   • Solana (Phantom)');
console.log('   • Bitcoin (Custom addresses)');
console.log('   • Mỗi network có balance riêng\n');

console.log('💡 CÁCH KIỂM TRA:');
console.log('   1. Mở: http://localhost:8090/_/');
console.log('   2. Click: Collections → wallets');
console.log('   3. Xem: balance column');
console.log('   4. Filter: user_id để xem wallets của user cụ thể\n');

console.log('🎯 API ENDPOINTS:');
console.log('   GET  /api/collections/wallets/records');
console.log('   POST /api/collections/wallets/records');
console.log('   PATCH /api/collections/wallets/records/:id');
console.log('   DELETE /api/collections/wallets/records/:id\n');

console.log('✨ TỔNG KẾT:');
console.log('   • Collection: wallets');
console.log('   • Field balance: Lưu số dư ví');
console.log('   • Field user_id: Liên kết với user');
console.log('   • Auto-update: Khi connect wallet');
console.log('   • Multi-network: ETH, SOL, BTC');








