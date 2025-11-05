<script lang="ts">
    import { pocketbaseService } from '$lib/services/pocketbaseService';
    import { onMount } from 'svelte';

    let currentUser = null;
    let isAuthenticated = false;
    let userStats = {
        totalWallets: 0,
        connectedWallets: 0,
        lastLogin: null
    };

    // Load user stats
    async function loadUserStats() {
        if (!isAuthenticated) return;

        try {
            const wallets = await pocketbaseService.getUserWallets();
            const stats = await pocketbaseService.getWalletStats();

            userStats = {
                totalWallets: wallets.length,
                connectedWallets: wallets.filter(w => w.is_connected).length,
                lastLogin: new Date().toISOString()
            };

            if (stats) {
                userStats = { ...userStats, ...stats };
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    // Listen for authentication events
    function handleAuthSuccess() {
        console.log('AccountSummary: User authenticated');
        currentUser = pocketbaseService.getCurrentUser();
        isAuthenticated = pocketbaseService.isAuthenticated();
        loadUserStats();
    }

    function handleAuthLogout() {
        console.log('AccountSummary: User logged out');
        currentUser = null;
        isAuthenticated = false;
        userStats = {
            totalWallets: 0,
            connectedWallets: 0,
            lastLogin: null
        };
    }

    onMount(() => {
        // Setup event listeners
        window.addEventListener('pocketbase-auth-success', handleAuthSuccess);
        window.addEventListener('pocketbase-auth-logout', handleAuthLogout);

        // Initial load
        currentUser = pocketbaseService.getCurrentUser();
        isAuthenticated = pocketbaseService.isAuthenticated();
        if (isAuthenticated) {
            loadUserStats();
        }

        return () => {
            // Cleanup
            window.removeEventListener('pocketbase-auth-success', handleAuthSuccess);
            window.removeEventListener('pocketbase-auth-logout', handleAuthLogout);
        };
    });

    // Reactive statements
    $: if (pocketbaseService.isAuthenticated()) {
        currentUser = pocketbaseService.getCurrentUser();
        isAuthenticated = true;
        loadUserStats();
    } else {
        isAuthenticated = false;
        currentUser = null;
    }

    function formatDate(dateString) {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function logout() {
        pocketbaseService.logout();
    }
</script>

<div class="account-summary">
    {#if isAuthenticated && currentUser}
        <!-- Authenticated State -->
        <div class="account-card">
            <div class="account-header">
                <div class="user-info">
                    <div class="user-avatar">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <div class="user-name">
                            {currentUser.name || currentUser.email.split('@')[0]}
                        </div>
                        <div class="user-email">
                            {currentUser.email}
                        </div>
                        <div class="user-status">
                            <span class="status-indicator online"></span>
                            Online
                        </div>
                    </div>
                </div>
                <div class="account-actions">
                    <button class="logout-btn" on:click={logout} title="Logout">
                        🚪
                    </button>
                </div>
            </div>

            <div class="account-stats">
                <div class="stat-item">
                    <div class="stat-value">{userStats.totalWallets}</div>
                    <div class="stat-label">Total Wallets</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{userStats.connectedWallets}</div>
                    <div class="stat-label">Connected</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">
                        {userStats.lastLogin ? formatDate(userStats.lastLogin).split(' ')[0] : 'Today'}
                    </div>
                    <div class="stat-label">Last Active</div>
                </div>
            </div>

            <div class="account-features">
                <div class="feature-item">
                    <span class="feature-icon">🔐</span>
                    <span class="feature-text">Secure Authentication</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">💾</span>
                    <span class="feature-text">Cloud Wallet Storage</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">🔄</span>
                    <span class="feature-text">Auto-sync</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">📊</span>
                    <span class="feature-text">Portfolio Tracking</span>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
            <div
                class="action-item"
                role="button"
                tabindex="0"
                on:click={() => window.dispatchEvent(new CustomEvent('create-wallet'))}
                on:keydown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('create-wallet'))}
            >
                <span class="action-icon">➕</span>
                <span class="action-text">Create Wallet</span>
            </div>
            <div
                class="action-item"
                role="button"
                tabindex="0"
                on:click={() => window.dispatchEvent(new CustomEvent('import-wallet'))}
                on:keydown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('import-wallet'))}
            >
                <span class="action-icon">📥</span>
                <span class="action-text">Import Wallet</span>
            </div>
            <div
                class="action-item"
                role="button"
                tabindex="0"
                on:click={() => window.dispatchEvent(new CustomEvent('view-settings'))}
                on:keydown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('view-settings'))}
            >
                <span class="action-icon">⚙️</span>
                <span class="action-text">Settings</span>
            </div>
        </div>
    {:else}
        <!-- Not Authenticated State -->
        <div class="auth-prompt-card">
            <div class="auth-icon">👤</div>
            <div class="auth-title">Account Required</div>
            <div class="auth-description">
                Sign in to access your wallet portfolio and sync across devices
            </div>
            <div class="auth-benefits">
                <div class="benefit-item">
                    <span class="benefit-icon">🔐</span>
                    <span>Secure wallet storage</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📱</span>
                    <span>Cross-device sync</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💰</span>
                    <span>Portfolio tracking</span>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .account-summary {
        display: grid;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .account-card {
        background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%);
        border: 1px solid #253157;
        border-radius: 12px;
        padding: 1.5rem;
        color: #f6f8ff;
    }

    .account-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #253157;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 1;
    }

    .user-avatar {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #446bff, #6b73ff);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.2rem;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .user-details {
        flex: 1;
    }

    .user-name {
        font-size: 1.2rem;
        font-weight: 600;
        color: #f6f8ff;
        margin-bottom: 0.25rem;
    }

    .user-email {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 0.5rem;
    }

    .user-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: #2ecc71;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        background: #2ecc71;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    .account-actions {
        display: flex;
        gap: 0.5rem;
    }

    .logout-btn {
        background: rgba(255, 71, 87, 0.2);
        color: #ff4757;
        border: 1px solid rgba(255, 71, 87, 0.3);
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

    .logout-btn:hover {
        background: rgba(255, 71, 87, 0.3);
        transform: scale(1.05);
    }

    .account-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .stat-item {
        text-align: center;
        padding: 1rem;
        background: rgba(68, 107, 255, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(68, 107, 255, 0.2);
    }

    .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #446bff;
        margin-bottom: 0.25rem;
    }

    .stat-label {
        font-size: 0.8rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .account-features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
    }

    .feature-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(46, 204, 113, 0.1);
        border: 1px solid rgba(46, 204, 113, 0.2);
        border-radius: 6px;
        font-size: 0.9rem;
        color: #2ecc71;
    }

    .feature-icon {
        font-size: 1.1rem;
    }

    .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.75rem;
    }

    .action-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: #1a1f2e;
        border: 1px solid #253157;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        color: #f6f8ff;
    }

    .action-item:hover {
        background: #253157;
        border-color: #446bff;
        transform: translateY(-2px);
    }

    .action-icon {
        font-size: 1.2rem;
    }

    .action-text {
        font-weight: 500;
    }

    .auth-prompt-card {
        background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%);
        border: 1px solid #253157;
        border-radius: 12px;
        padding: 2rem;
        text-align: center;
        color: #f6f8ff;
    }

    .auth-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.7;
    }

    .auth-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: #446bff;
        margin-bottom: 0.5rem;
    }

    .auth-description {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 1.5rem;
        line-height: 1.5;
    }

    .auth-benefits {
        display: grid;
        gap: 0.75rem;
    }

    .benefit-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: rgba(68, 107, 255, 0.1);
        border: 1px solid rgba(68, 107, 255, 0.2);
        border-radius: 6px;
        font-size: 0.9rem;
        color: #446bff;
    }

    .benefit-icon {
        font-size: 1.1rem;
    }

    @keyframes pulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }

    @media (max-width: 768px) {
        .account-summary {
            gap: 1rem;
        }

        .account-card {
            padding: 1rem;
        }

        .account-header {
            flex-direction: column;
            gap: 1rem;
        }

        .user-info {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
        }

        .account-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }

        .account-features {
            grid-template-columns: 1fr;
        }

        .quick-actions {
            grid-template-columns: 1fr;
        }
    }
</style>
