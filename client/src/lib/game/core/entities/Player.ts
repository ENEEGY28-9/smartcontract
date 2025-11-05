import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';
import type { PhysicsBody } from '../engine/PhysicsManager';
import { InputManager, InputAction } from '../engine/InputManager';
import { GAME_CONFIG, Vector3 } from '../utils/Constants';

export interface PlayerConfig {
  position?: Vector3;
  speed?: number;
  jumpForce?: number;
  laneWidth?: number;
}

export class Player {
  private mesh: THREE.Mesh | null = null;
  private physicsBody: PhysicsBody | null = null;
  private physicsManager: PhysicsManager;
  private inputManager: InputManager;

  private config: Required<PlayerConfig>;
  private currentLane = 0; // -1: left, 0: center, 1: right
  private targetLane = 0;
  private desiredLane = 0; // Track player's intended lane destination
  private isGrounded = true;
  private isSliding = false;
  private slideStartTime = 0;
  private justJumped = false; // Flag to prevent velocity override on jump frame

  // Boost state
  private isBoosting = false;
  private boostStartTime = 0;
  private boostDuration = 5; // 5 seconds boost
  private boostMultiplier = 4; // 4x speed boost (increased for visibility)

  // Movement state
  private velocity = new Vector3(0, 0, 0);
  private targetPosition = new Vector3(0, 0, 0);
  
  // Manual jump physics (since Rapier physics doesn't work well)
  private jumpVelocityY = 0;
  private gravity = -20; // Gravity acceleration

  // Third-person camera movement
  private camera: THREE.Camera | null = null;
  private isStrafing = false;
  private strafeDirection = new Vector3(0, 0, 0);

  // Auto forward movement
  private autoForwardMovement = true; // Enable automatic forward movement
  private forwardSpeed = GAME_CONFIG.PLAYER_SPEED;

  constructor(
    physicsManager: PhysicsManager,
    inputManager: InputManager,
    config: PlayerConfig = {}
  ) {
    this.physicsManager = physicsManager;
    this.inputManager = inputManager;

    // Player starts on ground (Y=1.0) - half capsule height above ground plane at Y=0
    // Capsule is 1.0 tall, so center should be at Y=1.0 to sit on ground
    this.config = {
      position: new Vector3(0, 1.0, 0), // Start on ground (capsule height/2 + radius)
      speed: GAME_CONFIG.PLAYER_SPEED,
      jumpForce: GAME_CONFIG.JUMP_FORCE,
      laneWidth: GAME_CONFIG.LANE_WIDTH,
      ...config,
    };

    this.createMesh();
    // Physics body will be created when physics manager is ready
  }

  /**
   * Initialize player physics body when physics manager is ready
   */
  initializePhysics(): void {
    this.createPhysicsBody();
    
    // Force player to start grounded
    this.isGrounded = true;
    
    // CRITICAL: Reset position to ground level
    if (this.physicsBody && this.mesh) {
      const groundY = 1.0;
      
      // Set mesh position
      this.mesh.position.set(0, groundY, 0);
      
      // Set physics position
      this.physicsManager.setBodyPosition(this.physicsBody.handle, {
        x: 0,
        y: groundY,
        z: 0
      });
      
      // CLEAR all velocity!
      this.physicsManager.setVelocity(this.physicsBody.handle, {
        x: 0,
        y: 0,
        z: 0
      });
      
      console.log('✅ Player reset to ground: y=1.0, velocity cleared');
    }
    
    console.log('✅ Player physics initialized, FORCING grounded state to TRUE');
    
    // Log initial state
    setTimeout(() => {
      if (this.physicsBody) {
        const pos = this.physicsManager.getBodyPosition(this.physicsBody.handle);
        const vel = this.physicsManager.getVelocity(this.physicsBody.handle);
        console.log(`📊 Initial player state: y=${pos?.y.toFixed(2)}, vy=${vel?.y.toFixed(2)}, grounded=${this.isGrounded}`);
      }
    }, 100);
  }

