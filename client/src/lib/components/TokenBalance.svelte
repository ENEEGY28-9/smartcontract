<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { gameState } from '$lib/stores/gameStore';
  import { authStore, authActions } from '$lib/stores/auth';

  let tokenBalance = 0;
  let sessionEarned = 0;
  let isConnected = false;
  let lastUpdate = Date.now();

  // Pool balance state
  let poolBalance = 0;
  let poolAddress = '';
  let isPoolConnected = false;
  let poolLastUpdate = 0;

  // Energy update tracking - DECLARE BEFORE USE
  let lastEnergyUpdate = 0; // Track when energy was last updated by game
  let updateCounter = 0; // Counter for tracking update sources
  let protectionDisabled = false; // Debug flag to disable protection

  // Get isolation mode from game (this is a simple way to share state)
  let isolationMode = false;

  // Subscribe to game store
  const unsubscribeGame = gameState.subscribe(state => {
    const newBalance = state.tokenBalance || 0;
    const oldBalance = tokenBalance;

    tokenBalance = newBalance;
    sessionEarned = state.sessionTokenEarned || 0;
    isConnected = state.isConnected;
    lastUpdate = Date.now();

    // Track if this update came from game (not from our own fetch)
    if (newBalance !== oldBalance) {
      const stateUpdateId = ++updateCounter;
      const timeSinceLastFetch = Date.now() - lastUpdate;
      console.log(`📊 [${stateUpdateId}] GAME STATE UPDATE: ${oldBalance} → ${newBalance} (timeSinceLast: ${timeSinceLastFetch}ms)`);

      if (timeSinceLastFetch > 1000) { // If more than 1s since last update, likely from game
        lastEnergyUpdate = Date.now();
        console.log(`🎮 [${stateUpdateId}] Marked as game update (protection active for 5s)`);
      }
    }
  });

  // Subscribe to auth store for balance fetching
  let lastAuthState = null;
  let balanceFetchTimeout = null;

  const unsubscribeAuth = authStore.subscribe(state => {
    // Only fetch balance when authentication state actually changes
    const currentAuthState = state.isAuthenticated && !!state.tokens?.access_token;
    const prevAuthState = lastAuthState;

    if (currentAuthState !== prevAuthState) {
      lastAuthState = currentAuthState;

      if (currentAuthState) {
        const authUpdateId = ++updateCounter;
        console.log(`🔑 [${authUpdateId}] Auth state changed, checking if we should fetch balance...`);

        // Check if energy was recently updated by game (within last 5 seconds)
        const timeSinceLastUpdate = Date.now() - lastEnergyUpdate;
        if (!protectionDisabled && timeSinceLastUpdate < 5000) {
          console.log(`⏳ [${authUpdateId}] PROTECTION ACTIVE: Skipping balance fetch - energy was updated ${timeSinceLastUpdate}ms ago by game`);
          console.log(`🛡️ [${authUpdateId}] Protection will be inactive in ${5000 - timeSinceLastUpdate}ms`);
          return;
        }

        if (protectionDisabled) {
          console.log(`🚫 [${authUpdateId}] PROTECTION DISABLED: Proceeding with balance fetch despite recent game update`);
        } else {
          console.log(`✅ [${authUpdateId}] PROTECTION INACTIVE: Proceeding with balance fetch (${timeSinceLastUpdate}ms since last game update)`);
        }

        // Debounce balance fetching to prevent concurrent requests
        if (balanceFetchTimeout) {
          clearTimeout(balanceFetchTimeout);
        }

        console.log(`⏰ [${authUpdateId}] Scheduling balance fetch in 100ms...`);
        balanceFetchTimeout = setTimeout(() => {
          console.log(`🚀 [${authUpdateId}] Executing scheduled balance fetch`);
          fetchBalance();
        }, 100); // Small delay to prevent rapid-fire requests
      }
    }
  });

  // WebSocket connection for real-time updates
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      // Get access token for WebSocket authentication
      const authState = get(authStore);
      const token = authState.tokens?.access_token;
      const wsUrl = token
        ? `ws://localhost:8080/token-updates?token=${encodeURIComponent(token)}`
        : 'ws://localhost:8080/token-updates';

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔗 Token balance WebSocket connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'energy_update' && data.userId === $authStore.user?.id) {
            // Check if isolation mode is active
            const isolationModeActive = (window as any).gameIsolationMode === true;
            if (isolationModeActive) {
              console.log('🔒 ISOLATION MODE: Blocking WebSocket energy update');
              return;
            }

            const oldBalance = $gameState.tokenBalance || 0;
            const wsUpdateId = ++updateCounter;
            console.log(`🌐 [${wsUpdateId}] WEBSOCKET UPDATE: energy ${oldBalance} → ${data.new_balance} (+${data.amount})`);

            // Update energy balance in game store
            gameState.update(state => ({
              ...state,
              tokenBalance: data.new_balance,
              sessionTokenEarned: (state.sessionTokenEarned || 0) + data.amount
            }));

            // Mark as external update (not from our fetch)
            lastEnergyUpdate = Date.now();

            // Show notification
            showTokenNotification(data.amount);

            lastUpdate = Date.now();
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 Token balance WebSocket disconnected');
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('Token balance WebSocket error:', error);
        attemptReconnect();
      };

    } catch (error) {
      console.error('Failed to connect token WebSocket:', error);
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached');
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`🔄 Attempting WebSocket reconnect (${reconnectAttempts}/${maxReconnectAttempts})`);
      connectWebSocket();
    }, delay);
  }

  function showTokenNotification(amount: number) {
    // Create floating notification
    const notification = document.createElement('div');
    notification.className = 'token-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="token-icon">🪙</span>
        <span class="token-amount">+${amount}</span>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Animate and remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Fetch pool balance
  async function fetchPoolBalance() {
    try {
      console.log('🏊 Fetching pool balance...');
      const response = await fetch('/api/test/pool-balance');

      if (response.ok) {
        const data = await response.json();
        poolBalance = data.available_tokens || 0;
        poolAddress = data.pool_address || '';
        isPoolConnected = true;
        poolLastUpdate = Date.now();

        console.log(`🏊 Pool balance updated: ${poolBalance} tokens from ${poolAddress}`);
      } else {
        isPoolConnected = false;
        console.warn('Failed to fetch pool balance:', response.status, response.statusText);
      }
    } catch (error) {
      isPoolConnected = false;
      console.error('Failed to fetch pool balance:', error);
    }
  }

  // Fetch initial balance on mount
  async function fetchBalance() {
    // Fetch user energies from PocketBase if authenticated
    if ($authStore.isAuthenticated) {
      try {
        // Check if isolation mode is active (simple global check)
        const isolationModeActive = (window as any).gameIsolationMode === true;
        if (isolationModeActive) {
          console.log('🔒 ISOLATION MODE: Blocking TokenBalance fetch to prevent conflicts');
          return;
        }

        const currentBalance = $gameState.tokenBalance || 0;
        const updateId = ++updateCounter;
        console.log(`🔄 [${updateId}] FETCHING balance from database (current game balance: ${currentBalance})...`);

        // Import PocketBase service dynamically
        const { pocketbaseService } = await import('$lib/services/pocketbaseService');
        const energyData = await pocketbaseService.getOrCreateUserEnergy();

        const oldBalance = $gameState.tokenBalance || 0;
        const newBalance = energyData.points || 0;

        gameState.update(state => ({
          ...state,
          tokenBalance: newBalance
        }));

        console.log(`✅ [${updateId}] FETCHED balance from database: ${oldBalance} → ${newBalance}`);

        // Detect significant reduction (potential problem)
        if (oldBalance > newBalance && oldBalance - newBalance >= 10) {
          console.error(`🚨 [${updateId}] SIGNIFICANT ENERGY REDUCTION DETECTED: ${oldBalance} → ${newBalance} (Δ${newBalance - oldBalance})`);
          console.error(`🔍 [${updateId}] This may indicate database sync issue or concurrent update conflict`);
        }
      } catch (error) {
        console.error('Failed to fetch user energies:', error);
        // Fallback to 0
        gameState.update(state => ({
          ...state,
          tokenBalance: 0
        }));
      }
    } else {
      console.log('⚠️ User not authenticated, skipping energy balance fetch');
    }
  }

  // Pool balance update interval
  let poolBalanceInterval: number | null = null;

  onMount(() => {
    console.log('🔑 TokenBalance mounted. Auth state:', {
      user: $authStore.user,
      tokens: !!$authStore.tokens?.access_token,
      isAuthenticated: $authStore.isAuthenticated
    });

    // Force re-authenticate if using old PocketBase tokens
    if ($authStore.tokens?.access_token && $authStore.tokens.access_token.includes('collectionId')) {
      console.warn('⚠️ Detected old PocketBase tokens, forcing re-authentication...');
      authStore.set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        // Force reload to clear all cached state
        console.log('🔄 Forcing page reload to clear old tokens...');
        window.location.reload();
      }
      return;
    }

    // Fetch initial balance
    fetchBalance();

    // Fetch initial pool balance
    fetchPoolBalance();

    // Set up pool balance updates every 30 seconds
    poolBalanceInterval = setInterval(fetchPoolBalance, 30000);

    // Connect WebSocket for real-time updates only if authenticated
    if ($authStore.tokens?.access_token) {
      connectWebSocket();
    }
  });

  onDestroy(() => {
    // Cleanup subscriptions
    unsubscribeGame();
    unsubscribeAuth();

    // Clear balance fetch timeout
    if (balanceFetchTimeout) {
      clearTimeout(balanceFetchTimeout);
      balanceFetchTimeout = null;
    }

    // Clear pool balance interval
    if (poolBalanceInterval) {
      clearInterval(poolBalanceInterval);
      poolBalanceInterval = null;
    }

    // Close WebSocket
    if (ws) {
      ws.close();
    }
  });

  // Debug keyboard handler
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'e') {
      console.log('🔍 [TokenBalance] Energy balance debug:');
      console.log(`  Game state tokenBalance: ${$gameState.tokenBalance || 0}`);
      console.log(`  Session earned: ${$gameState.sessionTokenEarned || 0}`);
      console.log(`  Component tokenBalance: ${tokenBalance}`);
      console.log(`  Authenticated: ${$authStore.isAuthenticated}`);
      console.log(`  Update counter: ${updateCounter}`);
      console.log(`  Last energy update: ${lastEnergyUpdate ? new Date(lastEnergyUpdate).toLocaleTimeString() : 'Never'}`);
      console.log(`  Protection disabled: ${protectionDisabled}`);
    } else if (event.key === 'p') {
      protectionDisabled = !protectionDisabled;
      console.log(`🛡️ [TokenBalance] Energy protection ${protectionDisabled ? 'DISABLED' : 'ENABLED'}`);
    }
  }

  // Handle logout
  function handleLogout() {
    console.log('🚪 Logging out...');
    authStore.set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
      // Reload page to reset everything
      window.location.reload();
    }
  }

  // Format large numbers
  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Calculate time since last update
  function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
