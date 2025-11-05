<script lang="ts">
    import { onMount } from 'svelte';
    import { walletStore } from '$lib/stores/wallet';
    import { authStore } from '$lib/stores/auth';
    import { WalletService } from '$lib/services/walletService';

    let walletState = {};
    let authState = {};
    let testResults = [];
    let isTesting = false;
    let messageToSign = 'Test authentication for ENEEGY game';

    walletStore.subscribe(state => {
        walletState = state;
    });

    authStore.subscribe(state => {
        authState = state;
    });

    async function runWalletTests() {
        isTesting = true;
        testResults = [];

        try {
            const TEST_WALLET_ADDRESS = '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB';

            // Test 1: Your Wallet Address Format
            const isValidAddress = WalletService.validateAddress(TEST_WALLET_ADDRESS);
            testResults.push({
                name: 'Your Wallet Address',
                status: isValidAddress ? 'PASS' : 'FAIL',
                details: isValidAddress ?
                    `Valid: ${WalletService.formatAddress(TEST_WALLET_ADDRESS)}` :
                    'Invalid address format'
            });

            // Test 2: Network Connection
            const networkConnected = await WalletService.testConnection();
            testResults.push({
                name: 'Solana Network',
                status: networkConnected ? 'PASS' : 'INFO',
                details: networkConnected ?
                    'Connected to Solana devnet (for testing)' :
                    'Using mock data - connect to Solana network for real data'
            });

            // Test 3: Your Wallet Balance
            const walletInfo = await WalletService.getWalletInfo(TEST_WALLET_ADDRESS);
            testResults.push({
                name: 'Your Wallet Balance',
                status: walletInfo.balance >= 0 ? 'PASS' : 'FAIL',
                details: walletInfo.note ?
                    `${walletInfo.balance.toFixed(4)} SOL (${walletInfo.balanceLamports} lamports) - ${walletInfo.note}` :
                    `${walletInfo.balance.toFixed(4)} SOL (${walletInfo.balanceLamports} lamports)`
            });

            // Test 4: Your Wallet Status
            testResults.push({
                name: 'Your Wallet Status',
                status: walletInfo.isValid ? 'PASS' : 'FAIL',
                details: walletInfo.isValid ?
                    `Valid Solana address on ${walletInfo.network}` :
                    'Invalid wallet address'
            });

            // Test 5: Transaction History (mock for now)
            testResults.push({
                name: 'Transaction History',
                status: 'INFO',
                details: 'Transaction history available when wallet has activity'
            });

            // Test 6: Connected Wallet (if any)
            if (walletState.connected && walletState.publicKey) {
                testResults.push({
                    name: 'Connected Wallet',
                    status: 'PASS',
                    details: `Connected to ${walletState.publicKey.toString()}`
                });

                testResults.push({
                    name: 'Connected Balance',
                    status: 'PASS',
                    details: `${walletState.balance.toFixed(4)} SOL`
                });
            } else {
                testResults.push({
                    name: 'Connected Wallet',
                    status: 'INFO',
                    details: 'No wallet connected (click Connect Wallet)'
                });
            }

        } catch (error) {
            testResults.push({
                name: 'General Error',
                status: 'FAIL',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        isTesting = false;
    }

    async function testAuthentication() {
        if (!walletState.connected || !walletState.wallet) {
            alert('Please connect wallet first');
            return;
        }

        try {
            const signature = await walletState.wallet.signMessage(new TextEncoder().encode(messageToSign));
            testResults.push({
                name: 'Message Signing',
                status: 'PASS',
                details: `Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`
            });
        } catch (error) {
            testResults.push({
                name: 'Message Signing',
                status: 'FAIL',
                details: error instanceof Error ? error.message : 'Failed to sign message'
            });
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    }

    function formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    let debugResults = [];

    function runDebugTest() {
        debugResults = [];
        console.log('🔍 Running wallet debug test...');

        // Check basic browser info
        debugResults.push({
            name: 'Browser Environment',
            status: 'INFO',
            details: `URL: ${window.location.href} | Server: localhost:5174 | User Agent: ${navigator.userAgent.slice(0, 50)}...`
        });

        // Check wallet availability
        if (typeof window !== 'undefined' && window.solana) {
            debugResults.push({
                name: 'Phantom Wallet',
                status: 'PASS',
                details: '✅ Phantom wallet extension detected'
            });

            debugResults.push({
                name: 'Connection Status',
                status: window.solana.isConnected ? 'PASS' : 'INFO',
                details: window.solana.isConnected ? '✅ Wallet is connected' : 'ℹ️ Wallet available but not connected'
            });

            if (window.solana.publicKey) {
                debugResults.push({
                    name: 'Wallet Address',
                    status: 'PASS',
                    details: `📍 ${window.solana.publicKey.toString()}`
                });
            }
        } else {
            debugResults.push({
                name: 'Phantom Wallet',
                status: 'FAIL',
                details: '❌ Phantom wallet not found. Please install from https://phantom.app/'
            });

            // Check for alternative wallet providers
            const alternativeProviders = [];
            if (window.phantom) alternativeProviders.push('window.phantom');
            if (window.sollet) alternativeProviders.push('window.sollet');
            if (window.__PHANTOM__) alternativeProviders.push('window.__PHANTOM__');

            if (alternativeProviders.length > 0) {
                debugResults.push({
                    name: 'Alternative Providers',
                    status: 'INFO',
                    details: `Found: ${alternativeProviders.join(', ')}`
                });
            }
        }

        // Check DOM for wallet indicators
        const phantomElements = document.querySelectorAll('[data-phantom], .phantom');
        debugResults.push({
            name: 'DOM Elements',
            status: phantomElements.length > 0 ? 'PASS' : 'INFO',
            details: phantomElements.length > 0 ? `Found ${phantomElements.length} wallet-related elements` : 'No wallet elements in DOM'
        });

        console.log('Debug results:', debugResults);
    }

    onMount(() => {
        runWalletTests();

        // Debug wallet availability
        console.log('🔍 Wallet Debug Information');
        console.log('================================');
        console.log('Window object:', typeof window);
        console.log('window.solana:', typeof window.solana);
        console.log('window.phantom:', typeof window.phantom);
        console.log('Current URL:', window.location.href);
        console.log('User Agent:', navigator.userAgent);

        if (window.solana) {
            console.log('✅ Phantom wallet detected!');
            console.log('Is connected:', window.solana.isConnected);
            console.log('Public key:', window.solana.publicKey);
        } else {
            console.log('❌ Phantom wallet not found');
            console.log('Please install Phantom wallet from: https://phantom.app/');
        }
    });
</script>

<div class="wallet-test-container">
    <div class="test-header">
        <h2>🧪 Wallet Test Interface</h2>
        <p>Test your Solana wallet integration</p>
    </div>

    <!-- Connection Status -->
    <div class="status-card">
        <h3>Connection Status</h3>
        <div class="status-grid">
            <div class="status-item">
                <span class="status-label">Connected:</span>
                <span class="status-value {walletState.connected ? 'success' : 'error'}">
                    {walletState.connected ? '✅ Yes' : '❌ No'}
                </span>
            </div>

            {#if walletState.publicKey}
                <div class="status-item">
                    <span class="status-label">Address:</span>
                    <span class="status-value">
                        <code>{formatAddress(walletState.publicKey.toString())}</code>
                        <button class="copy-btn" on:click={() => copyToClipboard(walletState.publicKey.toString())}>
                            📋
                        </button>
                    </span>
                </div>
            {/if}

            {#if walletState.balance >= 0}
                <div class="status-item">
                    <span class="status-label">Balance:</span>
                    <span class="status-value success">
                        {walletState.balance.toFixed(4)} SOL
                    </span>
                </div>
            {/if}

            <div class="status-item">
                <span class="status-label">Network:</span>
                <span class="status-value success">Solana Mainnet</span>
            </div>
        </div>
    </div>

    <!-- Test Controls -->
    <div class="test-controls">
        <button class="test-btn primary" on:click={runWalletTests} disabled={isTesting}>
            {#if isTesting}
                <span class="loading">⟳</span>
                Running Tests...
            {:else}
                🔄 Run Tests
            {/if}
        </button>

        <button class="test-btn secondary" on:click={() => walletStore.connect()}>
            🔗 Connect Wallet
        </button>

        <button class="test-btn danger" on:click={() => walletStore.disconnect()}>
            🚪 Disconnect
        </button>

        <button class="test-btn secondary" on:click={runDebugTest}>
            🔍 Debug Wallet
        </button>
    </div>

    <!-- Authentication Test -->
    <div class="auth-test">
        <h3>Authentication Test</h3>
        <div class="auth-form">
            <label for="message">Message to sign:</label>
            <input
                id="message"
                type="text"
                bind:value={messageToSign}
                placeholder="Enter message to sign"
            />
            <button class="test-btn auth" on:click={testAuthentication}>
                ✍️ Sign Message
            </button>
        </div>
    </div>

    <!-- Test Results -->
    <div class="test-results">
        <h3>Test Results</h3>
        {#if testResults.length === 0}
            <p class="no-results">Click "Run Tests" to see results</p>
        {:else}
            <div class="results-list">
                {#each testResults as result}
                    <div class="result-item {result.status.toLowerCase()}">
                        <div class="result-header">
                            <span class="result-name">{result.name}</span>
                            <span class="result-status">
                                {result.status === 'PASS' ? '✅' : '❌'} {result.status}
                            </span>
                        </div>
                        <div class="result-details">{result.details}</div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Debug Results -->
    <div class="test-results">
        <h3>🔍 Debug Information</h3>
        {#if debugResults.length === 0}
            <p class="no-results">Click "Debug Wallet" to see debug information</p>
        {:else}
            <div class="results-list">
                {#each debugResults as result}
                    <div class="result-item {result.status.toLowerCase()}">
                        <div class="result-header">
                            <span class="result-name">{result.name}</span>
                            <span class="result-status">
                                {result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : 'ℹ️'} {result.status}
                            </span>
                        </div>
                        <div class="result-details">{result.details}</div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Wallet Info -->
    <div class="wallet-info">
        <h3>🎮 Your Game Wallet</h3>
        <div class="info-grid">
            <div class="info-item">
                <strong>📍 Your Wallet Address:</strong>
                <code>57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB</code>
                <button class="copy-btn small" on:click={() => copyToClipboard('57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB')}>
                    📋 Copy
                </button>
            </div>
            <div class="info-item">
                <strong>💰 Current Balance:</strong>
                <span class="balance-display">Check "Run Tests" above</span>
            </div>
            <div class="info-item">
                <strong>🔗 Network:</strong>
                <span class="success">Solana Mainnet</span>
            </div>
            <div class="info-item">
                <strong>📱 Wallet Status:</strong>
                <span class="{walletState.connected ? 'success' : 'warning'}">
                    {walletState.connected ? '✅ Connected & Ready' : '⚠️ Connect wallet to test'}
                </span>
            </div>
        </div>

        <div class="action-tips">
            <h4>💡 Quick Actions:</h4>
            <ul>
                <li><strong>1. Get SOL:</strong> <a href="https://faucet.solana.com/" target="_blank">Visit Solana Faucet</a></li>
                <li><strong>2. Connect:</strong> Click "Connect Wallet" above</li>
                <li><strong>3. Test:</strong> Run tests to verify everything works</li>
                <li><strong>4. Play:</strong> Use SOL for in-game purchases & rewards</li>
            </ul>
        </div>
    </div>
</div>

<style>
    .wallet-test-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: #1a1f2e;
        border-radius: 12px;
        color: #f6f8ff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .test-header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #2a3441;
    }

    .test-header h2 {
        color: #446bff;
        margin: 0 0 0.5rem 0;
        font-size: 1.8rem;
    }

    .test-header p {
        color: #888;
        margin: 0;
        font-size: 1rem;
    }

    .status-card {
        background: #0f1629;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid #253157;
    }

    .status-card h3 {
        margin: 0 0 1rem 0;
        color: #446bff;
        font-size: 1.2rem;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .status-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .status-label {
        font-size: 0.9rem;
        color: #888;
    }

    .status-value {
        font-weight: 600;
        font-family: monospace;
    }

    .status-value.success {
        color: #2ecc71;
    }

    .status-value.error {
        color: #ff4757;
    }

    .status-value.warning {
        color: #ffa502;
    }

    .copy-btn {
        background: none;
        border: none;
        color: #446bff;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .copy-btn:hover {
        background: #253157;
    }

    .copy-btn.small {
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
        margin-left: 0.5rem;
    }

    .balance-display {
        font-family: monospace;
        font-weight: 600;
        color: #446bff;
    }

    .test-controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
    }

    .test-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .test-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .test-btn.primary {
        background: linear-gradient(135deg, #446bff, #6b73ff);
        color: white;
    }

    .test-btn.primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(68, 107, 255, 0.3);
    }

    .test-btn.secondary {
        background: #253157;
        color: #f6f8ff;
        border: 1px solid #446bff;
    }

    .test-btn.secondary:hover:not(:disabled) {
        background: #2a3441;
    }

    .test-btn.danger {
        background: #ff4757;
        color: white;
    }

    .test-btn.danger:hover:not(:disabled) {
        background: #ff3742;
    }

    .test-btn.auth {
        background: #2ecc71;
        color: white;
    }

    .loading {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .auth-test {
        background: #0f1629;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid #253157;
    }

    .auth-test h3 {
        margin: 0 0 1rem 0;
        color: #446bff;
        font-size: 1.2rem;
    }

    .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .auth-form label {
        font-weight: 600;
        color: #f6f8ff;
    }

    .auth-form input {
        padding: 0.75rem;
        background: #253157;
        border: 1px solid #446bff;
        border-radius: 6px;
        color: #f6f8ff;
        font-size: 0.9rem;
    }

    .auth-form input:focus {
        outline: none;
        border-color: #6b73ff;
    }

    .test-results {
        background: #0f1629;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid #253157;
    }

    .test-results h3 {
        margin: 0 0 1rem 0;
        color: #446bff;
        font-size: 1.2rem;
    }

    .no-results {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 2rem;
    }

    .results-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .result-item {
        padding: 1rem;
        border-radius: 6px;
        border-left: 4px solid;
    }

    .result-item.pass {
        background: rgba(46, 204, 113, 0.1);
        border-left-color: #2ecc71;
    }

    .result-item.fail {
        background: rgba(255, 71, 87, 0.1);
        border-left-color: #ff4757;
    }

    .result-item.info {
        background: rgba(68, 107, 255, 0.1);
        border-left-color: #446bff;
    }

    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .result-name {
        font-weight: 600;
        color: #f6f8ff;
    }

    .result-status {
        font-size: 0.9rem;
        font-weight: 600;
    }

    .result-details {
        color: #ccc;
        font-size: 0.9rem;
        font-family: monospace;
        word-break: break-all;
    }

    .wallet-info {
        background: #0f1629;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #253157;
    }

    .wallet-info h3 {
        margin: 0 0 1rem 0;
        color: #446bff;
        font-size: 1.2rem;
    }

    .info-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-item strong {
        color: #f6f8ff;
        font-size: 0.9rem;
    }

    .info-item code {
        background: #253157;
        padding: 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.8rem;
        word-break: break-all;
    }

    .info-item span {
        color: #ccc;
        font-size: 0.9rem;
    }

    .action-tips {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(68, 107, 255, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(68, 107, 255, 0.3);
    }

    .action-tips h4 {
        margin: 0 0 0.75rem 0;
        color: #446bff;
        font-size: 1rem;
    }

    .action-tips ul {
        margin: 0;
        padding-left: 1.5rem;
    }

    .action-tips li {
        margin: 0.5rem 0;
        color: #f6f8ff;
        font-size: 0.9rem;
    }

    .action-tips a {
        color: #446bff;
        text-decoration: none;
        font-weight: 600;
    }

    .action-tips a:hover {
        text-decoration: underline;
    }

    @media (max-width: 768px) {
        .wallet-test-container {
            margin: 1rem;
            padding: 1rem;
        }

        .test-controls {
            flex-direction: column;
        }

        .test-btn {
            width: 100%;
            justify-content: center;
        }

        .status-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
