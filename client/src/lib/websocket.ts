import { io, Socket } from 'socket.io-client';
import type {
  ClientMessage,
  ServerMessage,
  GameState,
  PlayerInput,
  LeaderboardData,
  ObstacleData,
  RoomInfo,
  JoinRoomRequest,
  JoinRoomResponse,
  NetworkStatus,
  Vector3
} from './types';

export class GameWebSocket {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private pingInterval: number | null = null;
  private latency: number = 0;

  // Event listeners
  private messageHandlers: Map<string, Function[]> = new Map();

  constructor() {
    // Don't connect automatically - will be called when needed
    // this.connect();
  }

  /**
   * Connect to the game WebSocket server
   */
  private connect(): void {
    try {
      // Use the correct gateway URL - gateway is running on localhost:8080
      this.socket = io('ws://localhost:8080/ws/game', {
        transports: ['websocket'],
        timeout: 5000,
        forceNew: true,
        reconnection: false // We'll handle reconnection manually
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.startPingInterval();

      // Emit network status update
      this.emitNetworkStatus();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from game server:', reason);
      this.isConnected = false;
      this.stopPingInterval();
      this.emitNetworkStatus();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.scheduleReconnect();
    });

    // Game-specific message handlers
    this.socket.on('game_state_update', (data: GameState) => {
      this.emit('game_state_update', data);
    });

    this.socket.on('leaderboard', (data: LeaderboardData) => {
      this.emit('leaderboard', data);
    });

    this.socket.on('obstacles', (data: ObstacleData[]) => {
      this.emit('obstacles', data);
    });

    this.socket.on('score_update', (data: { playerId: string; score: number }) => {
      this.emit('score_update', data);
    });

    this.socket.on('room_joined', (data: JoinRoomResponse) => {
      this.emit('room_joined', data);
    });

    this.socket.on('player_joined', (data: { playerId: string; playerName: string }) => {
      this.emit('player_joined', data);
    });

    this.socket.on('player_left', (data: { playerId: string }) => {
      this.emit('player_left', data);
    });

    this.socket.on('pong', (timestamp: number) => {
      this.latency = Date.now() - timestamp;
      this.emitNetworkStatus();
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection_failed', { maxAttempts: this.maxReconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  /**
   * Start ping interval to measure latency
   */
  private startPingInterval(): void {
    if (typeof window === 'undefined') return; // Skip in SSR

    this.pingInterval = window.setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping', Date.now());
      }
    }, 5000); // Ping every 5 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return {
      connected: this.isConnected,
      latency: this.latency,
      lastPing: Date.now(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Emit network status to listeners
   */
  private emitNetworkStatus(): void {
    this.emit('network_status', this.getNetworkStatus());
  }

  /**
   * Generic event emitter
   */
  private emit(event: string, data: any): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Add event listener
   */
  public on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler: Function): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send game state to server
   */
  public sendGameState(gameState: GameState): void {
    if (this.isConnected && this.socket) {
      const message: ClientMessage = {
        type: 'game_state',
        payload: gameState,
        timestamp: Date.now()
      };
      this.socket.emit('game_state', message);
    }
  }

  /**
   * Send player input to server
   */
  public sendPlayerInput(input: PlayerInput): void {
    if (this.isConnected && this.socket) {
      const message: ClientMessage = {
        type: 'player_input',
        payload: input,
        timestamp: Date.now()
      };
      this.socket.emit('player_input', message);
    }
  }

  /**
   * Join a game room
   */
  public joinRoom(request: JoinRoomRequest): void {
    if (this.isConnected && this.socket) {
      const message: ClientMessage = {
        type: 'join_room',
        payload: request,
        timestamp: Date.now()
      };
      this.socket.emit('join_room', message);
    }
  }

  /**
   * Leave current game room
   */
  public leaveRoom(): void {
    if (this.isConnected && this.socket) {
      const message: ClientMessage = {
        type: 'leave_room',
        payload: {},
        timestamp: Date.now()
      };
      this.socket.emit('leave_room', message);
    }
  }

  /**
   * Send ping for latency measurement
   */
  public sendPing(): void {
    if (this.isConnected && this.socket) {
      this.socket.emit('ping', Date.now());
    }
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.disconnect();
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }
}

// Export singleton instance
export const gameWebSocket = new GameWebSocket();
