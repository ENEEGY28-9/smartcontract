// Test camera follow behavior - should only follow when there's mouse input
const GAME_CONFIG = {
  CAMERA_DISTANCE: 15,
  CAMERA_HEIGHT: 4,
  CAMERA_SMOOTHING: 0.12,
  MOUSE_SENSITIVITY: 0.002
};

class MockCameraController {
  constructor() {
    this.currentRotation = { x: 0, y: 0 };
    this.mouseSensitivity = GAME_CONFIG.MOUSE_SENSITIVITY;
    this.config = {
      distance: GAME_CONFIG.CAMERA_DISTANCE,
      height: GAME_CONFIG.CAMERA_HEIGHT,
      smoothing: GAME_CONFIG.CAMERA_SMOOTHING
    };
    this.position = { x: 0, y: 5, z: 15 };
    this.targetPosition = { x: 0, y: 0, z: 0 };

    // Mouse input tracking
    this.hasMouseInput = false;
    this.lastMouseInputTime = 0;
  }

  handleMouseInput(mouseX, mouseY) {
    if (mouseX !== 0 || mouseY !== 0) {
      this.currentRotation.y -= mouseX * this.mouseSensitivity;
      this.currentRotation.x -= mouseY * this.mouseSensitivity;

      this.currentRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/4, this.currentRotation.x));

      this.hasMouseInput = true;
      this.lastMouseInputTime = Date.now();

      console.log(`Mouse input detected: Yaw=${this.currentRotation.y.toFixed(3)}, Pitch=${this.currentRotation.x.toFixed(3)}`);
    }
  }

  updateCameraPosition(playerPosition) {
    const currentTime = Date.now();
    const timeSinceLastInput = currentTime - this.lastMouseInputTime;

    if (this.hasMouseInput && timeSinceLastInput < 2000) {
      this.updateCameraPositionWithInput(playerPosition);
    } else {
      this.updateCameraPositionPassive(playerPosition);
    }

    if (timeSinceLastInput > 5000) {
      this.hasMouseInput = false;
    }
  }

  updateCameraPositionWithInput(playerPosition) {
    const distance = this.config.distance;
    const height = this.config.height;
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    const baseCameraX = playerPosition.x + Math.sin(cameraYaw) * distance;
    const baseCameraZ = playerPosition.z + Math.cos(cameraYaw) * distance;
    const verticalOffset = -Math.sin(cameraPitch) * distance * 1.2;

    const cameraX = baseCameraX;
    const cameraY = playerPosition.y + height + verticalOffset;
    const cameraZ = baseCameraZ;

    this.targetPosition = { x: cameraX, y: cameraY, z: cameraZ };
    this.position.x += (this.targetPosition.x - this.position.x) * this.config.smoothing;
    this.position.y += (this.targetPosition.y - this.position.y) * this.config.smoothing;
    this.position.z += (this.targetPosition.z - this.position.z) * this.config.smoothing;

    console.log(`Camera with input: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
  }

  updateCameraPositionPassive(playerPosition) {
    const distance = this.config.distance * 0.8;
    const height = this.config.height;
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    const cameraX = playerPosition.x + Math.sin(cameraYaw) * distance;
    const cameraZ = playerPosition.z + Math.cos(cameraYaw) * distance;
    const cameraY = playerPosition.y + height;

    this.targetPosition = { x: cameraX, y: cameraY, z: cameraZ };
    this.position.x += (this.targetPosition.x - this.position.x) * 0.02; // Very slow
    this.position.y += (this.targetPosition.y - this.position.y) * 0.02;
    this.position.z += (this.targetPosition.z - this.position.z) * 0.02;

    console.log(`Camera passive: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
  }

  getPosition() {
    return { ...this.position };
  }
}

// Test camera follow behavior
console.log('=== CAMERA FOLLOW BEHAVIOR TEST ===');

const camera = new MockCameraController();
let playerPosition = { x: 0, y: 0, z: 0 };

console.log('\n--- Test 1: No mouse input - camera should follow slowly ---');
console.log(`Initial hasMouseInput: ${camera.hasMouseInput}`);
for (let i = 0; i < 5; i++) {
  playerPosition.z += 2; // Player moves forward
  camera.updateCameraPosition(playerPosition);
}

console.log('\n--- Test 2: Mouse input - camera should follow normally ---');
camera.handleMouseInput(0.1, 0.0); // Rotate camera right
playerPosition.z += 2; // Player moves forward
camera.updateCameraPosition(playerPosition);

console.log('\n--- Test 3: Wait 3 seconds then no mouse input - camera should follow slowly ---');
// Simulate waiting 3 seconds
camera.lastMouseInputTime = Date.now() - 3000;
camera.hasMouseInput = false;

for (let i = 0; i < 5; i++) {
  playerPosition.z += 2; // Player moves forward
  camera.updateCameraPosition(playerPosition);
}

console.log('\n✅ Camera follow behavior test completed!');
console.log('Camera should only follow actively when there is mouse input.');