</script>

<div class="token-balance-container" on:keydown={handleKeyPress} tabindex="0">
  <div class="token-balance-card" class:connected={isConnected}>
      <div class="balance-header">
        <div class="token-icon">⚡</div>
        <div class="balance-info">
          <div class="balance-title">Energy (E)</div>
        {#if $authStore.isAuthenticated}
          <div class="balance-amount">{formatNumber(tokenBalance)}</div>
        {:else}
          <div class="login-prompt">🔐 Đăng nhập để xem energy balance</div>
        {/if}
      </div>
    </div>

    {#if sessionEarned > 0}
      <div class="session-earned">
        <span class="session-label">This Session:</span>
        <span class="session-amount">+{formatNumber(sessionEarned)}</span>
      </div>
    {/if}

    <div class="balance-footer">
      <div class="connection-status">
        {#if isConnected}
          <span class="status-dot connected"></span>
          <span class="status-text">Live</span>
        {:else}
          <span class="status-dot disconnected"></span>
          <span class="status-text">Offline</span>
        {/if}
      </div>
      <div class="last-update">
        {#if $authStore.isAuthenticated}
          <button class="logout-btn" on:click={handleLogout}>Logout</button>
        {:else}
          {getTimeAgo(lastUpdate)}
        {/if}
      </div>
    </div>
  </div>

  <!-- Pool Balance Card -->
  <div class="pool-balance-card" class:connected={isPoolConnected}>
    <div class="balance-header">
      <div class="pool-icon">🏊</div>
      <div class="balance-info">
        <div class="balance-title">Pool Tokens</div>
        <div class="balance-amount">{formatNumber(poolBalance)}</div>
      </div>
    </div>

    <div class="balance-footer">
      <div class="connection-status">
        {#if isPoolConnected}
          <span class="status-dot connected"></span>
          <span class="status-text">Connected</span>
        {:else}
          <span class="status-dot disconnected"></span>
          <span class="status-text">Offline</span>
        {/if}
      </div>
      <div class="last-update">
        {poolLastUpdate ? getTimeAgo(poolLastUpdate) : 'Never'}
      </div>
    </div>
  </div>
</div>

<style>
  .token-balance-container {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    font-family: 'Courier New', monospace;
  }

  .token-balance-card {
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid #333;
    border-radius: 12px;
    padding: 16px;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }

  .token-balance-card.connected {
    border-color: #00ff88;
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.2);
  }

  .balance-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .token-icon {
    font-size: 32px;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }

  .balance-info {
    flex: 1;
  }

  .balance-title {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .balance-amount {
    font-size: 24px;
    font-weight: bold;
    color: #00ff88;
    text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
  }

  .session-earned {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .session-label {
    font-size: 12px;
    color: #ccc;
  }

  .session-amount {
    font-size: 14px;
    font-weight: bold;
    color: #00ff88;
  }

  .balance-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #666;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }

  .status-dot.connected {
    background: #00ff88;
    box-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  }

  .status-text {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .last-update {
    font-size: 10px;
  }

  /* Pool Balance Card Styles */
  .pool-balance-card {
    background: linear-gradient(135deg, rgba(0, 123, 255, 0.1), rgba(0, 123, 255, 0.05));
    border: 1px solid rgba(0, 123, 255, 0.3);
    border-radius: 12px;
    padding: 16px;
    min-width: 200px;
    backdrop-filter: blur(10px);
    margin-top: 10px;
    box-shadow: 0 8px 32px rgba(0, 123, 255, 0.1);
  }

  .pool-balance-card.connected {
    border-color: rgba(0, 123, 255, 0.6);
    box-shadow: 0 8px 32px rgba(0, 123, 255, 0.2);
  }

  .pool-icon {
    font-size: 24px;
    opacity: 0.9;
  }

  .pool-balance-card .balance-title {
    color: #7bb3ff;
  }

  .pool-balance-card .balance-amount {
    color: #4d9fff;
  }

  .pool-balance-card .status-dot.connected {
    background: #007bff;
    box-shadow: 0 0 6px rgba(0, 123, 255, 0.6);
  }

  .login-prompt {
    font-size: 12px;
    color: #666;
    font-style: italic;
    text-align: center;
  }

  .logout-btn {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #ff4444;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 0, 0, 0.5);
  }

  /* Token notification animation */
  .token-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 255, 136, 0.9);
    border: 2px solid #00ff88;
    border-radius: 8px;
    padding: 12px 20px;
    box-shadow: 0 4px 16px rgba(0, 255, 136, 0.4);
    z-index: 10000;
    animation: tokenPopup 0.5s ease-out;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #000;
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-icon {
    font-size: 20px;
  }

  .token-amount {
    font-size: 18px;
    color: #000;
  }

  @keyframes tokenPopup {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .token-notification {
    animation: tokenPopup 0.5s ease-out, fadeOut 3s ease-in 2s forwards;
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .token-balance-container {
      top: 10px;
      right: 10px;
    }

    .token-balance-card {
      min-width: 160px;
      padding: 12px;
    }

    .balance-amount {
      font-size: 20px;
    }

    .token-icon {
      font-size: 28px;
    }
  }
</style>
