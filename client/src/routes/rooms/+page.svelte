<script lang="ts">
  import SpectatorView from '$lib/components/SpectatorView.svelte';
  import Login from '$lib/components/Login.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { currentPlayer } from '$lib/stores/game';
  import { authStore } from '$lib/stores/auth';
  import { roomActions, currentRoom } from '$lib/stores/room';
  import { pocketbaseService } from '$lib/services/pocketbaseService';

  // SvelteKit route props

  let currentPlayerId = null;
  let isAuthenticated = false;
  let authUser = null;

  // Spectator mode state
  let isSpectatorMode = false;
  let spectatorId = null;
  let roomId = null;

  // Auto-created room state
  let userRoom = null;
  let isCreatingRoom = false;
  let roomError = null;
  let isCheckingExistingRoom = false;
  let lastRoomCheckTime = 0;
  let roomCreationCooldown = 5000; // 5 seconds cooldown

  // Room settings
  let selectedGame = 'rune';
  let roomSettings = {
    maxPlayers: 8,
    timeLimit: 300,
    isPrivate: false,
    password: ''
  };

  // Subscribe to stores
  currentPlayer.subscribe(value => {
    currentPlayerId = value;
  });

  // Track previous user ID to detect user changes
  let previousUserId = null;

  authStore.subscribe(state => {
    const wasAuthenticated = isAuthenticated;
    isAuthenticated = state.isAuthenticated;
    const newUser = state.user;
    authUser = newUser;

    // If user is authenticated and currentPlayer not set, use authenticated user id
    if (isAuthenticated && authUser && !currentPlayerId) {
      currentPlayer.set(authUser.id);
    }

    // Clear room data when user logs out
    if (wasAuthenticated && !isAuthenticated) {
      console.log('👋 User logged out, clearing room data...');
      userRoom = null;
      // Clear localStorage cache for previous user
      if (previousUserId) {
        localStorage.removeItem(`user_room_${previousUserId}`);
      }
      roomError = null;
      previousUserId = null;
    }

    // Clear room data when user changes (different user login)
    if (isAuthenticated && newUser && previousUserId && previousUserId !== newUser.id) {
      console.log('🔄 User changed, clearing previous room data...');
      userRoom = null;
      localStorage.removeItem(`user_room_${previousUserId}`);
      roomError = null;
    }

    // Update previous user ID
    if (isAuthenticated && newUser) {
      previousUserId = newUser.id;
    }
  });

  currentRoom.subscribe(room => {
    userRoom = room;
  });

  // Function to sync room settings from database to local state
  function syncRoomSettingsFromDatabase(room) {
    if (!room) return;

    console.log('🔄 Syncing room settings from database:', room);

    // Sync max players
    if (room.max_members) {
      roomSettings.maxPlayers = room.max_members;
      console.log('✅ Synced maxPlayers:', room.max_members);
    }

    // Sync game type
    if (room.game_type) {
      selectedGame = room.game_type;
      console.log('✅ Synced gameType:', room.game_type);
    }

    // Sync private setting
    if (typeof room.is_private === 'boolean') {
      roomSettings.isPrivate = room.is_private;
      console.log('✅ Synced isPrivate:', room.is_private);
    }

    // Sync time limit from settings if available, otherwise use default
    if (room.settings && room.settings.timeLimit) {
      roomSettings.timeLimit = room.settings.timeLimit;
      console.log('✅ Synced timeLimit from settings:', room.settings.timeLimit);
    } else {
      // Use default time limit if not specified in settings
      roomSettings.timeLimit = 300; // 5 minutes default
      console.log('⚠️ No timeLimit in settings, using default:', roomSettings.timeLimit);
    }

    // Sync password if available
    if (room.password) {
      roomSettings.password = room.password;
      console.log('✅ Synced password');
    }
  }

  // Function to check if user already has an active room
  async function checkExistingRoom() {
    if (!isAuthenticated || !authUser) return null;

    isCheckingExistingRoom = true;

    try {
      // Check localStorage first for faster response
      const cachedRoomId = localStorage.getItem(`user_room_${authUser.id}`);
      if (cachedRoomId) {
        // Verify the cached room still exists
        try {
          const existingRoom = await pocketbaseService.pb.collection('rooms').getOne(cachedRoomId);
          if (existingRoom && existingRoom.owner_id === authUser.id &&
              (existingRoom.status === 'waiting' || existingRoom.status === 'playing')) {
            console.log('✅ Found existing room in cache:', existingRoom.name);
            userRoom = existingRoom;

            // CRITICAL: Sync settings even when loading from cache
            syncRoomSettingsFromDatabase(existingRoom);

            return existingRoom;
          } else {
            // Room no longer exists or not active, remove from cache
            localStorage.removeItem(`user_room_${authUser.id}`);
          }
        } catch (error) {
          console.warn('⚠️ Error verifying cached room:', error);
          localStorage.removeItem(`user_room_${authUser.id}`);
        }
      }

      // Query directly from PocketBase to get raw room data with owner_id
      const rawRooms = await pocketbaseService.pb.collection('rooms').getList(1, 100, {
        sort: '-created',
        filter: `owner_id = "${authUser.id}" && (status = "waiting" || status = "playing")`
      });

      console.log('🔍 Raw rooms query result:', rawRooms);
      console.log('🔍 Raw rooms data:', rawRooms.items);

      const userActiveRooms = rawRooms.items || [];

      // CRITICAL: Filter out rooms where owner no longer exists
      // This handles cases where rooms exist but their owners were deleted
      const validRooms = [];
      for (const room of userActiveRooms) {
        try {
          // Verify the owner still exists
          const ownerExists = await pocketbaseService.pb.collection('users').getOne(room.owner_id);
          if (ownerExists) {
            validRooms.push(room);
            console.log('✅ Room owner verified:', room.owner_id);
          } else {
            console.warn('⚠️ Room has non-existent owner, skipping:', room.id, 'Owner:', room.owner_id);
          }
        } catch (error) {
          console.warn('⚠️ Error verifying room owner, skipping room:', room.id, 'Error:', error.message);
        }
      }

      if (validRooms && validRooms.length > 0) {
        // Sort by creation date to get the latest
        const sortedRooms = validRooms.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        const latestRoom = sortedRooms[0];
        console.log('✅ Found existing active room:', latestRoom.name, 'Status:', latestRoom.status, 'Owner:', latestRoom.owner_id);

        // Cache the room ID
        localStorage.setItem(`user_room_${authUser.id}`, latestRoom.id);

        userRoom = latestRoom;

        // CRITICAL: Sync room settings from database to local state
        // This ensures UI shows actual database values, not defaults
        syncRoomSettingsFromDatabase(latestRoom);

        return latestRoom;
      }

      return null;
    } catch (error) {
      console.error('❌ Error checking existing room:', error);
      return null;
    } finally {
      isCheckingExistingRoom = false;
    }
  }

  onMount(() => {
    if (!browser) return;

    // Check for spectator parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    spectatorId = urlParams.get('spectatorId');
    roomId = urlParams.get('roomId');

    if (spectatorId && roomId) {
      isSpectatorMode = true;
      currentPlayer.set(spectatorId);
    } else if (isAuthenticated && authUser) {
      // Check if user already has an active room first
      // Only call on mount, not in reactive statements
      console.log('🏠 onMount: Initializing user room...');
      initializeUserRoom();
    }
  });

  // Initialize user room with proper checks
  async function initializeUserRoom() {
    if (!isAuthenticated || !authUser) return;

    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - lastRoomCheckTime < roomCreationCooldown) {
      console.log('⏰ Room creation on cooldown, skipping...');
      return;
    }
    lastRoomCheckTime = now;

    // Check if we already have a room or are creating one
    if (userRoom || isCreatingRoom || isCheckingExistingRoom) {
      console.log('ℹ️ Room already exists or being created, skipping...');
      return;
    }

    try {
      // First, check if user already has an active room
      console.log('🔍 Checking for existing room...');
      const existingRoom = await checkExistingRoom();

      if (existingRoom) {
        console.log('✅ Using existing room, no need to create new one');
        return;
      }

      // Only create new room if no existing room found
      console.log('🏗️ No existing room found, creating new one...');
      await createUserRoom();

      // createUserRoom() already sets userRoom if successful
      // No need to check again
    } catch (error) {
      console.error('❌ Error initializing user room:', error);
    }
  }

  // Watch for authentication changes (only for cleanup, not room creation)
  $: if (isAuthenticated && authUser && browser) {
    // This reactive statement only handles auth state changes for cleanup
    // Room creation is handled in onMount only
    console.log('🔄 Auth state changed:', authUser.name || authUser.id);
  }

  async function createUserRoom() {
    if (!isAuthenticated || !authUser) return;

    // Double-check we don't already have a room (extra protection)
    if (userRoom || isCreatingRoom) {
      console.log('⚠️ Room creation already in progress or room exists, skipping...');
      return;
    }

    isCreatingRoom = true;
    roomError = null;

    try {
      console.log('🏗️ Creating new room for user:', authUser.name || authUser.id);

      const result = await roomActions.createRoom({
        roomName: `${authUser.name || 'User'}'s Room`,
        hostId: authUser.id,
        hostName: authUser.name || `User_${authUser.id.slice(0, 8)}`,
        settings: {
          maxMembers: roomSettings.maxPlayers,
          gameType: selectedGame,
          gameMode: selectedGame,
          hasPassword: roomSettings.isPrivate,
          isPrivate: roomSettings.isPrivate,
          password: roomSettings.password,
          description: '',
        },
      });

      if (result.success && result.data) {
        userRoom = result.data;
        // Cache the room ID in localStorage to prevent duplicate creation
        localStorage.setItem(`user_room_${authUser.id}`, result.data.id);
        console.log('✅ Room created and cached:', result.data.name, 'ID:', result.data.id);

        // Immediately show the room creation UI
        // Don't rely on checkExistingRoom to find it again
        return;
      } else {
        roomError = result.error || 'Failed to create room';
        console.error('❌ Room creation failed:', roomError);
      }
    } catch (error) {
      roomError = 'Failed to create room: ' + error.message;
      console.error('❌ Room creation error:', error);
    } finally {
      isCreatingRoom = false;
    }
  }

  function updateGameSelection(game) {
    selectedGame = game;
    if (userRoom) {
      // Update room settings when game changes
      roomActions.updateRoomSettings(userRoom.id, {
        gameType: game,
        gameMode: game
      });
    }
  }

  // Update room settings in database
  async function updateRoomSettingsInDB() {
    if (!userRoom) return;

    try {
      // Note: Currently only max_members, game_type, is_private, and password
      // are stored as separate fields in PocketBase. JSON settings field is not working.
      // Time limit will remain local until database schema is fixed.
      await roomActions.updateRoomSettings(userRoom.id, {
        maxMembers: roomSettings.maxPlayers,
        maxPlayers: roomSettings.maxPlayers,
        isPrivate: roomSettings.isPrivate,
        hasPassword: roomSettings.isPrivate,
        password: roomSettings.password
        // timeLimit not saved to database yet due to schema limitations
      });
      console.log('✅ Room settings updated in database (limited fields)');
    } catch (error) {
      console.error('❌ Failed to update room settings:', error);
    }
  }

  async function startGame() {
    if (!userRoom) return;

    try {
      // Start the game with current room settings
      console.log('Starting game with room:', userRoom, 'Game:', selectedGame);

      // Handle different game types
      if (selectedGame === 'rune') {
        // Redirect to main page for RUNE game
        window.location.href = '/';
      } else if (selectedGame === 'bote') {
        // For BOTE, we might need different handling
        // For now, redirect to main page as well
        window.location.href = '/';
      } else {
        console.log('Unknown game type:', selectedGame);
        roomError = 'Game type not supported yet';
      }
    } catch (error) {
      roomError = 'Failed to start game: ' + error.message;
    }
  }

  function setPlayerName() {
    const name = prompt('Enter your player name:');
    if (name && name.trim()) {
      currentPlayer.set(name.trim());
    }
  }

  function exitSpectatorMode() {
    isSpectatorMode = false;
    spectatorId = null;
    roomId = null;
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  }
</script>

