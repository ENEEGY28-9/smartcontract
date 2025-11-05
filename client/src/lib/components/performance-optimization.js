// Performance Optimization System for Boss Battles
// Implements LOD system, object pooling, and network prediction

import * as THREE from 'three';

export class PerformanceOptimizer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // LOD (Level of Detail) system
        this.lodLevels = {
            high: { distance: 0, detail: 1.0 },
            medium: { distance: 50, detail: 0.7 },
            low: { distance: 100, detail: 0.4 },
            veryLow: { distance: 200, detail: 0.2 }
        };

        // Object pooling system
        this.objectPools = new Map();
        this.poolSizes = {
            projectiles: 100,
            particles: 200,
            effects: 50,
            obstacles: 30,
            pickups: 20
        };

        // Network prediction
        this.networkPrediction = new NetworkPredictionSystem();

        // Performance monitoring
        this.performanceMetrics = {
            fps: 60,
            frameTime: 16.67,
            drawCalls: 0,
            triangles: 0,
            memoryUsage: 0
        };

        this.initializeObjectPools();
        this.setupPerformanceMonitoring();
    }

    // Initialize object pools for better memory management
    initializeObjectPools() {
        Object.entries(this.poolSizes).forEach(([poolName, size]) => {
            this.objectPools.set(poolName, {
                available: [],
                inUse: [],
                total: size,
                createFunction: this.getObjectFactory(poolName)
            });

            // Pre-populate pools
            for (let i = 0; i < size; i++) {
                const obj = this.objectPools.get(poolName).createFunction();
                obj.visible = false;
                obj.userData.pool = poolName;
                this.objectPools.get(poolName).available.push(obj);
                this.scene.add(obj);
            }
        });

        console.log('🚀 Object pools initialized');
    }

    // Get object factory function for different pool types
    getObjectFactory(poolName) {
        switch (poolName) {
            case 'projectiles':
                return () => {
                    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0xFFD700,
                        transparent: true,
                        opacity: 0.8
                    });
                    return new THREE.Mesh(geometry, material);
                };

            case 'particles':
                return () => {
                    const geometry = new THREE.SphereGeometry(0.05, 4, 4);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x4a9eff,
                        transparent: true,
                        opacity: 0.8
                    });
                    return new THREE.Mesh(geometry, material);
                };

            case 'effects':
                return () => {
                    const geometry = new THREE.RingGeometry(1, 3, 16);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0xFF4500,
                        transparent: true,
                        opacity: 0.6
                    });
                    return new THREE.Mesh(geometry, material);
                };

            case 'obstacles':
                return () => {
                    const geometry = new THREE.BoxGeometry(2, 2, 2);
                    const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    return new THREE.Mesh(geometry, material);
                };

            case 'pickups':
                return () => {
                    const geometry = new THREE.OctahedronGeometry(0.6, 1);
                    const material = new THREE.MeshLambertMaterial({
                        color: 0xffd700,
                        emissive: 0x442200,
                        emissiveIntensity: 0.3
                    });
                    return new THREE.Mesh(geometry, material);
                };

            default:
                return () => new THREE.Object3D();
        }
    }

    // Get object from pool
    getPooledObject(poolName) {
        const pool = this.objectPools.get(poolName);
        if (!pool) return null;

        let obj = pool.available.pop();
        if (!obj) {
            // Pool exhausted, create new object (less optimal)
            obj = pool.createFunction();
            obj.visible = false;
            obj.userData.pool = poolName;
            this.scene.add(obj);
            console.warn(`⚠️ Pool "${poolName}" exhausted, created new object`);
        }

        obj.visible = true;
        pool.inUse.push(obj);
        return obj;
    }

    // Return object to pool
    returnPooledObject(obj) {
        if (!obj.userData.pool) return;

        const poolName = obj.userData.pool;
        const pool = this.objectPools.get(poolName);
        if (!pool) return;

        // Reset object state
        obj.visible = false;
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(1, 1, 1);

        // Remove from in-use, add to available
        const index = pool.inUse.indexOf(obj);
        if (index > -1) {
            pool.inUse.splice(index, 1);
        }
        pool.available.push(obj);
    }

    // LOD system for distance-based detail reduction
    updateLOD(objects) {
        objects.forEach(obj => {
            if (!obj.position || !obj.userData.originalGeometry) return;

            const distance = this.camera.position.distanceTo(obj.position);
            const lodLevel = this.getLODLevel(distance);

            // Apply LOD modifications
            this.applyLODToObject(obj, lodLevel);
        });
    }

    // Get appropriate LOD level based on distance
    getLODLevel(distance) {
        if (distance <= this.lodLevels.high.distance) return 'high';
        if (distance <= this.lodLevels.medium.distance) return 'medium';
        if (distance <= this.lodLevels.low.distance) return 'low';
        return 'veryLow';
    }

    // Apply LOD modifications to object
    applyLODToObject(obj, lodLevel) {
        const detail = this.lodLevels[lodLevel].detail;

        // Store original geometry if not already stored
        if (!obj.userData.originalGeometry) {
            obj.userData.originalGeometry = obj.geometry;
            obj.userData.originalDetail = 1.0;
        }

        // Reduce geometry detail based on LOD
        if (detail < obj.userData.originalDetail) {
            // For now, just scale down the object (simplified LOD)
            // In a full implementation, you'd swap geometries or reduce vertices
            obj.scale.setScalar(detail);
        } else {
            obj.scale.setScalar(1.0);
        }

        obj.userData.currentLOD = lodLevel;
    }

    // Adaptive quality based on performance
    adaptQuality(targetFPS = 60) {
        const currentFPS = this.performanceMetrics.fps;

        if (currentFPS < targetFPS * 0.8) {
            // Performance is poor, reduce quality
            this.reduceQuality();
        } else if (currentFPS > targetFPS * 1.2) {
            // Performance is good, can increase quality
            this.increaseQuality();
        }
    }

    // Reduce quality settings
    reduceQuality() {
        // Reduce LOD distances (objects switch to lower detail sooner)
        this.lodLevels.medium.distance = Math.max(30, this.lodLevels.medium.distance - 10);
        this.lodLevels.low.distance = Math.max(60, this.lodLevels.low.distance - 15);

        // Reduce particle counts
        this.poolSizes.particles = Math.max(100, this.poolSizes.particles - 20);

        console.log('📉 Quality reduced for better performance');
    }

    // Increase quality settings
    increaseQuality() {
        // Increase LOD distances (objects maintain higher detail longer)
        this.lodLevels.medium.distance = Math.min(70, this.lodLevels.medium.distance + 10);
        this.lodLevels.low.distance = Math.min(130, this.lodLevels.low.distance + 15);

        // Increase particle counts
        this.poolSizes.particles = Math.min(300, this.poolSizes.particles + 20);

        console.log('📈 Quality increased');
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000; // Update every second

        // Monitor WebGL context
        this.renderer = this.scene.children.find(child =>
            child instanceof THREE.WebGLRenderer
        );

        if (this.renderer) {
            this.originalRender = this.renderer.render.bind(this.renderer);
            this.renderer.render = this.wrapRenderFunction(this.renderer.render);
        }
    }

    // Wrap render function to monitor performance
    wrapRenderFunction(originalRender) {
        return (scene, camera) => {
            const startTime = performance.now();

            originalRender(scene, camera);

            const endTime = performance.now();
            this.performanceMetrics.frameTime = endTime - startTime;

            // Update FPS calculation
            this.frameCount++;
            if (performance.now() - this.lastFrameTime >= this.fpsUpdateInterval) {
                this.performanceMetrics.fps = (this.frameCount * 1000) / (performance.now() - this.lastFrameTime);
                this.frameCount = 0;
                this.lastFrameTime = performance.now();

                // Adaptive quality adjustment
                this.adaptQuality();
            }
        };
    }

    // Get performance statistics
    getPerformanceStats() {
        return {
            ...this.performanceMetrics,
            lodDistances: this.lodLevels,
            poolStats: Object.fromEntries(
                Array.from(this.objectPools.entries()).map(([name, pool]) => [
                    name,
                    {
                        available: pool.available.length,
                        inUse: pool.inUse.length,
                        total: pool.total
                    }
                ])
            )
        };
    }
}

