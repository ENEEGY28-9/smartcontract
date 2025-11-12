import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';
import type { PhysicsBody } from '../engine/PhysicsManager';
import { Vector3 } from '../utils/Constants';

export enum CollectibleType {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface CollectibleConfig {
  type?: CollectibleType;
  position?: THREE.Vector3;
  points?: number;
}

// CollectibleCallbacks removed - now handled by CollectibleManager

export class Collectible {
  private mesh: THREE.Mesh | null = null;
  private physicsBody: PhysicsBody | null = null;
  private physicsManager: PhysicsManager;

  private config: Required<CollectibleConfig>;
  private isCollected = false;
  private collectionTime = 0;

  // Visual effects
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private originalMaterial: THREE.MeshLambertMaterial | null = null;

  constructor(
    physicsManager: PhysicsManager,
    config: CollectibleConfig = {}
  ) {
    this.physicsManager = physicsManager;

    this.config = {
      type: CollectibleType.SMALL,
      position: new THREE.Vector3(0, 1, -20),
      points: 10,
      ...config
    };

    this.createMesh();
    console.log(`🔮 Collectible mesh created: ${this.mesh ? 'success' : 'failed'}`);

    // Try to create physics body after mesh is ready
    if (this.physicsManager && this.physicsManager.getWorld() && this.physicsManager.getRapier()) {
      this.createPhysicsBody();
    }
  }

  /**
   * Create the visual mesh for collectible
   */
  private createMesh(): void {
    const geometry = new THREE.SphereGeometry(this.getSizeByType(), 16, 16);
    const material = new THREE.MeshLambertMaterial({
      color: this.getColorByType(),
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.config.position);
    this.mesh.castShadow = true;

    console.log(`🔮 Created collectible mesh: type=${this.config.type}, position=(${this.config.position.x}, ${this.config.position.y}, ${this.config.position.z}), size=${this.getSizeByType()}`);

    // Store original material for glow effect
    this.originalMaterial = material;

    // Create glow material
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: this.getColorByType(),
      transparent: true,
      opacity: 0.3
    });

    // Add pulsing animation
    this.animatePulse();

    // Ensure mesh is visible
    if (this.mesh) {
      this.mesh.visible = true;
      console.log(`👁️ Collectible mesh visible: ${this.mesh.visible}`);
    }
  }

  /**
   * Create physics body for collectible
   */
  private createPhysicsBody(): void {
    if (!this.physicsManager || !this.physicsManager.getWorld() || !this.physicsManager.getRapier()) {
      console.warn('PhysicsManager not ready, will retry later');
      return;
    }

    try {
      console.log(`🔧 Creating physics body for ${this.config.type} collectible...`);

      // Create rigid body for collectible - use kinematic instead of fixed for better stability
      const rigidBodyDesc = this.physicsManager.getRapier().RigidBodyDesc.kinematicPositionBased();
      const rigidBody = this.physicsManager.getWorld().createRigidBody(rigidBodyDesc);

      // Set position with proper validation
      const x = this.config.position.x || 0;
      const y = this.config.position.y || 0;
      const z = this.config.position.z || 0;

      rigidBody.setTranslation(x, y, z, true);

      // Create collider with proper size
      const colliderDesc = this.physicsManager.getRapier().ColliderDesc.ball(this.getSizeByType());
      this.physicsManager.getWorld().createCollider(colliderDesc, rigidBody);

      this.physicsBody = rigidBody;

      // Verify physics body was created correctly
      try {
        const initialTranslation = rigidBody.translation();
        console.log(`✅ Created physics body for ${this.config.type} collectible at (${initialTranslation.x}, ${initialTranslation.y}, ${initialTranslation.z})`);
      } catch (error) {
        console.error(`❌ Error verifying physics body creation:`, error);
      }
    } catch (error) {
      console.error('Failed to create collectible physics body:', error);
      console.error('Error details:', error);
    }
  }

  /**
   * Get size based on collectible type
   */
  private getSizeByType(): number {
    switch (this.config.type) {
      case CollectibleType.SMALL:
        return 0.3;
      case CollectibleType.MEDIUM:
        return 0.5;
      case CollectibleType.LARGE:
        return 0.8;
      default:
        return 0.3;
    }
  }

  /**
   * Get color based on collectible type
   */
  private getColorByType(): number {
    switch (this.config.type) {
      case CollectibleType.SMALL:
        return 0x00ff00; // Green
      case CollectibleType.MEDIUM:
        return 0x0080ff; // Blue
      case CollectibleType.LARGE:
        return 0xff8000; // Orange
      default:
        return 0x00ff00;
    }
  }

  /**
   * Get points based on collectible type
   */
  public getPoints(): number {
    return this.config.points;
  }

  /**
   * Get collectible type
   */
  public getType(): CollectibleType {
    return this.config.type;
  }

  /**
   * Get mesh for adding to scene
   */
  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  /**
   * Get physics body for collision detection
   */
  public getPhysicsBody(): PhysicsBody | null {
    return this.physicsBody;
  }

  /**
   * Get current position
   */
  public getPosition(): THREE.Vector3 {
    if (this.physicsBody && this.physicsManager.getWorld()) {
      try {
        const translation = this.physicsBody.translation();
        // Check if translation contains NaN values
        if (isNaN(translation.x) || isNaN(translation.y) || isNaN(translation.z)) {
          console.warn('⚠️ Physics body translation contains NaN values, using mesh position');
          return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
        }
        return new THREE.Vector3(translation.x, translation.y, translation.z);
      } catch (error) {
        console.warn('⚠️ Error getting physics body translation, using mesh position:', error);
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
      }
    }
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
  }

