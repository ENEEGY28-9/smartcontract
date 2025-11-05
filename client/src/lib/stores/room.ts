import { writable, derived } from 'svelte/store';
import type { Room, RoomInfo, RoomSettings, RoomListFilter, CreateRoomRequest, JoinRoomRequest, RoomOperationResponse } from './types';
import { pocketbaseService } from '$lib/services/pocketbaseService';

// Room state store
export const currentRoom = writable<Room | null>(null);

// Room list store
export const roomList = writable<RoomInfo[]>([]);

// Room loading states
export const isLoadingRooms = writable<boolean>(false);
export const isCreatingRoom = writable<boolean>(false);
export const isJoiningRoom = writable<boolean>(false);

// Room error store
export const roomError = writable<string | null>(null);

// Leaderboard store
export const leaderboardData = writable<any[]>([]);
export const isLoadingLeaderboard = writable<boolean>(false);
export const leaderboardError = writable<string | null>(null);

// Gateway base URL - temporarily disabled since we only have PocketBase
const GATEWAY_BASE_URL = 'http://localhost:5173/pb-api';

// Room service class để quản lý room operations
export class RoomService {
    private gatewayUrl: string;

    constructor(gatewayUrl: string = GATEWAY_BASE_URL) {
        this.gatewayUrl = gatewayUrl;
    }

