// Test forward movement in third-person mode
const GAME_CONFIG = {
  MIN_LANE: -1,
  MAX_LANE: 1,
  PLAYER_SPEED: 10,
  MOUSE_SENSITIVITY: 0.002
};

class TestCamera {
  constructor() {
    this.rotationY = 0; // Yaw rotation
    this.rotationX = 0; // Pitch rotation
  }

  getWorldDirection() {
    // Simple camera direction calculation
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
}

class TestPlayer {
  constructor() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.position = { x: 0, y: 0, z: 0 };
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
      // Lane movement fallback
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

// Test forward movement
console.log('=== FORWARD MOVEMENT TEST ===');

const camera = new TestCamera();
const player = new TestPlayer();
player.setCamera(camera);

console.log('\n--- Test 1: Forward movement with camera facing forward ---');
console.log(`Initial position: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

// Move forward
player.handleInput({ moveLeft: false, moveRight: false, moveForward: true });
player.updateMovement();
console.log(`After moving forward: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

console.log('\n--- Test 2: Rotate camera and move forward ---');
// Rotate camera right by 90 degrees
camera.rotationY = Math.PI / 2; // 90 degrees

player.handleInput({ moveLeft: false, moveRight: false, moveForward: true });
player.updateMovement();
console.log(`After rotating camera 90° right and moving forward: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

console.log('\n--- Test 3: Combined movement (forward + strafe) ---');
// Reset camera
camera.rotationY = 0;

player.handleInput({ moveLeft: false, moveRight: true, moveForward: true });
player.updateMovement();
console.log(`After moving forward + right: (${player.getPosition().x.toFixed(3)}, ${player.getPosition().y}, ${player.getPosition().z.toFixed(3)})`);

console.log('\n✅ Forward movement test completed!');
console.log('Player can now move forward relative to camera direction.');
