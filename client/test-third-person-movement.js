// Test third-person camera movement
// Note: This would need THREE.js in a real environment
// For this test, we'll simulate the behavior
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  LANE_WIDTH: 3,
  PLAYER_SPEED: 10
};

class MockCamera {
  constructor() {
    this.rotationY = 0; // Rotation around Y axis
    this.rotationX = 0; // Rotation around X axis
  }

  getWorldDirection() {
    // Simulate camera looking forward and down
    // Camera rotation affects direction
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);

    return {
      x: sinY * cosX,
      y: -sinX,
      z: cosY * cosX
    };
  }

  updateRotation(mouseX, mouseY) {
    this.rotationY += mouseX * 0.002;
    this.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotationX + mouseY * 0.002));
  }
}

class ThirdPersonPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.meshPosition = { x: 0, y: 0, z: 0 };
    this.camera = null;
    this.isStrafing = false;
    this.strafeDirection = { x: 0, y: 0, z: 0 };
  }

  setCamera(camera) {
    this.camera = camera;
  }

  handleInput(inputState) {
    if (this.camera && (inputState.moveLeft || inputState.moveRight || inputState.moveForward)) {
      this.handleThirdPersonMovement(inputState);
    } else {
      // Fallback to lane movement
      if (inputState.moveLeft && this.desiredLane > GAME_CONFIG.MIN_LANE) {
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
      } else if (inputState.moveRight && this.desiredLane < GAME_CONFIG.MAX_LANE) {
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
      }
      this.targetLane = this.desiredLane;
    }
  }

  handleThirdPersonMovement(inputState) {
    if (!this.camera) return;

    const cameraDirection = this.camera.getWorldDirection();

    // Calculate right vector (perpendicular to camera direction and up)
    const up = { x: 0, y: 1, z: 0 };
    const rightVector = {
      x: cameraDirection.z * up.y - cameraDirection.y * up.z,
      y: cameraDirection.x * up.z - cameraDirection.z * up.x,
      z: cameraDirection.y * up.x - cameraDirection.x * up.y
    };

    // Normalize right vector
    const length = Math.sqrt(rightVector.x * rightVector.x + rightVector.y * rightVector.y + rightVector.z * rightVector.z);
    if (length > 0) {
      rightVector.x /= length;
      rightVector.y /= length;
      rightVector.z /= length;
    }

    this.strafeDirection = { x: 0, y: 0, z: 0 };

    if (inputState.moveLeft) {
      this.strafeDirection.x += rightVector.x * -1;
      this.strafeDirection.z += rightVector.z * -1;
    }
    if (inputState.moveRight) {
      this.strafeDirection.x += rightVector.x * 1;
      this.strafeDirection.z += rightVector.z * 1;
    }
    if (inputState.moveForward) {
      // Move forward relative to camera direction (flatten to ignore vertical component)
      const forwardVector = {
        x: cameraDirection.x,
        y: 0, // Remove vertical component
        z: cameraDirection.z
      };
      // Normalize forward vector
      const forwardLength = Math.sqrt(forwardVector.x * forwardVector.x + forwardVector.z * forwardVector.z);
      if (forwardLength > 0) {
        forwardVector.x /= forwardLength;
        forwardVector.z /= forwardLength;
      }
      this.strafeDirection.x += forwardVector.x;
      this.strafeDirection.z += forwardVector.z;
    }

    const strafeLength = Math.sqrt(this.strafeDirection.x * this.strafeDirection.x + this.strafeDirection.z * this.strafeDirection.z);
    if (strafeLength > 0) {
      this.strafeDirection.x = (this.strafeDirection.x / strafeLength) * GAME_CONFIG.PLAYER_SPEED * 0.5;
      this.strafeDirection.z = (this.strafeDirection.z / strafeLength) * GAME_CONFIG.PLAYER_SPEED * 0.5;
      this.isStrafing = true;
    } else {
      this.isStrafing = false;
    }
  }

  updateMovement(deltaTime = 0.016) {
    if (this.isStrafing && this.camera) {
      this.meshPosition.x += this.strafeDirection.x * deltaTime;
      this.meshPosition.z += this.strafeDirection.z * deltaTime;
    }
  }

  getPosition() {
    return { ...this.meshPosition };
  }
}

// Test third-person movement
console.log('=== THIRD-PERSON CAMERA MOVEMENT TEST ===');

const camera = new MockCamera();
const player = new ThirdPersonPlayer();
player.setCamera(camera);

// Test 1: Camera rotation
console.log('\n--- Test 1: Camera rotation ---');
console.log(`Initial camera rotation: Y=${camera.rotationY.toFixed(3)}, X=${camera.rotationX.toFixed(3)}`);

camera.updateRotation(1.0, 0.0); // Rotate right
console.log(`After rotating right: Y=${camera.rotationY.toFixed(3)}, X=${camera.rotationX.toFixed(3)}`);

camera.updateRotation(0.0, -0.5); // Rotate left
console.log(`After rotating left: Y=${camera.rotationY.toFixed(3)}, X=${camera.rotationX.toFixed(3)}`);

const direction = camera.getWorldDirection();
console.log(`Camera direction: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)}, ${direction.z.toFixed(3)})`);

// Test 2: Strafing movement
console.log('\n--- Test 2: Strafing movement ---');
console.log(`Initial position: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

// Move right relative to camera
player.handleInput({ moveLeft: false, moveRight: true });
player.updateMovement();
console.log(`After strafing right: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

// Rotate camera and strafe again
camera.updateRotation(0.5, 0.0); // Rotate more
player.handleInput({ moveLeft: false, moveRight: true });
player.updateMovement();
console.log(`After rotating camera and strafing right again: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

console.log('\n✅ Third-person movement test completed!');
console.log('Movement should be relative to camera direction, not world coordinates.');