  /**
   * Set camera reference for third-person movement
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Handle third-person camera-based movement (mouse strafing + constant forward)
   * - Mouse X: strafing left/right relative to camera direction
   * - Mouse Y: camera rotation only (up/down look around)
   * - Constant forward: nhân vật luôn tiến về phía camera đang nhìn
   * - Kết quả: di chuyển tự do 360° với strafe + forward movement
   */
  private handleThirdPersonMovement(inputState: any, deltaTime: number): void {
    if (!this.camera) return;

    // Get camera forward and right vectors for directional movement
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    const rightVector = new THREE.Vector3()
      .crossVectors(cameraDirection, THREE.Object3D.DEFAULT_UP)
      .normalize();

    // Calculate movement direction based on camera orientation and mouse input
    this.strafeDirection.set(0, 0, 0);

    // Mouse X controls strafing relative to camera direction
    const mouseStrafeAmount = inputState[InputAction.MOUSE_MOVE_X] || 0;
    if (Math.abs(mouseStrafeAmount) > 0.01) {
      // Strafe left/right relative to where camera is facing
      // Mouse right (+X) moves player right, mouse left (-X) moves player left
      this.strafeDirection.add(rightVector.clone().multiplyScalar(mouseStrafeAmount * 1.5));
    }

    // Constant forward movement - nhân vật luôn tiến về phía camera đang nhìn
    if (this.autoForwardMovement) {
      const forwardVector = cameraDirection.clone();
      forwardVector.y = 0; // Remove vertical component for ground movement
      forwardVector.normalize();
      this.strafeDirection.add(forwardVector.multiplyScalar(this.getSpeed() * 0.6));
    }

    // Apply movement with proper scaling (use getSpeed for boost)
    if (this.strafeDirection.length() > 0) {
      this.strafeDirection.normalize().multiplyScalar(this.getSpeed() * 0.7);

      // Update player position
      this.targetPosition.x += this.strafeDirection.x * deltaTime;
      this.targetPosition.z += this.strafeDirection.z * deltaTime;

      // Rotate player to face movement direction (combination of strafing and forward)
      const targetRotation = Math.atan2(this.strafeDirection.x, this.strafeDirection.z);
      if (this.mesh) {
        this.mesh.rotation.y = targetRotation;
      }

      this.isStrafing = true;
    } else {
      this.isStrafing = false;
    }
  }

  /**
   * Create the visual mesh for the player
   */
  private createMesh(): void {
    // Create a simple capsule geometry for the player
    const geometry = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);

    // Create a material with a nice color
    const material = new THREE.MeshLambertMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.8,
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Set initial position
    this.mesh.position.copy(this.config.position as THREE.Vector3);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /**
   * Create physics body for collision detection
   */
  private createPhysicsBody(): void {
    if (!this.physicsManager.isReady()) {
      console.warn('⚠️ Physics manager not ready, skipping physics body creation');
      return;
    }

    this.physicsBody = this.physicsManager.createDynamicBody(this.config.position, {
      mass: 1.0,
      friction: 0.3,
      restitution: 0.1,
    });

    if (this.physicsBody) {
      console.log('✅ Player physics body created');
    }
  }

  /**
   * Update player state
   */
  update(deltaTime: number): void {
    if (!this.mesh || !this.physicsBody) return;

    this.handleInput(deltaTime);
    this.updateMovement(deltaTime);
    this.updatePhysics();
    this.updateMesh();
  }

