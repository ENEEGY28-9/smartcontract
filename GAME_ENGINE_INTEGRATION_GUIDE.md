# Game Engine Integration Guide

## Tổng quan

Hướng dẫn này mô tả cách tích hợp State Synchronization framework từ backend vào game engine phía client để đạt được gameplay mượt mà với độ trễ thấp.

## Kiến trúc tổng thể

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Game Engine   │    │  Client Network  │    │   Server        │
│   (Unity/UE)    │◄──►│  State Sync      │◄──►│   Worker        │
│                 │    │  Manager         │    │   Backend       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Các thành phần chính

### 1. Client State Sync Manager

```typescript
class ClientStateSyncManager {
    private predictedStates: Map<string, PredictedEntityState>;
    private serverStates: Map<string, ServerEntityState>;
    private inputBuffer: InputBuffer;
    private reconciliationEngine: ReconciliationEngine;
    private predictionEngine: ClientPredictionEngine;

    // Initialize với server connection
    async initialize(serverEndpoint: string): Promise<void> {
        // Setup WebSocket hoặc gRPC connection
        this.networkClient = new NetworkClient(serverEndpoint);

        // Initialize prediction và reconciliation engines
        this.predictionEngine = new ClientPredictionEngine();
        this.reconciliationEngine = new ReconciliationEngine();

        // Setup event listeners
        this.setupNetworkListeners();
    }

    // Process local input với client prediction
    processLocalInput(input: PlayerInput): void {
        // Add input vào buffer
        this.inputBuffer.addInput(input);

        // Generate client prediction
        const prediction = this.predictionEngine.predictNextState(input);

        // Apply prediction locally
        this.applyPredictedState(prediction);

        // Send input to server
        this.sendInputToServer(input);
    }

    // Handle server state update
    handleServerStateUpdate(stateUpdate: StateUpdate): void {
        // Store server state
        this.serverStates.set(stateUpdate.tick, stateUpdate);

        // Check for reconciliation cần thiết
        if (this.needsReconciliation(stateUpdate)) {
            this.performReconciliation(stateUpdate);
        }

        // Update local state với server corrections
        this.updateLocalState(stateUpdate);
    }

    private needsReconciliation(serverUpdate: StateUpdate): boolean {
        // Check if client prediction differs significantly từ server state
        const predictedState = this.predictedStates.get(serverUpdate.playerId);
        if (!predictedState) return false;

        const serverEntity = serverUpdate.entities.find(e => e.playerId === serverUpdate.playerId);
        if (!serverEntity) return false;

        const distance = this.calculateDistance(predictedState.position, serverEntity.position);
        return distance > RECONCILIATION_THRESHOLD;
    }
}
```

### 2. Client Prediction Engine

```typescript
class ClientPredictionEngine {
    private physicsConstants: PhysicsConstants;
    private predictionHistory: PredictionHistory[];

    predictNextState(input: PlayerInput): PredictedEntityState {
        // Get current predicted state
        const currentState = this.getCurrentPredictedState(input.playerId);

        // Apply physics simulation để predict next state
        const nextPosition = this.simulatePhysics(currentState, input);
        const nextVelocity = this.calculateVelocity(currentState, input);

        return {
            entityId: input.playerId,
            tick: currentState.tick + 1,
            position: nextPosition,
            velocity: nextVelocity,
            confidence: this.calculateConfidence(input),
            appliedInput: input
        };
    }

    private simulatePhysics(currentState: EntityState, input: PlayerInput): Vector3 {
        const deltaTime = 1.0 / 60.0; // 60 FPS
        const inputVelocity = new Vector3(
            input.movement[0] * 10.0,
            0,
            input.movement[2] * 10.0
        );

        // Lerp giữa current velocity và input velocity
        const lerpFactor = 0.3;
        const targetVelocity = currentState.velocity.lerp(inputVelocity, lerpFactor);

        // Apply physics
        const newPosition = currentState.position.add(
            targetVelocity.multiplyScalar(deltaTime)
        );

        // Apply gravity và ground collision
        if (newPosition.y <= 0) {
            newPosition.y = 0;
        }

        return newPosition;
    }

    private calculateConfidence(input: PlayerInput): number {
        // Confidence giảm theo thời gian dự đoán và input complexity
        const timeFactor = Math.max(0.1, 1.0 - (input.timestamp * 0.01));
        const complexityFactor = this.calculateInputComplexity(input);

        return timeFactor * complexityFactor;
    }
}
```

