import * as THREE from 'three';

export interface PetConfig {
  position?: THREE.Vector3;
  size?: number;
  color?: number;
}

export class Pet {
  private mesh: THREE.Mesh | null = null;
  private config: Required<PetConfig>;
  private targetPosition = new THREE.Vector3();

  constructor(config: PetConfig = {}) {
    this.config = {
      position: new THREE.Vector3(0, 0, 0),
      size: 0.3, // Smaller than player
      color: 0xff6b6b, // Reddish color
      ...config
    };
  }

  /**
   * Initialize the pet mesh
   */
  initialize(scene: THREE.Scene): void {
    // Create pet geometry - smaller capsule
    const geometry = new THREE.CapsuleGeometry(this.config.size * 0.5, this.config.size, 4, 8);

    // Create material
    const material = new THREE.MeshLambertMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.9,
    });

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.config.position);

    // Add to scene
    scene.add(this.mesh);

    console.log('🐾 Pet initialized at position:', this.config.position);
  }

  /**
   * Update pet position to follow player (shoulder position)
   */
  update(playerPosition: THREE.Vector3, playerRotation: THREE.Euler): void {
    if (!this.mesh) return;

    // Calculate shoulder position (right shoulder of player)
    // Player capsule is 1.0 height, so shoulder is at y=0.8
    const shoulderOffset = new THREE.Vector3(0.6, 0.8, 0); // Right shoulder

    // Apply player rotation to offset
    shoulderOffset.applyEuler(playerRotation);

    // Set target position
    this.targetPosition.copy(playerPosition).add(shoulderOffset);

    // Smoothly interpolate to target position
    this.mesh.position.lerp(this.targetPosition, 0.1);

    // Make pet face same direction as player
    this.mesh.rotation.y = playerRotation.y;
  }

  /**
   * Get pet position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
  }

  /**
   * Set pet position directly
   */
  setPosition(position: THREE.Vector3): void {
    if (this.mesh) {
      this.mesh.position.copy(position);
    }
  }

  /**
   * Remove pet from scene
   */
  destroy(scene: THREE.Scene): void {
    if (this.mesh && scene) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(mat => mat.dispose());
      } else {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
  }
}
