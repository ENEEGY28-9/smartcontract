import { writable, derived } from 'svelte/store';
import type {
  GameState,
  PlayerState,
  GameConfig,
  ObstacleData,
  LeaderboardData,
  RoomInfo,
  PhysicsState,
  Vector3
} from './types';
import { gameWebSocket } from '../websocket';

// Game configuration constants
export const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: { x: 0, y: -9.81, z: 0 },
  jumpForce: 8.0,
  laneWidth: 2.0,
  playerSpeed: 5.0,
  obstacleSpawnRate: 0.7
};

// Writable stores for reactive state management
export const gameState = writable<GameState>({
  playerId: '',
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  score: 0,
  speed: DEFAULT_GAME_CONFIG.playerSpeed,
  isJumping: false,
  isSliding: false,
  currentLane: 1, // Start in center lane
  timestamp: Date.now()
});

export const playerState = writable<PlayerState>({
  id: '',
  name: 'Player',
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  score: 0,
  isAlive: true,
  lane: 1
});

export const otherPlayers = writable<PlayerState[]>([]);

export const obstacles = writable<ObstacleData[]>([]);

export const leaderboard = writable<LeaderboardData>({
  entries: [],
  lastUpdated: 0
});

export const currentRoom = writable<RoomInfo | null>(null);

export const isConnected = writable<boolean>(false);

export const latency = writable<number>(0);

export const gameConfig = writable<GameConfig>(DEFAULT_GAME_CONFIG);

// Derived stores for computed values
export const isGameActive = derived(
  gameState,
  ($gameState) => $gameState.playerId !== ''
);

export const currentLanePosition = derived(
  [gameState, gameConfig],
  ([$gameState, $gameConfig]) => {
    const laneOffset = ($gameState.currentLane - 1) * $gameConfig.laneWidth;
    return { ...$gameState.position, x: laneOffset };
  }
);

export const gameSpeed = derived(
  gameState,
  ($gameState) => $gameState.speed
);

export class GameStateManager {
  private lastServerState: GameState | null = null;
  private lastServerTimestamp: number = 0;
  private clientPredictionBuffer: GameState[] = [];
  private reconciliationInProgress: boolean = false;

  constructor() {
    this.setupWebSocketListeners();
    this.startStateSync();
  }

  /**
   * Setup WebSocket event listeners for state synchronization
   */
  private setupWebSocketListeners(): void {
    // Listen for game state updates from server
    gameWebSocket.on('game_state_update', (serverState: GameState) => {
      this.handleServerStateUpdate(serverState);
    });

    // Listen for obstacle updates
    gameWebSocket.on('obstacles', (obstacleData: ObstacleData[]) => {
      obstacles.set(obstacleData);
    });

    // Listen for leaderboard updates
    gameWebSocket.on('leaderboard', (leaderboardData: LeaderboardData) => {
      leaderboard.set(leaderboardData);
    });

    // Listen for score updates
    gameWebSocket.on('score_update', (scoreData: { playerId: string; score: number }) => {
      if (scoreData.playerId === this.getCurrentPlayerId()) {
        gameState.update(state => ({ ...state, score: scoreData.score }));
      }
    });

    // Listen for room updates
    gameWebSocket.on('room_joined', (roomData) => {
      if (roomData.success && roomData.room) {
        currentRoom.set(roomData.room);
      }
    });

    // Listen for network status changes
    gameWebSocket.on('network_status', (status) => {
      isConnected.set(status.connected);
      latency.set(status.latency);
    });
  }

  /**
   * Start periodic state synchronization
   */
  private startStateSync(): void {
    // Send game state to server every 50ms (20 FPS)
    setInterval(() => {
      if (this.getIsConnected()) {
        const currentState = this.getCurrentGameState();
        gameWebSocket.sendGameState(currentState);
      }
    }, 50);

    // Client-side game loop for prediction (skip in SSR)
    if (typeof window !== 'undefined') {
      this.startClientGameLoop();
    }
  }

