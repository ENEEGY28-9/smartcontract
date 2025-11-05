import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';
import { Player } from '../entities/Player';
import { Collectible, CollectibleType, CollectibleCallbacks } from '../entities/Collectible';
import { Vector3 } from '../utils/Constants';

export interface CollectibleSpawnConfig {
  spawnDistance?: number;      // Khoảng cách phía trước player để spawn
  despawnDistance?: number;    // Khoảng cách phía sau player để despawn
  spawnInterval?: number;      // Thời gian giữa các lần spawn (ms)
  maxCollectibles?: number;    // Số lượng collectibles tối đa
  laneWidth?: number;          // Chiều rộng lane để spawn ngẫu nhiên
}

export class CollectibleManager {
  private physicsManager: PhysicsManager;
  private player: Player | null = null;

  private config: Required<CollectibleSpawnConfig>;
  private callbacks: CollectibleCallbacks;
  private collectibles: Collectible[] = [];
  private pool: Collectible[] = []; // Object pool for reuse

  private lastSpawnTime = 0;
  private nextSpawnZ = -20; // Vị trí Z để spawn collectible tiếp theo

  // Spawn probabilities for different types
  private readonly SPAWN_PROBABILITIES = {
    [CollectibleType.SMALL]: 0.6,   // 60%
    [CollectibleType.MEDIUM]: 0.3,  // 30%
    [CollectibleType.LARGE]: 0.1    // 10%
  };

  // Track collected collectibles for score
  private collectedCount = 0;
  private totalPoints = 0;

  constructor(
    physicsManager: PhysicsManager,
    config: CollectibleSpawnConfig = {},
    callbacks: CollectibleCallbacks = {}
  ) {
    this.physicsManager = physicsManager;
    this.callbacks = callbacks;

    this.config = {
      spawnDistance: 15,      // Spawn 15 units trước player để dễ thấy hơn
      despawnDistance: 5,     // Despawn 5 units sau player
      spawnInterval: 1000,    // Spawn mỗi 1 giây để test nhanh hơn
      maxCollectibles: 8,     // Tối đa 8 collectibles cùng lúc
      laneWidth: 2.8,         // Lane width từ constants
      ...config
    };
  }

