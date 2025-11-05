import * as THREE from 'three';
import { InputManager, InputAction } from './InputManager';
import { Player } from '../entities/Player';
import { GAME_CONFIG, Vector3 } from '../utils/Constants';

export enum CameraMode {
  THIRD_PERSON = 'third_person',
  FIRST_PERSON = 'first_person',
  CINEMATIC = 'cinematic',
}

export interface CameraConfig {
  mode?: CameraMode;
  distance?: number;
  height?: number;
  smoothing?: number;
  mouseSensitivity?: number;
  followSpeed?: number;
}

export class CameraController {
  private camera: THREE.Camera;
  private player: Player;
  private inputManager: InputManager;

  private config: Required<CameraConfig>;
  private currentMode: CameraMode;

  // Camera position and rotation
  private targetPosition = new THREE.Vector3();
  private targetRotation = new THREE.Quaternion();
  private currentRotation = { x: 0, y: 0 };

  // Mouse look state
  private isMouseLookActive = false;
  private mouseSensitivity: number;
  private hasMouseInput = false; // Track if there's recent mouse input
  private lastMouseInputTime = 0;
  private mouseMovementThreshold = 0.01; // Ultra-low threshold for maximum responsiveness
  private lastPlayerPosition = new THREE.Vector3(); // Track player position to detect movement

  // Mouse movement control mode (unified: Both Mouse X and Y control camera rotation for 360° directional movement)
  private mouseControlsMovement = true; // Set to true for unified control: Mouse movement controls both camera rotation and player direction

  // Camera collision detection
  private raycaster = new THREE.Raycaster();

  // Camera zoom/transition state
  private targetDistance: number = GAME_CONFIG.CAMERA_DISTANCE;
  private currentDistance: number = GAME_CONFIG.CAMERA_DISTANCE;
  private distanceTransitionSpeed = 0.4; // Very fast base speed for instant zoom response
  private baseTransitionSpeed = 0.4; // Base speed for calculations

  constructor(
    camera: THREE.Camera,
    player: Player,
    inputManager: InputManager,
    config: CameraConfig = {}
  ) {
    this.camera = camera;
    this.player = player;
    this.inputManager = inputManager;

    this.config = {
      mode: CameraMode.THIRD_PERSON,
      distance: GAME_CONFIG.CAMERA_DISTANCE,
      height: GAME_CONFIG.CAMERA_HEIGHT,
      smoothing: 0.08,  // Ultra-fast smoothing for maximum responsiveness
      mouseSensitivity: GAME_CONFIG.MOUSE_SENSITIVITY,
      followSpeed: 0.1,
      ...config,
    };

    this.currentMode = this.config.mode;
    this.mouseSensitivity = this.config.mouseSensitivity * 4.0; // Apply multiplier for better responsiveness

    // Initialize mouse control mode - default to player movement control
    this.mouseControlsMovement = true;

    // Initialize camera distance state
    this.targetDistance = this.config.distance;
    this.currentDistance = this.config.distance;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for camera control
   */
  private setupEventListeners(): void {
    // Mouse look toggle (right mouse button)
    document.addEventListener('mousedown', (event) => {
      if (event.button === 2) { // Right mouse button
        this.isMouseLookActive = true;
      }
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 2) { // Right mouse button
        this.isMouseLookActive = false;
      }
    });

    document.addEventListener('contextmenu', (event) => {
      event.preventDefault(); // Prevent context menu
    });
  }

  /**
   * Update camera position and rotation
   */
  update(deltaTime: number): void {
    this.handleMouseInput();
    this.updateCameraDistance(deltaTime);
    this.updateCameraPosition();
    this.updateCameraRotation();
    this.handleCameraCollision();

    // Check if we should disable mouse input tracking (increased timeout for better UX)
    const currentTime = Date.now();
    if (currentTime - this.lastMouseInputTime > 10000) { // 10 seconds instead of 3
      this.hasMouseInput = false;
    }
  }

