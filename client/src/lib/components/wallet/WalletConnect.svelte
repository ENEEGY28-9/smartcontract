<script>
    import { walletStore } from '$lib/stores/wallet';
    import { goto } from '$app/navigation';

    let walletState = {};

    walletStore.subscribe(state => {
        walletState = state;
    });

    async function connectWallet() {
        const result = await walletStore.connect();
        if (result.success) {
            // Optionally redirect to test page
            // goto('/wallet-test');
        }
    }

    async function disconnectWallet() {
        await walletStore.disconnect();
    }

    function goToWalletTest() {
        goto('/wallet-test');
    }

    function formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    function copyAddress() {
        if (walletState.publicKey) {
            navigator.clipboard.writeText(walletState.publicKey.toString());
            alert('Address copied to clipboard!');
        }
    }
</script>

<div class="wallet-container">
    {#if walletState.connected}
        <div class="wallet-connected">
            <div class="wallet-info">
                <div class="balance">{walletState.balance.toFixed(4)} SOL</div>
                <div class="address" on:click={copyAddress} on:keydown={copyAddress} role="button" tabindex="0" title="Click to copy">
                    {formatAddress(walletState.publicKey?.toString() || '')}
                </div>
            </div>
            <div class="wallet-actions">
                <button class="test-btn" on:click={goToWalletTest}>
                    🧪 Test
                </button>
                <button class="disconnect-btn" on:click={disconnectWallet}>
                    🚪
                </button>
            </div>
        </div>
    {:else}
        <div class="wallet-actions">
            <!-- Connect Wallet button removed -->
            <!-- <button class="connect-btn" on:click={connectWallet} disabled={walletState.isConnecting}>
                {#if walletState.isConnecting}
                    <span class="loading">⟳</span>
                    Connecting...
                {:else}
                    <img src="https://phantom.app/img/phantom-logo.png" alt="Phantom" class="phantom-icon" />
                    Connect Wallet
                {/if}
            </button> -->
            <!-- Test Interface button removed -->
            <!-- <button class="test-btn" on:click={goToWalletTest}>
                🧪 Test Interface
            </button> -->
        </div>
    {/if}

    {#if walletState.error}
        <div class="error-message">
            {walletState.error}
        </div>
    {/if}
</div>

<style>
    .wallet-container {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .wallet-connected {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #446bff, #6b73ff);
        border-radius: 12px;
        color: white;
        box-shadow: 0 2px 8px rgba(68, 107, 255, 0.2);
    }

    .wallet-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }

    .balance {
        font-size: 0.9rem;
        font-weight: 700;
        color: #f6f8ff;
    }

    .address {
        font-size: 0.7rem;
        opacity: 0.9;
        cursor: pointer;
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
        transition: background-color 0.2s;
        font-family: monospace;
    }

    .address:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.15);
    }

    .address:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .wallet-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .connect-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #446bff, #6b73ff);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .connect-btn:focus:not(:disabled) {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
    }

    .connect-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(68, 107, 255, 0.3);
    }

    .connect-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .phantom-icon {
        width: 16px;
        height: 16px;
    }

    .test-btn {
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .test-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
    }

    .test-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .disconnect-btn {
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }

    .disconnect-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
    }

    .disconnect-btn:hover {
        background: #ff4757;
        border-color: #ff4757;
    }

    .loading {
        animation: spin 1s linear infinite;
        display: inline-block;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .error-message {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: #ff4757;
        color: white;
        border-radius: 6px;
        font-size: 0.8rem;
        z-index: 1000;
    }

    @media (max-width: 768px) {
        .wallet-container {
            flex-direction: column;
            gap: 0.5rem;
        }

        .wallet-connected {
            padding: 0.4rem 0.8rem;
        }

        .balance {
            font-size: 0.8rem;
        }

        .address {
            font-size: 0.6rem;
        }

        .connect-btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
        }
    }
</style>