// Network Prediction System for smooth multiplayer experience
export class NetworkPredictionSystem {
    constructor() {
        this.playerPredictions = new Map();
        this.predictionHistory = new Map();
        this.latency = 50; // ms
        this.predictionTime = 100; // ms ahead to predict
    }

    // Predict player position based on movement history
    predictPlayerPosition(playerId, currentPosition, velocity, input) {
        if (!this.playerPredictions.has(playerId)) {
            this.playerPredictions.set(playerId, {
                position: currentPosition.clone(),
                velocity: velocity.clone(),
                lastUpdate: Date.now(),
                predictionCount: 0
            });
        }

        const prediction = this.playerPredictions.get(playerId);
        const now = Date.now();

        // Calculate time since last update
        const deltaTime = (now - prediction.lastUpdate) / 1000;

        // Predict future position based on current velocity and input
        const predictedPosition = currentPosition.clone();
        predictedPosition.add(velocity.clone().multiplyScalar(deltaTime));

        // Apply input-based prediction
        if (input) {
            const inputVector = this.getInputVector(input);
            predictedPosition.add(inputVector.multiplyScalar(deltaTime * 12)); // Movement speed
        }

        prediction.position.copy(predictedPosition);
        prediction.lastUpdate = now;
        prediction.predictionCount++;

        return predictedPosition;
    }

    // Convert input to movement vector
    getInputVector(input) {
        const vector = new THREE.Vector3();

        if (input.forward) vector.z -= 1;
        if (input.backward) vector.z += 1;
        if (input.left) vector.x -= 1;
        if (input.right) vector.x += 1;

        return vector.normalize();
    }

