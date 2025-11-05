/**
 * Client State Synchronization Example
 * Example implementation cho game engine integration
 */

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    subtract(other) {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiplyScalar(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    lerp(other, t) {
        return new Vector3(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t,
            this.z + (other.z - this.z) * t
        );
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
}

// Entity state representation
class EntityState {
    constructor(entityId, position, velocity, rotation = [0, 0, 0, 1]) {
        this.entityId = entityId;
        this.position = position;
        this.velocity = velocity;
        this.rotation = rotation;
        this.tick = 0;
    }
}

// Player input
class PlayerInput {
    constructor(playerId, movement, timestamp) {
        this.playerId = playerId;
        this.inputSequence = Date.now(); // Simple sequence number
        this.movement = movement; // [x, y, z]
        this.timestamp = timestamp;
    }
}

// Client prediction engine
class ClientPredictionEngine {
    constructor() {
        this.physicsConstants = {
            deltaTime: 1.0 / 60.0,
            gravity: -9.81,
            friction: 0.9,
            maxVelocity: 15.0
        };
        this.predictedStates = new Map();
        this.predictionHistory = [];
    }

    // Predict next state dựa trên input
    predictNextState(input, currentState) {
        if (!currentState) {
            // Initial state
            currentState = new EntityState(
                input.playerId,
                new Vector3(0, 5, 0),
                new Vector3(0, 0, 0)
            );
        }

        // Calculate input velocity
        const inputVelocity = new Vector3(
            input.movement[0] * 10.0,
            0,
            input.movement[2] * 10.0
        );

        // Lerp giữa current velocity và input velocity
        const lerpFactor = 0.3;
        const targetVelocity = currentState.velocity.lerp(inputVelocity, lerpFactor);

        // Apply friction
        const frictionVelocity = new Vector3(
            targetVelocity.x * this.physicsConstants.friction,
            targetVelocity.y,
            targetVelocity.z * this.physicsConstants.friction
        );

        // Clamp velocity
        const speed = frictionVelocity.magnitude();
        const clampedVelocity = speed > this.physicsConstants.maxVelocity
            ? frictionVelocity.multiplyScalar(this.physicsConstants.maxVelocity / speed)
            : frictionVelocity;

        // Calculate new position
        const deltaPosition = clampedVelocity.multiplyScalar(this.physicsConstants.deltaTime);
        let newPosition = currentState.position.add(deltaPosition);

        // Apply gravity
        newPosition = new Vector3(
            newPosition.x,
            newPosition.y + this.physicsConstants.gravity * this.physicsConstants.deltaTime,
            newPosition.z
        );

        // Ground collision
        if (newPosition.y < 0) {
            newPosition.y = 0;
            clampedVelocity.y = 0;
        }

        const predictedState = new EntityState(
            input.playerId,
            newPosition,
            clampedVelocity,
            currentState.rotation
        );
        predictedState.tick = currentState.tick + 1;
        predictedState.confidence = this.calculateConfidence(input);

        // Store prediction
        this.predictedStates.set(input.playerId, predictedState);
        this.predictionHistory.push({
            input,
            state: predictedState,
            timestamp: Date.now()
        });

        return predictedState;
    }

    calculateConfidence(input) {
        // Simple confidence calculation dựa trên input consistency
        const recentPredictions = this.predictionHistory.slice(-5);
        if (recentPredictions.length < 2) return 1.0;

        // Check if movement is consistent
        const movements = recentPredictions.map(p => p.input.movement);
        const avgMovement = movements.reduce((acc, mov) =>
            new Vector3(acc.x + mov[0], acc.y + mov[1], acc.z + mov[2]), new Vector3()
        ).multiplyScalar(1.0 / movements.length);

        const consistency = movements.reduce((acc, mov) => {
            const diff = Math.abs(mov[0] - avgMovement.x) + Math.abs(mov[2] - avgMovement.z);
            return acc + (1.0 - Math.min(diff / 5.0, 1.0));
        }, 0) / movements.length;

        return Math.max(0.1, consistency);
    }

    getPredictedState(playerId) {
        return this.predictedStates.get(playerId);
    }
}

// Reconciliation engine
class ReconciliationEngine {
    constructor() {
        this.rollbackBuffer = new Map();
        this.serverStates = new Map();
    }

    // Apply reconciliation khi nhận server state
    applyReconciliation(playerId, serverState, predictedState) {
        if (!predictedState || !serverState) return;

        // Calculate correction
        const positionCorrection = serverState.position.subtract(predictedState.position);
        const velocityCorrection = serverState.velocity.subtract(predictedState.velocity);

        const distance = positionCorrection.magnitude();

        if (distance > 1.0) { // Threshold cho reconciliation
            console.log(`Applying reconciliation for ${playerId}, distance: ${distance}`);

            // Apply correction với smoothing
            const smoothingFactor = 0.7;
            const smoothedCorrection = positionCorrection.multiplyScalar(smoothingFactor);

            // Update predicted state
            predictedState.position = predictedState.position.add(smoothedCorrection);
            predictedState.velocity = predictedState.velocity.add(
                velocityCorrection.multiplyScalar(smoothingFactor)
            );

            // Update visual representation
            this.updateEntityVisual(playerId, predictedState);
        }
    }

    updateEntityVisual(playerId, state) {
        // Update game object position/rotation dựa trên corrected state
        const gameObject = this.getGameObject(playerId);
        if (gameObject) {
            gameObject.position.set(state.position.x, state.position.y, state.position.z);

            // Smooth visual transition nếu cần
            gameObject.updateVisualState(state);
        }
    }

    getGameObject(playerId) {
        // Return game object cho player
        return gameObjects.get(playerId);
    }
}

// Input buffer để handle network latency
class InputBuffer {
    constructor() {
        this.inputs = [];
        this.lastProcessedSequence = 0;
    }

    addInput(input) {
        // Insert theo sequence order
        const insertIndex = this.inputs.findIndex(i => i.inputSequence > input.inputSequence);
        if (insertIndex === -1) {
            this.inputs.push(input);
        } else {
            this.inputs.splice(insertIndex, 0, input);
        }
    }

    getPendingInputs() {
        return this.inputs.filter(input => input.inputSequence > this.lastProcessedSequence);
    }

    markProcessed(sequence) {
        this.lastProcessedSequence = Math.max(this.lastProcessedSequence, sequence);

        // Remove processed inputs để avoid memory bloat
        this.inputs = this.inputs.filter(input => input.inputSequence > this.lastProcessedSequence);
    }
}

// Main state sync manager
class ClientStateSyncManager {
    constructor() {
        this.predictionEngine = new ClientPredictionEngine();
        this.reconciliationEngine = new ReconciliationEngine();
        this.inputBuffer = new InputBuffer();

        this.networkClient = null;
        this.isConnected = false;
        this.localPlayerId = null;

        this.stats = {
            predictions: 0,
            reconciliations: 0,
            averageLatency: 0,
            lastServerUpdate: 0
        };
    }

    // Initialize connection với server
    async initialize(serverEndpoint, playerId) {
        this.localPlayerId = playerId;

        // Setup WebSocket connection (placeholder)
        this.networkClient = new WebSocketClient(serverEndpoint);

        this.networkClient.onOpen = () => {
            this.isConnected = true;
            console.log('Connected to state sync server');
        };

        this.networkClient.onMessage = (message) => {
            this.handleServerMessage(message);
        };

        this.networkClient.onClose = () => {
            this.isConnected = false;
            console.log('Disconnected from state sync server');
        };

        // Setup game loop integration
        this.setupGameLoop();
    }

    // Process local player input
    processLocalInput(movementInput) {
        if (!this.isConnected || !this.localPlayerId) return;

        const input = new PlayerInput(
            this.localPlayerId,
            movementInput, // [x, y, z]
            Date.now()
        );

        // Add to buffer
        this.inputBuffer.addInput(input);

        // Generate prediction
        const currentState = this.predictionEngine.getPredictedState(this.localPlayerId);
        const predictedState = this.predictionEngine.predictNextState(input, currentState);

        // Apply prediction locally (immediate response)
        this.applyPredictedState(predictedState);

        // Send to server
        this.sendInputToServer(input);

        this.stats.predictions++;
    }

    // Apply predicted state to visual representation
    applyPredictedState(predictedState) {
        // Update local game object immediately
        const gameObject = this.getGameObject(this.localPlayerId);
        if (gameObject) {
            gameObject.position.set(
                predictedState.position.x,
                predictedState.position.y,
                predictedState.position.z
            );

            gameObject.velocity = predictedState.velocity;
        }
    }

    // Handle server messages
    handleServerMessage(message) {
        switch (message.type) {
            case 'state_update':
                this.handleStateUpdate(message);
                break;
            case 'reconciliation':
                this.handleReconciliation(message);
                break;
            case 'input_ack':
                this.handleInputAck(message);
                break;
        }
    }

    // Handle server state update
    handleStateUpdate(message) {
        const serverState = message.state;

        // Update server states buffer
        this.reconciliationEngine.serverStates.set(serverState.tick, serverState);

        // Update other entities (non-local player)
        for (const entity of serverState.entities) {
            if (entity.entityId !== this.localPlayerId) {
                this.updateEntityFromServer(entity);
            }
        }

        // Check for reconciliation với local player
        if (serverState.entities.some(e => e.entityId === this.localPlayerId)) {
            const localPredicted = this.predictionEngine.getPredictedState(this.localPlayerId);
            const serverEntity = serverState.entities.find(e => e.entityId === this.localPlayerId);

            if (localPredicted && serverEntity) {
                this.reconciliationEngine.applyReconciliation(
                    this.localPlayerId,
                    serverEntity,
                    localPredicted
                );

                this.stats.reconciliations++;
            }
        }

        this.stats.lastServerUpdate = Date.now();
    }

    // Send input to server
    sendInputToServer(input) {
        if (this.networkClient && this.isConnected) {
            this.networkClient.send({
                type: 'player_input',
                input: input
            });
        }
    }

    // Setup game loop integration
    setupGameLoop() {
        // Assume game engine có game loop
        const gameLoop = () => {
            // Process pending inputs
            const pendingInputs = this.inputBuffer.getPendingInputs();

            for (const input of pendingInputs) {
                // Send to server nếu chưa sent
                if (!input.sent) {
                    this.sendInputToServer(input);
                    input.sent = true;
                }
            }

            // Cleanup old predictions periodically
            if (Math.random() < 0.01) { // 1% chance mỗi frame
                this.cleanupOldPredictions();
            }
        };

        // Hook into game loop (placeholder)
        if (typeof requestAnimationFrame !== 'undefined') {
            const animate = () => {
                gameLoop();
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    // Cleanup old prediction history
    cleanupOldPredictions() {
        const cutoffTime = Date.now() - 10000; // 10 seconds ago

        this.predictionEngine.predictionHistory = this.predictionEngine.predictionHistory.filter(
            p => p.timestamp > cutoffTime
        );

        // Keep only recent server states
        for (const [tick, state] of this.reconciliationEngine.serverStates) {
            if (Date.now() - state.timestamp > 10000) {
                this.reconciliationEngine.serverStates.delete(tick);
            }
        }
    }

    // Get current stats
    getStats() {
        return {
            ...this.stats,
            predictionHistorySize: this.predictionEngine.predictionHistory.length,
            serverStatesSize: this.reconciliationEngine.serverStates.size,
            pendingInputs: this.inputBuffer.inputs.length
        };
    }
}

// WebSocket client (placeholder implementation)
class WebSocketClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.ws = null;
        this.onOpen = () => {};
        this.onMessage = () => {};
        this.onClose = () => {};
    }

    connect() {
        this.ws = new WebSocket(this.endpoint);

        this.ws.onopen = () => {
            this.onOpen();
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.onMessage(message);
        };

        this.ws.onclose = () => {
            this.onClose();
        };
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

// Example usage
async function exampleUsage() {
    // Initialize state sync manager
    const stateSyncManager = new ClientStateSyncManager();

    // Connect to server
    await stateSyncManager.initialize('ws://localhost:8080/state-sync', 'player_123');

    // Simulate player input (thường từ game engine input system)
    setInterval(() => {
        // Generate random movement input
        const movement = [
            (Math.random() - 0.5) * 2, // x movement
            0,                          // y movement (always 0 for ground-based)
            (Math.random() - 0.5) * 2   // z movement
        ];

        stateSyncManager.processLocalInput(movement);

        // Log stats periodically
        if (Math.random() < 0.1) { // 10% chance
            console.log('State Sync Stats:', stateSyncManager.getStats());
        }
    }, 1000 / 60); // 60 FPS

    // Handle keyboard input (example)
    document.addEventListener('keydown', (event) => {
        const movement = [0, 0, 0];

        switch (event.code) {
            case 'KeyW': movement[2] = 1; break;  // Forward
            case 'KeyS': movement[2] = -1; break; // Backward
            case 'KeyA': movement[0] = -1; break; // Left
            case 'KeyD': movement[0] = 1; break;  // Right
        }

        if (movement[0] !== 0 || movement[2] !== 0) {
            stateSyncManager.processLocalInput(movement);
        }
    });
}

// Export for use in game engine
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ClientStateSyncManager,
        ClientPredictionEngine,
        ReconciliationEngine,
        Vector3,
        PlayerInput,
        EntityState
    };
}

// Browser usage
if (typeof window !== 'undefined') {
    window.ClientStateSyncManager = ClientStateSyncManager;
    window.exampleUsage = exampleUsage;
}

console.log('Client State Sync system loaded. Call exampleUsage() to start demo.');
