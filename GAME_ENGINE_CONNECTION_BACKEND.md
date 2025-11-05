# 🎮 Game Engine Connection Backend

## 📋 Mục Lục
- [Tổng Quan](#tổng-quan)
- [Kiến Trúc Hiện Tại](#kiến-trúc-hiện-tại)
- [Các Bước Kết Nối](#các-bước-kết-nối)
  - [Bước 1: Tạo Network Abstraction Layer](#bước-1-tạo-network-abstraction-layer)
  - [Bước 2: Tích Hợp Network Vào Game](#bước-2-tích-hợp-network-vào-game)
  - [Bước 3: Cập Nhật UI Để Hiển Thị Network Status](#bước-3-cập-nhật-ui-để-hiển-thị-network-status)
  - [Bước 4: Cập Nhật Cleanup Function](#bước-4-cập-nhật-cleanup-function)
- [Cách Test](#cách-test)
- [Những Gì Nhận Được](#những-gì-nhận-được)
- [Các Bước Tiếp Theo](#các-bước-tiếp-theo)

## 🎯 Tổng Quan

Hướng dẫn chi tiết cách kết nối game **Infinite Runner 3D** hiện tại (single player) với backend microservices một cách chuyên nghiệp để tạo foundation cho việc nâng cấp lên multiplayer sau này.

## 🏗️ Kiến Trúc Hiện Tại

### Backend Services (Đã Hoàn Thành):
- **Gateway** (port 8080): HTTP API & WebSocket server
- **Worker** (port 50051): Game logic & physics simulation
- **Room Manager** (port 50052): Room management system
- **Server**: Main application coordinator

### Game Hiện Tại:
- **Single Player**: Hoạt động độc lập hoàn toàn
- **Three.js**: 3D rendering engine
- **Physics**: Rapier3D physics simulation
- **Input System**: Keyboard/mouse controls
- **Game Loop**: 60 FPS fixed timestep

## 🚀 Các Bước Kết Nối

### Bước 1: Tạo Network Abstraction Layer

Tạo file `client/src/lib/network/GameNetwork.ts`:

```typescript
import { websocket } from '../transport/enhanced-websocket';
import { roomManager } from '../stores/room';

export interface GameState {
  tick: number;
  entities: any[];
  score: number;
  gameStatus: 'waiting' | 'playing' | 'paused' | 'finished';
}

export interface PlayerInput {
  movement: { x: number; y: number; z: number };
  actions: string[];
  timestamp: number;
  sequence: number;
}

export class GameNetwork {
  private static instance: GameNetwork;
  private isConnected = false;
  private currentRoomId: string | null = null;
  private playerId: string;
  private inputSequence = 0;

  // Callbacks for game state updates
  private onStateUpdateCallbacks: ((state: GameState) => void)[] = [];
  private onConnectionChangeCallbacks: ((connected: boolean) => void)[] = [];

  private constructor() {
    this.playerId = this.generatePlayerId();
    this.setupEventListeners();
  }

  public static getInstance(): GameNetwork {
    if (!GameNetwork.instance) {
      GameNetwork.instance = new GameNetwork();
    }
    return GameNetwork.instance;
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners() {
    // Listen for WebSocket connection events
    websocket.onConnectionChange((connected) => {
      this.isConnected = connected;
      this.onConnectionChangeCallbacks.forEach(callback => callback(connected));

      if (connected) {
        this.onConnected();
      } else {
        this.onDisconnected();
      }
    });

    // Listen for state updates from backend
    websocket.onStateUpdate((state) => {
      this.onStateUpdateCallbacks.forEach(callback => callback(state));
    });
  }

  private async onConnected() {
    console.log('🎮 Connected to game backend');

    try {
      // Create or join default single-player room
      this.currentRoomId = await this.createOrJoinDefaultRoom();
      console.log(`✅ Joined room: ${this.currentRoomId}`);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
    }
  }

  private onDisconnected() {
    console.log('🔌 Disconnected from game backend');
    this.isConnected = false;
  }

  private async createOrJoinDefaultRoom(): Promise<string> {
    try {
      // Try to create a single-player room
      const roomId = await roomManager.createRoom(
        `Single Player Game - ${this.playerId}`,
        this.playerId,
        {
          maxPlayers: 1,
          gameMode: 'single_player',
          isPrivate: true,
          allowSpectators: false
        }
      );

      // Join the room as player
      await roomManager.joinRoom(roomId, this.playerId);

      return roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  // Public API for game
  public async initialize(): Promise<void> {
    console.log('🔄 Initializing game network...');

    try {
      // Connect to WebSocket
      await websocket.connect();

      // Wait for connection to be established
      await this.waitForConnection();

      console.log('✅ Game network initialized');
    } catch (error) {
      console.error('❌ Failed to initialize network:', error);
      throw error;
    }
  }

  private async waitForConnection(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkConnection = () => {
        if (this.isConnected) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  public sendInput(input: PlayerInput): void {
    if (!this.isConnected || !this.currentRoomId) {
      console.warn('⚠️ Cannot send input: not connected or no room');
      return;
    }

    try {
      websocket.sendInput({
        room_id: this.currentRoomId,
        player_id: this.playerId,
        sequence: this.inputSequence++,
        payload_json: JSON.stringify(input)
      });
    } catch (error) {
      console.error('❌ Failed to send input:', error);
    }
  }

  public sendGameState(state: Partial<GameState>): void {
    if (!this.isConnected || !this.currentRoomId) {
      return;
    }

    try {
      // Send current game state to backend for synchronization
      websocket.sendStateUpdate({
        room_id: this.currentRoomId,
        tick: state.tick || 0,
        entities: state.entities || [],
        game_status: state.gameStatus || 'playing'
      });
    } catch (error) {
      console.error('❌ Failed to send game state:', error);
    }
  }

  public onStateUpdate(callback: (state: GameState) => void): void {
    this.onStateUpdateCallbacks.push(callback);
  }

  public onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChangeCallbacks.push(callback);
  }

  public removeStateUpdateCallback(callback: (state: GameState) => void): void {
    const index = this.onStateUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.onStateUpdateCallbacks.splice(index, 1);
    }
  }

  public removeConnectionChangeCallback(callback: (connected: boolean) => void): void {
    const index = this.onConnectionChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.onConnectionChangeCallbacks.splice(index, 1);
    }
  }

  public getConnectionStatus(): { connected: boolean; roomId: string | null; playerId: string } {
    return {
      connected: this.isConnected,
      roomId: this.currentRoomId,
      playerId: this.playerId
    };
  }

  public async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from game backend...');

    try {
      if (this.currentRoomId) {
        await roomManager.leaveRoom(this.currentRoomId, this.playerId);
      }

      await websocket.disconnect();
      this.isConnected = false;

      console.log('✅ Disconnected successfully');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }
}
```

### Bước 2: Tích Hợp Network Vào Game

Cập nhật file `client/src/lib/game/InfiniteRunner.svelte`:

**Thêm imports:**
```typescript
import { GameNetwork } from '../network/GameNetwork';
import type { GameState, PlayerInput } from '../network/GameNetwork';
```

**Thêm biến state:**
```typescript
let isNetworkConnected = false;
let gameNetwork: GameNetwork | null = null;
```

**Thêm function initializeNetwork()** vào onMount():
```typescript
async function initializeNetwork() {
  try {
    console.log('🔄 Initializing game network...');
    
    // Create network instance
    gameNetwork = GameNetwork.getInstance();
    
    // Setup connection status monitoring
    gameNetwork.onConnectionChange((connected) => {
      isNetworkConnected = connected;
      console.log(`📡 Network connection: ${connected ? 'connected' : 'disconnected'}`);
    });
    
    // Setup state update handling
    gameNetwork.onStateUpdate((state) => {
      console.log('📦 Received game state from backend:', state);
      // Here you can sync with backend state if needed
    });
    
    // Initialize connection
    await gameNetwork.initialize();
    
    console.log('✅ Network connection established');
  } catch (error) {
    console.error('❌ Network initialization failed:', error);
    // Continue with offline mode if network fails
    console.log('⚠️ Continuing in offline mode');
  }
}
```

**Cập nhật update() function để gửi input và state:**
```typescript
function update(deltaTime) {
  if (!isGameRunning) return;

  try {
    // Update input first to capture current frame's input
    if (inputManager) {
      inputManager.update();
    }

    // Send input to backend if network is available
    if (gameNetwork && isNetworkConnected) {
      const currentInput = inputManager.getCurrentInput();
      if (currentInput) {
        gameNetwork.sendInput(currentInput);
      }
    }

    // Update physics
    if (physicsManager) {
      physicsManager.update(deltaTime);
    }

    // Update player
    if (player) {
      player.update(deltaTime);
    }

    // Update camera with current input
    if (cameraController) {
      cameraController.update(deltaTime);
    }

    // Update game state
    updateGameState(deltaTime);

    // Send current game state to backend (for synchronization)
    if (gameNetwork && isNetworkConnected) {
      gameNetwork.sendGameState({
        tick: Math.floor(Date.now() / 16.67), // Approximate 60fps tick
        score: score,
        gameStatus: isGameRunning ? 'playing' : 'paused'
      });
    }

    // Update FPS counter
    fps = Math.round(1 / deltaTime);
  } catch (error) {
    console.error('❌ Update error:', error);
  }
}
```

### Bước 3: Cập Nhật UI Để Hiển Thị Network Status

**Thêm network status indicator vào HUD:**
```svelte
<div class="hud-top">
  <div class="score">Score: {score}</div>
  <div class="fps">FPS: {fps}</div>
  <div class="network-status" class:connected={isNetworkConnected} class:disconnected={!isNetworkConnected}>
    📡 {isNetworkConnected ? 'Connected' : 'Offline'}
  </div>
</div>
```

**Cập nhật start screen để hiển thị network info:**
```svelte
<div class="start-screen">
  <h1>Infinite Runner 3D</h1>
  <p><strong>Single Player Mode with Backend Sync</strong></p>
  <p>• Game state synchronized with backend</p>
  <p>• Ready for multiplayer upgrade</p>
  <p>• Network connection: <span class="network-indicator" class:connected={isNetworkConnected}>●</span> {isNetworkConnected ? 'Connected' : 'Offline'}</p>
  <!-- ... existing code ... -->
</div>
```

### Bước 4: Cập Nhật Cleanup Function

```typescript
function cleanup() {
  try {
    // Disconnect from network first
    if (gameNetwork) {
      gameNetwork.disconnect();
      gameNetwork = null;
    }

    // ... existing cleanup code ...
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
```

## 🧪 Cách Test

### Bước 1: Khởi Động Backend
```bash
# Terminal 1 - Start all backend services
.\restart-all-services-simple.ps1
```

### Bước 2: Khởi Động Client
```bash
# Terminal 2 - Start client với network integration
cd client && npm run dev
```

### Bước 3: Test Trong Browser
1. Mở `http://localhost:5173`
2. Kiểm tra network status indicator hiển thị "Connected"
3. Game sẽ hiển thị trạng thái kết nối với backend
4. Game vẫn chơi được bình thường nhưng đã sync với backend

## ✅ Những Gì Nhận Được

### ✅ Game Vẫn Hoạt Động Bình Thường
- Single player gameplay không thay đổi
- Tất cả features hiện tại vẫn hoạt động
- Performance không bị ảnh hưởng

### ✅ Backend Integration Chuyên Nghiệp
- **Connection Management**: Tự động kết nối/reconnect
- **Error Handling**: Graceful fallback khi mất mạng
- **State Synchronization**: Đồng bộ trạng thái với backend
- **Room Management**: Tự động tạo/join single-player room
- **Input Sending**: Gửi input lên backend để monitor

### ✅ Foundation Cho Multiplayer
- **Network Abstraction**: Dễ dàng nâng cấp lên multiplayer
- **State Management**: Đã có framework để sync state
- **Room System**: Có thể chuyển từ single-player sang multiplayer room
- **Scalable Architecture**: Có thể mở rộng mà không refactor nhiều

### ✅ Monitoring & Debugging
- **Network Status UI**: Hiển thị trạng thái kết nối real-time
- **Console Logging**: Chi tiết logs để debug
- **Error Reporting**: Báo cáo lỗi mạng một cách rõ ràng

## 🔮 Các Bước Tiếp Theo

### Sau Khi Test Thành Công:
1. **Monitor Backend Logs**: Kiểm tra worker nhận được input từ game
2. **Verify State Sync**: Đảm bảo game state được gửi lên backend
3. **Test Disconnection**: Kiểm tra graceful handling khi mất mạng
4. **Add More Metrics**: Thêm monitoring cho performance

### Chuẩn Bị Cho Multiplayer:
1. **Thêm Player Entities**: Hỗ trợ multiple players trong cùng room
2. **State Interpolation**: Smooth state updates giữa các players
3. **Latency Compensation**: Client-side prediction để giảm lag
4. **Anti-Cheat**: Thêm validation để ngăn cheating

## 🎯 Lợi Ích Khi Làm Theo Cách Này:

1. **Professional Architecture**: Code được tổ chức chuyên nghiệp
2. **Maintainable**: Dễ bảo trì và mở rộng
3. **Testable**: Có thể test độc lập từng component
4. **Scalable**: Dễ dàng nâng cấp lên multiplayer
5. **Production Ready**: Có error handling và monitoring tốt

Bạn có thể bắt đầu implement ngay bây giờ để thấy game đã kết nối với backend một cách chuyên nghiệp! 🚀
