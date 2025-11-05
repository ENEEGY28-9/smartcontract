// Test camera movement không cần giữ chuột trái
const GAME_CONFIG = {
  MOUSE_SENSITIVITY: 0.002,
  TOUCH_SENSITIVITY: 0.005
};

class MockInputManager {
  constructor() {
    this.mouseInput = {
      movementX: 0,
      movementY: 0,
      buttons: {}
    };
    this.inputState = {
      cameraRotate: false
    };
    this.isTouchActive = false;
  }

  // Simulate mouse move (luôn capture movement)
  simulateMouseMove(movementX, movementY) {
    this.mouseInput.movementX = movementX;
    this.mouseInput.movementY = movementY;
  }

  // Simulate touch (cho mobile)
  simulateTouchStart() {
    this.inputState.cameraRotate = true;
    this.isTouchActive = true;
  }

  simulateTouchMove(deltaX, deltaY) {
    if (this.isTouchActive) {
      this.mouseInput.movementX = deltaX * GAME_CONFIG.TOUCH_SENSITIVITY;
      this.mouseInput.movementY = deltaY * GAME_CONFIG.TOUCH_SENSITIVITY;
    }
  }

  getMouseInput() {
    return this.mouseInput;
  }

  isActionPressed() {
    return this.inputState.cameraRotate;
  }
}

class MockCameraController {
  constructor() {
    this.currentRotation = { x: 0, y: 0 };
    this.mouseSensitivity = GAME_CONFIG.MOUSE_SENSITIVITY;
  }

  handleMouseInput() {
    const mouseInput = this.inputManager.getMouseInput();

    // Always update camera rotation based on mouse movement (no need to hold mouse button)
    if (mouseInput.movementX !== 0 || mouseInput.movementY !== 0) {
      this.currentRotation.y -= mouseInput.movementX * this.mouseSensitivity;
      this.currentRotation.x -= mouseInput.movementY * this.mouseSensitivity;

      // Clamp vertical rotation to prevent flipping
      this.currentRotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.currentRotation.x)
      );

      console.log(`Camera rotation: Y=${this.currentRotation.y.toFixed(3)}, X=${this.currentRotation.x.toFixed(3)}`);
    }
  }

  setInputManager(inputManager) {
    this.inputManager = inputManager;
  }
}

// Test camera movement
console.log('=== CAMERA MOVEMENT TEST (No Hold Required) ===');

const inputManager = new MockInputManager();
const cameraController = new MockCameraController();
cameraController.setInputManager(inputManager);

console.log('\n--- Test 1: Mouse movement without holding button ---');
console.log('Initial rotation:', cameraController.currentRotation);

// Simulate mouse movement (không cần giữ chuột trái)
inputManager.simulateMouseMove(10, 5); // 10px right, 5px down
cameraController.handleMouseInput();

inputManager.simulateMouseMove(-8, -3); // 8px left, 3px up
cameraController.handleMouseInput();

console.log('\n--- Test 2: Touch simulation ---');
inputManager.simulateTouchStart();
inputManager.simulateTouchMove(15, 8); // Touch drag
cameraController.handleMouseInput();

console.log('\n✅ Camera movement test completed!');
console.log('Camera should rotate with any mouse/touch movement, no button hold required.');
