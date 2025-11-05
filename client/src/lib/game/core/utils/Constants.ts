// Three.js Vector3 import at the top
import * as THREE from 'three';

// Game Constants and Configuration
export const GAME_CONFIG = {
  // Physics constants
  GRAVITY: -9.81,
  PLAYER_SPEED: 10,
  JUMP_FORCE: 8,
  SLIDE_DURATION: 1000,

  // Lane configuration
  LANE_WIDTH: 2.8,  // Slightly reduced for smoother lane transitions
  TRACK_SEGMENT_LENGTH: 20,
  LANE_COUNT: 3, // Total number of lanes (-1, 0, 1)
  MIN_LANE: -1,  // Leftmost lane
  MAX_LANE: 1,   // Rightmost lane

  // Camera settings - optimized for clear visual feedback
  CAMERA_DISTANCE: 15,  // Increased distance for much better vertical movement visibility
  CAMERA_HEIGHT: 4,     // Higher for better overview and clearer up/down movement
  CAMERA_SMOOTHING: 0.08,  // Faster smoothing for more responsive feel

  // Input sensitivity - increased for better responsiveness
  MOUSE_SENSITIVITY: 0.015,   // Ultra-high sensitivity for instant camera response
  TOUCH_SENSITIVITY: 0.006,   // Better touch responsiveness

  // Game progression
  SPEED_INCREASE_INTERVAL: 30000, // 30 seconds
  SPEED_INCREASE_FACTOR: 0.05,   // 5% increase

  // World settings
  WORLD_SIZE: 100,
  SEGMENT_POOL_SIZE: 10,
} as const;

export const PHYSICS_CONFIG = {
  GRAVITY: { x: 0.0, y: -9.81, z: 0.0 },
  PLAYER_MASS: 1.0,
  PLAYER_FRICTION: 0.3,
  PLAYER_RESTITUTION: 0.1,
} as const;

// Export Three.js Vector3 for coordinates (compatible with Three.js)
export const Vector3 = THREE.Vector3;

// Input action types
export enum InputAction {
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  MOVE_FORWARD = 'move_forward',
  JUMP = 'jump',
  SLIDE = 'slide',
  PAUSE = 'pause',
  CAMERA_ROTATE = 'camera_rotate',
  MOUSE_MOVE_X = 'mouse_move_x',  // Mouse X movement for strafing
  MOUSE_MOVE_Y = 'mouse_move_y',  // Mouse Y movement for forward/backward
  EXIT_POINTER_LOCK = 'exit_pointer_lock'  // Exit pointer lock with ESC
}

// Game states
export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

// Biome types
export enum BiomeType {
  FOREST = 'forest',
  DESERT = 'desert',
  ICE = 'ice',
  FIRE = 'fire'
}
