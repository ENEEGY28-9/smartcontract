/**
 * ObjectPool - Efficient object pooling system for performance optimization
 * Reduces garbage collection by reusing objects instead of creating/destroying them
 */

class ObjectPool {
    constructor(factory, resetFunction, initialSize = 10, maxSize = 100) {
        this.factory = factory;
        this.resetFunction = resetFunction;
        this.pool = [];
        this.active = new Set();
        this.initialSize = initialSize;
        this.maxSize = maxSize;

        this.stats = {
            created: 0,
            reused: 0,
            destroyed: 0
        };

        this.initialize();
    }

    initialize() {
        // Pre-populate the pool
        for (let i = 0; i < this.initialSize; i++) {
            const obj = this.factory();
            this.pool.push(obj);
            this.stats.created++;
        }
    }

    get() {
        let obj = this.pool.pop();

        if (!obj) {
            // Pool is empty, create new object
            obj = this.factory();
            this.stats.created++;
        } else {
            this.stats.reused++;
        }

        this.active.add(obj);
        return obj;
    }

    release(obj) {
        if (!this.active.has(obj)) {
            console.warn('Attempting to release object that is not active');
            return false;
        }

        this.active.delete(obj);

        // Reset object state
        if (this.resetFunction) {
            this.resetFunction(obj);
        }

        // Return to pool if under max size
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
            return true;
        } else {
            // Pool is full, destroy the object
            this.destroyObject(obj);
            this.stats.destroyed++;
            return false;
        }
    }

    destroyObject(obj) {
        // Clean up object resources
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
            obj.geometry.dispose();
        }

        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(material => material.dispose());
            } else {
                obj.material.dispose();
            }
        }

        if (obj.texture) {
            obj.texture.dispose();
        }

        // Remove from parent if attached to scene
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    }

    clear() {
        // Destroy all pooled objects
        this.pool.forEach(obj => this.destroyObject(obj));
        this.pool.length = 0;

        // Destroy all active objects
        this.active.forEach(obj => this.destroyObject(obj));
        this.active.clear();

        this.stats.destroyed += this.pool.length + this.active.size;
    }

    resize(newMaxSize) {
        this.maxSize = newMaxSize;

        // If new max is smaller, destroy excess objects
        while (this.pool.length > this.maxSize) {
            const obj = this.pool.pop();
            this.destroyObject(obj);
            this.stats.destroyed++;
        }
    }

    // Batch operations
    getMultiple(count) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            objects.push(this.get());
        }
        return objects;
    }

    releaseMultiple(objects) {
        objects.forEach(obj => this.release(obj));
    }

    // Pool management
    shrink() {
        // Remove half of pooled objects to free memory
        const removeCount = Math.floor(this.pool.length / 2);
        for (let i = 0; i < removeCount; i++) {
            const obj = this.pool.pop();
            this.destroyObject(obj);
            this.stats.destroyed++;
        }
    }

    expand(targetSize) {
        // Add objects to pool up to target size
        const addCount = Math.min(targetSize - this.pool.length, this.maxSize - this.pool.length);
        for (let i = 0; i < addCount; i++) {
            const obj = this.factory();
            this.pool.push(obj);
            this.stats.created++;
        }
    }

    // Statistics and monitoring
    getStats() {
        return {
            ...this.stats,
            pooled: this.pool.length,
            active: this.active.size,
            total: this.pool.length + this.active.size,
            utilization: (this.active.size / (this.pool.length + this.active.size)) * 100,
            efficiency: (this.stats.reused / (this.stats.created + this.stats.reused)) * 100
        };
    }

    getMemoryUsage() {
        // Estimate memory usage (rough calculation)
        const averageObjectSize = 1024; // 1KB per object estimate
        return {
            pooled: this.pool.length * averageObjectSize,
            active: this.active.size * averageObjectSize,
            total: (this.pool.length + this.active.size) * averageObjectSize
        };
    }

    // Debugging
    logStats() {
        const stats = this.getStats();
        console.log(`ObjectPool Stats: ${stats.total} total, ${stats.active} active, ${stats.pooled} pooled`);
        console.log(`Efficiency: ${stats.efficiency.toFixed(1)}%, Utilization: ${stats.utilization.toFixed(1)}%`);
    }

    // Factory function helpers for common Three.js objects
    static createCoinFactory() {
        return () => {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshLambertMaterial({ color: 0xffd700 });
            const coin = new THREE.Mesh(geometry, material);

            coin.userData = { type: 'coin', pooled: true };
            return coin;
        };
    }

    static createParticleFactory() {
        return () => {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.userData = { type: 'particle', pooled: true };
            return particle;
        };
    }

    static createObstacleFactory(obstacleType = 'barrier') {
        return () => {
            const geometry = new THREE.BoxGeometry(2, 3, 0.5);
            const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const obstacle = new THREE.Mesh(geometry, material);

            obstacle.userData = { type: 'obstacle', obstacleType, pooled: true };
            return obstacle;
        };
    }

    static createPowerUpFactory(powerUpType = 'jetpack') {
        return () => {
            const geometry = new THREE.SphereGeometry(0.3, 12, 12);
            const material = new THREE.MeshLambertMaterial({
                color: powerUpType === 'jetpack' ? 0xff4444 :
                       powerUpType === 'magnet' ? 0x4444ff : 0x44ff44,
                emissive: powerUpType === 'jetpack' ? 0x220000 :
                         powerUpType === 'magnet' ? 0x000022 : 0x002200
            });
            const powerUp = new THREE.Mesh(geometry, material);

            powerUp.userData = { type: 'powerup', powerUpType, pooled: true };
            return powerUp;
        };
    }

    // Reset function helpers
    static resetCoin(coin) {
        coin.position.set(0, 0, 0);
        coin.rotation.set(0, 0, 0);
        coin.scale.setScalar(1);
        coin.visible = true;
    }

    static resetParticle(particle) {
        particle.position.set(0, 0, 0);
        particle.material.opacity = 0.8;
        particle.visible = true;
    }

    static resetObstacle(obstacle) {
        obstacle.position.set(0, 0, 0);
        obstacle.rotation.set(0, 0, 0);
        obstacle.visible = true;
    }

    static resetPowerUp(powerUp) {
        powerUp.position.set(0, 0, 0);
        powerUp.rotation.set(0, 0, 0);
        powerUp.visible = true;
    }

    // Advanced pooling strategies
    warmUp(count) {
        // Pre-create additional objects for expected demand
        this.expand(this.pool.length + count);
    }

    coolDown() {
        // Remove excess objects when demand is low
        this.shrink();
    }

    // Adaptive sizing based on usage patterns
    adaptToUsage() {
        const stats = this.getStats();
        const targetUtilization = 70; // Target 70% utilization

        if (stats.utilization > targetUtilization + 10) {
            // Too many active objects, expand pool
            this.expand(this.pool.length + Math.ceil(this.active.size * 0.5));
        } else if (stats.utilization < targetUtilization - 20) {
            // Too many pooled objects, shrink pool
            this.shrink();
        }
    }

    // Debug visualization
    createDebugInfo() {
        const stats = this.getStats();
        return {
            name: this.constructor.name,
            stats: stats,
            memory: this.getMemoryUsage(),
            adaptive: {
                currentUtilization: stats.utilization,
                targetUtilization: 70,
                shouldExpand: stats.utilization > 80,
                shouldShrink: stats.utilization < 50
            }
        };
    }
}

