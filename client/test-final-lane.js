// Final test for lane movement với các thông số đã được tối ưu
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_WIDTH: 3
};

class FinalPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
  }

  handleInput(moveLeft, moveRight) {
    if (moveLeft) {
      if (this.desiredLane > GAME_CONFIG.MIN_LANE) {
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
      }
    } else if (moveRight) {
      if (this.desiredLane < GAME_CONFIG.MAX_LANE) {
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
      }
    }
    this.targetLane = this.desiredLane;
  }

  updateMovement(deltaTime = 0.016) {
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) {
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const laneChangeSpeed = 12.0; // Faster speed
      const moveAmount = laneChangeSpeed * deltaTime;
      this.currentLane += direction * moveAmount;

      if (direction > 0 && this.currentLane >= this.targetLane - 0.01) {
        this.currentLane = this.targetLane;
      } else if (direction < 0 && this.currentLane <= this.targetLane + 0.01) {
        this.currentLane = this.targetLane;
      }
    }
  }

  getPosition() {
    return {
      x: this.currentLane * GAME_CONFIG.LANE_WIDTH,
      y: 0,
      z: 0
    };
  }
}

// Test với input liên tục
console.log('=== FINAL TEST: Lane Movement với Thông Số Tối Ưu ===');

const player = new FinalPlayer();
console.log(`Initial position: ${JSON.stringify(player.getPosition())}`);

console.log('\n--- Test 1: Di chuyển từ lane 0 đến lane -1 ---');
for (let i = 0; i < 10; i++) {
  player.handleInput(true, false);
  player.updateMovement();
  const pos = player.getPosition();
  console.log(`Step ${i}: lane=${player.currentLane.toFixed(3)}, position=(${pos.x.toFixed(3)}, ${pos.y}, ${pos.z})`);
}

console.log('\n--- Test 2: Tiếp tục giữ A (nên không di chuyển vì đã ở lane -1) ---');
for (let i = 0; i < 3; i++) {
  player.handleInput(true, false);
  player.updateMovement();
  const pos = player.getPosition();
  console.log(`Step ${i}: lane=${player.currentLane.toFixed(3)}, position=(${pos.x.toFixed(3)}, ${pos.y}, ${pos.z})`);
}

console.log('\n--- Test 3: Chuyển sang lane 1 ---');
for (let i = 0; i < 10; i++) {
  player.handleInput(false, true);
  player.updateMovement();
  const pos = player.getPosition();
  console.log(`Step ${i}: lane=${player.currentLane.toFixed(3)}, position=(${pos.x.toFixed(3)}, ${pos.y}, ${pos.z})`);
}

console.log('\n✅ Final test completed - Movement should be smooth and continuous!');
