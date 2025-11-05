// Complete game simulation để debug vấn đề lane movement
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_WIDTH: 3,
  LANE_CHANGE_SPEED: 12.0,
  LERP_FACTOR: 0.5
};

class CompletePlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.meshPosition = { x: 0, y: 0, z: 0 };
    this.frameCount = 0;
  }

  handleInput(inputState) {
    // Handle lane movement - allow continuous lane changes when holding keys
    if (inputState.moveLeft) {
      if (this.desiredLane > GAME_CONFIG.MIN_LANE) {
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
        console.log(`🔄 Frame ${this.frameCount}: Input LEFT - desiredLane: ${this.desiredLane}`);
      }
    } else if (inputState.moveRight) {
      if (this.desiredLane < GAME_CONFIG.MAX_LANE) {
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
        console.log(`🔄 Frame ${this.frameCount}: Input RIGHT - desiredLane: ${this.desiredLane}`);
      }
    }

    this.targetLane = this.desiredLane;
  }

  update(deltaTime = 0.016) {
    this.frameCount++;

    // Update lane position smoothly
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

    // Update mesh position with lerp (simulating Three.js lerp)
    const targetPositionX = this.currentLane * GAME_CONFIG.LANE_WIDTH;
    this.meshPosition.x += (targetPositionX - this.meshPosition.x) * GAME_CONFIG.LERP_FACTOR;

    console.log(`🚶 Frame ${this.frameCount}: lane=${this.currentLane.toFixed(3)}, position=(${this.meshPosition.x.toFixed(3)}, ${this.meshPosition.y}, ${this.meshPosition.z})`);
  }

  getPosition() {
    return { ...this.meshPosition };
  }
}

// Simulate game loop với input pattern thực tế
console.log('=== COMPLETE GAME SIMULATION ===');
console.log('Mô phỏng game loop với input pattern thực tế');

const player = new CompletePlayer();

// Test 1: Nhấn A một lần (như người dùng thường làm)
console.log('\n--- Test 1: Nhấn A một lần ---');
player.handleInput({ moveLeft: true, moveRight: false });
player.update();

// Test 2: Giữ A liên tục (như người dùng giữ phím)
console.log('\n--- Test 2: Giữ A liên tục ---');
for (let i = 0; i < 10; i++) {
  player.handleInput({ moveLeft: true, moveRight: false }); // Giữ phím
  player.update();
}

// Test 3: Nhả A và nhấn D
console.log('\n--- Test 3: Nhả A và nhấn D ---');
player.handleInput({ moveLeft: false, moveRight: false }); // Nhả phím
player.update();
player.handleInput({ moveLeft: false, moveRight: true }); // Nhấn D
player.update();

// Test 4: Giữ D liên tục
console.log('\n--- Test 4: Giữ D liên tục ---');
for (let i = 0; i < 10; i++) {
  player.handleInput({ moveLeft: false, moveRight: true }); // Giữ phím
  player.update();
}

// Test 5: Di chuyển qua lại nhiều lần
console.log('\n--- Test 5: Di chuyển qua lại nhiều lần ---');
for (let cycle = 0; cycle < 3; cycle++) {
  console.log(`\nCycle ${cycle + 1}:`);

  // Đi về trái
  for (let i = 0; i < 8; i++) {
    player.handleInput({ moveLeft: true, moveRight: false });
    player.update();
  }

  // Đi về phải
  for (let i = 0; i < 8; i++) {
    player.handleInput({ moveLeft: false, moveRight: true });
    player.update();
  }
}

console.log('\n✅ Simulation completed!');
