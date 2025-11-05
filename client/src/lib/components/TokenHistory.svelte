<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { authStore } from '$lib/stores/auth';

  interface Transaction {
    id: string;
    type: 'mint' | 'transfer' | 'receive' | 'convert';
    amount: number;
    timestamp: string;
    txSignature?: string;
    description?: string;
    particleLocation?: [number, number];
  }

  let transactions: Transaction[] = [];
  let loading = false;
  let error = '';
  let isOpen = false;

  async function loadTransactionHistory() {
    if (!$authStore.tokens?.access_token) return;

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/token/history', {
        headers: {
          'Authorization': `Bearer ${$authStore.tokens.access_token}`,
        },
      });

      if (response.ok) {
        transactions = await response.json();
      } else {
        error = 'Failed to load transaction history';
      }
    } catch (err) {
      error = 'Network error loading history';
      console.error('Token history error:', err);
    } finally {
      loading = false;
    }
  }

  function toggleHistory() {
    isOpen = !isOpen;
    if (isOpen && transactions.length === 0) {
      loadTransactionHistory();
    }
  }

  function formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  function getTransactionIcon(type: string): string {
    switch (type) {
      case 'mint': return '🪙';
      case 'transfer': return '📤';
      case 'receive': return '📥';
      case 'convert': return '🔄';
      default: return '💰';
    }
  }

  function getTransactionColor(type: string): string {
    switch (type) {
      case 'mint': return '#00ff88';
      case 'transfer': return '#ff6b6b';
      case 'receive': return '#4ecdc4';
      case 'convert': return '#45b7d1';
      default: return '#888';
    }
  }

  onMount(() => {
    // Load history when component mounts if user is authenticated
    if ($authStore.tokens?.access_token) {
      loadTransactionHistory();
    }
  });

  $: if ($authStore.tokens?.access_token && !transactions.length) {
    // Reload when user logs in
    loadTransactionHistory();
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="token-history-container">
  <button
    class="history-toggle"
    class:open={isOpen}
    on:click={toggleHistory}
    aria-label="Toggle transaction history"
  >
    <span class="toggle-icon">📋</span>
    <span class="toggle-text">History</span>
    {#if transactions.length > 0}
      <span class="transaction-count">{transactions.length}</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="history-panel" transition:slide={{ duration: 300 }}>
      <div class="panel-header">
        <h3>Transaction History</h3>
        <button class="refresh-btn" on:click={loadTransactionHistory} disabled={loading}>
          🔄
        </button>
      </div>

      <div class="panel-content">
        {#if loading}
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading transactions...</span>
          </div>
        {:else if error}
          <div class="error-state">
            <span class="error-icon">⚠️</span>
            <span>{error}</span>
            <button class="retry-btn" on:click={loadTransactionHistory}>
              Retry
            </button>
          </div>
        {:else if transactions.length === 0}
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <span>No transactions yet</span>
            <p>Start playing to earn your first tokens!</p>
          </div>
        {:else}
          <div class="transactions-list">
            {#each transactions as tx}
              <div class="transaction-item type-{tx.type}">
                <div class="transaction-icon" style="color: {getTransactionColor(tx.type)}">
                  {getTransactionIcon(tx.type)}
                </div>

                <div class="transaction-details">
                  <div class="transaction-main">
                    <div class="transaction-type">
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      {#if tx.particleLocation}
                        <span class="location-badge">
                          📍 {tx.particleLocation[0]}, {tx.particleLocation[1]}
                        </span>
                      {/if}
                    </div>
                    <div class="transaction-amount" style="color: {getTransactionColor(tx.type)}">
                      {tx.type === 'transfer' ? '-' : '+'}{tx.amount}
                    </div>
                  </div>

                  <div class="transaction-meta">
                    <div class="transaction-time">
                      {formatTimeAgo(tx.timestamp)}
                    </div>
                    {#if tx.description}
                      <div class="transaction-desc">
                        {tx.description}
                      </div>
                    {/if}
                  </div>

                  {#if tx.txSignature}
                    <div class="transaction-link">
                      <a
                        href="https://solscan.io/tx/{tx.txSignature}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="solscan-link"
                      >
                        View on Solscan ↗
                      </a>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .token-history-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: 'Courier New', monospace;
  }

  .history-toggle {
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid #333;
    border-radius: 8px;
    padding: 10px 16px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: bold;
  }

  .history-toggle:hover {
    border-color: #666;
    background: rgba(0, 0, 0, 0.9);
  }

  .history-toggle.open {
    border-color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .toggle-icon {
    font-size: 16px;
  }

  .transaction-count {
    background: #00ff88;
    color: #000;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: bold;
    min-width: 16px;
    text-align: center;
  }

  .history-panel {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 400px;
    max-height: 500px;
    background: rgba(0, 0, 0, 0.95);
    border: 2px solid #333;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    background: rgba(255, 255, 255, 0.05);
  }

  .panel-header h3 {
    margin: 0;
    color: #00ff88;
    font-size: 16px;
    font-weight: bold;
  }

  .refresh-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .panel-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #ccc;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #333;
    border-top: 2px solid #00ff88;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state {
    color: #ff6b6b;
  }

  .error-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .retry-btn {
    margin-top: 12px;
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid #ff6b6b;
    color: #ff6b6b;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background: rgba(255, 107, 107, 0.3);
  }

  .empty-state {
    color: #888;
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .empty-state p {
    font-size: 12px;
    margin: 8px 0 0 0;
    opacity: 0.7;
  }

  .transactions-list {
    padding: 8px 0;
  }

  .transaction-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s ease;
  }

  .transaction-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .transaction-icon {
    font-size: 20px;
    margin-top: 2px;
  }

  .transaction-details {
    flex: 1;
    min-width: 0; /* Allow text to wrap */
  }

  .transaction-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
  }

  .transaction-type {
    font-size: 14px;
    font-weight: bold;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .location-badge {
    background: rgba(0, 255, 136, 0.2);
    color: #00ff88;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: normal;
  }

  .transaction-amount {
    font-size: 16px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  .transaction-meta {
    margin-top: 4px;
  }

  .transaction-time {
    font-size: 11px;
    color: #888;
    margin-bottom: 2px;
  }

  .transaction-desc {
    font-size: 11px;
    color: #aaa;
    line-height: 1.3;
  }

  .transaction-link {
    margin-top: 6px;
  }

  .solscan-link {
    font-size: 11px;
    color: #00ff88;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(0, 255, 136, 0.1);
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .solscan-link:hover {
    background: rgba(0, 255, 136, 0.2);
    text-decoration: underline;
  }

  /* Type-specific styling */
  .type-mint {
    border-left: 3px solid #00ff88;
  }

  .type-transfer {
    border-left: 3px solid #ff6b6b;
  }

  .type-receive {
    border-left: 3px solid #4ecdc4;
  }

  .type-convert {
    border-left: 3px solid #45b7d1;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .token-history-container {
      bottom: 10px;
      right: 10px;
    }

    .history-panel {
      width: calc(100vw - 40px);
      max-width: 350px;
      right: -10px;
    }

    .panel-header {
      padding: 12px 16px;
    }

    .transaction-item {
      padding: 10px 16px;
      gap: 10px;
    }

    .transaction-icon {
      font-size: 18px;
    }

    .transaction-amount {
      font-size: 14px;
    }
  }

  /* Animation for slide transition */
  .history-panel {
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