  /**
   * Update camera distance with ultra-smooth interpolation (completely independent of mouse input)
   */
  private updateCameraDistance(deltaTime: number): void {
    // Pre-calculate values for better performance
    const distanceDiff = this.targetDistance - this.currentDistance;
    const absDistanceDiff = Math.abs(distanceDiff);

    // Early exit if already close enough
    if (absDistanceDiff < 0.01) {
      this.currentDistance = this.targetDistance;
      this.config.distance = this.currentDistance;
      return;
    }

    // Debug logging for zoom operations
    if (absDistanceDiff > 2) {
      console.log(`📷 Camera Distance Debug - Current: ${this.currentDistance.toFixed(2)}, Target: ${this.targetDistance.toFixed(2)}, Diff: ${absDistanceDiff.toFixed(2)}`);
    }

    // Use aggressive adaptive speed for instant response
    let transitionSpeed = this.baseTransitionSpeed;

    // Always use maximum adaptive speed - camera distance is completely independent
    if (absDistanceDiff > 20) {
      transitionSpeed = this.baseTransitionSpeed * 6.0; // 6x speed for very large zoom out
      console.log(`📷 Using 6x speed for very large zoom out: ${absDistanceDiff.toFixed(2)}`);
    } else if (absDistanceDiff > 15) {
      transitionSpeed = this.baseTransitionSpeed * 4.5; // 4.5x speed for large zoom out
      console.log(`📷 Using 4.5x speed for large zoom out: ${absDistanceDiff.toFixed(2)}`);
    } else if (absDistanceDiff > 10) {
      transitionSpeed = this.baseTransitionSpeed * 3.5; // 3.5x speed for medium zoom out
      console.log(`📷 Using 3.5x speed for medium zoom out: ${absDistanceDiff.toFixed(2)}`);
    } else if (absDistanceDiff > 5) {
      transitionSpeed = this.baseTransitionSpeed * 2.2; // 2.2x speed for small zoom out
    } else {
      transitionSpeed = this.baseTransitionSpeed * 1.4; // 1.4x speed for tiny zoom out
    }

    // Use ultra-fast easing for instant response
    const t = Math.min(1, transitionSpeed * deltaTime * 60);

    // Use ease-out-cubic for natural feel
    const easeOutCubic = 1 - Math.pow(1 - t, 3);

    const distanceIncrement = distanceDiff * easeOutCubic;
    this.currentDistance += distanceIncrement;

    // Update config distance to match current distance
    this.config.distance = this.currentDistance;

    // Debug final result
    if (absDistanceDiff > 2) {
      console.log(`📷 Camera distance updated: +${distanceIncrement.toFixed(3)}, New distance: ${this.currentDistance.toFixed(2)}`);
    }
  }

  /**
   * Handle mouse input for camera rotation
   * Supports both horizontal (yaw) and vertical (pitch) rotation
   * Now works alongside player movement control
   */
  private handleMouseInput(): void {
    const mouseInput = this.inputManager.getMouseInput();

    // Apply mouse input with improved sensitivity - capture every movement
    if (mouseInput.accumulatedMovementX !== 0 || mouseInput.accumulatedMovementY !== 0 || this.isMouseLookActive) {
      // Debug logging for troubleshooting
      if (mouseInput.accumulatedMovementX !== 0 || mouseInput.accumulatedMovementY !== 0) {
        console.log(`🎯 Mouse input applied! accumulatedMovementX: ${mouseInput.accumulatedMovementX.toFixed(3)}, accumulatedMovementY: ${mouseInput.accumulatedMovementY.toFixed(3)}`);
        console.log(`📐 Current rotation before: x=${this.currentRotation.x.toFixed(3)}, y=${this.currentRotation.y.toFixed(3)}`);
      }

      // Apply different sensitivity for vertical vs horizontal movement
      // Vertical movement (pitch) needs higher sensitivity for better feel
      // Horizontal movement (yaw) should be less sensitive for better control
      const horizontalSensitivity = this.mouseSensitivity * 0.4; // Reduced for smoother camera control
      const verticalSensitivity = this.mouseSensitivity * 0.8; // Balanced sensitivity for camera

      // UNIFIED CONTROL: Both Mouse X and Y control camera rotation for full 360° directional movement
      if (this.mouseControlsMovement) {
        // Mouse movement controls camera rotation, which in turn determines player movement direction
        // Horizontal rotation (yaw): left/right mouse movement affects camera left/right rotation
        this.currentRotation.y -= mouseInput.accumulatedMovementX * horizontalSensitivity;

        // Vertical rotation (pitch): up/down mouse movement affects camera up/down rotation
        this.currentRotation.x += mouseInput.accumulatedMovementY * verticalSensitivity;
      } else {
        // Original behavior: both X and Y control camera rotation
        // Horizontal rotation (yaw): left/right mouse movement
        this.currentRotation.y -= mouseInput.accumulatedMovementX * horizontalSensitivity;

        // Vertical rotation (pitch): up/down mouse movement
        this.currentRotation.x += mouseInput.accumulatedMovementY * verticalSensitivity;
      }

      // Clamp vertical rotation to allow full range of motion
      // Range: -85° (down) to +85° (up) for maximum vertical control
      this.currentRotation.x = Math.max(
        -Math.PI * 0.47,  // -85 degrees (looking down)
        Math.min(Math.PI * 0.47, this.currentRotation.x)  // +85 degrees (looking up)
      );

      if (mouseInput.accumulatedMovementX !== 0 || mouseInput.accumulatedMovementY !== 0) {
        console.log(`📐 Rotation after application: x=${this.currentRotation.x.toFixed(3)}, y=${this.currentRotation.y.toFixed(3)}`);
        console.log(`📐 Mouse sensitivity: horizontal=${horizontalSensitivity.toFixed(4)}, vertical=${verticalSensitivity.toFixed(4)}`);
      }

      // Mark that we have mouse input and update timestamp (always update when mouse look is active)
      this.hasMouseInput = true;
      this.lastMouseInputTime = Date.now();

      // Reset accumulated movement after applying it to prevent overflow
      // This is the correct place to reset since we've consumed the input
      this.inputManager.resetAccumulatedMovement();
    }
  }

