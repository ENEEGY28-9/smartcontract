// Debug script để kiểm tra trực quan camera mouse input
class MouseDebugger {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.cameraPitch = 0;
    this.cameraYaw = 0;
  }

  // Simulate mouse movement
  handleMouseInput(movementX, movementY) {
    // Apply sensitivity and invert Y for natural feel
    this.mouseX = movementX;
    this.mouseY = -movementY; // Invert Y axis

    // Update camera rotation with new sensitivity
    this.cameraYaw -= this.mouseX * 0.002; // Horizontal rotation (increased sensitivity)
    this.cameraPitch -= this.mouseY * 0.002; // Vertical rotation (increased sensitivity)

    // Clamp vertical rotation
    this.cameraPitch = Math.max(-Math.PI/3, Math.min(Math.PI/4, this.cameraPitch));

    console.log(`Mouse: (${this.mouseX.toFixed(1)}, ${this.mouseY.toFixed(1)}) | Camera: Yaw=${this.cameraYaw.toFixed(3)}, Pitch=${this.cameraPitch.toFixed(3)}`);
  }

  // Calculate camera position
  getCameraPosition(playerPos) {
    const distance = 15;
    const height = 4;

    const cameraYaw = this.cameraYaw;
    const cameraPitch = this.cameraPitch;

    const baseCameraX = playerPos.x + Math.sin(cameraYaw) * distance;
    const baseCameraZ = playerPos.z + Math.cos(cameraYaw) * distance;

    // Apply vertical offset based on pitch with enhanced feedback
    const verticalOffset = -Math.sin(cameraPitch) * distance * 1.2;

    const cameraX = baseCameraX;
    const cameraY = playerPos.y + height + verticalOffset;
    const cameraZ = baseCameraZ;

    return { x: cameraX, y: cameraY, z: cameraZ };
  }
}

// Test với các input khác nhau
console.log('=== CAMERA MOUSE INPUT DEBUG ===');
console.log('Testing different mouse movements to understand the issue');

const cameraDebugger = new MouseDebugger();
const playerPos = { x: 0, y: 0, z: 0 };

console.log('\n--- Test 1: Mouse moving UP (should make camera look up) ---');
console.log('Mouse movement: UP (negative Y)');
cameraDebugger.handleMouseInput(0, -10); // Mouse up
const pos1 = cameraDebugger.getCameraPosition(playerPos);
console.log(`Camera position: (${pos1.x.toFixed(2)}, ${pos1.y.toFixed(2)}, ${pos1.z.toFixed(2)})`);

console.log('\n--- Test 2: Mouse moving DOWN (should make camera look down) ---');
console.log('Mouse movement: DOWN (positive Y)');
cameraDebugger.handleMouseInput(0, 10); // Mouse down
const pos2 = cameraDebugger.getCameraPosition(playerPos);
console.log(`Camera position: (${pos2.x.toFixed(2)}, ${pos2.y.toFixed(2)}, ${pos2.z.toFixed(2)})`);

console.log('\n--- Test 3: Mouse moving RIGHT (should rotate camera horizontally) ---');
console.log('Mouse movement: RIGHT (positive X)');
cameraDebugger.handleMouseInput(10, 0); // Mouse right
const pos3 = cameraDebugger.getCameraPosition(playerPos);
console.log(`Camera position: (${pos3.x.toFixed(2)}, ${pos3.y.toFixed(2)}, ${pos3.z.toFixed(2)})`);

console.log('\n--- Test 4: Mouse moving LEFT (should rotate camera horizontally) ---');
console.log('Mouse movement: LEFT (negative X)');
cameraDebugger.handleMouseInput(-10, 0); // Mouse left
const pos4 = cameraDebugger.getCameraPosition(playerPos);
console.log(`Camera position: (${pos4.x.toFixed(2)}, ${pos4.y.toFixed(2)}, ${pos4.z.toFixed(2)})`);

console.log('\n✅ Debug test completed!');
console.log('Check if camera responds intuitively to mouse movements.');
