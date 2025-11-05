// Final test với thông số tối ưu cuối cùng
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_WIDTH: 3,
  LANE_CHANGE_SPEED: 20.0,
  LERP_FACTOR: 0.8
};

class FinalPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
  }

  handleInput(inputState) {
    if (inputState.moveLeft && this.desiredLane > GAME_CONFIG.MIN_LANE) {
      this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
    } else if (inputState.moveRight && this.desiredLane < GAME_CONFIG.MAX_LANE) {
      this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
    }
    this.targetLane = this.desiredLane;
  }

  updateMovement(deltaTime = 0.016) {
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) {
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const moveAmount = GAME_CONFIG.LANE_CHANGE_SPEED * deltaTime;
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

console.log('=== FINAL LANE MOVEMENT TEST ===');
console.log('Với thông số tối ưu cuối cùng');

const player = new FinalPlayer();

// Test di chuyển qua lại nhiều lần
for (let cycle = 0; cycle < 5; cycle++) {
  console.log(`\n--- Cycle ${cycle + 1} ---`);

  // Đi về trái từ lane hiện tại đến lane trái nhất
  const startLane = player.currentLane;
  const targetLeft = GAME_CONFIG.MIN_LANE;

  console.log(`Từ lane ${startLane} đi về trái đến ${targetLeft}`);

  while (player.currentLane > targetLeft) {
    player.handleInput({ moveLeft: true, moveRight: false });
    player.updateMovement();
  }

  console.log(`Đã đạt lane ${player.currentLane}`);

  // Đi về phải từ lane hiện tại đến lane phải nhất
  const targetRight = GAME_CONFIG.MAX_LANE;
  console.log(`Từ lane ${player.currentLane} đi về phải đến ${targetRight}`);

  while (player.currentLane < targetRight) {
    player.handleInput({ moveLeft: false, moveRight: true });
    player.updateMovement();
  }

  console.log(`Đã đạt lane ${player.currentLane}`);
}

console.log('\n✅ Final test completed!');
console.log(`Vị trí cuối cùng: ${JSON.stringify(player.getPosition())}`);