  /**
   * Handle player input
   */
  private handleInput(deltaTime: number): void {
    const inputState = this.inputManager.getInputState();
    const justPressed = this.inputManager.getJustPressedState();

    // Debug logging for ALL inputs every frame
    const hasAnyInput = justPressed.jump || justPressed.slide || 
                        inputState[InputAction.MOVE_LEFT] || 
                        inputState[InputAction.MOVE_RIGHT];
    
    if (hasAnyInput) {
      console.log(`🎮 handleInput: JUMP=${justPressed.jump}, SLIDE=${justPressed.slide}, grounded=${this.isGrounded}, sliding=${this.isSliding}, hasPhysicsBody=${!!this.physicsBody}`);
    }

    // Handle third-person camera movement (mouse-based strafing and auto forward)
    if (this.camera && this.autoForwardMovement) {
      this.handleThirdPersonMovement(inputState, deltaTime);
    } else {
      // Handle lane-based movement (fallback - for keyboard users)
      if (inputState[InputAction.MOVE_LEFT] && this.desiredLane > GAME_CONFIG.MIN_LANE) {
        this.desiredLane = Math.max(GAME_CONFIG.MIN_LANE, this.desiredLane - 1);
      } else if (inputState[InputAction.MOVE_RIGHT] && this.desiredLane < GAME_CONFIG.MAX_LANE) {
        this.desiredLane = Math.min(GAME_CONFIG.MAX_LANE, this.desiredLane + 1);
      }
      this.targetLane = this.desiredLane;
    }

    // Handle jumping (keyboard space bar) - use justPressed to avoid timing issues
    console.log(`🔍 Jump check: justPressed.jump=${justPressed.jump}, grounded=${this.isGrounded}, sliding=${this.isSliding}`);
    
    if (justPressed.jump) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 JUMP INPUT DETECTED IN PLAYER!');
      console.log(`   Current state: grounded=${this.isGrounded}, sliding=${this.isSliding}`);
      console.log(`   Physics body: ${!!this.physicsBody}`);
      console.log(`   Mesh exists: ${!!this.mesh}`);
      
      if (this.mesh) {
        console.log(`   Mesh position: y=${this.mesh.position.y.toFixed(2)}`);
      }
      
      // Check if grounded before jumping
      if (!this.isGrounded) {
        console.log('   ⚠️ Player NOT grounded - cannot jump!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return; // Don't jump if not grounded
      }
      
      if (this.isGrounded && !this.isSliding) {
        console.log('   ✅ ALL CONDITIONS MET - CALLING JUMP()...');
        this.jump();
      } else {
        console.log(`   ❌ Cannot jump - grounded: ${this.isGrounded}, sliding: ${this.isSliding}`);
        
        // Log detailed physics state
        if (this.physicsBody) {
          const pos = this.physicsManager.getBodyPosition(this.physicsBody.handle);
          const vel = this.physicsManager.getVelocity(this.physicsBody.handle);
          console.log(`   Physics: y=${pos?.y.toFixed(2)}, vy=${vel?.y.toFixed(2)}, groundLevel=${this.config.position.y.toFixed(2)}`);
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Handle sliding (keyboard shift) - use justPressed to avoid timing issues
    if (justPressed.slide) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🛷 SLIDE INPUT DETECTED!');
      console.log(`   Current state: grounded=${this.isGrounded}, sliding=${this.isSliding}`);
      
      if (this.isGrounded && !this.isSliding) {
        console.log('   ✅ Conditions met - executing slide...');
        this.startSlide();
      } else {
        console.log(`   ❌ Cannot slide - grounded: ${this.isGrounded}, sliding: ${this.isSliding}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * Update player movement
   */
  private updateMovement(deltaTime: number): void {
    // Update boost state
    this.updateBoostState(deltaTime);

    // Handle third-person camera strafing movement
    if (this.isStrafing && this.camera) {
      this.updateThirdPersonMovement(deltaTime);
    } else {
      // Handle traditional lane-based movement
      this.updateLaneMovement(deltaTime);
    }

    // Handle sliding state
    if (this.isSliding) {
      const slideDuration = GAME_CONFIG.SLIDE_DURATION / 1000; // Convert to seconds
      const elapsed = (Date.now() - this.slideStartTime) / 1000;

      if (elapsed >= slideDuration) {
        this.endSlide();
      }
    }
  }

  /**
   * Update third-person camera-based movement
   */
  private updateThirdPersonMovement(deltaTime: number): void {
    if (!this.camera || !this.mesh) return;

    // Apply strafe movement
    if (this.strafeDirection.length() > 0) {
      this.mesh!.position.x += this.strafeDirection.x * deltaTime;
      this.mesh!.position.z += this.strafeDirection.z * deltaTime;
    }

    // Update physics body position if available
    if (this.physicsBody) {
      this.physicsManager.setBodyPosition(this.physicsBody.handle, {
        x: this.mesh!.position.x,
        y: this.mesh!.position.y,
        z: this.mesh!.position.z,
      });
    }
  }

  /**
   * Update boost state
   */
  private updateBoostState(deltaTime: number): void {
    if (this.isBoosting) {
      const currentTime = Date.now() / 1000; // Current time in seconds
      const elapsed = currentTime - this.boostStartTime;

      // Log remaining time every second
      if (Math.floor(elapsed) !== Math.floor(elapsed - deltaTime)) {
        console.log(`🚀 Boost active - ${Math.max(0, Math.round(this.boostDuration - elapsed))}s remaining`);
      }

      if (elapsed >= this.boostDuration) {
        this.isBoosting = false;
        console.log('🚀 Boost ended');
      }
    }
  }

  /**
   * Start boost
   */
  startBoost(): void {
    if (!this.isBoosting) {
      this.isBoosting = true;
      this.boostStartTime = Date.now() / 1000; // Current time in seconds
      console.log('🚀 Boost started! Speed multiplier:', this.boostMultiplier);
      console.log('🚀 Current speed:', this.getSpeed());
    } else {
      console.log('⚠️ Boost already active!');
    }
  }

  /**
   * Update traditional lane-based movement
   */
  private updateLaneMovement(deltaTime: number): void {
    // Update lane position smoothly with improved logic
    if (Math.abs(this.currentLane - this.targetLane) > 0.01) { // Use epsilon for floating point comparison
      const direction = this.targetLane > this.currentLane ? 1 : -1;
      const laneChangeSpeed = 18.0; // units per second - optimized for smooth feel

      // Move towards target lane
      const moveAmount = laneChangeSpeed * deltaTime;
      this.currentLane += direction * moveAmount;

      // Check if we've reached or passed the target lane (with epsilon tolerance)
      if (direction > 0 && this.currentLane >= this.targetLane - 0.01) {
        this.currentLane = this.targetLane;
      } else if (direction < 0 && this.currentLane <= this.targetLane + 0.01) {
        this.currentLane = this.targetLane;
      }
    }

    // Update target position (only for horizontal movement, Z is handled by physics)
    this.targetPosition = new Vector3(
      this.currentLane * this.config.laneWidth,
      this.mesh!.position.y, // Use current Y position
      this.mesh!.position.z  // Use current Z position (physics handles forward movement)
    );

    // Move towards target position (only X axis for lane switching)
    const lerpFactor = 0.75; // Optimized lerp for smooth yet responsive movement
    this.mesh!.position.x = THREE.MathUtils.lerp(
      this.mesh!.position.x,
      this.targetPosition.x,
      lerpFactor
    );

    // Update physics body position if available (sync mesh with physics)
    if (this.physicsBody) {
      this.physicsManager.setBodyPosition(this.physicsBody.handle, {
        x: this.mesh!.position.x,
        y: this.mesh!.position.y,
        z: this.mesh!.position.z,
      });
    }
  }

  /**
   * Update physics simulation - MANUAL GRAVITY
   */
  private updatePhysics(): void {
    if (!this.mesh) return;

    // Manual gravity and jump physics
    const groundLevel = 1.0;
    const playerY = this.mesh.position.y;
    const distanceFromGround = Math.abs(playerY - groundLevel);
    
    // Apply gravity if not grounded
    if (!this.isGrounded || playerY > groundLevel + 0.1) {
      this.jumpVelocityY += this.gravity * 0.016; // Apply gravity (assume ~60fps)
      this.mesh.position.y += this.jumpVelocityY * 0.016; // Apply velocity
      
      // Prevent falling through ground
      if (this.mesh.position.y <= groundLevel) {
        this.mesh.position.y = groundLevel;
        this.jumpVelocityY = 0;
        this.isGrounded = true;
        console.log('🦶 Player landed!');
      }
    } else {
      // On ground - ensure position is exact
      this.mesh.position.y = groundLevel;
      this.jumpVelocityY = 0;
      this.isGrounded = true;
    }
  }

  /**
   * Update visual mesh properties
   */
  private updateMesh(): void {
    if (!this.mesh) return;

    // Handle sliding visual effect
    if (this.isSliding) {
      const slideProgress = (Date.now() - this.slideStartTime) / GAME_CONFIG.SLIDE_DURATION;
      const scaleY = 0.5 + 0.5 * (1 - slideProgress); // Shrink Y scale during slide

      this.mesh.scale.y = Math.max(0.3, scaleY);
      this.mesh.scale.x = 1 + 0.2 * slideProgress; // Stretch X scale slightly
      this.mesh.scale.z = 1 + 0.2 * slideProgress; // Stretch Z scale slightly
    } else {
      // Reset scale when not sliding
      this.mesh.scale.set(1, 1, 1);
    }

    // DON'T add bobbing effect - it overrides jump position!
    // Position is now controlled by updatePhysics (manual gravity)
  }

  /**
   * Make the player jump
   */
  private jump(): void {
    console.log('🚀 JUMP! Setting upward velocity');
    
    // Set jump velocity (will be applied in updatePhysics)
    this.jumpVelocityY = 10; // Jump upward velocity
    this.isGrounded = false;
    
    console.log(`✅ Jump initiated! velocity=${this.jumpVelocityY}`);
  }

  /**
   * Start sliding animation
   */
  private startSlide(): void {
    console.log('🛷 SLIDE! Starting slide animation');
    
    this.isSliding = true;
    this.slideStartTime = Date.now();

    console.log(`✅ Slide started! Duration: ${GAME_CONFIG.SLIDE_DURATION}ms`);
  }

  /**
   * End sliding animation
   */
  private endSlide(): void {
    this.isSliding = false;
    this.mesh!.scale.set(1, 1, 1); // Reset scale

    console.log('🏃 Player stopped sliding');
  }

  /**
   * Get the player's mesh
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  /**
   * Get the player's physics body
   */
  getPhysicsBody(): PhysicsBody | null {
    return this.physicsBody;
  }

  /**
   * Get current player position
   */
  getPosition(): THREE.Vector3 {
    if (this.mesh) {
      return this.mesh.position.clone();
    }
    return this.config.position as THREE.Vector3;
  }

  /**
   * Get current speed (with boost multiplier if active)
   */
  getSpeed(): number {
    const baseSpeed = this.config.speed;
    return this.isBoosting ? baseSpeed * this.boostMultiplier : baseSpeed;
  }

  /**
   * Check if boost is active
   */
  getIsBoosting(): boolean {
    return this.isBoosting;
  }

  /**
   * Set player position
   */
  setPosition(position: Vector3): void {
    if (this.mesh) {
      this.mesh.position.copy(position as THREE.Vector3);
    }
    this.config.position = position;

    if (this.physicsBody) {
      this.physicsManager.setBodyPosition(this.physicsBody.handle, position);
    }
  }

  /**
   * Check if player is grounded
   */
  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  /**
   * Set grounded state
   */
  setGrounded(grounded: boolean): void {
    this.isGrounded = grounded;
  }

  /**
   * Get current lane
   */
  getCurrentLane(): number {
    return this.currentLane;
  }

  /**
   * Check if player is sliding
   */
  isPlayerSliding(): boolean {
    return this.isSliding;
  }

  /**
   * Reset player to initial state
   */
  reset(): void {
    this.currentLane = 0;
    this.targetLane = 0;
    this.desiredLane = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.isBoosting = false;
    this.velocity = new Vector3(0, 0, 0);

    this.setPosition(this.config.position);

    if (this.mesh) {
      this.mesh.scale.set(1, 1, 1);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.physicsBody) {
      this.physicsManager.removeBody(this.physicsBody.handle);
      this.physicsBody = null;
    }

    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
  }
}