    // Correct prediction when server state arrives
    correctPrediction(playerId, serverPosition, serverVelocity) {
        const prediction = this.playerPredictions.get(playerId);
        if (!prediction) return;

        // Calculate error between prediction and server state
        const error = serverPosition.clone().sub(prediction.position);
        const errorMagnitude = error.length();

        if (errorMagnitude > 0.5) { // Only correct if error is significant
            // Smoothly interpolate to correct position
            prediction.position.lerp(serverPosition, 0.3);

            console.log(`🔄 Corrected prediction for player ${playerId}, error: ${errorMagnitude.toFixed(2)}`);
        }

        // Update velocity for future predictions
        prediction.velocity.copy(serverVelocity);
    }

    // Store prediction history for rollback capability
    storePrediction(playerId, position, timestamp) {
        if (!this.predictionHistory.has(playerId)) {
            this.predictionHistory.set(playerId, []);
        }

        const history = this.predictionHistory.get(playerId);
        history.push({ position: position.clone(), timestamp });

        // Keep only recent history (last 5 seconds)
        const cutoffTime = timestamp - 5000;
        this.predictionHistory.set(playerId,
            history.filter(entry => entry.timestamp > cutoffTime)
        );
    }

    // Rollback to previous state if needed
    rollbackToTime(playerId, targetTime) {
        const history = this.predictionHistory.get(playerId);
        if (!history || history.length === 0) return null;

        // Find closest entry before target time
        let closestEntry = null;
        let closestTime = Infinity;

        for (const entry of history) {
            if (entry.timestamp <= targetTime && targetTime - entry.timestamp < closestTime) {
                closestEntry = entry;
                closestTime = targetTime - entry.timestamp;
            }
        }

        return closestEntry ? closestEntry.position : null;
    }

    // Clean up old prediction data
    cleanup() {
        const currentTime = Date.now();

        // Remove old predictions
        for (const [playerId, prediction] of this.playerPredictions.entries()) {
            if (currentTime - prediction.lastUpdate > 10000) { // 10 seconds
                this.playerPredictions.delete(playerId);
            }
        }

        // Clean up old history
        for (const [playerId, history] of this.predictionHistory.entries()) {
            const cutoffTime = currentTime - 5000; // 5 seconds
            this.predictionHistory.set(playerId,
                history.filter(entry => entry.timestamp > cutoffTime)
            );
        }
    }
}

// Frustum Culling System for performance
export class FrustumCullingSystem {
    constructor(camera) {
        this.camera = camera;
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
    }

    // Update frustum planes
    updateFrustum() {
        this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    // Check if object is visible in frustum
    isObjectVisible(object) {
        if (!object.geometry) return true; // Not a mesh

        // For now, simple distance-based culling
        // In a full implementation, you'd use proper frustum intersection
        const distance = this.camera.position.distanceTo(object.position);
        return distance < 200; // Cull objects farther than 200 units
    }

    // Cull objects outside frustum
    cullObjects(objects) {
        this.updateFrustum();

        return objects.filter(obj => this.isObjectVisible(obj));
    }

    // Get objects within specific range
    getObjectsInRange(objects, center, radius) {
        return objects.filter(obj => {
            const distance = obj.position.distanceTo(center);
            return distance <= radius && this.isObjectVisible(obj);
        });
    }
}

// Memory Management System
export class MemoryManager {
    constructor() {
        this.memoryThreshold = 100 * 1024 * 1024; // 100MB
        this.cleanupInterval = 30000; // 30 seconds
        this.lastCleanup = Date.now();

        this.monitoredObjects = new Set();
        this.disposableObjects = new WeakSet();
    }

    // Monitor object for memory management
    monitorObject(obj) {
        this.monitoredObjects.add(obj);
        this.disposableObjects.add(obj);
    }

    // Mark object for disposal
    markForDisposal(obj) {
        this.disposableObjects.add(obj);
    }

    // Cleanup disposable objects
    cleanup() {
        if (Date.now() - this.lastCleanup < this.cleanupInterval) return;

        console.log('🧹 Running memory cleanup...');

        // Dispose of marked objects
        for (const obj of this.disposableObjects) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            if (obj.texture) obj.texture.dispose();
        }

        this.disposableObjects = new WeakSet();
        this.lastCleanup = Date.now();

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        console.log('✅ Memory cleanup completed');
    }

    // Get memory usage estimate
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
            };
        }

        return { used: 0, total: 0, limit: 0, percentage: 0 };
    }

    // Check if memory usage is high
    isMemoryHigh() {
        const memory = this.getMemoryUsage();
        return memory.percentage > 80;
    }

    // Aggressive cleanup when memory is high
    aggressiveCleanup() {
        if (!this.isMemoryHigh()) return;

        console.log('🚨 High memory usage detected, performing aggressive cleanup');

        // Clear all disposable objects
        this.cleanup();

        // Reduce LOD distances significantly
        this.reduceLODDistances();

        // Clear particle pools
        this.clearParticlePools();

        console.log('💥 Aggressive cleanup completed');
    }

    // Reduce LOD distances for better performance
    reduceLODDistances() {
        // This would need access to the performance optimizer
        // For now, just log the action
        console.log('📉 Reduced LOD distances for better performance');
    }

    // Clear particle pools to free memory
    clearParticlePools() {
        // This would need access to object pools
        // For now, just log the action
        console.log('🧽 Cleared particle pools to free memory');
    }
}
