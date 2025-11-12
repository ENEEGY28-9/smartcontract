import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';
import { Player } from '../entities/Player';
import { Collectible, CollectibleType } from '../entities/Collectible';

export interface CollectibleSpawnConfig {
  spawnDistance?: number;      // Khoảng cách phía trước player để spawn
  despawnDistance?: number;    // Khoảng cách phía sau player để despawn
  spawnInterval?: number;      // Thời gian giữa các lần spawn (ms)
  maxCollectibles?: number;    // Số lượng collectibles tối đa
  laneWidth?: number;          // Chiều rộng lane để spawn ngẫu nhiên
}

export interface CollectibleCallbacks {
  onCollect?: (points: number) => void; // Callback đơn giản khi thu thập
}

export class CollectibleManager {
  private physicsManager: PhysicsManager;
  private player: Player | null = null;
  private debugCollision = false;

  private config: Required<CollectibleSpawnConfig>;
  private callbacks: CollectibleCallbacks | null = null;
  private collectibles: Collectible[] = [];
  private pool: Collectible[] = []; // Object pool for reuse

  private lastSpawnTime = 0;

  // Spawn probabilities for different types
  private readonly SPAWN_PROBABILITIES = {
    [CollectibleType.SMALL]: 0.6,   // 60%
    [CollectibleType.MEDIUM]: 0.3,  // 30%
    [CollectibleType.LARGE]: 0.1    // 10%
  };

  constructor(
    physicsManager: PhysicsManager,
    config: CollectibleSpawnConfig = {},
    callbacks: CollectibleCallbacks | null = null
  ) {
    this.physicsManager = physicsManager;
    this.callbacks = callbacks;

    console.log('🔧 CollectibleManager constructor config:', config);

    this.config = {
      spawnDistance: 15,      // Spawn 15 units trước player để dễ thấy hơn
      despawnDistance: 5,     // Despawn 5 units sau player
      spawnInterval: 200,     // Spawn mỗi 200ms để có nhiều particles hơn
      maxCollectibles: 20,    // Tối đa 20 collectibles cùng lúc
      laneWidth: 2.8,         // Lane width từ constants
      ...config
    };

    console.log('✅ Final CollectibleManager config:', this.config);
  }