### 3. Reconciliation Engine

```typescript
class ReconciliationEngine {
    private rollbackBuffer: Map<string, EntityState[]>;

    performReconciliation(serverUpdate: StateUpdate, playerId: string): void {
        // Find player entity trong server update
        const serverEntity = serverUpdate.entities.find(e => e.playerId === playerId);
        if (!serverEntity) return;

        // Get current predicted state
        const predictedState = this.getPredictedState(playerId);

        // Calculate correction
        const positionCorrection = serverEntity.position.subtract(predictedState.position);
        const velocityCorrection = serverEntity.velocity.subtract(predictedState.velocity);

        // Apply correction với smoothing
        this.applyCorrection(playerId, positionCorrection, velocityCorrection);

        // Rollback và replay inputs nếu cần thiết
        if (this.shouldRollback(serverUpdate.tick)) {
            this.rollbackAndReplay(serverUpdate.tick, playerId);
        }
    }

    private applyCorrection(playerId: string, positionCorrection: Vector3, velocityCorrection: Vector3): void {
        const smoothingFactor = 0.7; // Smooth correction để tránh jerk

        // Apply position correction
        const currentPosition = this.getCurrentPosition(playerId);
        const correctedPosition = currentPosition.add(
            positionCorrection.multiplyScalar(smoothingFactor)
        );

        // Apply velocity correction
        const currentVelocity = this.getCurrentVelocity(playerId);
        const correctedVelocity = currentVelocity.add(
            velocityCorrection.multiplyScalar(smoothingFactor)
        );

        // Update entity state
        this.updateEntityState(playerId, correctedPosition, correctedVelocity);
    }

    private rollbackAndReplay(targetTick: number, playerId: string): void {
        // Get inputs từ target tick
        const inputs = this.getInputsAfterTick(targetTick);

        // Rollback to server state
        this.rollbackToTick(targetTick);

        // Replay inputs để catch up
        for (const input of inputs) {
            this.processInput(input);
        }
    }
}
```

## Network Protocol

### Message Types

```protobuf
// State update từ server
message StateUpdate {
    uint64 tick = 1;
    repeated EntityState entities = 2;
    repeated ChatMessage chat_messages = 3;
    uint64 timestamp = 4;
    CompressionInfo compression = 5;
}

// Client input
message PlayerInput {
    string player_id = 1;
    uint32 input_sequence = 2;
    Vector3 movement = 3;
    uint64 timestamp = 4;
    InputValidation validation = 5;
}

// Reconciliation message
message ReconciliationMessage {
    uint64 server_tick = 1;
    EntityState server_state = 2;
    EntityState client_predicted_state = 3;
    Vector3 position_correction = 4;
    Vector3 velocity_correction = 5;
}
```

## Integration Steps

### 1. Setup Client State Manager

```typescript
// Trong game engine initialization
const stateSyncManager = new ClientStateSyncManager();
await stateSyncManager.initialize("ws://localhost:8080");

// Join game room
await stateSyncManager.joinRoom(roomId, playerId);
```

### 2. Process Player Input

```typescript
// Trong game loop
function handlePlayerInput(input: PlayerInput) {
    // Process locally với prediction
    stateSyncManager.processLocalInput(input);

    // Update visual representation immediately
    updatePlayerVisual(input.playerId, predictedState);
}

// Send input to server mỗi frame hoặc khi có thay đổi
setInterval(() => {
    const pendingInputs = stateSyncManager.getPendingInputs();
    for (const input of pendingInputs) {
        networkClient.sendInput(input);
    }
}, 1000 / 60); // 60 FPS
```

### 3. Handle Server Updates

```typescript
// Network event handler
networkClient.onStateUpdate = (stateUpdate) => {
    stateSyncManager.handleServerStateUpdate(stateUpdate);

    // Update other entities (non-player)
    for (const entity of stateUpdate.entities) {
        if (entity.playerId !== localPlayerId) {
            updateEntityVisual(entity);
        }
    }
};
```

### 4. Error Handling và Edge Cases

