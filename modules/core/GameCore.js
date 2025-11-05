/**
 * GameCore - Core game state management
 * Manages fundamental game state, constants, and basic game loop
 */

class GameCore {
    constructor() {
        this.gameState = {
            score: 0,
            distance: 0,
            coins: 0,
            speed: 1.0,
            currentLane: 1, // 0: left, 1: middle, 2: right
            isJumping: false,
            isSliding: false,
            isGameOver: false,
            gameTime: 0,
            isPaused: false,
            level: 1
        };

        this.constants = {
            LANES: [-4, 0, 4],
            GRAVITY: -25,
            JUMP_FORCE: 8,
            SLIDE_DURATION: 0.8,
            COLLISION_COOLDOWN: 0.5,
            MAX_SPEED: 2.0,
            SPEED_INCREASE_RATE: 0.1,
            LANE_WIDTH: 4
        };

        this.gameObjects = {
            player: null,
            obstacles: [],
            coins: [],
            powerUps: [],
            environment: []
        };

        this.eventListeners = new Map();
        this.updateCallbacks = [];

        this.init();
    }

    init() {
        this.reset();
        this.setupEventSystem();
    }

    reset() {
        this.gameState = {
            score: 0,
            distance: 0,
            coins: 0,
            speed: 1.0,
            currentLane: 1,
            isJumping: false,
            isSliding: false,
            isGameOver: false,
            gameTime: 0,
            isPaused: false,
            level: 1
        };

        this.gameObjects = {
            player: null,
            obstacles: [],
            coins: [],
            powerUps: [],
            environment: []
        };
    }

    startGame() {
        if (this.gameState.isGameOver) {
            this.reset();
        }

        this.gameState.isGameOver = false;
        this.gameState.isPaused = false;

        this.emit('gameStarted');
        console.log('Game started');
    }

    pauseGame() {
        this.gameState.isPaused = !this.gameState.isPaused;
        this.emit('gamePaused', this.gameState.isPaused);
    }

    gameOver(reason = 'Unknown') {
        this.gameState.isGameOver = true;
        this.gameState.isPaused = true;

        this.emit('gameOver', {
            score: this.gameState.score,
            distance: this.gameState.distance,
            coins: this.gameState.coins,
            reason: reason
        });
        console.log('Game over:', reason);
    }

