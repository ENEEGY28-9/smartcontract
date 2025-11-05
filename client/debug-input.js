// Debug script để kiểm tra input handling thực tế
class MockInputManager {
  constructor() {
    this.inputState = {
      moveLeft: false,
      moveRight: false
    };
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.inputState.moveLeft = true;
        console.log('🔑 KEY DOWN: A/Left Arrow');
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.inputState.moveRight = true;
        console.log('🔑 KEY DOWN: D/Right Arrow');
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.inputState.moveLeft = false;
        console.log('🔑 KEY UP: A/Left Arrow');
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.inputState.moveRight = false;
        console.log('🔑 KEY UP: D/Right Arrow');
      }
    });
  }

  getInputState() {
    return this.inputState;
  }
}

// Test input trong trình duyệt
console.log('=== INPUT DEBUG TEST ===');
console.log('Mở trình duyệt và nhấn A/D để test input');
console.log('Hoặc chạy đoạn code sau trong console:');

// Simulate input test
const inputManager = new MockInputManager();

let frame = 0;
const testInterval = setInterval(() => {
  frame++;
  const inputState = inputManager.getInputState();

  console.log(`Frame ${frame}: moveLeft=${inputState.moveLeft}, moveRight=${inputState.moveRight}`);

  if (frame >= 20) {
    clearInterval(testInterval);
    console.log('Test completed');
  }
}, 100);

console.log('Test sẽ chạy trong 2 giây. Nhấn A/D trong thời gian này để xem input hoạt động như thế nào.');