```typescript
// Handle connection loss
networkClient.onConnectionLost = () => {
    // Switch to offline mode hoặc show reconnection UI
    enterOfflineMode();
};

// Handle high latency
stateSyncManager.onHighLatency = (latency) => {
    // Increase prediction confidence threshold
    adjustPredictionThreshold(latency);
};

// Handle server reconciliation
stateSyncManager.onReconciliation = (correction) => {
    // Apply visual correction với smoothing
    applyVisualCorrection(correction);
};
```

## Performance Optimization

### 1. Entity Culling

```typescript
function shouldRenderEntity(entity: EntityState, camera: Camera): boolean {
    const distance = calculateDistance(entity.position, camera.position);
    const viewDistance = getPlayerViewDistance();

    // Use hierarchical AOI để determine visibility
    return distance <= viewDistance * getAOIMultiplier(entity.type);
}
```

### 2. State Interpolation

```typescript
class StateInterpolator {
    private stateBuffer: EntityState[] = [];

    addState(state: EntityState): void {
        this.stateBuffer.push(state);

        // Keep only recent states
        if (this.stateBuffer.length > 10) {
            this.stateBuffer.shift();
        }
    }

    getInterpolatedState(tick: number): EntityState {
        // Find states around target tick
        const before = this.findStateBefore(tick);
        const after = this.findStateAfter(tick);

        if (before && after) {
            // Interpolate between states
            const t = (tick - before.tick) / (after.tick - before.tick);
            return this.interpolateStates(before, after, t);
        }

        return before || after || this.getLatestState();
    }
}
```

### 3. Memory Management

```typescript
// Periodic cleanup
setInterval(() => {
    // Cleanup old prediction history
    stateSyncManager.cleanupOldPredictions();

    // Cleanup old state buffers
    stateInterpolator.cleanupOldStates();

    // Garbage collect nếu cần thiết
    if (typeof gc !== 'undefined') {
        gc();
    }
}, 30000); // Every 30 seconds
```

## Testing và Debugging

### 1. Prediction Accuracy Testing

```typescript
function testPredictionAccuracy() {
    const testInputs = generateTestInputs();
    const serverStates = simulateServerResponses(testInputs);

    for (let i = 0; i < testInputs.length; i++) {
        const predicted = clientPrediction.predictNextState(testInputs[i]);
        const actual = serverStates[i];

        const error = calculatePredictionError(predicted, actual);
        logPredictionError(i, error);
    }
}
```

### 2. Network Latency Simulation

```typescript
class LatencySimulator {
    private latencyBuffer: Map<string, {message: any, sendTime: number}> = new Map();

    simulateLatency(message: any, latency: number): void {
        const sendTime = Date.now() + latency;

        this.latencyBuffer.set(message.id, {
            message,
            sendTime
        });

        // Process delayed messages
        setTimeout(() => {
            const delayed = this.latencyBuffer.get(message.id);
            if (delayed) {
                this.latencyBuffer.delete(message.id);
                this.processDelayedMessage(delayed.message);
            }
        }, latency);
    }
}
```

## Best Practices

1. **Always validate server responses** trước khi apply
2. **Use interpolation** cho smooth visual updates
3. **Monitor prediction accuracy** và adjust thresholds
4. **Handle edge cases** như connection loss và high latency
5. **Profile performance** regularly để identify bottlenecks
6. **Keep state history** minimal để avoid memory leaks

## Troubleshooting

### Common Issues

1. **Jerky movement**: Increase smoothing factor hoặc check reconciliation logic
2. **Desync issues**: Verify server và client sử dụng same physics constants
3. **High memory usage**: Implement proper cleanup và limit history buffers
4. **Poor prediction accuracy**: Tune physics constants và prediction algorithms

### Debug Tools

```typescript
// Debug overlay
function renderDebugOverlay() {
    const stats = stateSyncManager.getStats();

    debugText.textContent = `
        Prediction Accuracy: ${stats.accuracy.toFixed(2)}
        Reconciliation Rate: ${stats.reconciliationRate.toFixed(2)}
        Network Latency: ${stats.latency}ms
        Buffer Size: ${stats.bufferSize}
    `;
}
```

Với integration này, game sẽ có gameplay mượt mà với độ trễ thấp thông qua client prediction, rollback reconciliation, và optimized state synchronization.
