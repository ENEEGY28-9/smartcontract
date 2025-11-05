import { PHYSICS_CONFIG, Vector3 } from '../utils/Constants';

// Re-export for other modules
export interface PhysicsBody {
  handle: any; // Rapier RigidBody handle
  collider?: any; // Rapier Collider handle
}

export class PhysicsManager {
  private world: any = null; // Rapier World
  private rapier: any = null;
  private bodies: Map<string, PhysicsBody> = new Map();
  private isInitialized = false;

  constructor() {
    // Don't call init() here, let the user call it explicitly
  }

  /**
   * Initialize Rapier physics world
   */
  async init(): Promise<void> {
    try {
      console.log('🔄 Initializing Rapier Physics...');

      // Import Rapier with correct syntax for version 0.14.0
      const RAPIER = await import('@dimforge/rapier3d');
      console.log('✅ Rapier module imported');

      // Store Rapier module for later use
      this.rapier = RAPIER;

      // Create physics world
      const gravity = { x: PHYSICS_CONFIG.GRAVITY.x, y: PHYSICS_CONFIG.GRAVITY.y, z: PHYSICS_CONFIG.GRAVITY.z };
      this.world = new RAPIER.World(gravity);
      console.log('✅ Physics world created');

      this.isInitialized = true;
      console.log('✅ Rapier Physics initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Rapier Physics:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Create a dynamic rigid body (for player)
   */
  createDynamicBody(
    position: Vector3,
    options: {
      mass?: number;
      friction?: number;
      restitution?: number;
    } = {}
  ): PhysicsBody | null {
    if (!this.isInitialized || !this.world) return null;

    const {
      mass = PHYSICS_CONFIG.PLAYER_MASS,
      friction = PHYSICS_CONFIG.PLAYER_FRICTION,
      restitution = PHYSICS_CONFIG.PLAYER_RESTITUTION,
    } = options;

    try {
      // Create rigid body descriptor
      const bodyDesc = new this.rapier.RigidBodyDesc(this.rapier.RigidBodyType.Dynamic)
        .setTranslation(position.x, position.y, position.z);

      // Create the rigid body
      const body = this.world.createRigidBody(bodyDesc);

      // Create collider descriptor (capsule for player)
      const colliderDesc = this.rapier.ColliderDesc.capsule(1.0, 0.5) // height 2.0, radius 0.5
        .setFriction(friction)
        .setRestitution(restitution);

      // Create the collider
      const collider = this.world.createCollider(colliderDesc, body);

      const physicsBody: PhysicsBody = { handle: body, collider };
      this.bodies.set(body.handle, physicsBody);

      return physicsBody;
    } catch (error) {
      console.error('❌ Failed to create dynamic body:', error);
      return null;
    }
  }

  /**
   * Create a static rigid body (for ground/colliders)
   */
  createStaticBody(position: Vector3, size: Vector3): PhysicsBody | null {
    if (!this.isInitialized || !this.world) return null;

    try {
      // Create rigid body descriptor
      const bodyDesc = new this.rapier.RigidBodyDesc(this.rapier.RigidBodyType.Fixed)
        .setTranslation(position.x, position.y, position.z);

      // Create the rigid body
      const body = this.world.createRigidBody(bodyDesc);

      // Create collider descriptor (cuboid for ground)
      const colliderDesc = this.rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);

      // Create the collider
      const collider = this.world.createCollider(colliderDesc, body);

      const physicsBody: PhysicsBody = { handle: body, collider };
      this.bodies.set(body.handle, physicsBody);

      return physicsBody;
    } catch (error) {
      console.error('❌ Failed to create static body:', error);
      return null;
    }
  }

  /**
   * Remove a physics body from the world
   */
  removeBody(handle: any): void {
    if (this.world && handle) {
      this.world.removeRigidBody(handle);
      this.bodies.delete(handle);
    }
  }

  /**
   * Update physics simulation
   */
  update(deltaTime: number): void {
    if (!this.isInitialized || !this.world) return;

    try {
      // Step the physics simulation
      this.world.step();
    } catch (error) {
      console.error('❌ Physics update error:', error);
    }
  }

  /**
   * Get the position of a rigid body
   */
  getBodyPosition(handle: any): Vector3 | null {
    if (!this.isInitialized || !handle) return null;

    try {
      const translation = handle.translation();
      return {
        x: translation.x,
        y: translation.y,
        z: translation.z,
      };
    } catch (error) {
      console.error('❌ Failed to get body position:', error);
      return null;
    }
  }

  /**
   * Set the position of a rigid body
   */
  setBodyPosition(handle: any, position: Vector3): void {
    if (!this.isInitialized || !handle) return;

    try {
      handle.setTranslation({
        x: position.x,
        y: position.y,
        z: position.z,
      }, true);
    } catch (error) {
      console.error('❌ Failed to set body position:', error);
    }
  }

  /**
   * Get the rotation of a rigid body (as quaternion)
   */
  getBodyRotation(handle: any): { x: number; y: number; z: number; w: number } | null {
    if (!this.isInitialized || !handle) return null;

    try {
      const rotation = handle.rotation();
      return {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      };
    } catch (error) {
      console.error('❌ Failed to get body rotation:', error);
      return null;
    }
  }

  /**
   * Apply force to a rigid body
   */
  applyForce(handle: any, force: Vector3): void {
    if (!this.isInitialized || !handle) return;

    try {
      handle.addForce({
        x: force.x,
        y: force.y,
        z: force.z,
      }, true);
    } catch (error) {
      console.error('❌ Failed to apply force:', error);
    }
  }

  /**
   * Apply impulse to a rigid body (instant velocity change)
   */
  applyImpulse(handle: any, impulse: Vector3): void {
    if (!this.isInitialized || !handle) return;

    try {
      handle.applyImpulse({
        x: impulse.x,
        y: impulse.y,
        z: impulse.z,
      }, true);
    } catch (error) {
      console.error('❌ Failed to apply impulse:', error);
    }
  }

  /**
   * Set velocity of a rigid body
   */
  setVelocity(handle: any, velocity: Vector3): void {
    if (!this.isInitialized || !handle) return;

    try {
      handle.setLinvel({
        x: velocity.x,
        y: velocity.y,
        z: velocity.z,
      }, true);
    } catch (error) {
      console.error('❌ Failed to set velocity:', error);
    }
  }

  /**
   * Get velocity of a rigid body
   */
  getVelocity(handle: any): Vector3 | null {
    if (!this.isInitialized || !handle) return null;

    try {
      const velocity = handle.linvel();
      return {
        x: velocity.x,
        y: velocity.y,
        z: velocity.z,
      };
    } catch (error) {
      console.error('❌ Failed to get velocity:', error);
      return null;
    }
  }

  /**
   * Check if two bodies are colliding
   */
  checkCollision(body1: any, body2: any): boolean {
    if (!this.isInitialized || !this.world) return false;

    try {
      // This would need proper collision detection implementation
      // For now, return false as placeholder
      return false;
    } catch (error) {
      console.error('❌ Collision check error:', error);
      return false;
    }
  }

  /**
   * Get all bodies in the physics world
   */
  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Check if physics is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the Rapier world instance
   */
  getWorld(): any {
    return this.world;
  }

  /**
   * Get the Rapier module instance
   */
  getRapier(): any {
    return this.rapier;
  }

  /**
   * Clean up physics world
   */
  destroy(): void {
    if (this.world) {
      // Clean up all bodies
      for (const [handle] of this.bodies) {
        this.world.removeRigidBody(handle);
      }
      this.bodies.clear();
    }
    this.world = null;
    this.rapier = null;
    this.isInitialized = false;
  }
}
