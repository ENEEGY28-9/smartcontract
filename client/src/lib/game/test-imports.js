// Test file to check if imports work correctly
import { GameLoop } from './core/engine/GameLoop.js';
import { InputManager } from './core/engine/InputManager.js';
import { PhysicsManager } from './core/engine/PhysicsManager.js';
import { CameraController, CameraMode } from './core/engine/CameraController.js';
import { Player } from './core/entities/Player.js';
import { GAME_CONFIG } from './core/utils/Constants.js';

console.log('✅ All imports successful');
console.log('GameLoop:', GameLoop);
console.log('InputManager:', InputManager);
console.log('PhysicsManager:', PhysicsManager);
console.log('CameraController:', CameraController);
console.log('Player:', Player);
console.log('GAME_CONFIG:', GAME_CONFIG);
