// Test file để kiểm tra imports
import { GameLoop } from './core/engine/GameLoop.js';
import { InputManager } from './core/engine/InputManager.js';
import { PhysicsManager } from './core/engine/PhysicsManager.js';
import { CameraController, CameraMode } from './core/engine/CameraController.js';
import { Player } from './core/entities/Player.js';
import { GAME_CONFIG, Vector3 } from './core/utils/Constants.js';

console.log('✅ All imports successful!');
console.log('GameLoop:', GameLoop);
console.log('InputManager:', InputManager);
console.log('PhysicsManager:', PhysicsManager);
console.log('CameraController:', CameraController);
console.log('Player:', Player);
console.log('GAME_CONFIG:', GAME_CONFIG);
console.log('Vector3:', Vector3);

// Test tạo instances
try {
  console.log('🧪 Testing class instantiation...');
  const gameLoop = new GameLoop();
  console.log('✅ GameLoop instance created');
} catch (error) {
  console.error('❌ GameLoop instantiation failed:', error);
}
