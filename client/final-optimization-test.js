// Final optimization test - comprehensive game feel test
const GAME_CONFIG = {
  // Camera settings - optimized
  CAMERA_DISTANCE: 10,
  CAMERA_HEIGHT: 3.5,
  CAMERA_SMOOTHING: 0.12,
  MOUSE_SENSITIVITY: 0.0012,

  // Lane settings - optimized
  LANE_WIDTH: 2.8,
  LANE_CHANGE_SPEED: 18.0,
  MOVEMENT_LERP: 0.75,

  // Player settings
  PLAYER_SPEED: 10
};

class OptimizedPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.position = { x: 0, y: 0, z: 0 };
    this.meshPosition = { x: 0, y: 0, z: 0 };
  }

  handleInput(inputState) {
    // Optimized lane movement logic
    if (inputState.moveLeft && this.desiredLane > -1) {
      this.desiredLane = Math.max(-1, this.desiredLane - 1);
    } else if (inputState.moveRight && this.desiredLane < 1) {
      this.desiredLane = Math.min(1, this.desiredLane + 1);
    }
    this.targetLane = this.desiredLane;
  }

  updateMovement(deltaTime = 0.016) {
    // Lane-based movement with optimized parameters
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

    // Update position with optimized lerp
    const targetX = this.currentLane * GAME_CONFIG.LANE_WIDTH;
    this.meshPosition.x += (targetX - this.meshPosition.x) * GAME_CONFIG.MOVEMENT_LERP;
    this.meshPosition.y = this.position.y;
    this.meshPosition.z = this.position.z;
  }

  getPosition() {
    return { ...this.meshPosition };
  }
}

class OptimizedCamera {
  constructor() {
    this.currentRotation = { x: 0, y: 0 };
    this.mouseSensitivity = GAME_CONFIG.MOUSE_SENSITIVITY;
    this.config = {
      distance: GAME_CONFIG.CAMERA_DISTANCE,
      height: GAME_CONFIG.CAMERA_HEIGHT,
      smoothing: GAME_CONFIG.CAMERA_SMOOTHING
    };
    this.position = { x: 0, y: 5, z: 10 };
    this.targetPosition = { x: 0, y: 0, z: 0 };
  }

  handleMouseInput(mouseX, mouseY) {
    if (mouseX !== 0 || mouseY !== 0) {
      this.currentRotation.y -= mouseX * this.mouseSensitivity;
      this.currentRotation.x -= mouseY * this.mouseSensitivity;

      // Optimized vertical clamping
      this.currentRotation.x = Math.max(
        -Math.PI / 3,  // -60 degrees
        Math.min(Math.PI / 4, this.currentRotation.x)  // +45 degrees
      );
    }
  }

  updateCameraPosition(playerPosition) {
    const distance = this.config.distance;
    const height = this.config.height;
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    // Optimized camera positioning
    const horizontalOffsetX = Math.sin(cameraYaw) * distance;
    const horizontalOffsetZ = Math.cos(cameraYaw) * distance;
    const pitchMultiplier = Math.cos(cameraPitch);
    const verticalOffsetY = Math.sin(cameraPitch) * distance * 0.3;

    const cameraX = playerPosition.x - horizontalOffsetX;
    const cameraZ = playerPosition.z - horizontalOffsetZ;
    const cameraY = playerPosition.y + height + verticalOffsetY;

    const adjustedDistance = distance * pitchMultiplier;
    const finalCameraX = playerPosition.x - Math.sin(cameraYaw) * adjustedDistance;
    const finalCameraZ = playerPosition.z - Math.cos(cameraYaw) * adjustedDistance;

    this.targetPosition = { x: finalCameraX, y: cameraY, z: finalCameraZ };

    // Optimized smoothing
    this.position.x += (this.targetPosition.x - this.position.x) * this.config.smoothing;
    this.position.y += (this.targetPosition.y - this.position.y) * this.config.smoothing;
    this.position.z += (this.targetPosition.z - this.position.z) * this.config.smoothing;
  }

  getPosition() {
    return { ...this.position };
  }
}

// Comprehensive optimization test
console.log('=== FINAL OPTIMIZATION TEST ===');
console.log('Testing optimized parameters for best game feel');

const player = new OptimizedPlayer();
const camera = new OptimizedCamera();

// Test 1: Smooth lane transitions
console.log('\n--- Test 1: Optimized Lane Movement ---');
for (let i = 0; i < 10; i++) {
  player.handleInput({ moveLeft: true, moveRight: false });
  player.updateMovement();
  const pos = player.getPosition();
  console.log(`Step ${i}: lane=${player.currentLane.toFixed(3)}, pos=(${pos.x.toFixed(3)}, ${pos.y}, ${pos.z})`);
}

// Test 2: Camera following with vertical movement
console.log('\n--- Test 2: Camera Vertical Movement ---');
console.log(`Initial camera: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Rotate camera up
camera.handleMouseInput(0.0, 0.5);
camera.updateCameraPosition(player.getPosition());
console.log(`After looking up: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Rotate camera down
camera.handleMouseInput(0.0, -0.8);
camera.updateCameraPosition(player.getPosition());
console.log(`After looking down: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Test 3: Combined movement
console.log('\n--- Test 3: Combined Player + Camera Movement ---');
player.currentLane = 0;
player.targetLane = 0;
player.desiredLane = 0;

for (let i = 0; i < 5; i++) {
  // Player moves right
  player.handleInput({ moveLeft: false, moveRight: true });
  player.updateMovement();

  // Camera follows and rotates
  camera.handleMouseInput(0.1, 0.05);
  camera.updateCameraPosition(player.getPosition());

  const playerPos = player.getPosition();
  const cameraPos = camera.getPosition();
  console.log(`Frame ${i}: Player(${playerPos.x.toFixed(2)}, ${playerPos.z.toFixed(2)}) | Camera(${cameraPos.x.toFixed(2)}, ${cameraPos.y.toFixed(2)}, ${cameraPos.z.toFixed(2)})`);
}

console.log('\n✅ Final optimization test completed!');
console.log('All parameters have been fine-tuned for optimal game feel.');
