// Debug script để kiểm tra lane movement
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_WIDTH: 2
};

class DebugPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
  }

  // Simulate input handling
  handleInput(moveLeft, moveRight) {
    if (moveLeft) {
      // Khi giữ phím LEFT, luôn cố gắng di chuyển đến lane bên trái
      // Không phụ thuộc vào vị trí hiện tại, chỉ cần chưa đạt giới hạn
      if (this.desiredLane > GAME_CONFIG.MIN_LANE) {
        const oldDesiredLane = this.desiredLane;
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
        console.log(`🔄 INPUT: Move LEFT - currentLane=${this.currentLane.toFixed(3)}, targetLane=${this.targetLane}, desiredLane=${oldDesiredLane} → ${this.desiredLane}`);
      }
    } else if (moveRight) {
      // Khi giữ phím RIGHT, luôn cố gắng di chuyển đến lane bên phải
      // Không phụ thuộc vào vị trí hiện tại, chỉ cần chưa đạt giới hạn
      if (this.desiredLane < GAME_CONFIG.MAX_LANE) {
        const oldDesiredLane = this.desiredLane;
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
        console.log(`🔄 INPUT: Move RIGHT - currentLane=${this.currentLane.toFixed(3)}, targetLane=${this.targetLane}, desiredLane=${oldDesiredLane} → ${this.desiredLane}`);
      }
    }

    this.targetLane = this.desiredLane;
  }

  // Simulate movement update
  updateMovement(deltaTime = 0.016) {
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) {
      const oldCurrentLane = this.currentLane;
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const laneChangeSpeed = 8.0;
      const moveAmount = laneChangeSpeed * deltaTime;
      this.currentLane += direction * moveAmount;

      console.log(`🚶 MOVEMENT: currentLane=${oldCurrentLane.toFixed(3)} → ${this.currentLane.toFixed(3)}, targetLane=${this.targetLane}, direction=${direction}, moveAmount=${moveAmount.toFixed(3)}`);

      if (direction > 0 && this.currentLane >= this.targetLane - 0.01) {
        this.currentLane = this.targetLane;
        console.log(`✅ MOVEMENT: Reached target lane ${this.targetLane}`);
      } else if (direction < 0 && this.currentLane <= this.targetLane + 0.01) {
        this.currentLane = this.targetLane;
        console.log(`✅ MOVEMENT: Reached target lane ${this.targetLane}`);
      }
    } else {
      console.log(`⏹️ MOVEMENT: No movement needed - currentLane=${this.currentLane.toFixed(3)}, targetLane=${this.targetLane}`);
    }
  }
}

// Test với input liên tục
console.log('=== DEBUG: Lane Movement với Input Liên Tục ===');
const player = new DebugPlayer();

console.log('\n--- Test 1: Nhấn A một lần (chỉ 1 frame) ---');
player.handleInput(true, false); // Chỉ 1 lần
player.updateMovement();

console.log('\n--- Test 2: Giữ A liên tục (nhiều frame) - nên tiếp tục di chuyển khi đã đạt lane -1 ---');
for (let i = 0; i < 8; i++) {
  console.log(`\nFrame ${i + 1}:`);
  player.handleInput(true, false); // Giữ liên tục
  player.updateMovement();
}

console.log('\n--- Test 3: Nhả A và nhấn lại ---');
console.log('Nhả A...');
player.handleInput(false, false); // Nhả phím
player.updateMovement();
console.log('Nhấn A lại...');
player.handleInput(true, false); // Nhấn lại
player.updateMovement();

console.log('\n✅ Debug test completed');