  /**
   * Set player reference for collision detection
   */
  public setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Get random collectible type based on probabilities
   */
  private getRandomCollectibleType(): CollectibleType {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [type, probability] of Object.entries(this.SPAWN_PROBABILITIES)) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return type as CollectibleType;
      }
    }

    return CollectibleType.SMALL; // Fallback
  }

  /**
   * Generate random position for collectible
   */
  private generateSpawnPosition(): THREE.Vector3 {
    const laneCount = 3; // -1, 0, 1
    const randomLane = Math.floor(Math.random() * laneCount) - 1; // -1, 0, 1

    const x = randomLane * this.config.laneWidth;
    const y = 1; // Height above ground
    const z = this.nextSpawnZ;

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Create new collectible or get from pool
   */
  private createCollectible(position: THREE.Vector3, type: CollectibleType): Collectible {
    // Try to get from pool first
    if (this.pool.length > 0) {
      const collectible = this.pool.pop()!;
      collectible.reset(position, type);
      return collectible;
    }

    // Create new collectible
    const collectible = new Collectible(this.physicsManager, {
      type,
      position,
      points: this.getPointsForType(type)
    }, this.callbacks);

    return collectible;
  }

  /**
   * Get points for collectible type
   */
  private getPointsForType(type: CollectibleType): number {
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
   * Check if should spawn new collectible
   */
  private shouldSpawnCollectible(): boolean {
    const now = Date.now();
    if (now - this.lastSpawnTime < this.config.spawnInterval) {
      return false;
    }

    if (this.collectibles.length >= this.config.maxCollectibles) {
      return false;
    }

    return true;
  }

  /**
   * Try to spawn new collectible
   */
  private trySpawnCollectible(): void {
    if (!this.shouldSpawnCollectible()) return;

    const position = this.generateSpawnPosition();
    const type = this.getRandomCollectibleType();

    const collectible = this.createCollectible(position, type);
    this.collectibles.push(collectible);

    this.lastSpawnTime = Date.now();
    this.nextSpawnZ -= 8; // Spawn collectible tiếp theo cách 8 units để dày hơn

    console.log(`🎈 Spawned ${type} collectible at (${position.x}, ${position.y}, ${position.z})`);
  }

  /**
   * Check collision between player and collectibles
   */
  private async checkCollisions(): Promise<number> {
    if (!this.player) return 0;

    const playerPosition = this.player.getPosition();
    const playerPhysicsBody = this.player.getPhysicsBody();

    if (!playerPhysicsBody) return 0;

    let pointsEarned = 0;

    // Check each collectible for collision
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];
      const collectiblePosition = collectible.getPosition();

      // Simple distance-based collision detection
      const distance = playerPosition.distanceTo(collectiblePosition as THREE.Vector3);
      const collisionDistance = 1.5; // Distance threshold for collection

      if (distance < collisionDistance && !collectible.isAlreadyCollected()) {
        // Collect the collectible
        await collectible.collect();
        pointsEarned += collectible.getPoints();

        console.log(`💎 Collected ${collectible.getType()} collectible! +${collectible.getPoints()} points`);

        // Remove from active collectibles after a delay to show animation
        setTimeout(() => {
          this.removeCollectible(i);
        }, 1000);
      }
    }

    return pointsEarned;
  }

  /**
   * Remove collectible from active list and return to pool
   */
  private removeCollectible(index: number): void {
    if (index < 0 || index >= this.collectibles.length) return;

    const collectible = this.collectibles[index];

    // Return to pool for reuse
    this.pool.push(collectible);

    // Remove from active list
    this.collectibles.splice(index, 1);

    console.log(`♻️ Returned collectible to pool. Pool size: ${this.pool.length}`);
  }

  /**
   * Update all collectibles and check for spawning
   */
  public async update(deltaTime: number): Promise<number> {
    if (!this.player) return 0;

    // Try to spawn new collectible
    this.trySpawnCollectible();

    // Update all collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];

      // Update collectible animation
      collectible.update(deltaTime);

      // Check if collectible is too far behind player (despawn)
      const collectiblePosition = collectible.getPosition();
      const playerPosition = this.player.getPosition();

      if (collectiblePosition.z < playerPosition.z - this.config.despawnDistance) {
        this.removeCollectible(i);
        console.log(`🗑️ Despawned collectible at z=${collectiblePosition.z}`);
      }
    }

    // Check for collisions and return points earned
    return await this.checkCollisions();
  }

  /**
   * Get all collectible meshes for adding to scene
   */
  public getMeshes(): THREE.Mesh[] {
    return this.collectibles
      .map(collectible => collectible.getMesh())
      .filter((mesh): mesh is THREE.Mesh => mesh !== null);
  }

  /**
   * Get statistics for debugging
   */
  public getStats(): {
    active: number;
    pooled: number;
    collected: number;
    totalPoints: number;
    nextSpawnZ: number;
  } {
    return {
      active: this.collectibles.length,
      pooled: this.pool.length,
      collected: this.collectedCount,
      totalPoints: this.totalPoints,
      nextSpawnZ: this.nextSpawnZ
    };
  }

  /**
   * Reset manager for new game
   */
  public reset(): void {
    // Return all active collectibles to pool
    for (const collectible of this.collectibles) {
      this.pool.push(collectible);
    }

    this.collectibles = [];
    this.lastSpawnTime = 0;
    this.nextSpawnZ = -20;
    this.collectedCount = 0;
    this.totalPoints = 0;

    console.log('🔄 CollectibleManager reset');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Destroy all collectibles in pool and active list
    for (const collectible of [...this.collectibles, ...this.pool]) {
      collectible.destroy();
    }

    this.collectibles = [];
    this.pool = [];

    console.log('🧹 CollectibleManager destroyed');
  }
}
