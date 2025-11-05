<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Lock } from 'lucide-svelte';
  import { roomList, isLoadingRooms, roomError, roomActions } from '$lib/stores/room';
  import { authStore } from '$lib/stores/auth';
  import { currentPlayer } from '$lib/stores/game';
    // Types are imported but not used with type annotations in Svelte script
  import { roomUtils } from '$lib/stores/room';
  // import { GameMode } from '$lib/stores/types';

  let rooms = [];
  let filteredRooms = [];
  let loading = false;
  let error = null;
  let showCreateRoom = false;
  let currentPlayerId = null;
  let currentUserId = null;

  // Filter state
  let filter = {
    gameMode: undefined,
    hasPassword: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    state: 'waiting',
  };

  // Create room form state
  let newRoomName = '';
  let newRoomGameMode = 'deathmatch';
  let newRoomMaxPlayers = 8;
  let newRoomHasPassword = false;
  let newRoomPassword = '';
  let newRoomTimeLimit = 300; // 5 minutes default
  let newRoomAllowSpectators = true;

  // Leaderboard state
  let showLeaderboard = false;
  let leaderboardGameMode = '';
  let leaderboardTimeRange = '';

  // Subscribe to stores
  roomList.subscribe(value => {
    rooms = value;
    applyFilter();
  });

  isLoadingRooms.subscribe(value => loading = value);
  roomError.subscribe(value => error = value);
  currentPlayer.subscribe(value => currentPlayerId = value);
  authStore.subscribe(state => { currentUserId = state.user?.id; });

  onMount(() => {
    if (!browser) return;
    loadRooms();
  });

  function loadRooms() {
    roomActions.listRooms(filter);
  }

  function applyFilter() {
    filteredRooms = rooms.filter(room => {
      // Map PocketBase schema to UI fields
      const gameMode = room.game_type || room.gameMode;
      const hasPassword = room.is_private || room.hasPassword;
      const playerCount = room.members?.length || room.playerCount || 0;
      const maxPlayers = room.max_members || room.maxPlayers;
      const state = room.status || room.state;

      if (filter.gameMode && gameMode !== filter.gameMode) return false;
      if (filter.hasPassword !== undefined && hasPassword !== filter.hasPassword) return false;
      if (filter.minPlayers && playerCount < filter.minPlayers) return false;
      if (filter.maxPlayers && playerCount > filter.maxPlayers) return false;
      if (filter.state && state !== filter.state) return false;
      return true;
    });
  }

  function handleFilterChange() {
    applyFilter();
  }

  function resetFilter() {
    filter = {
      gameMode: undefined,
      hasPassword: undefined,
      minPlayers: undefined,
      maxPlayers: undefined,
      state: 'waiting',
    };
    applyFilter();
  }

  async function handleJoinRoom(room) {
    // If player name not set, fall back to authenticated user id or generate anon id
    if (!currentPlayerId) {
      if (currentUserId) {
        currentPlayer.set(currentUserId);
        currentPlayerId = currentUserId;
      } else {
        const anonId = 'anon_' + Math.random().toString(36).substring(2, 9);
        currentPlayer.set(anonId);
        currentPlayerId = anonId;
      }
    }

    const result = await roomActions.joinRoom({
      roomId: room.id,
      playerId: currentPlayerId,
      playerName: `Player_${(currentPlayerId || '').slice(0, 8)}`,
    });

    if (result.success) {
      // Room joined successfully, switch to game view
      // This would typically navigate to a game page
      console.log('Joined room:', room.name);
    } else {
      error = result.error || 'Failed to join room';
    }
  }

  async function handleJoinRoomAsSpectator(room) {
    // Ensure spectator id exists; fallback similar to player join
    if (!currentPlayerId) {
      if (currentUserId) {
        currentPlayer.set(currentUserId);
        currentPlayerId = currentUserId;
      } else {
        const anonId = 'anon_' + Math.random().toString(36).substring(2, 9);
        currentPlayer.set(anonId);
        currentPlayerId = anonId;
      }
    }

    const result = await roomActions.joinRoomAsSpectator({
      roomId: room.id,
      spectatorId: currentPlayerId,
      spectatorName: `Spectator_${(currentPlayerId || '').slice(0, 8)}`,
    });

    if (result.success) {
      // Spectator joined successfully, navigate to rooms page with spectator parameters
      window.location.href = `/rooms?spectatorId=${encodeURIComponent(currentPlayerId)}&roomId=${encodeURIComponent(room.id)}`;
      console.log('Joined room as spectator:', room.name);
    } else {
      error = result.error || 'Failed to join as spectator';
    }
  }

  async function handleCreateRoom() {
    if (!currentPlayerId) {
      error = 'Please set your player name first';
      return;
    }

    const roomNameError = roomUtils.validateRoomName(newRoomName);
    if (roomNameError) {
      error = roomNameError;
      return;
    }

    const result = await roomActions.createRoom({
      roomName: newRoomName,
      hostId: currentUserId || currentPlayerId, // Prefer authenticated user
      hostName: `Host_${(currentUserId || currentPlayerId).slice(0, 8)}`,
      settings: {
        maxMembers: newRoomMaxPlayers,
        gameType: newRoomGameMode,
        gameMode: newRoomGameMode, // Keep for backward compatibility
        hasPassword: newRoomHasPassword,
        isPrivate: newRoomHasPassword,
        password: newRoomPassword,
        description: '',
      },
    });

    if (result.success) {
      showCreateRoom = false;
      newRoomName = '';
      newRoomGameMode = 'subway_surfers';
      newRoomMaxPlayers = 8;
      newRoomHasPassword = false;
      newRoomPassword = '';
      loadRooms(); // Refresh room list
    } else {
      error = result.error || 'Failed to create room';
    }
  }

  // Manage modal state and actions (host only)
  let showManageModal = false;
  let manageRoom = null;

  function openManage(room) {
    manageRoom = JSON.parse(JSON.stringify(room)); // shallow copy for editing
    showManageModal = true;
  }

  async function kickPlayerFromRoom(targetPlayerId) {
    if (!manageRoom || !currentUserId) return;
    try {
      const res = await roomActions.kickPlayer(manageRoom.id, currentUserId, targetPlayerId);
      if (res.success) {
        await roomActions.listRooms();
        // refresh manageRoom players
        const updated = (await roomActions.listRooms(filter)).data;
        manageRoom = updated.find(r => r.id === manageRoom.id) || null;
      } else {
        alert('Kick failed: ' + res.error);
      }
    } catch (e) {
      console.error(e);
      alert('Kick error: ' + e.message);
    }
  }

  async function saveRoomSettings(updatedSettings) {
    if (!manageRoom || !currentUserId) return;
    try {
      const res = await roomActions.updateRoomSettings(manageRoom.id, updatedSettings);
      if (res.success) {
        await roomActions.listRooms();
        showManageModal = false;
        manageRoom = null;
      } else {
        alert('Update failed: ' + res.error);
      }
    } catch (e) {
      console.error(e);
      alert('Update error: ' + e.message);
    }
  }

  function formatTimeAgo(seconds) {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  async function loadLeaderboard() {
    await roomActions.loadLeaderboard(leaderboardGameMode || undefined, leaderboardTimeRange || undefined);
  }

  // Load leaderboard on mount - temporarily disabled
  // onMount(() => {
  //   loadLeaderboard();
  // });
</script>

<div class="room-browser">
  <div class="header">
    <h2>Game Rooms</h2>
    <button class="create-btn" on:click={() => showCreateRoom = !showCreateRoom}>
      {showCreateRoom ? 'Cancel' : 'Create Room'}
    </button>
  </div>

  {#if error}
    <div class="error-message">
      {error}
      <button on:click={() => error = null}>Close</button>
    </div>
  {/if}

  <!-- Filter Controls -->
  <div class="filters">
    <div class="filter-group">
      <label for="gameModeFilter">Game Type:</label>
      <select id="gameModeFilter" bind:value={filter.gameMode} on:change={handleFilterChange}>
        <option value={undefined}>All</option>
        <option value="subway_surfers">Subway Surfers</option>
        <option value="infinite_runner">Infinite Runner</option>
        <option value="puzzle">Puzzle</option>
        <option value="racing">Racing</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="passwordFilter">Password:</label>
      <select id="passwordFilter" bind:value={filter.hasPassword} on:change={handleFilterChange}>
        <option value={undefined}>All</option>
        <option value={true}>Protected</option>
        <option value={false}>Open</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="minPlayersFilter">Min Players:</label>
      <input
        id="minPlayersFilter"
        type="number"
        min="1"
        max="16"
        bind:value={filter.minPlayers}
        on:input={handleFilterChange}
        placeholder="0"
      />
    </div>

    <div class="filter-group">
      <label for="maxPlayersFilter">Max Players:</label>
      <input
        id="maxPlayersFilter"
        type="number"
        min="2"
        max="16"
        bind:value={filter.maxPlayers}
        on:input={handleFilterChange}
        placeholder="16"
      />
    </div>

    <button class="reset-btn" on:click={resetFilter}>Reset</button>
  </div>

  <!-- Create Room Form -->
  {#if showCreateRoom}
    <div class="create-room-form">
      <h3>Create New Room</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="roomNameInput">Room Name:</label>
          <input
            id="roomNameInput"
            type="text"
            bind:value={newRoomName}
            placeholder="Enter room name"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label for="roomGameModeSelect">Game Type:</label>
          <select id="roomGameModeSelect" bind:value={newRoomGameMode}>
            <option value="subway_surfers">Subway Surfers</option>
            <option value="infinite_runner">Infinite Runner</option>
            <option value="puzzle">Puzzle</option>
            <option value="racing">Racing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="roomMaxMembersInput">Max Members:</label>
          <input
            id="roomMaxMembersInput"
            type="number"
            min="2"
            max="50"
            bind:value={newRoomMaxPlayers}
          />
        </div>

        <div class="form-group">
          <label for="roomTimeLimitInput">Time Limit (seconds):</label>
          <input
            id="roomTimeLimitInput"
            type="number"
            min="60"
            max="3600"
            step="30"
            bind:value={newRoomTimeLimit}
            placeholder="300 (5 minutes)"
          />
        </div>

        <div class="form-group">
          <label for="roomPasswordCheckbox">
            <input id="roomPasswordCheckbox" type="checkbox" bind:checked={newRoomHasPassword} />
            Password Protected
          </label>
        </div>

        <div class="form-group">
          <label for="roomAllowSpectatorsCheckbox">
            <input id="roomAllowSpectatorsCheckbox" type="checkbox" bind:checked={newRoomAllowSpectators} />
            Allow Spectators
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button class="create-btn" on:click={handleCreateRoom} disabled={loading}>
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        <button class="cancel-btn" on:click={() => showCreateRoom = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <!-- Room List -->
  <div class="room-list">
    {#if loading}
      <div class="loading">Loading rooms...</div>
    {:else if filteredRooms.length === 0}
      <div class="empty-state">
        <p>No rooms found matching your criteria.</p>
        <button on:click={loadRooms}>Refresh</button>
      </div>
    {:else}
      <div class="rooms-grid">
        {#each filteredRooms as room (room.id)}
          <div class="room-card">
            <div class="room-header">
              <h3>{room.name}</h3>
              <span class="room-state {room.status || room.state}">{roomUtils.formatRoomState(room.status || room.state)}</span>
            </div>

            <div class="room-info">
              <div class="info-row">
                <span>Game Type:</span>
                <span>{roomUtils.formatGameMode(room.game_type || room.gameMode)}</span>
              </div>
              <div class="info-row">
                <span>Players:</span>
                <span>{(room.members?.length || 0)}/{room.max_members || room.maxPlayers || 4}</span>
              </div>
              <div class="info-row">
                <span>Owner:</span>
                <span>{room.owner_id ? `User_${room.owner_id.slice(0, 8)}` : 'N/A'}</span>
              </div>
              {#if room.game_settings?.timeLimit}
              <div class="info-row">
                <span>Time Limit:</span>
                <span>{room.game_settings.timeLimit}s</span>
              </div>
              {/if}
              <div class="info-row">
                <span>Created:</span>
                <span>{formatTimeAgo(room.created)}</span>
              </div>
              {#if room.is_private || room.hasPassword}
                <div class="info-row password-indicator">
                  <Lock class="lock-icon" />
                  Password Protected
                </div>
              {/if}
            </div>

  {#if showManageModal && manageRoom}
    <div class="manage-modal">
      <div class="manage-content">
        <div class="manage-header">
          <h3>Manage Room: {manageRoom.name}</h3>
          <button class="close-btn" on:click={() => { showManageModal = false; manageRoom = null; }}>Close</button>
        </div>

        <div class="manage-body">
          <h4>Members</h4>
          <ul>
            {#each manageRoom.members || [] as memberId}
              <li class="manage-player">
                <span>User_{memberId.slice(0, 8)} {manageRoom.owner_id === memberId ? '(Owner)' : ''}</span>
                {#if currentUserId && manageRoom.owner_id === currentUserId && memberId !== currentUserId}
                  <button class="kick-btn" on:click={() => kickPlayerFromRoom(memberId)}>Kick</button>
                {/if}
              </li>
            {/each}
          </ul>

          <h4>Settings</h4>
          <div class="settings-form">
            <label>Max Members:<input type="number" bind:value={manageRoom.max_members} min="2" max="50" /></label>
            <label>Game Type:
              <select bind:value={manageRoom.game_type}>
                <option value="subway_surfers">Subway Surfers</option>
                <option value="infinite_runner">Infinite Runner</option>
                <option value="puzzle">Puzzle</option>
                <option value="racing">Racing</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Private Room:<input type="checkbox" bind:checked={manageRoom.is_private} /></label>
            <div class="settings-actions"><button on:click={() => saveRoomSettings(manageRoom)}>Save</button></div>
          </div>
        </div>
      </div>
    </div>
  {/if}

            <div class="room-actions">
              <button
                class="join-btn"
                on:click={() => handleJoinRoom(room)}
                disabled={(room.status || room.state) !== 'waiting' || (room.members?.length || 0) >= (room.max_members || room.maxPlayers || 4)}
              >
                {(room.status || room.state) !== 'waiting' ? 'Game Started' :
                 (room.members?.length || 0) >= (room.max_members || room.maxPlayers || 4) ? 'Full' : 'Join as Player'}
              </button>
              {#if currentUserId && room.owner_id === currentUserId}
                <button class="manage-btn" on:click={() => openManage(room)}>Manage</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Leaderboard Modal -->
  {#if showLeaderboard}
    <div class="leaderboard-modal">
      <div class="leaderboard-content">
        <div class="leaderboard-header">
          <h3>Global Leaderboard</h3>
          <button class="close-btn" on:click={() => showLeaderboard = false}>Close</button>
        </div>

        <div class="leaderboard-filters">
          <select bind:value={leaderboardGameMode} on:change={loadLeaderboard}>
            <option value="">All Game Modes</option>
            <option value="subway_surfers">Subway Surfers</option>
            <option value="infinite_runner">Infinite Runner</option>
            <option value="puzzle">Puzzle</option>
            <option value="racing">Racing</option>
            <option value="other">Other</option>
          </select>

          <select bind:value={leaderboardTimeRange} on:change={loadLeaderboard}>
            <option value="">All Time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {#if roomActions.isLoadingLeaderboardData()}
          <div class="loading">Loading leaderboard...</div>
        {:else if roomActions.getLeaderboardError()}
          <div class="error">Error: {roomActions.getLeaderboardError()}</div>
        {:else}
          <div class="leaderboard-list">
            {#each roomActions.getLeaderboardData() as entry, index}
              <div class="leaderboard-entry {index < 3 ? 'top-' + (index + 1) : ''}">
                <div class="rank">#{index + 1}</div>
                <div class="player-info">
                  <div class="player-name">{entry.playerName || `Player_${entry.playerId.slice(0, 8)}`}</div>
                  <div class="player-id">{entry.playerId}</div>
                </div>
                <div class="score">{entry.score.toLocaleString()}</div>
                <div class="game-mode">{roomUtils.formatGameMode(entry.gameMode)}</div>
                <div class="date">{new Date(entry.timestamp).toLocaleDateString()}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .room-browser {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    background: #0a0e1a;
    color: white;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100vh - 160px);
    box-sizing: border-box;
  }

  /* Make the room list area fill remaining space and scroll when needed */
  .room-list {
    flex: 1 1 auto;
    overflow: auto;
    padding-right: 8px; /* allow space for scrollbar */
  }

  /* Slightly tighter grid to better fit on smaller screens */
  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .header h2 {
    margin: 0;
    color: #4a9eff;
  }

  .create-btn, .reset-btn {
    background: #4a9eff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
  }

  .create-btn:hover:not(:disabled) {
    background: #3a8eef;
  }

  .create-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    background: #ff4757;
    color: white;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-message button {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    align-items: center;
    padding: 1rem;
    background: #1a1f2e;
    border-radius: 8px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.9rem;
    color: #a0a0a0;
  }

  .filter-group select,
  .filter-group input {
    padding: 0.5rem;
    border: 1px solid #3a3f4b;
    border-radius: 4px;
    background: #2a2f3e;
    color: white;
    font-size: 0.9rem;
  }

  .reset-btn {
    background: #666;
    margin-left: auto;
  }

  .create-room-form {
    background: #1a1f2e;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    border: 1px solid #3a3f4b;
  }

  .create-room-form h3 {
    margin-top: 0;
    color: #4a9eff;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    color: #a0a0a0;
  }

  .form-group input,
  .form-group select {
    padding: 0.75rem;
    border: 1px solid #3a3f4b;
    border-radius: 6px;
    background: #2a2f3e;
    color: white;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: #666;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #a0a0a0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #a0a0a0;
  }

  .empty-state button {
    background: #4a9eff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 1rem;
  }

  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .room-card {
    background: #1a1f2e;
    border: 1px solid #3a3f4b;
    border-radius: 12px;
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .room-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(74, 158, 255, 0.1);
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .room-header h3 {
    margin: 0;
    color: #4a9eff;
  }

  .room-state {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .room-state.waiting {
    background: #2ecc71;
    color: white;
  }

  .room-state.playing {
    background: #e74c3c;
    color: white;
  }

  .room-state.finished {
    background: #95a5a6;
    color: white;
  }

  .room-info {
    margin-bottom: 1.5rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .info-row.password-indicator {
    color: #f39c12;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lock-icon {
    width: 14px;
    height: 14px;
  }

  .room-actions {
    display: flex;
    justify-content: flex-end;
  }

  .join-btn {
    background: #2ecc71;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
  }

  .join-btn:hover:not(:disabled) {
    background: #27ae60;
  }

  .join-btn:disabled {
    background: #7f8c8d;
    cursor: not-allowed;
  }

  .spectator-btn {
    background: #9b59b6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s;
  }

  .spectator-btn:hover:not(:disabled) {
    background: #8e44ad;
  }

  .spectator-btn:disabled {
    background: #7f8c8d;
    cursor: not-allowed;
  }

  /* Leaderboard Modal */
  .leaderboard-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .leaderboard-content {
    background: #1a1f2e;
    border-radius: 12px;
    padding: 2rem;
    max-width: 800px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
  }

  .leaderboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .leaderboard-header h3 {
    margin: 0;
    color: #4a9eff;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .leaderboard-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .leaderboard-filters select {
    padding: 0.5rem;
    background: #2d3748;
    border: 1px solid #4a5568;
    border-radius: 6px;
    color: white;
  }

  .leaderboard-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .leaderboard-entry {
    display: grid;
    grid-template-columns: 50px 1fr 100px 120px 100px;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: #2d3748;
    border-radius: 8px;
    align-items: center;
  }

  .leaderboard-entry.top-1 {
    background: linear-gradient(135deg, #ffd700, #ffb347);
    color: #000;
  }

  .leaderboard-entry.top-2 {
    background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
    color: #000;
  }

  .leaderboard-entry.top-3 {
    background: linear-gradient(135deg, #cd7f32, #b87333);
    color: #fff;
  }

  .rank {
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
  }

  .player-info {
    display: flex;
    flex-direction: column;
  }

  .player-name {
    font-weight: 600;
  }

  .player-id {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .score {
    font-weight: bold;
    font-size: 1.1rem;
    text-align: right;
  }

  .game-mode {
    text-align: center;
    padding: 0.25rem 0.5rem;
    background: #4a9eff;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .date {
    text-align: center;
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .leaderboard-btn {
    background: #4a9eff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
  }

  .leaderboard-btn:hover {
    background: #3a8eef;
  }

  /* Manage modal styles */
  .manage-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
  }

  .manage-content {
    background: #0f1629;
    padding: 1.25rem;
    border-radius: 12px;
    width: 90%;
    max-width: 720px;
    color: white;
  }

  .manage-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem; }
  .manage-player { display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .kick-btn { background:#ff4d4f; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; }
  .settings-form label { display:flex; gap:8px; align-items:center; margin:8px 0; }
  .settings-actions { margin-top:12px; }

  @media (max-width: 768px) {
    .room-browser {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .rooms-grid {
      grid-template-columns: 1fr;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .leaderboard-entry {
      grid-template-columns: 40px 1fr 80px 100px 80px;
      font-size: 0.9rem;
    }

    .leaderboard-filters {
      flex-direction: column;
    }
  }
</style>