  /**
   * Update camera position based on mode and player position
   */
  private updateCameraPosition(): void {
    const playerPosition = this.player.getPosition();

    switch (this.currentMode) {
      case CameraMode.THIRD_PERSON:
        this.updateThirdPersonCamera(playerPosition);
        break;
      case CameraMode.FIRST_PERSON:
        this.updateFirstPersonCamera(playerPosition);
        break;
      case CameraMode.CINEMATIC:
        this.updateCinematicCamera(playerPosition);
        break;
    }
  }

  /**
   * Update third person camera position
   * Camera always follows player position - mouse input only affects rotation, not position following
   */
  private updateThirdPersonCamera(playerPosition): void {
    // Check if player is actually moving (position changed significantly)
    const playerMovement = this.lastPlayerPosition.distanceTo(playerPosition as THREE.Vector3);
    const isPlayerMoving = playerMovement > 0.05; // Reduced threshold for better sensitivity

    // Update last player position for next frame
    this.lastPlayerPosition.copy(playerPosition as THREE.Vector3);

    // Camera ALWAYS follows player position - mouse input doesn't affect this
    if (isPlayerMoving) {
      // Player is moving - use responsive following for smooth tracking
      console.log('📷 Responsive camera following - player moving');
      this.updateCameraPositionWithInput(playerPosition);
    } else {
      // Player appears stationary - use gentle following to keep player in view
      // This handles cases where player is running but position hasn't changed much in one frame
      console.log('📷 Gentle camera following - keeping player in view');
      this.updateCameraPositionPassive(playerPosition);
    }

    // Note: Mouse input only affects camera rotation, not position following
  }

  /**
   * Update camera position when there's active mouse input
   */
  private updateCameraPositionWithInput(playerPosition): void {
    // Get camera configuration
    const distance = this.config.distance;
    const height = this.config.height;

    // Extract camera angles (yaw = horizontal rotation, pitch = vertical rotation)
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    // Calculate camera position behind player with orbit support
    // Yaw controls horizontal orbiting, pitch controls vertical angle
    const orbitRadius = distance;

    // Enhanced vertical positioning for better up/down camera movement
    // Camera position relative to player with correct vertical movement
    // When pitch increases (looking up), camera should go higher and potentially back
    // When pitch decreases (looking down), camera should go lower and potentially forward

    // Base camera position (behind player)
    const baseCameraX = playerPosition.x + Math.sin(cameraYaw) * orbitRadius;
    const baseCameraZ = playerPosition.z + Math.cos(cameraYaw) * orbitRadius;

    // Apply vertical offset based on pitch with enhanced visual feedback
    // Convention: positive pitch = looking down, negative pitch = looking up
    // When looking down (positive pitch), camera should go lower
    // When looking up (negative pitch), camera should go higher

    // Use a combination of sin and cos for more natural vertical movement
    const verticalOffset = Math.sin(cameraPitch) * orbitRadius * 0.7; // Vertical offset
    const forwardOffset = Math.cos(cameraPitch) * orbitRadius * 0.3;   // Forward/backward offset for depth

    // Apply forward/backward offset to camera position
    const cameraX = baseCameraX + Math.sin(cameraYaw) * forwardOffset;
    const cameraY = playerPosition.y + height + verticalOffset;
    const cameraZ = baseCameraZ + Math.cos(cameraYaw) * forwardOffset;

    // Set target position for smooth interpolation
    this.targetPosition.set(cameraX, cameraY, cameraZ);

    // Smooth camera movement with normal smoothing when there's input
    this.camera.position.lerp(this.targetPosition, this.config.smoothing);

    // Apply camera rotation to look at the player
    // Camera should always look at the player, not ahead
    this.camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);

