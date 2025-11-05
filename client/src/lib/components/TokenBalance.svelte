<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameState } from '$lib/stores/gameStore';
  import { authStore } from '$lib/stores/auth';

  let tokenBalance = 0;
  let sessionEarned = 0;
  let isConnected = false;
  let lastUpdate = Date.now();

  // Subscribe to game store
  const unsubscribeGame = gameState.subscribe(state => {
    tokenBalance = state.tokenBalance || 0;
    sessionEarned = state.sessionTokenEarned || 0;
    isConnected = state.isConnected;
    lastUpdate = Date.now();
  });

  // WebSocket connection for real-time updates
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket('ws://localhost:8080/token-updates');

      ws.onopen = () => {
        console.log('🔗 Token balance WebSocket connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'token_update' && data.userId === $authStore.user?.id) {
            // Update game store
            gameState.update(state => ({
              ...state,
              tokenBalance: data.new_balance,
              sessionTokenEarned: (state.sessionTokenEarned || 0) + data.amount
            }));

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

  // Fetch initial balance on mount
  async function fetchBalance() {
    if (!$authStore.tokens?.access_token) return;

    try {
      const response = await fetch('/api/token/balance', {
        headers: {
          'Authorization': `Bearer ${$authStore.tokens.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        gameState.update(state => ({
          ...state,
          tokenBalance: data.game_tokens || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    }
  }

  onMount(() => {
    // Fetch initial balance
    fetchBalance();

    // Connect WebSocket for real-time updates
    connectWebSocket();
  });

  onDestroy(() => {
    // Cleanup subscriptions
    unsubscribeGame();

    // Close WebSocket
    if (ws) {
      ws.close();
    }
  });

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

<div class="token-balance-container">
  <div class="token-balance-card" class:connected={isConnected}>
    <div class="balance-header">
      <div class="token-icon">🪙</div>
      <div class="balance-info">
        <div class="balance-title">Game Tokens</div>
        <div class="balance-amount">{formatNumber(tokenBalance)}</div>
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
        {getTimeAgo(lastUpdate)}
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
