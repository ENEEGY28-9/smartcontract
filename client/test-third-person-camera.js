// Test third-person camera stability
const GAME_CONFIG = {
  CAMERA_DISTANCE: 10,
  CAMERA_HEIGHT: 3,
  CAMERA_SMOOTHING: 0.15,
  MOUSE_SENSITIVITY: 0.0015
};

class MockPlayer {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = 0; // Player rotation around Y axis
  }

  setPosition(x, y, z) {
    this.position = { x, y, z };
  }

  setRotation(radians) {
    this.rotation = radians;
  }

  getPosition() {
    return this.position;
  }
}

class ThirdPersonCamera {
  constructor() {
    this.currentRotation = { x: 0, y: 0 };
    this.mouseSensitivity = GAME_CONFIG.MOUSE_SENSITIVITY;
    this.config = {
      distance: GAME_CONFIG.CAMERA_DISTANCE,
      height: GAME_CONFIG.CAMERA_HEIGHT,
      smoothing: GAME_CONFIG.CAMERA_SMOOTHING
    };

    this.targetPosition = { x: 0, y: 0, z: 0 };
    this.currentPosition = { x: 0, y: 5, z: 10 };
  }

  handleMouseInput(mouseX, mouseY) {
    // Update camera rotation based on mouse movement
    if (mouseX !== 0 || mouseY !== 0) {
      this.currentRotation.y -= mouseX * this.mouseSensitivity;
      this.currentRotation.x -= mouseY * this.mouseSensitivity;

      // Clamp vertical rotation to prevent extreme flipping but allow good range
      this.currentRotation.x = Math.max(
        -Math.PI / 3,  // Allow looking down more (-60 degrees)
        Math.min(Math.PI / 4, this.currentRotation.x)  // Allow looking up (45 degrees)
      );

      console.log(`Camera rotation: Y=${this.currentRotation.y.toFixed(3)}, X=${this.currentRotation.x.toFixed(3)}`);
    }
  }

  updateCameraPosition(playerPosition) {
    const distance = this.config.distance;
    const height = this.config.height;

    // Use both yaw (horizontal rotation) and pitch (vertical rotation)
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    // Calculate camera position with both rotations
    // Horizontal offset (yaw)
    const horizontalOffsetX = Math.sin(cameraYaw) * distance;
    const horizontalOffsetZ = Math.cos(cameraYaw) * distance;

    // Vertical offset (pitch affects height and distance)
    const pitchMultiplier = Math.cos(cameraPitch);
    const verticalOffsetY = Math.sin(cameraPitch) * distance * 0.5;

    const cameraX = playerPosition.x - horizontalOffsetX;
    const cameraZ = playerPosition.z - horizontalOffsetZ;
    const cameraY = playerPosition.y + height + verticalOffsetY;

    // Apply pitch to distance for more realistic camera movement
    const adjustedDistance = distance * pitchMultiplier;

    // Recalculate position with adjusted distance (behind player)
    const finalCameraX = playerPosition.x - Math.sin(cameraYaw) * adjustedDistance;
    const finalCameraZ = playerPosition.z - Math.cos(cameraYaw) * adjustedDistance;

    // Set target position
    this.targetPosition = { x: finalCameraX, y: cameraY, z: finalCameraZ };

    // Smooth camera movement
    this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * this.config.smoothing;
    this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * this.config.smoothing;
    this.currentPosition.z += (this.targetPosition.z - this.currentPosition.z) * this.config.smoothing;
  }

  getPosition() {
    return this.currentPosition;
  }
}

// Test camera stability
console.log('=== THIRD-PERSON CAMERA STABILITY TEST ===');

const player = new MockPlayer();
const camera = new ThirdPersonCamera();

console.log('\n--- Test 1: Camera follows player movement ---');
console.log(`Initial camera position: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Player moves forward
player.setPosition(0, 0, 5);
camera.updateCameraPosition(player.getPosition());
console.log(`Camera after player moves forward: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Player moves right
player.setPosition(3, 0, 5);
camera.updateCameraPosition(player.getPosition());
console.log(`Camera after player moves right: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

console.log('\n--- Test 2: Camera rotation around player ---');
console.log(`Initial rotation: Y=${camera.currentRotation.y.toFixed(3)}, X=${camera.currentRotation.x.toFixed(3)}`);

// Rotate camera right
camera.handleMouseInput(1.0, 0.0);
camera.updateCameraPosition(player.getPosition());
console.log(`Camera position after rotating right: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Rotate camera up (should now affect vertical position)
camera.handleMouseInput(0.0, 0.5);
camera.updateCameraPosition(player.getPosition());
console.log(`Camera position after rotating up: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Rotate camera down
camera.handleMouseInput(0.0, -0.8);
camera.updateCameraPosition(player.getPosition());
console.log(`Camera position after rotating down: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

// Test extreme vertical rotation
camera.handleMouseInput(0.0, 1.0); // Try to look up a lot
camera.updateCameraPosition(player.getPosition());
console.log(`Camera position after extreme up rotation: (${camera.getPosition().x.toFixed(2)}, ${camera.getPosition().y.toFixed(2)}, ${camera.getPosition().z.toFixed(2)})`);

console.log('\n✅ Camera stability test completed!');
console.log('Camera should respond to both horizontal and vertical mouse movement.');
