// Giải thích chi tiết về camera controls và visual feedback
console.log('=== CAMERA CONTROLS EXPLAINED ===');
console.log('');

console.log('🎮 MOUSE SENSITIVITY LÀ GÌ?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Sensitivity = tốc độ camera phản hồi với mouse movement');
console.log('• Cao sensitivity = camera di chuyển nhanh hơn với cùng mouse movement');
console.log('• Thấp sensitivity = camera di chuyển chậm hơn, cần mouse movement nhiều hơn');
console.log('');
console.log('Ví dụ:');
console.log('• Sensitivity 0.001 = di chuyển mouse 10px → camera di chuyển 0.01°');
console.log('• Sensitivity 0.01 = di chuyển mouse 10px → camera di chuyển 0.1°');
console.log('');

console.log('📊 VISUAL FEEDBACK LÀ GÌ?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Visual feedback = cách camera hiển thị sự thay đổi vị trí');
console.log('• Camera di chuyển càng nhiều → visual feedback càng rõ');
console.log('• Khoảng cách thay đổi lớn → dễ nhận biết sự khác biệt');
console.log('');

console.log('🎯 CAMERA MOVEMENT CHI TIẾT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('1️⃣ HORIZONTAL MOVEMENT (Yaw - Xoay ngang):');
console.log('   • Mouse RIGHT (X+) → Camera xoay phải → Camera X giảm');
console.log('   • Mouse LEFT (X-) → Camera xoay trái → Camera X tăng');
console.log('   • Khoảng cách thay đổi: ~10 units với 180° rotation');
console.log('');
console.log('2️⃣ VERTICAL MOVEMENT (Pitch - Nhìn lên/xuống):');
console.log('   • Mouse UP (Y-) → Camera nhìn lên → Camera Y tăng');
console.log('   • Mouse DOWN (Y+) → Camera nhìn xuống → Camera Y giảm');
console.log('   • Khoảng cách thay đổi: ~0.8 units với 60° rotation');
console.log('');

console.log('🔄 CONVENTION HIỆN TẠI');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Mouse UP = Nhìn lên (camera Y tăng)');
console.log('• Mouse DOWN = Nhìn xuống (camera Y giảm)');
console.log('• Mouse LEFT = Xoay trái (camera X tăng)');
console.log('• Mouse RIGHT = Xoay phải (camera X giảm)');
console.log('');
console.log('Điều này giống như hầu hết các game third-person shooter.');
console.log('');

console.log('⚙️ CÁCH ĐIỀU CHỈNH');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Để tăng visual feedback:');
console.log('• Tăng CAMERA_DISTANCE (hiện tại: 12)');
console.log('• Tăng vertical movement multiplier (hiện tại: 0.8)');
console.log('');
console.log('Để tăng sensitivity:');
console.log('• Tăng MOUSE_SENSITIVITY (hiện tại: 0.0012)');
console.log('');
console.log('Để thay đổi convention:');
console.log('• Đảo ngược Y axis trong InputManager');
console.log('');

console.log('✅ TỔNG KẾT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Camera hiện tại hoạt động đúng chuẩn game, chỉ cần điều chỉnh');
console.log('sensitivity và visual feedback để phù hợp với sở thích cá nhân.');