    async createRoom(request: CreateRoomRequest): Promise<RoomOperationResponse> {
        isCreatingRoom.set(true);
        roomError.set(null);

        try {
            // Create room directly in PocketBase
            const hostName = request.hostName || `Host_${request.hostId.slice(0, 8)}`;
            const record = await pocketbaseService.createRoom(request.roomName, request.hostId, hostName, request.settings || {});
            if (record && record.id) {
                // Refresh list after creation
                await this.listRooms();
                return { success: true, roomId: record.id, data: record };
            }
            roomError.set('Failed to create room');
            return { success: false, error: 'Failed to create room' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            isCreatingRoom.set(false);
        }
    }

    async listRooms(filter?: RoomListFilter): Promise<RoomOperationResponse> {
        isLoadingRooms.set(true);
        roomError.set(null);

        try {
            // List rooms from PocketBase
            const records = await pocketbaseService.listRooms(filter);

            const transformedRooms: RoomInfo[] = records.map((r: any) => {
                // Map PocketBase room record to RoomInfo
                const gameMode = r.game_type || (r.settings && r.settings.gameMode) || 'rune';

                const state = r.status || 'waiting';

                return {
                    id: r.id,
                    name: r.name,
                    players: r.players || [],
                    settings: {
                        maxPlayers: r.max_members || r.settings?.maxPlayers || 8,
                        gameMode: gameMode,
                        mapName: r.settings?.mapName || 'default_map',
                        timeLimit: r.settings?.timeLimit || 300,
                        hasPassword: r.is_private || r.settings?.hasPassword || false,
                        isPrivate: r.is_private || r.settings?.isPrivate || false,
                        allowSpectators: r.settings?.allowSpectators ?? true,
                        autoStart: r.settings?.autoStart ?? true,
                        minPlayersToStart: r.settings?.minPlayersToStart || 2,
                    },
                    state: state,
                    playerCount: (r.members?.length || 0) || r.player_count || (Array.isArray(r.players) ? r.players.length : 0),
                    spectatorCount: r.spectator_count || 0,
                    maxPlayers: r.max_members || r.settings?.maxPlayers || 8,
                    hasPassword: r.is_private || r.settings?.hasPassword || false,
                    gameMode: gameMode,
                    createdAt: 0,
                } as RoomInfo;
            });

            roomList.set(transformedRooms);
            return { success: true, data: transformedRooms };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            isLoadingRooms.set(false);
        }
    }

    async getRoomInfo(roomId: string): Promise<RoomOperationResponse> {
        roomError.set(null);

        try {
            const response = await fetch(`${this.gatewayUrl}/api/rooms/${roomId}`);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('❌ JSON parsing failed:', jsonError);
                throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
            }

            if (data.success) {
                return {
                    success: true,
                    data: data.room,
                };
            } else {
                roomError.set(data.error || 'Failed to get room info');
                return {
                    success: false,
                    error: data.error || 'Failed to get room info',
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    async joinRoom(request: JoinRoomRequest): Promise<RoomOperationResponse> {
        isJoiningRoom.set(true);
        roomError.set(null);

        try {
            // Join room via PocketBase
            const player = { id: request.playerId, name: request.playerName };
            const updated = await pocketbaseService.joinRoomAsPlayer(request.roomId, player);
            // Refresh room list after joining
            await this.listRooms();
            return { success: true, roomId: request.roomId, data: updated };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            isJoiningRoom.set(false);
        }
    }

    async startGame(roomId: string, playerId: string): Promise<RoomOperationResponse> {
        roomError.set(null);

        try {
            const response = await fetch(`${this.gatewayUrl}/api/rooms/start-game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roomId, playerId }),
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('❌ JSON parsing failed:', jsonError);
                throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
            }

            if (data.success) {
                // Refresh room info after starting game
                await this.getRoomInfo(roomId);
                return {
                    success: true,
                    roomId,
                    data: data,
                };
            } else {
                roomError.set(data.error || 'Failed to start game');
                return {
                    success: false,
                    error: data.error || 'Failed to start game',
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    // Get current room ID
    getCurrentRoomId(): string | null {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();
        return room?.id || null;
    }

    // Leave current room
    async leaveRoom(): Promise<RoomOperationResponse> {
        const roomId = this.getCurrentRoomId();
        if (!roomId) {
            return { success: false, error: 'Not in a room' };
        }

        let playerId: string | null = null;

        // Get current player ID from current room
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();

        if (room) {
            // Find current player (this would need to be tracked in auth store)
            // For now, we'll use a simple approach
            playerId = room.players.find(p => p.isHost)?.id || room.players[0]?.id;
        }

        if (!playerId) {
            // Fallback: clear local state if we can't determine player ID
            currentRoom.set(null);
            await this.listRooms();
            return { success: true, roomId };
        }

        roomError.set(null);

        try {
            // Leave room via PocketBase
            const result = await pocketbaseService.leaveRoom(roomId, playerId);
            currentRoom.set(null);
            // If room deleted, refresh list
            await this.listRooms();
            return { success: true, roomId, data: result };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            roomError.set(errorMessage);

            // Fallback: clear local state on network error
            currentRoom.set(null);
            await this.listRooms();

            return {
                success: true,
                roomId,
                error: 'Network error - cleared local state',
            };
        }
    }

    // Get room by ID from current list
    getRoomById(roomId: string): RoomInfo | null {
        let rooms: RoomInfo[] = [];
        roomList.subscribe(r => rooms = r)();
        return rooms.find(room => room.id === roomId) || null;
    }

    // Check if player is in a room
    isPlayerInRoom(playerId: string): boolean {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();
        if (!room) return false;

        return room.players.some(player => player.id === playerId);
    }

    // Get room players
    getRoomPlayers(): RoomPlayer[] {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();
        return room?.players || [];
    }

    // Get room spectators
    getRoomSpectators(): RoomSpectator[] {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();
        return room?.spectators || [];
    }

    // Check if current player is host
    isCurrentPlayerHost(playerId: string): boolean {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();
        return room?.hostId === playerId;
    }

    // Check if room can be started
    canStartGame(playerId: string): boolean {
        let room: Room | null = null;
        currentRoom.subscribe(r => room = r)();

        if (!room || room.state !== 'waiting') return false;

        return room.hostId === playerId && room.players.length >= 2;
    }
}

// Utility functions for room operations
export const roomUtils = {
    // Format room state for display
    formatRoomState(state: string): string {
        switch (state) {
            case 'waiting': return 'Waiting for players';
            case 'starting': return 'Starting...';
            case 'playing': return 'In progress';
            case 'finished': return 'Finished';
            case 'closed': return 'Closed';
            default: return 'Unknown';
        }
    },

    // Format game mode for display
    formatGameMode(mode: string): string {
        // Handle string values from PocketBase
        switch (mode) {
            case 'subway_surfers': return 'Subway Surfers';
            case 'infinite_runner': return 'Infinite Runner';
            case 'puzzle': return 'Puzzle';
            case 'racing': return 'Racing';
            case 'other': return 'Other';
            case 'deathmatch': return 'Deathmatch';
            case 'team_deathmatch': return 'Team Deathmatch';
            case 'capture_the_flag': return 'Capture the Flag';
            case 'king_of_the_hill': return 'King of the Hill';
            default: return mode || 'Unknown';
        }
    },

    // Get default room settings
    getDefaultRoomSettings(): RoomSettings {
        return {
            maxPlayers: 8,
            gameMode: 'subway_surfers',
            mapName: 'default_map',
            timeLimit: 300, // 5 minutes
            hasPassword: false,
            isPrivate: false,
            allowSpectators: true,
            autoStart: true,
            minPlayersToStart: 2,
        };
    },

    // Validate room name
    validateRoomName(name: string): string | null {
        if (!name || name.trim().length === 0) {
            return 'Room name is required';
        }
        if (name.length > 50) {
            return 'Room name too long (max 50 characters)';
        }
        if (name.length < 3) {
            return 'Room name too short (min 3 characters)';
        }
        return null;
    },

    // Validate player name
    validatePlayerName(name: string): string | null {
        if (!name || name.trim().length === 0) {
            return 'Player name is required';
        }
        if (name.length > 20) {
            return 'Player name too long (max 20 characters)';
        }
        if (name.length < 2) {
            return 'Player name too short (min 2 characters)';
        }
        return null;
    },
};

// Export singleton instance
export const roomService = new RoomService();

// Transform server room data to client format
function transformServerRoom(serverRoom: any): RoomInfo {
    // Convert game_mode number to string enum
    let gameMode: string = 'subway_surfers'; // default
    switch (serverRoom.game_mode) {
        case 0:
            gameMode = 'deathmatch';
            break;
        case 1:
            gameMode = 'team_deathmatch';
            break;
        case 2:
            gameMode = 'capture_the_flag';
            break;
        case 3:
            gameMode = 'king_of_the_hill';
            break;
    }

    // Convert room state number to string enum
    let state: string = 'waiting'; // default
    switch (serverRoom.state) {
        case 0:
            state = 'waiting';
            break;
        case 1:
            state = 'starting';
            break;
        case 2:
            state = 'playing';
            break;
        case 3:
            state = 'finished';
            break;
        case 4:
            state = 'closed';
            break;
    }

    return {
        id: serverRoom.id,
        name: serverRoom.name,
        settings: {
            maxPlayers: serverRoom.max_players || 8,
            gameMode: gameMode,
            mapName: serverRoom.settings?.map_name || 'default_map',
            timeLimit: serverRoom.settings?.time_limit || 300,
            hasPassword: serverRoom.has_password || false,
            isPrivate: serverRoom.settings?.is_private || false,
            allowSpectators: serverRoom.settings?.allow_spectators || true,
            autoStart: serverRoom.settings?.auto_start || true,
            minPlayersToStart: serverRoom.settings?.min_players_to_start || 2,
        },
        state: state,
        playerCount: serverRoom.player_count || 0,
        spectatorCount: serverRoom.spectator_count || 0,
        maxPlayers: serverRoom.max_players || 8,
        hasPassword: serverRoom.has_password || false,
        gameMode: gameMode,
        createdAt: serverRoom.created_at_seconds_ago || 0,
    };
}

// Export actions for easy use
export const roomActions = {
    async createRoom(request: CreateRoomRequest): Promise<RoomOperationResponse> {
        return await roomService.createRoom(request);
    },

    async listRooms(filter?: RoomListFilter): Promise<RoomOperationResponse> {
        return await roomService.listRooms(filter);
    },

    async getRoomInfo(roomId: string): Promise<RoomOperationResponse> {
        return await roomService.getRoomInfo(roomId);
    },

    async joinRoom(request: JoinRoomRequest): Promise<RoomOperationResponse> {
        return await roomService.joinRoom(request);
    },

    async startGame(roomId: string, playerId: string): Promise<RoomOperationResponse> {
        return await roomService.startGame(roomId, playerId);
    },

    async kickPlayer(roomId: string, requesterId: string, targetPlayerId: string): Promise<RoomOperationResponse> {
        try {
            const result = await pocketbaseService.kickPlayer(roomId, requesterId, targetPlayerId);
            await this.listRooms();
            return { success: true, data: result };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to kick player';
            roomError.set(msg);
            return { success: false, error: msg };
        }
    },

    async updateRoomSettings(roomId: string, settings: any): Promise<RoomOperationResponse> {
        try {
            const result = await pocketbaseService.updateRoomSettings(roomId, settings);
            await this.listRooms();
            return { success: true, data: result };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to update settings';
            roomError.set(msg);
            return { success: false, error: msg };
        }
    },

    async leaveRoom(): Promise<RoomOperationResponse> {
        return await roomService.leaveRoom();
    },

    getCurrentRoomId(): string | null {
        return roomService.getCurrentRoomId();
    },

    isPlayerInRoom(playerId: string): boolean {
        return roomService.isPlayerInRoom(playerId);
    },

    isCurrentPlayerHost(playerId: string): boolean {
        return roomService.isCurrentPlayerHost(playerId);
    },

    canStartGame(playerId: string): boolean {
        return roomService.canStartGame(playerId);
    },

    getRoomPlayers(): RoomPlayer[] {
        return roomService.getRoomPlayers();
    },

    getRoomSpectators(): RoomSpectator[] {
        return roomService.getRoomSpectators();
    },

    // Leaderboard methods
    async loadLeaderboard(gameMode?: string, timeRange?: string): Promise<any[]> {
        isLoadingLeaderboard.set(true);
        leaderboardError.set(null);

        try {
            // TODO: Implement leaderboard API when backend server is available
            // For now, return mock data to prevent errors
            console.log('📊 Leaderboard API not implemented yet, returning mock data');

            const mockData = [
                {
                    id: '1',
                    playerName: 'Player1',
                    score: 1500,
                    gameMode: 'subway_surfers',
                    rank: 1,
                    timestamp: new Date().toISOString()
                },
                {
                    id: '2',
                    playerName: 'Player2',
                    score: 1200,
                    gameMode: 'subway_surfers',
                    rank: 2,
                    timestamp: new Date().toISOString()
                },
                {
                    id: '3',
                    playerName: 'Player3',
                    score: 1000,
                    gameMode: 'subway_surfers',
                    rank: 3,
                    timestamp: new Date().toISOString()
                }
            ];

            // Filter by gameMode if specified
            const filteredData = gameMode ?
                mockData.filter(entry => entry.gameMode === gameMode) :
                mockData;

            leaderboardData.set(filteredData);
            return filteredData;
        } catch (error) {
            const errorMessage = error.message || 'Unknown error';
            console.error('❌ Failed to load leaderboard:', errorMessage);
            leaderboardError.set(`Failed to load leaderboard: ${errorMessage}`);
            return [];
        } finally {
            isLoadingLeaderboard.set(false);
        }
    },

    async submitScore(playerId: string, score: number, gameMode: string, roomId?: string): Promise<boolean> {
        try {
            // TODO: Implement score submission when backend server is available
            console.log('📊 Score submission not implemented yet, logging locally:', { playerId, score, gameMode, roomId, timestamp: Date.now() });
            // Reload leaderboard with mock data
            await this.loadLeaderboard(gameMode);
            return true; // Return success to avoid breaking game flow
        } catch (error) {
            console.error('❌ Failed to submit score:', error);
            return false;
        }
    },

    getLeaderboardData(): any[] {
        let data: any[] = [];
        leaderboardData.subscribe(value => data = value)();
        return data;
    },

    isLoadingLeaderboardData(): boolean {
        let loading = false;
        isLoadingLeaderboard.subscribe(value => loading = value)();
        return loading;
    },

    getLeaderboardError(): string | null {
        let error: string | null = null;
        leaderboardError.subscribe(value => error = value)();
        return error;
    },

    getRoomById(roomId: string): RoomInfo | null {
        return roomService.getRoomById(roomId);
    },

    // Leaderboard actions are available through roomService methods above
};