<svelte:head>
  <title>ENEEGY - Game Rooms</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="rooms-page">
  {#if !isAuthenticated}
    <!-- Show login when not authenticated -->
    <div class="auth-overlay">
      <Login />
    </div>
  {:else if isSpectatorMode}
    <!-- Show spectator view when in spectator mode -->
    <div class="spectator-section">
      {#if spectatorId && roomId}
        <SpectatorView {exitSpectatorMode} />
      {:else}
        <div class="loading-container">
          <p>Loading spectator mode...</p>
          <button class="primary-btn" on:click={exitSpectatorMode}>Back to Rooms</button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Main room creation interface -->
    <div class="rooms-container">
      <div class="rooms-header">
        <h1>Game Rooms</h1>
        <p class="subtitle">Select your game and start playing instantly</p>
      </div>

      {#if isCreatingRoom}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Creating your room...</p>
        </div>
      {:else if roomError}
        <div class="error-state">
          <p>Failed to create room: {roomError}</p>
          <button class="retry-btn" on:click={createUserRoom}>Try Again</button>
        </div>
      {:else if userRoom}
        <div class="room-interface">
          <!-- Room Info & Game Selection Row -->
          <div class="top-row">
            <div class="room-status">
              <div class="room-name">{userRoom.name}</div>
              <div class="room-meta">ID: {userRoom.id.slice(0, 8)} • Ready</div>
            </div>

            <div class="game-selector">
              <div class="game-tabs">
                <button
                  class="game-tab {selectedGame === 'rune' ? 'active' : ''}"
                  on:click={() => updateGameSelection('rune')}
                >
                  RUNE
                </button>
                <button
                  class="game-tab {selectedGame === 'bote' ? 'active' : ''}"
                  on:click={() => updateGameSelection('bote')}
                >
                  BOTE
                </button>
              </div>
            </div>
          </div>

          <!-- Settings Row -->
          <div class="settings-row">
            <div class="setting-item">
              <label>Players</label>
              <div class="range-container">
                <input
                  type="range"
                  min="2"
                  max="16"
                  bind:value={roomSettings.maxPlayers}
                  on:change={updateRoomSettingsInDB}
                />
                <span class="value">{roomSettings.maxPlayers}</span>
              </div>
            </div>

            <div class="setting-item">
              <label title="Time limit (stored locally only)">Time</label>
              <div class="range-container">
                <input
                  type="range"
                  min="60"
                  max="1800"
                  step="30"
                  bind:value={roomSettings.timeLimit}
                  on:change={updateRoomSettingsInDB}
                  title="Time limit is stored locally only"
                />
                <span class="value">{Math.floor(roomSettings.timeLimit / 60)}m</span>
              </div>
            </div>

            <div class="setting-item">
              <label class="checkbox-container">
                <input type="checkbox" bind:checked={roomSettings.isPrivate} on:change={updateRoomSettingsInDB} />
                <span>Private</span>
              </label>
              {#if roomSettings.isPrivate}
                <input
                  type="password"
                  placeholder="Password"
                  class="password-input"
                  bind:value={roomSettings.password}
                />
              {/if}
            </div>
          </div>

          <!-- Play Button -->
          <div class="play-section">
            <button class="play-btn" on:click={startGame}>
              <span class="play-text">Play Now</span>
              <span class="game-name">
                {selectedGame === 'rune' ? 'RUNE' :
                 selectedGame === 'bote' ? 'BOTE' : 'Game'}
              </span>
            </button>
          </div>
        </div>
      {:else}
        <div class="welcome-state">
          <div class="welcome-content">
            <h2>Welcome to Game Rooms</h2>
            <p>Your personal room will be created automatically</p>
            <button class="create-btn" on:click={createUserRoom}>
              <span>Create Room</span>
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Compact Tech Design - Fits in 1 viewport */

  .rooms-page {
    width: 100%;
    min-height: 100vh;
    background: #000000;
    font-family: 'Poppins', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
  }

  .rooms-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    width: 100%;
  }

  .rooms-header {
    text-align: center;
    padding: 1rem 0 2rem;
  }

  .rooms-header h1 {
    font-size: 2.2rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 0.5rem;
    letter-spacing: -0.02em;
  }

  .rooms-header .subtitle {
    font-size: 1rem;
    color: #b0b0b0;
    margin: 0;
    font-weight: 400;
  }

  .loading-state, .error-state, .welcome-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 60vh;
  }

  .loading-state {
    flex-direction: column;
    gap: 1rem;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #333333;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-state p {
    color: #b0b0b0;
    font-size: 1rem;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state {
    flex-direction: column;
    gap: 1.5rem;
  }

  .error-state p {
    color: #ff6b6b;
    font-size: 1rem;
    margin: 0;
    text-align: center;
  }

  .retry-btn {
    background: transparent;
    color: #ff6b6b;
    border: 1px solid #ff6b6b;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background: #ff6b6b;
    color: #000000;
  }

  .welcome-state {
    flex-direction: column;
  }

  .welcome-content {
    text-align: center;
  }

  .welcome-content h2 {
    color: #ffffff;
    font-size: 1.8rem;
    margin: 0 0 1rem;
    font-weight: 600;
  }

  .welcome-content p {
    color: #b0b0b0;
    font-size: 1rem;
    margin: 0 0 2rem;
  }

  .create-btn {
    background: transparent;
    color: #ffffff;
    border: 1px solid #ffffff;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    letter-spacing: 0.01em;
  }

  .create-btn:hover {
    background: #ffffff;
    color: #000000;
    transform: translateY(-1px);
  }

  .room-interface {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    flex: 1;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .room-status {
    flex: 1;
  }

  .room-name {
    font-size: 1.4rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.25rem;
  }

  .room-meta {
    font-size: 0.9rem;
    color: #b0b0b0;
  }

  .game-selector {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .game-tabs {
    display: flex;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 0.25rem;
  }

  .game-tab {
    background: transparent;
    border: none;
    color: #b0b0b0;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .game-tab:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .game-tab.active {
    background: #ffffff;
    color: #000000;
    font-weight: 600;
  }

  .settings-row {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    min-width: 120px;
  }

  .setting-item label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #ffffff;
    text-align: center;
  }

  .range-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .range-container input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: #333333;
    outline: none;
    cursor: pointer;
  }

  .range-container input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
  }

  .range-container input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: none;
  }

  .range-container .value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
    min-width: 2rem;
    text-align: center;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ffffff;
  }

  .checkbox-container input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #ffffff;
  }

  .password-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #333333;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .password-input::placeholder {
    color: #666666;
  }

  .play-section {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
  }

  .play-btn {
    background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
    color: #000000;
    border: none;
    padding: 1rem 3rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    min-width: 200px;
  }

  .play-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
    background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
  }

  .play-btn:active {
    transform: translateY(0);
  }

  .play-text {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .game-name {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .auth-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .spectator-section {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .loading-container {
    text-align: center;
    padding: 3rem;
  }

  .primary-btn {
    background: transparent;
    color: #ffffff;
    border: 1px solid #ffffff;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    letter-spacing: 0.02em;
  }

  .primary-btn:hover {
    background: #ffffff;
    color: #000000;
    transform: translateY(-1px);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .rooms-container {
      padding: 1rem 1rem;
    }

    .top-row {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .game-selector {
      justify-content: center;
    }

    .settings-row {
      gap: 1.5rem;
    }

    .setting-item {
      min-width: 100px;
    }
  }

  @media (max-width: 768px) {
    .rooms-header {
      padding: 1rem 0 1.5rem;
    }

    .rooms-header h1 {
      font-size: 1.8rem;
    }

    .rooms-header .subtitle {
      font-size: 0.9rem;
    }

    .top-row {
      padding: 1rem;
      gap: 1rem;
    }

    .room-name {
      font-size: 1.2rem;
    }

    .game-tabs {
      flex-wrap: wrap;
      justify-content: center;
    }

    .game-tab {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .settings-row {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .setting-item {
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
      min-width: unset;
    }

    .setting-item label {
      text-align: left;
      min-width: 60px;
    }

    .play-btn {
      padding: 0.875rem 2rem;
      font-size: 1rem;
      min-width: 180px;
    }

    .play-text {
      font-size: 0.8rem;
    }

    .game-name {
      font-size: 1rem;
    }
  }

  @media (max-width: 480px) {
    .rooms-container {
      padding: 0.75rem 0.75rem;
    }

    .rooms-header h1 {
      font-size: 1.5rem;
    }

    .welcome-content h2 {
      font-size: 1.5rem;
    }

    .welcome-content p {
      font-size: 0.9rem;
    }

    .create-btn, .play-btn {
      padding: 0.75rem 1.5rem;
      font-size: 0.9rem;
    }

    .top-row {
      padding: 0.75rem;
    }

    .settings-row {
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .setting-item {
      gap: 0.5rem;
    }

    .game-tab {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .play-section {
      padding: 1.5rem 0;
    }
  }
</style>