  /**
   * Check if collectible is collected
   */
  public isAlreadyCollected(): boolean {
    return this.isCollected;
  }

  /**
   * Mark collectible as collected and start collection animation
   */
  public collect(): void {
    console.log('🎨 Collectible.collect() called for type:', this.config.type);

    if (this.isCollected) {
      console.log('⚠️ Collectible already collected, skipping');
      return;
    }

    this.isCollected = true;
    this.collectionTime = Date.now();

    // Start collection animation
    this.animateCollection();
  }

  /**
   * Update collectible (animations, effects)
   */
  public update(deltaTime: number): void {
    if (!this.mesh) return;

    // Try to create physics body if not exists and physics manager is ready
    if (!this.physicsBody && this.physicsManager && this.physicsManager.getWorld() && this.physicsManager.getRapier()) {
      this.createPhysicsBody();
    }

    // Update pulsing animation
    if (!this.isCollected) {
      this.updatePulseAnimation(deltaTime);
    }

    // Update collection animation if collected
    if (this.isCollected) {
      this.updateCollectionAnimation(deltaTime);
    }

    // Temporarily disable physics body sync to avoid NaN issues
    // if (this.physicsBody && this.physicsManager.getWorld()) {
    //   try {
    //     const translation = this.physicsBody.translation();
    //     if (!isNaN(translation.x) && !isNaN(translation.y) && !isNaN(translation.z)) {
    //       this.mesh.position.set(translation.x, translation.y, translation.z);
    //     }
    //   } catch (error) {
    //     console.warn('⚠️ Error updating physics body position:', error);
    //   }
    // }
  }

  /**
   * Animate pulsing effect
   */
  private animatePulse(): void {
    if (!this.mesh) return;

    let pulseDirection = 1;
    const animate = () => {
      if (!this.mesh || this.isCollected) return;

      const scale = this.mesh.scale.x + pulseDirection * 0.01;
      if (scale >= 1.2 || scale <= 0.8) {
        pulseDirection *= -1;
      }

      this.mesh.scale.setScalar(scale);
      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update pulse animation
   */
  private updatePulseAnimation(deltaTime: number): void {
    // Pulse animation is handled by animatePulse() method
  }

  /**
   * Animate collection effect
   */
  private animateCollection(): void {
    if (!this.mesh) return;

    // Change to glow material
    if (this.glowMaterial) {
      this.mesh.material = this.glowMaterial;
    }

    // Scale up and fade out
    const animate = () => {
      if (!this.mesh) return;

      const elapsed = Date.now() - this.collectionTime;
      const duration = 1000; // 1 second animation

      if (elapsed >= duration) {
        // Animation complete, hide mesh
        this.mesh.visible = false;
        return;
      }

      const progress = elapsed / duration;
      const scale = 1 + progress * 2; // Scale up to 3x
      const opacity = 1 - progress; // Fade out

      this.mesh.scale.setScalar(scale);
      if (this.glowMaterial) {
        this.glowMaterial.opacity = opacity * 0.5;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update collection animation
   */
  private updateCollectionAnimation(deltaTime: number): void {
    // Collection animation is handled by animateCollection() method
  }

  /**
   * Reset collectible for reuse
   */
  public reset(newPosition: THREE.Vector3, newType?: CollectibleType): void {
    this.config.position = newPosition;
    if (newType) {
      this.config.type = newType;
      this.config.points = this.getPointsByType(newType);
    }

    this.isCollected = false;
    this.collectionTime = 0;

    // Reset mesh
    if (this.mesh) {
      this.mesh.position.copy(newPosition);
      this.mesh.scale.setScalar(1);
      this.mesh.visible = true;

      // Reset material
      if (this.originalMaterial) {
        this.mesh.material = this.originalMaterial;
      }

      // Update mesh properties based on new type
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      const geometry = new THREE.SphereGeometry(this.getSizeByType(), 16, 16);
      this.mesh.geometry = geometry;

      const material = new THREE.MeshLambertMaterial({
        color: this.getColorByType(),
        transparent: true,
        opacity: 0.8
      });
      this.mesh.material = material;
      this.originalMaterial = material;
    }

    // Temporarily disable physics body reset to avoid NaN issues
    // if (this.physicsBody && this.physicsManager.getWorld()) {
    //   this.physicsBody.setTranslation(
    //     newPosition.x,
    //     newPosition.y,
    //     newPosition.z,
    //     true
    //   );
    // }

    // Update config position
    this.config.position = newPosition;
  }

  /**
   * Get points by collectible type
   */
  private getPointsByType(type: CollectibleType): number {
    switch (type) {
      case CollectibleType.SMALL:
        return 10;
      case CollectibleType.MEDIUM:
        return 25;
      case CollectibleType.LARGE:
        return 50;
      default:
        return 10;
    }
  }

  /**
   * Destroy collectible and cleanup resources
   */
  public destroy(): void {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material && typeof this.mesh.material.dispose === 'function') {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }

    if (this.physicsBody && this.physicsManager.getWorld()) {
      this.physicsManager.getWorld().removeRigidBody(this.physicsBody);
      this.physicsBody = null;
    }

    this.originalMaterial = null;
    this.glowMaterial = null;
  }
}
