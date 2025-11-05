// Test camera vertical movement specifically
const GAME_CONFIG = {
  CAMERA_DISTANCE: 15,
  CAMERA_HEIGHT: 4,
  MOUSE_SENSITIVITY: 0.002
};

class SimpleCamera {
  constructor() {
    this.currentRotation = { x: 0, y: 0 }; // pitch (x), yaw (y)
    this.mouseSensitivity = GAME_CONFIG.MOUSE_SENSITIVITY;
    this.config = {
      distance: GAME_CONFIG.CAMERA_DISTANCE,
      height: GAME_CONFIG.CAMERA_HEIGHT,
      smoothing: 0.12
    };
    this.position = { x: 0, y: 5, z: 10 };
    this.targetPosition = { x: 0, y: 0, z: 0 };
  }

  handleMouseInput(mouseX, mouseY) {
    if (mouseX !== 0 || mouseY !== 0) {
      // Apply mouse sensitivity - note: movementY is inverted for natural feel
      this.currentRotation.y -= mouseX * this.mouseSensitivity; // Horizontal rotation (yaw)
      this.currentRotation.x -= mouseY * this.mouseSensitivity; // Vertical rotation (pitch)

      // Clamp vertical rotation to prevent flipping
      this.currentRotation.x = Math.max(
        -Math.PI / 3,  // -60 degrees (looking down)
        Math.min(Math.PI / 4, this.currentRotation.x)  // +45 degrees (looking up)
      );

      console.log(`Rotation: Yaw=${this.currentRotation.y.toFixed(3)}, Pitch=${this.currentRotation.x.toFixed(3)}`);
    }
  }

  updateCameraPosition(playerPosition) {
    const distance = this.config.distance;
    const height = this.config.height;
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    // Simple camera positioning with orbit support
    const orbitRadius = distance;

    // Camera position relative to player with correct vertical movement
    const baseCameraX = playerPosition.x + Math.sin(cameraYaw) * orbitRadius;
    const baseCameraZ = playerPosition.z + Math.cos(cameraYaw) * orbitRadius;

    // Convention: positive pitch = looking down, negative pitch = looking up
    const verticalOffset = -Math.sin(cameraPitch) * orbitRadius * 1.2; // Enhanced visual feedback

    const cameraX = baseCameraX;
    const cameraY = playerPosition.y + height + verticalOffset;
    const cameraZ = baseCameraZ;

    this.targetPosition = { x: cameraX, y: cameraY, z: cameraZ };

    // Smooth camera movement
    this.position.x += (this.targetPosition.x - this.position.x) * this.config.smoothing;
    this.position.y += (this.targetPosition.y - this.position.y) * this.config.smoothing;
    this.position.z += (this.targetPosition.z - this.position.z) * this.config.smoothing;
  }

  getPosition() {
    return { ...this.position };
  }
}

// Test camera vertical movement
console.log('=== CAMERA VERTICAL MOVEMENT TEST ===');

const camera = new SimpleCamera();
const playerPosition = { x: 0, y: 0, z: 0 };

console.log('\n--- Test 1: Mouse up movement (should increase pitch) ---');
console.log(`Initial rotation: Pitch=${camera.currentRotation.x.toFixed(3)}, Yaw=${camera.currentRotation.y.toFixed(3)}`);

// Simulate mouse moving up (negative Y movement)
camera.handleMouseInput(0, -1.0); // Mouse up = negative Y movement
camera.updateCameraPosition(playerPosition);
console.log(`After mouse up: Camera at (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

console.log('\n--- Test 2: Mouse down movement (should decrease pitch) ---');
// Simulate mouse moving down (positive Y movement)
camera.handleMouseInput(0, 1.0); // Mouse down = positive Y movement
camera.updateCameraPosition(playerPosition);
console.log(`After mouse down: Camera at (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

console.log('\n--- Test 3: Combined horizontal and vertical movement ---');
// Simulate mouse moving diagonally (right and up)
camera.handleMouseInput(0.5, -0.5); // Right and up
camera.updateCameraPosition(playerPosition);
console.log(`After diagonal movement: Camera at (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

console.log('\n✅ Camera vertical movement test completed!');
console.log('Camera should respond to both horizontal (X) and vertical (Y) mouse movement.');
