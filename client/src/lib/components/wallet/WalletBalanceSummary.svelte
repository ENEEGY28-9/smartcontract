<script lang="ts">
    import { pocketbaseService, type WalletData } from '$lib/services/pocketbaseService';
    import { onMount, createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    // Reactive variables for wallet data
    let userWallets: WalletData[] = [];
    let isLoading = false;
    let error = '';
    let totalBalance = {
        ethereum: 0,
        solana: 0,
        sui: 0,
        total: 0
    };
    let connectedWallets = 0;
    let totalWallets = 0;

    // Load user wallets and calculate summary
    async function loadWalletSummary() {
        if (!pocketbaseService.isAuthenticated()) {
            resetSummary();
            return;
        }

        isLoading = true;
        error = '';

        try {
            userWallets = await pocketbaseService.getUserWallets();
            calculateBalanceSummary();
        } catch (err) {
            console.error('Error loading wallet summary:', err);
            error = 'Failed to load wallet data';
            resetSummary();
        } finally {
            isLoading = false;
        }
    }

    function calculateBalanceSummary() {
        totalBalance = {
            ethereum: 0,
            solana: 0,
            sui: 0,
            total: 0
        };
        connectedWallets = 0;
        totalWallets = userWallets.length;

        userWallets.forEach(wallet => {
            if (wallet.balance && wallet.is_connected) {
                const balance = parseFloat(wallet.balance.toString());

                switch (wallet.network) {
                    case 'ethereum':
                        totalBalance.ethereum += balance;
                        break;
                    case 'solana':
                        totalBalance.solana += balance;
                        break;
                    case 'sui':
                        totalBalance.sui += balance;
                        break;
                }

                connectedWallets++;
            }
        });

        // Calculate total in approximate USD (using rough estimates)
        totalBalance.total = totalBalance.ethereum * 2500 + // ~$2500 per ETH
                           totalBalance.solana * 150 +    // ~$150 per SOL
                           totalBalance.sui * 1.2;  // ~$1.2 per SUI

        console.log('Wallet summary calculated:', totalBalance);
    }

    function resetSummary() {
        userWallets = [];
        totalBalance = {
            ethereum: 0,
            solana: 0,
            sui: 0,
            total: 0
        };
        connectedWallets = 0;
        totalWallets = 0;
    }

    // Listen for authentication events
    function handleAuthSuccess() {
        console.log('User authenticated, loading wallet summary...');
        loadWalletSummary();
        dispatch('auth-success');
    }

    function handleAuthLogout() {
        console.log('User logged out, clearing wallet summary...');
        resetSummary();
        dispatch('auth-logout');
    }

    // Auto-refresh balance every 30 seconds for connected wallets
    let refreshInterval: any;

    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        refreshInterval = setInterval(async () => {
            if (pocketbaseService.isAuthenticated() && connectedWallets > 0) {
                console.log('Auto-refreshing wallet balances...');
                await loadWalletSummary();
            }
        }, 30000); // 30 seconds
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = 0;
        }
    }

    onMount(() => {
        // Setup event listeners
        window.addEventListener('pocketbase-auth-success', handleAuthSuccess);
        window.addEventListener('pocketbase-auth-logout', handleAuthLogout);

        // Initial load
        loadWalletSummary();

        // Start auto-refresh if authenticated
        if (pocketbaseService.isAuthenticated()) {
            startAutoRefresh();
        }

        return () => {
            // Cleanup
            window.removeEventListener('pocketbase-auth-success', handleAuthSuccess);
            window.removeEventListener('pocketbase-auth-logout', handleAuthLogout);
            stopAutoRefresh();
        };
    });

    // Reactive statements
    $: if (pocketbaseService.isAuthenticated()) {
        loadWalletSummary();
        startAutoRefresh();
    } else {
        resetSummary();
        stopAutoRefresh();
    }

    // Format currency values
    function formatCurrency(value: number): string {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toFixed(2)}`;
    }

    function formatCrypto(value: number, network: string): string {
        const decimals = network === 'sui' ? 8 : 4;
        return `${value.toFixed(decimals)} ${network === 'ethereum' ? 'ETH' : network === 'solana' ? 'SOL' : 'SUI'}`;
    }

    // Manual refresh function
    function manualRefresh() {
        loadWalletSummary();
    }
</script>

<div class="wallet-balance-summary">
    <div class="summary-header">
        <h3>Wallet Portfolio</h3>
        <div class="summary-actions">
            <button
                class="refresh-btn"
                on:click={manualRefresh}
                disabled={isLoading}
                title="Refresh balances"
            >
                {#if isLoading}
                    🔄
                {:else}
                    ↻
                {/if}
            </button>
        </div>
    </div>

    {#if !pocketbaseService.isAuthenticated()}
        <div class="auth-prompt">
            <p>💡 Please log in to view your wallet portfolio</p>
        </div>
    {:else if error}
        <div class="error-message">
            <p>❌ {error}</p>
        </div>
    {:else if totalWallets === 0}
        <div class="empty-state">
            <p>📝 No wallets found. Connect or create wallets to see your portfolio.</p>
        </div>
    {:else}
        <!-- Total Balance Card -->
        <div class="total-balance-card">
            <div class="total-label">Total Portfolio Value</div>
            <div class="total-amount">
                {formatCurrency(totalBalance.total)}
            </div>
            <div class="total-details">
                Across {totalWallets} wallet{totalWallets !== 1 ? 's' : ''} • {connectedWallets} connected
            </div>
        </div>

        <!-- Network Breakdown -->
        <div class="network-breakdown">
            {#if totalBalance.ethereum > 0}
                <div class="network-card ethereum">
                    <div class="network-header">
                        <span class="network-name">Ethereum</span>
                        <span class="network-icon">🔷</span>
                    </div>
                    <div class="network-balance">
                        {formatCrypto(totalBalance.ethereum, 'ethereum')}
                    </div>
                    <div class="network-value">
                        ≈ {formatCurrency(totalBalance.ethereum * 2500)}
                    </div>
                </div>
            {/if}

            {#if totalBalance.solana > 0}
                <div class="network-card solana">
                    <div class="network-header">
                        <span class="network-name">Solana</span>
                        <span class="network-icon">🟣</span>
                    </div>
                    <div class="network-balance">
                        {formatCrypto(totalBalance.solana, 'solana')}
                    </div>
                    <div class="network-value">
                        ≈ {formatCurrency(totalBalance.solana * 150)}
                    </div>
                </div>
            {/if}

            {#if totalBalance.sui > 0}
                <div class="network-card sui">
                    <div class="network-header">
                        <span class="network-name">SUI</span>
                        <span class="network-icon">🔵</span>
                    </div>
                    <div class="network-balance">
                        {formatCrypto(totalBalance.sui, 'sui')}
                    </div>
                    <div class="network-value">
                        ≈ {formatCurrency(totalBalance.sui * 1.2)}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Wallet List Summary -->
        <div class="wallet-list-summary">
            <div class="wallet-list-header">
                <span>Connected Wallets ({connectedWallets})</span>
            </div>
            {#if userWallets.filter(w => w.is_connected).length === 0}
                <div class="no-connected-wallets">
                    <p>No connected wallets. Connect to wallets to see live balances.</p>
                </div>
            {:else}
                <div class="connected-wallets-list">
                    {#each userWallets.filter(w => w.is_connected) as wallet (wallet.id)}
                        <div class="wallet-item">
                            <div class="wallet-info">
                                <div class="wallet-address">
                                    {wallet.network === 'ethereum'
                                        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                                        : wallet.network === 'solana'
                                        ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}`
                                        : `${wallet.address.slice(0, 10)}...${wallet.address.slice(-10)}`
                                    }
                                </div>
                                <div class="wallet-type">
                                    {wallet.wallet_type} • {wallet.network}
                                </div>
                            </div>
                            <div class="wallet-balance">
                                {#if wallet.balance}
                                    <div class="balance-amount">
                                        {parseFloat(wallet.balance.toString()).toFixed(wallet.network === 'sui' ? 8 : 4)}
                                        <span class="balance-symbol">
                                            {wallet.network === 'ethereum' ? 'ETH' : wallet.network === 'solana' ? 'SOL' : 'SUI'}
                                        </span>
                                    </div>
                                {:else}
                                    <div class="balance-loading">Loading...</div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Auto-refresh indicator -->
        {#if connectedWallets > 0}
            <div class="auto-refresh-indicator">
                <span class="refresh-status">🔄 Auto-refresh: 30s</span>
                <span class="last-updated">
                    Last updated: {new Date().toLocaleTimeString()}
                </span>
            </div>
        {/if}
    {/if}
</div>

<style>
    .wallet-balance-summary {
        background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%);
        border: 1px solid #253157;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        color: #f6f8ff;
    }

    .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #253157;
    }

    .summary-header h3 {
        margin: 0;
        color: #446bff;
        font-size: 1.3rem;
    }

    .summary-actions {
        display: flex;
        gap: 0.5rem;
    }

    .refresh-btn {
        background: #446bff;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem;
        cursor: pointer;
        font-size: 1.1rem;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
        background: #6b73ff;
        transform: rotate(180deg);
    }

    .refresh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .total-balance-card {
        background: linear-gradient(135deg, #446bff 0%, #6b73ff 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 20px rgba(68, 107, 255, 0.3);
    }

    .total-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-bottom: 0.5rem;
    }

    .total-amount {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .total-details {
        font-size: 0.8rem;
        opacity: 0.8;
    }

    .network-breakdown {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .network-card {
        background: #0f1629;
        border: 1px solid #253157;
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
    }

    .network-card.ethereum {
        border-top: 3px solid #446bff;
    }

    .network-card.solana {
        border-top: 3px solid #9945ff;
    }

    .network-card.sui {
        border-top: 3px solid #4da2ff;
    }

    .network-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .network-name {
        font-weight: 600;
        font-size: 1rem;
    }

    .network-icon {
        font-size: 1.2rem;
    }

    .network-balance {
        font-size: 1.3rem;
        font-weight: bold;
        color: #2ecc71;
        margin-bottom: 0.25rem;
    }

    .network-value {
        font-size: 0.8rem;
        color: #888;
    }

    .wallet-list-summary {
        background: #0f1629;
        border: 1px solid #253157;
        border-radius: 8px;
        padding: 1rem;
    }

    .wallet-list-header {
        font-weight: 600;
        margin-bottom: 1rem;
        color: #446bff;
        font-size: 1.1rem;
    }

    .connected-wallets-list {
        display: grid;
        gap: 0.75rem;
    }

    .wallet-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #1a1f2e;
        border-radius: 6px;
        border: 1px solid #253157;
    }

    .wallet-info {
        flex: 1;
    }

    .wallet-address {
        font-family: monospace;
        font-size: 0.9rem;
        color: #feca57;
        margin-bottom: 0.25rem;
    }

    .wallet-type {
        font-size: 0.8rem;
        color: #888;
    }

    .wallet-balance {
        text-align: right;
    }

    .balance-amount {
        font-weight: 600;
        color: #2ecc71;
        font-size: 1rem;
    }

    .balance-symbol {
        font-size: 0.8rem;
        color: #888;
        margin-left: 0.25rem;
    }

    .balance-loading {
        color: #888;
        font-style: italic;
    }

    .auto-refresh-indicator {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #253157;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: #888;
    }

    .auth-prompt, .error-message, .empty-state, .no-connected-wallets {
        text-align: center;
        padding: 2rem;
        background: rgba(68, 107, 255, 0.1);
        border: 1px solid rgba(68, 107, 255, 0.3);
        border-radius: 8px;
        margin: 1rem 0;
    }

    .auth-prompt p, .error-message p, .empty-state p, .no-connected-wallets p {
        margin: 0;
        color: #446bff;
    }

    .error-message p {
        color: #ff4757;
    }

    @media (max-width: 768px) {
        .wallet-balance-summary {
            padding: 1rem;
        }

        .network-breakdown {
            grid-template-columns: 1fr;
        }

        .total-amount {
            font-size: 2rem;
        }

        .wallet-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .wallet-balance {
            text-align: left;
        }
    }
</style>
