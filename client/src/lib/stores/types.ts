// Game data types matching the Rust backend
export interface TransformQ {
    position: [number, number, number];
    rotation: [number, number, number, number];
}

export interface VelocityQ {
    velocity: [number, number, number];
    angular_velocity: [number, number, number];
}

export interface Player {
    id: string;
    score: number;
}

export interface Pickup {
    value: number;
}

export interface Obstacle {
    obstacle_type: string;
}

export interface PowerUp {
    power_type: string;
    duration: number; // in seconds
    value: number;
}

export interface Enemy {
    enemy_type: string;
    damage: number;
    speed: number;
    last_attack: number;
    attack_cooldown: number;
}

export interface EntitySnapshot {
    id: number;
    transform: TransformQ;
    velocity?: VelocityQ;
    player?: Player;
    pickup?: Pickup;
    obstacle?: Obstacle;
    power_up?: PowerUp;
    enemy?: Enemy;
}

export interface ChatMessage {
    id: string;
    player_id: string;
    player_name: string;
    message: string;
    timestamp: number;
    message_type: ChatMessageType;
}

export interface SpectatorSnapshot {
    id: string;
    transform: TransformQ;
    camera_mode: string;
    target_player_id?: string;
    view_distance: number;
}

export interface GameSnapshot {
    tick: number;
    entities: EntitySnapshot[];
    chat_messages?: ChatMessage[];
    spectators?: SpectatorSnapshot[];
}

export enum ChatMessageType {
    Global = 'global',
    Team = 'team',
    Whisper = 'whisper',
    System = 'system'
}

export enum SpectatorCameraMode {
    Free = 'free',
    Follow = 'follow',
    Overview = 'overview',
    Fixed = 'fixed'
}

export interface PlayerInput {
    player_id: string;
    input_sequence: number;
    movement: [number, number, number];
    timestamp: number;
}

// UI-related types
export interface GameStats {
    tick: number;
    totalEntities: number;
    players: number;
    pickups: number;
    enemies: number;
    obstacles: number;
}

// Input state for keyboard/mouse handling
export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
}

// Room management types
export interface RoomSettings {
    maxPlayers: number;
    gameMode: GameMode;
    mapName: string;
    timeLimit?: number; // seconds
    hasPassword: boolean;
    isPrivate: boolean;
    allowSpectators: boolean;
    autoStart: boolean;
    minPlayersToStart: number;
}

export interface RoomPlayer {
    id: string;
    name: string;
    joinedAt: number;
    isReady: boolean;
    isHost: boolean;
    team?: string;
    score: number;
    ping: number;
    lastSeen: number;
}

export interface RoomSpectator {
    id: string;
    name: string;
    joinedAt: number;
}

export interface Room {
    id: string;
    name: string;
    settings: RoomSettings;
    state: RoomState;
    players: RoomPlayer[];
    spectators: RoomSpectator[];
    hostId: string;
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
    gameWorldId?: string;
}

export interface RoomInfo {
    id: string;
    name: string;
    settings: RoomSettings;
    state: RoomState;
    playerCount: number;
    spectatorCount: number;
    maxPlayers: number;
    hasPassword: boolean;
    gameMode: GameMode;
    createdAt: number; // seconds ago
}

export interface RoomListFilter {
    gameMode?: GameMode;
    hasPassword?: boolean;
    minPlayers?: number;
    maxPlayers?: number;
    state?: RoomState;
}

export interface CreateRoomRequest {
    roomName: string;
    hostId: string;
    hostName: string;
    settings?: RoomSettings;
}

export interface JoinRoomRequest {
    roomId: string;
    playerId: string;
    playerName: string;
}

export interface RoomOperationResponse {
    success: boolean;
    roomId?: string;
    error?: string;
    data?: any;
}

export enum RoomState {
    Waiting = 'waiting',
    Starting = 'starting',
    Playing = 'playing',
    Finished = 'finished',
    Closed = 'closed'
}

export enum GameMode {
    Deathmatch = 'deathmatch',
    TeamDeathmatch = 'team_deathmatch',
    CaptureTheFlag = 'capture_the_flag',
    KingOfTheHill = 'king_of_the_hill',
    SubwaySurfers = 'subway_surfers'
}

// Subway Surfers specific types
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface PlayerState {
    id: string;
    name: string;
    position: Vector3;
    velocity: Vector3;
    rotation: Vector3;
    score: number;
    isAlive: boolean;
    lane: number; // 0: left, 1: center, 2: right
}

export interface GameState {
    playerId: string;
    position: Vector3;
    velocity: Vector3;
    score: number;
    speed: number;
    isJumping: boolean;
    isSliding: boolean;
    currentLane: number;
    timestamp: number;
    multiplayerData?: {
        otherPlayers: PlayerState[];
        roomId: string;
    };
}

// WebSocket message types
export interface ClientMessage {
    type: 'player_input' | 'game_state' | 'join_room' | 'leave_room' | 'ping';
    payload: any;
    timestamp: number;
}

export interface ServerMessage {
    type: 'game_state_update' | 'leaderboard' | 'obstacles' | 'score_update' | 'room_joined' | 'player_joined' | 'player_left' | 'pong';
    payload: any;
    timestamp: number;
}

// Player input types
export interface PlayerInput {
    type: 'keydown' | 'keyup' | 'swipe';
    key?: string; // for keyboard input
    direction?: 'left' | 'right' | 'up' | 'down'; // for swipe
    timestamp: number;
}

// Game configuration
export interface GameConfig {
    gravity: Vector3;
    jumpForce: number;
    laneWidth: number;
    playerSpeed: number;
    obstacleSpawnRate: number;
}

// Obstacle data from server
export interface ObstacleData {
    id: string;
    type: 'train' | 'barrier' | 'coin' | 'powerup';
    position: Vector3;
    rotation: Vector3;
    scale: Vector3;
    lane: number;
    speed: number;
}

// Leaderboard data
export interface LeaderboardEntry {
    playerId: string;
    playerName: string;
    score: number;
    rank: number;
    isOnline: boolean;
}

export interface LeaderboardData {
    entries: LeaderboardEntry[];
    lastUpdated: number;
}

// Room management for Subway Surfers
export interface RoomInfo {
    id: string;
    name: string;
    gameMode: 'single_player' | 'multiplayer';
    maxPlayers: number;
    currentPlayers: number;
    status: 'waiting' | 'starting' | 'in_progress' | 'finished';
    hostPlayerId: string;
}

export interface JoinRoomRequest {
    roomId: string;
    playerId: string;
    playerName: string;
}

export interface JoinRoomResponse {
    success: boolean;
    error?: string;
    room?: RoomInfo;
}

// Physics state for server reconciliation
export interface PhysicsState {
    position: Vector3;
    velocity: Vector3;
    rotation: Vector3;
    timestamp: number;
    serverFrame: number;
}

// Network status
export interface NetworkStatus {
    connected: boolean;
    latency: number;
    lastPing: number;
    reconnectAttempts: number;
}