  /**
   * Start client-side game loop for prediction and rendering
   */
  private startClientGameLoop(): void {
    let lastTime = 0;
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    const gameLoop = (currentTime: number) => {
      if (currentTime - lastTime >= frameTime) {
        this.updateClientPrediction(currentTime - lastTime);
        lastTime = currentTime;
      }
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }

  /**
   * Update client prediction based on time delta
   */
  private updateClientPrediction(deltaTime: number): void {
    if (this.reconciliationInProgress) return;

    gameState.update(state => {
      const newState = { ...state };

      // Apply client-side physics prediction
      const seconds = deltaTime / 1000;

      // Update position based on velocity
      newState.position.x += newState.velocity.x * seconds;
      newState.position.y += newState.velocity.y * seconds;
      newState.position.z += newState.velocity.z * seconds;

      // Apply gravity
      newState.velocity.y += DEFAULT_GAME_CONFIG.gravity.y * seconds;

      // Update timestamp
      newState.timestamp = Date.now();

      return newState;
    });
  }

  /**
   * Handle server state update with reconciliation
   */
  private handleServerStateUpdate(serverState: GameState): void {
    this.lastServerState = serverState;
    this.lastServerTimestamp = Date.now();

    // Start reconciliation process
    this.reconcileWithServer(serverState);
  }

  /**
   * Reconcile client prediction with server authoritative state
   */
  private reconcileWithServer(serverState: GameState): void {
    this.reconciliationInProgress = true;

    gameState.update(state => {
      // Calculate time difference since server state
      const timeDiff = Date.now() - serverState.timestamp;

      // Simple linear reconciliation - blend client and server state
      const blendFactor = Math.min(timeDiff / 100, 1.0); // Max 100ms blend

      const reconciledState = {
        ...state,
        position: {
          x: state.position.x * (1 - blendFactor) + serverState.position.x * blendFactor,
          y: state.position.y * (1 - blendFactor) + serverState.position.y * blendFactor,
          z: state.position.z * (1 - blendFactor) + serverState.position.z * blendFactor
        },
        velocity: serverState.velocity, // Server velocity is authoritative
        score: serverState.score,
        speed: serverState.speed,
        isJumping: serverState.isJumping,
        isSliding: serverState.isSliding,
        currentLane: serverState.currentLane,
        timestamp: Date.now()
      };

      return reconciledState;
    });

    // Update other players if in multiplayer
    if (serverState.multiplayerData) {
      otherPlayers.set(serverState.multiplayerData.otherPlayers);
    }

    this.reconciliationInProgress = false;
  }

  /**
   * Get current player ID
   */
  private getCurrentPlayerId(): string {
    let playerId = '';
    gameState.subscribe(state => {
      playerId = state.playerId;
    })();
    return playerId;
  }

  /**
   * Get current game state
   */
  private getCurrentGameState(): GameState {
    let currentState: GameState = {
      playerId: '',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      score: 0,
      speed: DEFAULT_GAME_CONFIG.playerSpeed,
      isJumping: false,
      isSliding: false,
      currentLane: 1,
      timestamp: Date.now()
    };

    gameState.subscribe(state => {
      currentState = state;
    })();

    return currentState;
  }

  /**
   * Get connection status
   */
  private getIsConnected(): boolean {
    let connected = false;
    isConnected.subscribe(status => {
      connected = status;
    })();
    return connected;
  }

  /**
   * Initialize player for a new game session
   */
  public initializePlayer(playerId: string, playerName: string = 'Player'): void {
    const initialState: GameState = {
      playerId,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: DEFAULT_GAME_CONFIG.playerSpeed },
      score: 0,
      speed: DEFAULT_GAME_CONFIG.playerSpeed,
      isJumping: false,
      isSliding: false,
      currentLane: 1,
      timestamp: Date.now()
    };

    gameState.set(initialState);

    const playerInfo: PlayerState = {
      id: playerId,
      name: playerName,
      position: initialState.position,
      velocity: initialState.velocity,
      rotation: { x: 0, y: 0, z: 0 },
      score: 0,
      isAlive: true,
      lane: 1
    };

    playerState.set(playerInfo);
  }

  /**
   * Update player movement based on input
   */
  public updatePlayerMovement(input: { direction?: string; jump?: boolean; slide?: boolean }): void {
    gameState.update(state => {
      const newState = { ...state };

      // Handle lane changes
      if (input.direction === 'left' && newState.currentLane > 0) {
        newState.currentLane--;
      } else if (input.direction === 'right' && newState.currentLane < 2) {
        newState.currentLane++;
      }

      // Handle jump
      if (input.jump && !newState.isJumping) {
        newState.isJumping = true;
        newState.velocity.y = DEFAULT_GAME_CONFIG.jumpForce;
      }

      // Handle slide
      if (input.slide && !newState.isSliding) {
        newState.isSliding = true;
        // Set sliding timeout
        setTimeout(() => {
          gameState.update(s => ({ ...s, isSliding: false }));
        }, 500);
      }

      return newState;
    });
  }

  /**
   * Join a game room
   */
  public async joinRoom(roomId: string, playerId: string, playerName: string): Promise<void> {
    gameWebSocket.joinRoom({
      roomId,
      playerId,
      playerName
    });
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    gameWebSocket.leaveRoom();
    currentRoom.set(null);
    otherPlayers.set([]);
  }

  /**
   * Cleanup and disconnect
   */
  public destroy(): void {
    gameWebSocket.disconnect();
    // Clear all stores
    gameState.set({
      playerId: '',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      score: 0,
      speed: DEFAULT_GAME_CONFIG.playerSpeed,
      isJumping: false,
      isSliding: false,
      currentLane: 1,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const gameStateManager = new GameStateManager();