    // Debug logging for camera positioning
    if (Math.abs(cameraPitch) > 0.1) {
      console.log(`📷 Camera positioning - Pitch: ${cameraPitch.toFixed(3)}, VerticalOffset: ${verticalOffset.toFixed(2)}, ForwardOffset: ${forwardOffset.toFixed(2)}`);
    }
  }

  /**
   * Update camera position when completely static (no input)
   */
  private updateCameraPositionStatic(): void {
    // When no input at all, camera stays completely still
    // This prevents any unwanted camera movement
    // Camera maintains its current position and rotation
    return;
  }

  /**
   * Update camera position passively when no mouse input (legacy function)
   */
  private updateCameraPositionPassive(playerPosition): void {
    // When no mouse input, camera should follow player very slowly
    // This prevents camera from jumping around but still allows following

    // Calculate a more stable camera position behind player
    const distance = this.config.distance * 0.8; // Slightly closer
    const height = this.config.height;

    // Use current camera rotation for consistency
    const cameraYaw = this.currentRotation.y;
    const cameraPitch = this.currentRotation.x;

    // Enhanced positioning even for passive camera
    const baseCameraX = playerPosition.x + Math.sin(cameraYaw) * distance;
    const baseCameraZ = playerPosition.z + Math.cos(cameraYaw) * distance;

    // Apply vertical offset based on pitch even in passive mode
    const verticalOffset = Math.sin(cameraPitch) * distance * 0.5; // Reduced effect for passive mode
    const forwardOffset = Math.cos(cameraPitch) * distance * 0.2;   // Subtle forward/backward offset

    const cameraX = baseCameraX + Math.sin(cameraYaw) * forwardOffset;
    const cameraY = playerPosition.y + height + verticalOffset;
    const cameraZ = baseCameraZ + Math.cos(cameraYaw) * forwardOffset;

    // Set target position
    this.targetPosition.set(cameraX, cameraY, cameraZ);

    // Moderate smoothing when no input (camera follows smoothly)
    this.camera.position.lerp(this.targetPosition, 0.04); // Balanced following speed

    // Apply camera rotation to look at the player
    // Camera should always look at the player for consistent behavior
    this.camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
  }

  /**
   * Update first person camera position
   */
  private updateFirstPersonCamera(playerPosition): void {
    // Position camera at player's head level
    const headOffset = 1.7; // Approximate head height

    this.targetPosition.set(
      playerPosition.x,
      playerPosition.y + headOffset,
      playerPosition.z
    );

    // Smooth camera movement
    this.camera.position.lerp(this.targetPosition, this.config.followSpeed);
  }

  /**
   * Update cinematic camera position
   */
  private updateCinematicCamera(playerPosition): void {
    // Dynamic camera for cinematic effects (e.g., during jumps)
    const time = Date.now() * 0.001; // Convert to seconds

    // Create a gentle orbiting motion
    const radius = this.config.distance * 1.5;
    const height = this.config.height * 1.2;

    this.targetPosition.set(
      playerPosition.x + Math.sin(time * 0.5) * radius,
      playerPosition.y + height + Math.sin(time * 0.3) * 2,
      playerPosition.z + Math.cos(time * 0.5) * radius
    );

    // Smooth camera movement
    this.camera.position.lerp(this.targetPosition, this.config.smoothing);
  }

  /**
   * Update camera rotation
   */
  private updateCameraRotation(): void {
    // For third-person camera, we need to rotate the camera to look at the player
    // The camera should always look at the player from the calculated position

    // Clamp vertical rotation to prevent camera flipping in third-person mode
    if (this.currentMode === CameraMode.THIRD_PERSON) {
      this.currentRotation.x = Math.max(
        -Math.PI * 0.44,  // Allow more vertical rotation for better control
        Math.min(Math.PI * 0.44, this.currentRotation.x)  // -80 to +80 degrees
      );
    }
  }

  /**
   * Handle camera collision with environment
   */
  private handleCameraCollision(): void {
    if (this.currentMode === CameraMode.FIRST_PERSON) return; // No collision for first person

    const playerPosition = this.player.getPosition();
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Cast ray from player to camera position to check for obstacles
    this.raycaster.set(playerPosition as THREE.Vector3, cameraDirection);

    // This would need scene geometry to check collisions
    // For now, we'll implement a simple distance-based collision avoidance

    const cameraToPlayer = this.camera.position.distanceTo(playerPosition as THREE.Vector3);
    const minDistance = this.config.distance * 0.5;

    if (cameraToPlayer < minDistance) {
      // Move camera closer to prevent clipping
      const pushBack = minDistance - cameraToPlayer;
      const pushDirection = cameraDirection.clone().multiplyScalar(-pushBack);

      this.camera.position.add(pushDirection);
    }
  }

  /**
   * Set camera mode
   */
  setMode(mode: CameraMode): void {
    this.currentMode = mode;
    console.log(`📷 Camera mode changed to: ${mode}`);
  }

  /**
   * Get current camera mode
   */
  getMode(): CameraMode {
    return this.currentMode;
  }

  /**
   * Set mouse sensitivity
   */
  setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity * 4.0; // Apply multiplier for better responsiveness
    this.config.mouseSensitivity = sensitivity; // Keep original value in config
  }

  /**
   * Set mouse control mode (whether mouse controls camera or player movement)
   */
  setMouseControlsMovement(enabled: boolean): void {
    this.mouseControlsMovement = enabled;
    console.log(`📷 Mouse controls movement: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get mouse control mode
   */
  getMouseControlsMovement(): boolean {
    return this.mouseControlsMovement;
  }

  /**
   * Get mouse sensitivity (returns the original value, not the multiplied one)
   */
  getMouseSensitivity(): number {
    return this.config.mouseSensitivity;
  }

  /**
   * Handle direct mouse movement input (for external calls)
   */
  handleMouseMovement(x: number, y: number): void {
    // Convert normalized coordinates (-1 to 1) to rotation angles
    const horizontalSensitivity = this.mouseSensitivity * 2;
    const verticalSensitivity = this.mouseSensitivity * 1.5;

    // Apply rotation based on mouse position
    const deltaYaw = x * horizontalSensitivity;
    const deltaPitch = y * verticalSensitivity;

    this.currentRotation.y += deltaYaw;
    this.currentRotation.x = Math.max(
      -Math.PI * 0.47, // -85 degrees (looking up)
      Math.min(Math.PI * 0.47, this.currentRotation.x + deltaPitch) // +85 degrees (looking down)
    );

    console.log(`📷 Direct mouse movement applied: yaw=${deltaYaw.toFixed(4)}, pitch=${deltaPitch.toFixed(4)}`);
  }

  /**
   * Set camera distance (for third person mode) with smooth transition
   */
  setDistance(distance: number): void {
    this.targetDistance = Math.max(5, Math.min(50, distance)); // Clamp distance between 5-50
  }

  /**
   * Instantly set camera distance (no transition)
   */
  setDistanceInstant(distance: number): void {
    this.targetDistance = Math.max(5, Math.min(50, distance));
    this.currentDistance = this.targetDistance;
    this.config.distance = this.currentDistance;
  }

  /**
   * Get camera distance (current interpolated value)
   */
  getDistance(): number {
    return this.currentDistance;
  }

  /**
   * Get target camera distance (immediate value)
   */
  getTargetDistance(): number {
    return this.targetDistance;
  }

  /**
   * Set distance transition speed (0.01 = very slow, 0.2 = very fast)
   */
  setDistanceTransitionSpeed(speed: number): void {
    this.distanceTransitionSpeed = Math.max(0.01, Math.min(0.2, speed));
  }

  /**
   * Get distance transition speed
   */
  getDistanceTransitionSpeed(): number {
    return this.distanceTransitionSpeed;
  }

  /**
   * Set camera height offset
   */
  setHeight(height: number): void {
    this.config.height = height;
  }

  /**
   * Get camera height offset
   */
  getHeight(): number {
    return this.config.height;
  }

  /**
   * Make camera look at a specific point
   */
  lookAt(point): void {
    this.camera.lookAt(point as THREE.Vector3);
  }

  /**
   * Get camera position
   */
  getPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }

  /**
   * Set camera position
   */
  setPosition(position): void {
    this.camera.position.set(position.x, position.y, position.z);
  }

  /**
   * Get camera forward direction
   */
  getForwardDirection() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return { x: direction.x, y: direction.y, z: direction.z };
  }

  /**
   * Get camera right direction
   */
  getRightDirection() {
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(right);
    right.cross(this.camera.up);
    return { x: right.x, y: right.y, z: right.z };
  }

  /**
   * Reset camera to default state
   */
  reset(): void {
    this.currentRotation = { x: 0, y: 0 };
    this.isMouseLookActive = false;

    // Reset to third person mode
    this.setMode(CameraMode.THIRD_PERSON);
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('mousedown', this.setupEventListeners);
    document.removeEventListener('mouseup', this.setupEventListeners);
    document.removeEventListener('contextmenu', this.setupEventListeners);
  }
}
