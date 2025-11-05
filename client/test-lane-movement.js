// Quick test for lane movement logic
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_COUNT: 3
};

class MockPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
  }

  // Simulate the new input handling logic
  handleInput(moveLeft, moveRight) {
    if (moveLeft) {
      this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
      console.log(`Moving left: currentLane=${this.currentLane}, desiredLane=${this.desiredLane}`);
    } else if (moveRight) {
      this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
      console.log(`Moving right: currentLane=${this.currentLane}, desiredLane=${this.desiredLane}`);
    }

    // Update target lane to match desired lane
    this.targetLane = this.desiredLane;
  }

  // Simulate movement update
  updateMovement(deltaTime = 0.016) { // ~60fps
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) {
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const laneChangeSpeed = 8.0;
      const moveAmount = laneChangeSpeed * deltaTime;
      this.currentLane += direction * moveAmount;

      if (direction > 0 && this.currentLane >= this.targetLane - 0.01) {
        this.currentLane = this.targetLane;
      } else if (direction < 0 && this.currentLane <= this.targetLane + 0.01) {
        this.currentLane = this.targetLane;
      }

      console.log(`Updating movement: currentLane=${this.currentLane.toFixed(3)}, targetLane=${this.targetLane}, desiredLane=${this.desiredLane}`);
    }
  }
}

// Test the lane movement
console.log('=== Testing Lane Movement Logic ===');

const player = new MockPlayer();

// Test 1: Hold left key - should allow continuous movement to leftmost lane
console.log('\n--- Test 1: Holding left key (should reach lane -1) ---');
for (let i = 0; i < 15; i++) {
  player.handleInput(true, false); // Hold left
  player.updateMovement();
  if (i < 5 || i > 10) { // Log first few and last few steps
    console.log(`Step ${i}: currentLane=${player.currentLane.toFixed(3)}, targetLane=${player.targetLane}, desiredLane=${player.desiredLane}`);
  }
}

// Test 2: Hold right key - should allow continuous movement to rightmost lane
console.log('\n--- Test 2: Holding right key (should reach lane 1) ---');
player.currentLane = 0;
player.targetLane = 0;
player.desiredLane = 0;
for (let i = 0; i < 15; i++) {
  player.handleInput(false, true); // Hold right
  player.updateMovement();
  if (i < 5 || i > 10) { // Log first few and last few steps
    console.log(`Step ${i}: currentLane=${player.currentLane.toFixed(3)}, targetLane=${player.targetLane}, desiredLane=${player.desiredLane}`);
  }
}

// Test 3: Switch directions while moving
console.log('\n--- Test 3: Switch directions while moving ---');
player.currentLane = 0;
player.targetLane = 0;
player.desiredLane = 0;
player.handleInput(true, false); // Start moving left
player.updateMovement();
player.updateMovement();
console.log(`After starting left: currentLane=${player.currentLane.toFixed(3)}, targetLane=${player.targetLane}, desiredLane=${player.desiredLane}`);

player.handleInput(false, true); // Switch to right while moving
player.updateMovement();
console.log(`After switching to right: currentLane=${player.currentLane.toFixed(3)}, targetLane=${player.targetLane}, desiredLane=${player.desiredLane}`);

// Test 4: Test with more lanes (5 lanes total: -2, -1, 0, 1, 2)
console.log('\n--- Test 4: Testing with expanded lane system (-2 to 2) ---');
const EXPANDED_CONFIG = {
  MIN_LANE: -2,
  MAX_LANE: 2,
  LANE_COUNT: 5
};

class ExpandedMockPlayer extends MockPlayer {
  handleInput(moveLeft, moveRight) {
    if (moveLeft) {
      this.desiredLane = Math.max(EXPANDED_CONFIG.MIN_LANE, this.desiredLane - 1);
      console.log(`Moving left (expanded): currentLane=${this.currentLane}, desiredLane=${this.desiredLane}`);
    } else if (moveRight) {
      this.desiredLane = Math.min(EXPANDED_CONFIG.MAX_LANE, this.desiredLane + 1);
      console.log(`Moving right (expanded): currentLane=${this.currentLane}, desiredLane=${this.desiredLane}`);
    }
    this.targetLane = this.desiredLane;
  }
}

const expandedPlayer = new ExpandedMockPlayer();
expandedPlayer.currentLane = 0;
expandedPlayer.targetLane = 0;
expandedPlayer.desiredLane = 0;

// Move to leftmost lane
for (let i = 0; i < 25; i++) {
  expandedPlayer.handleInput(true, false);
  expandedPlayer.updateMovement();
  if (i < 5 || (i > 15 && expandedPlayer.currentLane <= EXPANDED_CONFIG.MIN_LANE + 0.1)) {
    console.log(`Step ${i}: currentLane=${expandedPlayer.currentLane.toFixed(3)}, desiredLane=${expandedPlayer.desiredLane}`);
  }
}

console.log(`\n✅ Lane movement logic test completed`);