// Pool manager for multiple object types
class PoolManager {
    constructor() {
        this.pools = new Map();
        this.globalStats = {
            totalCreated: 0,
            totalReused: 0,
            totalDestroyed: 0
        };
    }

    createPool(name, factory, resetFunction, initialSize = 10, maxSize = 100) {
        const pool = new ObjectPool(factory, resetFunction, initialSize, maxSize);
        this.pools.set(name, pool);
        return pool;
    }

    getPool(name) {
        return this.pools.get(name);
    }

    get(name) {
        const pool = this.pools.get(name);
        return pool ? pool.get() : null;
    }

    release(name, obj) {
        const pool = this.pools.get(name);
        if (pool) {
            pool.release(obj);
        }
    }

    // Batch operations
    getMultiple(name, count) {
        const pool = this.pools.get(name);
        return pool ? pool.getMultiple(count) : [];
    }

    releaseMultiple(name, objects) {
        const pool = this.pools.get(name);
        if (pool) {
            pool.releaseMultiple(objects);
        }
    }

    // Pool management
    clearAll() {
        this.pools.forEach(pool => pool.clear());
    }

    resizeAll(newMaxSize) {
        this.pools.forEach(pool => pool.resize(newMaxSize));
    }

    adaptAll() {
        this.pools.forEach(pool => pool.adaptToUsage());
    }

    // Statistics
    getGlobalStats() {
        const stats = {
            pools: Array.from(this.pools.entries()).map(([name, pool]) => ({
                name,
                ...pool.getStats()
            })),
            total: {
                created: 0,
                reused: 0,
                destroyed: 0,
                pooled: 0,
                active: 0
            }
        };

        stats.pools.forEach(poolStat => {
            stats.total.created += poolStat.created;
            stats.total.reused += poolStat.reused;
            stats.total.destroyed += poolStat.destroyed;
            stats.total.pooled += poolStat.pooled;
            stats.total.active += poolStat.active;
        });

        return stats;
    }

    // Memory management
    forceGarbageCollection() {
        // Force garbage collection if available (development only)
        if (window.gc) {
            window.gc();
        }

        // Trigger pool adaptation
        this.adaptAll();
    }

    // Debug methods
    logAllStats() {
        console.group('Object Pool Manager Stats');
        const globalStats = this.getGlobalStats();

        console.log('Global:', globalStats.total);
        console.log('Individual pools:');
        globalStats.pools.forEach(pool => {
            console.log(`${pool.name}:`, pool);
        });

        console.groupEnd();
    }

    exportStats() {
        return this.getGlobalStats();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ObjectPool, PoolManager };
}

// Make classes available globally
if (typeof window !== 'undefined') {
    window.ObjectPool = ObjectPool;
    window.PoolManager = PoolManager;
}