    update(deltaTime) {
        if (this.gameState.isPaused || this.gameState.isGameOver) {
            return;
        }

        this.gameState.gameTime += deltaTime;
        this.gameState.distance += this.gameState.speed * deltaTime;

        // Increase speed over time
        if (this.gameState.gameTime > 0) {
            const speedIncrease = Math.floor(this.gameState.gameTime / 10) * this.constants.SPEED_INCREASE_RATE;
            this.gameState.speed = Math.min(1.0 + speedIncrease, this.constants.MAX_SPEED);
        }

        // Update score based on distance
        const newScore = Math.floor(this.gameState.distance);
        if (newScore > this.gameState.score) {
            this.gameState.score = newScore;
            this.emit('scoreUpdated', this.gameState.score);
        }

        // Call all update callbacks
        this.updateCallbacks.forEach(callback => {
            try {
                callback(deltaTime, this.gameState);
            } catch (error) {
                console.error('Error in update callback:', error);
            }
        });

        // Clean up old objects periodically
        if (Math.floor(this.gameState.gameTime) % 30 === 0) {
            this.cleanupOldObjects();
        }
    }

    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
        return this.updateCallbacks.length - 1; // Return index for potential removal
    }

    removeUpdateCallback(index) {
        if (index >= 0 && index < this.updateCallbacks.length) {
            this.updateCallbacks.splice(index, 1);
            return true;
        }
        return false;
    }

    // Event system
    setupEventSystem() {
        this.eventListeners = new Map();
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Game state getters/setters
    getScore() {
        return this.gameState.score;
    }

    getDistance() {
        return this.gameState.distance;
    }

    getCoins() {
        return this.gameState.coins;
    }

    getSpeed() {
        return this.gameState.speed;
    }

    getCurrentLane() {
        return this.gameState.currentLane;
    }

    getLanePosition(laneIndex) {
        return this.constants.LANES[laneIndex] || 0;
    }

    isGameRunning() {
        return !this.gameState.isGameOver && !this.gameState.isPaused;
    }

    isGameOver() {
        return this.gameState.isGameOver;
    }

    isPaused() {
        return this.gameState.isPaused;
    }

    // Player actions
    jump() {
        if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.isJumping) {
            return false;
        }

        this.gameState.isJumping = true;
        this.emit('playerJumped');
        return true;
    }

    slide() {
        if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.isSliding) {
            return false;
        }

        this.gameState.isSliding = true;
        this.emit('playerSlid');

        // Auto-reset slide after duration
        setTimeout(() => {
            this.gameState.isSliding = false;
            this.emit('slideEnded');
        }, this.constants.SLIDE_DURATION * 1000);

        return true;
    }

    moveToLane(laneIndex) {
        if (laneIndex < 0 || laneIndex > 2 || laneIndex === this.gameState.currentLane) {
            return false;
        }

        this.gameState.currentLane = laneIndex;
        this.emit('laneChanged', laneIndex);
        return true;
    }

    moveLeft() {
        return this.moveToLane(this.gameState.currentLane - 1);
    }

    moveRight() {
        return this.moveToLane(this.gameState.currentLane + 1);
    }

    addCoins(amount) {
        this.gameState.coins += amount;
        this.emit('coinsChanged', this.gameState.coins);
    }

    // Object management
    addGameObject(type, object) {
        if (this.gameObjects[type]) {
            this.gameObjects[type].push(object);
        }
    }

    removeGameObject(type, object) {
        if (this.gameObjects[type]) {
            const index = this.gameObjects[type].indexOf(object);
            if (index > -1) {
                this.gameObjects[type].splice(index, 1);
            }
        }
    }

    getGameObjects(type) {
        return this.gameObjects[type] || [];
    }

    cleanupOldObjects() {
        // Remove objects that are too far behind the player
        const playerZ = this.gameState.distance - 50; // Keep 50 units behind

        Object.keys(this.gameObjects).forEach(type => {
            const objects = this.gameObjects[type];
            if (Array.isArray(objects)) {
                this.gameObjects[type] = objects.filter(obj => {
                    if (obj.position && obj.position.z < playerZ) {
                        // Remove from scene if it has a parent (Three.js object)
                        if (obj.parent) {
                            obj.parent.remove(obj);
                        }
                        return false;
                    }
                    return true;
                });
            }
        });

        this.emit('objectsCleaned');
    }

    // Save/Load functionality
    saveGame() {
        const saveData = {
            gameState: this.gameState,
            timestamp: Date.now(),
            version: '1.0'
        };

        return Utils.saveToLocalStorage('gameCore', saveData);
    }

    loadGame() {
        const saveData = Utils.loadFromLocalStorage('gameCore');
        if (saveData && saveData.gameState) {
            this.gameState = { ...this.gameState, ...saveData.gameState };
            return true;
        }
        return false;
    }

    // Debug methods
    getDebugInfo() {
        return {
            gameState: this.gameState,
            objectCounts: Object.keys(this.gameObjects).map(type => ({
                type,
                count: this.gameObjects[type].length
            })),
            performance: {
                updateCallbacks: this.updateCallbacks.length,
                eventListeners: Array.from(this.eventListeners.entries()).map(([event, listeners]) => ({
                    event,
                    listenerCount: listeners.length
                }))
            }
        };
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            fps: this.calculateFPS(),
            frameTime: this.getAverageFrameTime(),
            memoryUsage: this.getMemoryUsage(),
            objectCount: this.getTotalObjectCount()
        };
    }

    calculateFPS() {
        // This would need to be implemented with actual frame timing
        return 60; // Placeholder
    }

    getAverageFrameTime() {
        // This would need to be implemented with actual frame timing
        return 16.67; // Placeholder for 60fps
    }

    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
    }

    getTotalObjectCount() {
        return Object.values(this.gameObjects).reduce((total, objects) => total + objects.length, 0);
    }
}

// Singleton pattern for global access
const gameCore = new GameCore();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameCore;
}

// Make GameCore available globally
if (typeof window !== 'undefined') {
    window.GameCore = GameCore;
}