  /**
   * Set player reference for collision detection
   */
  public setPlayer(player: Player, debugCollision: boolean = false): void {
    this.player = player;
    this.debugCollision = debugCollision;
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
    if (!this.player) {
      console.warn('⚠️ No player for spawn position, using default');
      return new THREE.Vector3(0, 1, -20);
    }

    const playerPosition = this.player.getPosition();
    const laneCount = 3; // -1, 0, 1
    const randomLane = Math.floor(Math.random() * laneCount) - 1; // -1, 0, 1

    const x = randomLane * this.config.laneWidth;
    const y = 1; // Height above ground

    // Spawn collectibles AHEAD of player (towards negative Z direction)
    // Player moves towards negative Z, so spawn at player Z minus spawn distance
    const z = playerPosition.z - this.config.spawnDistance;

    console.log(`🎯 Spawning collectible at lane ${randomLane} (x=${x.toFixed(1)}), z=${z.toFixed(1)} (player z=${playerPosition.z.toFixed(1)})`);

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
    });

    return collectible;
  }

  /**
   * Get points for collectible type
   */
  private getPointsForType(type: CollectibleType): number {
    // All collectibles now give 1 point each
    return 1;
  }

  /**
   * Check if should spawn new collectible
   */
  private shouldSpawnCollectible(): boolean {
    const now = Date.now();
    const timeSinceLastSpawn = now - this.lastSpawnTime;

    console.log(`🔄 Checking spawn conditions: timeSinceLast=${timeSinceLastSpawn}ms (interval=${this.config.spawnInterval}ms), currentCollectibles=${this.collectibles.length} (max=${this.config.maxCollectibles})`);

    if (timeSinceLastSpawn < this.config.spawnInterval) {
      console.log('⏳ Spawn interval not reached');
      return false;
    }

    if (this.collectibles.length >= this.config.maxCollectibles) {
      console.log('📦 Max collectibles reached');
      return false;
    }

    console.log('✅ Should spawn collectible');
    return true;
  }

  /**
   * Try to spawn new collectible
   */
  private trySpawnCollectible(): void {
    if (!this.shouldSpawnCollectible()) return;

    // Try to spawn in different lanes to ensure even distribution
    const maxAttempts = 3;
    let spawned = false;

    for (let attempt = 0; attempt < maxAttempts && !spawned; attempt++) {
      const position = this.generateSpawnPosition();
      const type = this.getRandomCollectibleType();

      // Check if position is too close to existing collectibles
      const minDistance = 8.0; // Minimum distance between collectibles
      const tooClose = this.collectibles.some(existing => {
        const distance = existing.getPosition().distanceTo(position);
        return distance < minDistance;
      });

      if (!tooClose) {
        const collectible = this.createCollectible(position, type);
        this.collectibles.push(collectible);
        this.lastSpawnTime = Date.now();

        console.log(`🎈 Spawned ${type} collectible at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(`📊 After spawn: collectibles array length = ${this.collectibles.length}`);
        spawned = true;
      }
    }

    if (!spawned) {
      console.log('⚠️ Could not find suitable spawn position after max attempts');
    }
  }

  /**
   * Check collision between player and collectibles
   */
  private checkCollisions(): number {
    if (!this.player) {
      console.log('⚠️ No player set for collision detection');
      return 0;
    }

    const playerPosition = this.player.getPosition();
    const playerPhysicsBody = this.player.getPhysicsBody();

    console.log(`🎮 Player status: position=(${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}), hasPhysicsBody=${!!playerPhysicsBody}`);

    if (!playerPhysicsBody) {
      console.log('⚠️ Player has no physics body');
      return 0;
    }

    let pointsEarned = 0;
    console.log(`🔍 Checking collisions for ${this.collectibles.length} collectibles at player pos: ${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)}`);

    if (this.collectibles.length === 0) {
      console.warn('⚠️ No collectibles to check for collision!');
      return 0;
    }

    // Check each collectible for collision
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];
      const collectiblePosition = collectible.getPosition();

      // Simple distance-based collision detection
      const distance = playerPosition.distanceTo(collectiblePosition as THREE.Vector3);
      const collisionDistance = 2.5; // Distance threshold for collection (reduced for precision)

      // Debug log when debug mode is enabled or when close (within 4 units)
      if (this.debugCollision || distance < 4.0) {
        console.log(`📍 Collectible ${i} (${collectible.getType()}): player_pos(${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)}), collectible_pos(${collectiblePosition.x.toFixed(1)}, ${collectiblePosition.z.toFixed(1)}), distance=${distance.toFixed(2)}, threshold=${collisionDistance}, collected=${collectible.isAlreadyCollected()}`);
      }

      if (distance < collisionDistance && !collectible.isAlreadyCollected()) {
        console.log('🎯 COLLISION DETECTED! Collecting collectible...');

        // Collect the collectible
        collectible.collect();
        const points = collectible.getPoints();
        pointsEarned += points;

        console.log(`💎 Collected ${collectible.getType()} collectible! +${points} point${points > 1 ? 's' : ''}`);

        // Call callback to update energy balance
        if (this.callbacks?.onCollect) {
          this.callbacks.onCollect(points);
        }

        // Remove from active collectibles after animation completes
        setTimeout(() => {
          this.removeCollectible(i);
        }, 1000); // Match with animation duration
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
  public update(deltaTime: number): number {
    if (!this.player) return 0;

    // Try to spawn new collectible
    this.trySpawnCollectible();

    console.log(`🔄 Updating ${this.collectibles.length} collectibles`);

    // Update all collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];

      // Update collectible animation
      collectible.update(deltaTime);

      // Check if collectible is too far behind player (despawn)
      const collectiblePosition = collectible.getPosition();
      const playerPosition = this.player.getPosition();

      const despawnThreshold = playerPosition.z - this.config.despawnDistance;
      console.log(`🔍 Collectible ${i}: pos(${collectiblePosition.x.toFixed(1)}, ${collectiblePosition.z.toFixed(1)}), player(${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)}), threshold=${despawnThreshold.toFixed(1)}, shouldDespawn=${collectiblePosition.z < despawnThreshold}`);

      if (collectiblePosition.z < despawnThreshold) {
        this.removeCollectible(i);
        console.log(`🗑️ Despawned collectible at z=${collectiblePosition.z}, threshold=${despawnThreshold}`);
      }
    }

    // Check for collisions and return points earned
    return this.checkCollisions();
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
   * Reset manager for new game
   */
  public reset(): void {
    // Return all active collectibles to pool
    for (const collectible of this.collectibles) {
      this.pool.push(collectible);
    }

    this.collectibles = [];
    this.lastSpawnTime = 0;

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
