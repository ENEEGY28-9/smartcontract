// Test timing-based movement logic
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1
};

class TimingBasedPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.lastInputTime = 0;
    this.frameCount = 0;
  }

  handleInput(inputState, currentTime) {
    this.frameCount++;

    if (inputState.moveLeft) {
      if (this.desiredLane <= GAME_CONFIG.MIN_LANE) {
        return; // Đã ở lane trái nhất
      }

      if (this.desiredLane === this.currentLane && (currentTime - this.lastInputTime) > 100) {
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
        this.lastInputTime = currentTime;
        console.log(`🔄 Frame ${this.frameCount}: Move LEFT - desiredLane: ${this.desiredLane}`);
      }
    } else if (inputState.moveRight) {
      if (this.desiredLane >= GAME_CONFIG.MAX_LANE) {
        return; // Đã ở lane phải nhất
      }

      if (this.desiredLane === this.currentLane && (currentTime - this.lastInputTime) > 100) {
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
        this.lastInputTime = currentTime;
        console.log(`🔄 Frame ${this.frameCount}: Move RIGHT - desiredLane: ${this.desiredLane}`);
      }
    }

    this.targetLane = this.desiredLane;
  }

  updateMovement(deltaTime = 0.016) {
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) {
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const laneChangeSpeed = 12.0;
      const moveAmount = laneChangeSpeed * deltaTime;
      this.currentLane += direction * moveAmount;

      if (direction > 0 && this.currentLane >= this.targetLane - 0.01) {
        this.currentLane = this.targetLane;
      } else if (direction < 0 && this.currentLane <= this.targetLane + 0.01) {
        this.currentLane = this.targetLane;
      }
    }
  }
}

// Test timing-based movement
console.log('=== TIMING-BASED MOVEMENT TEST ===');

const player = new TimingBasedPlayer();
let currentTime = 0;

// Test 1: Nhấn A nhanh (không đủ 100ms)
console.log('\n--- Test 1: Nhấn A nhanh (< 100ms) ---');
player.handleInput({ moveLeft: true, moveRight: false }, currentTime);
player.updateMovement();
currentTime += 50; // Chưa đủ 100ms

// Test 2: Tiếp tục giữ A (vẫn chưa đủ 100ms)
console.log('\n--- Test 2: Tiếp tục giữ A ---');
player.handleInput({ moveLeft: true, moveRight: false }, currentTime);
player.updateMovement();
currentTime += 30; // Vẫn chưa đủ 100ms tổng cộng

// Test 3: Giữ đủ lâu để trigger movement tiếp theo
console.log('\n--- Test 3: Giữ đủ lâu để trigger movement ---');
player.handleInput({ moveLeft: true, moveRight: false }, currentTime);
player.updateMovement();
currentTime += 50; // Đủ 100ms tổng cộng

// Test 4: Giữ tiếp tục để di chuyển đến lane cuối
console.log('\n--- Test 4: Giữ tiếp tục để đến lane cuối ---');
for (let i = 0; i < 15; i++) {
  currentTime += 100; // Mỗi frame 100ms
  player.handleInput({ moveLeft: true, moveRight: false }, currentTime);
  player.updateMovement();

  if (player.currentLane <= GAME_CONFIG.MIN_LANE) {
    console.log(`Đã đạt lane giới hạn: ${player.currentLane}`);
    break;
  }
}

console.log('\n✅ Timing-based test completed!');
