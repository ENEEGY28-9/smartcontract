import { writable } from 'svelte/store';
import { PublicKey } from '@solana/web3.js';
import { WalletService } from '$lib/services/walletService';

// Interface for wallet state
interface WalletState {
    connected: boolean;
    publicKey: PublicKey | null;
    balance: number;
    isConnecting: boolean;
    error: string | null;
    wallet: any | null;
}

function createWalletStore() {
    const { subscribe, set, update } = writable<WalletState>({
        connected: false,
        publicKey: null,
        balance: 0,
        isConnecting: false,
        error: null,
        wallet: null,
    });

    let mockMode = false;

    return {
        subscribe,

        // Mock mode controls
        enableMockMode() {
            mockMode = true;
            console.log('🧪 Mock wallet mode enabled');
            return this.connect();
        },

        disableMockMode() {
            mockMode = false;
            console.log('🧪 Mock wallet mode disabled');
            this.disconnect();
        },

        isMockMode() {
            return mockMode;
        },

        getMockWallet() {
            // Return inline mock wallet for comparison
            return {
                isConnected: true,
                publicKey: { toString: () => '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB' },
                connect: async () => ({ publicKey: this.publicKey }),
                disconnect: async () => {},
                signMessage: async (message) => new Uint8Array([1, 2, 3, 4, 5])
            };
        },

        detectWallet() {
            console.log('🔍 Detecting wallet...');

            // Method 1: Check if mock mode is enabled
            if (mockMode) {
                console.log('🧪 Mock wallet mode enabled');
                // Create mock wallet inline to avoid circular dependency
                const inlineMockWallet = {
                    isConnected: true,
                    publicKey: { toString: () => '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB' },
                    connect: async () => ({ publicKey: inlineMockWallet.publicKey }),
                    disconnect: async () => { inlineMockWallet.isConnected = false; },
                    signMessage: async (message) => new Uint8Array([1, 2, 3, 4, 5])
                };
                return {
                    available: true,
                    method: 'mock-wallet',
                    wallet: inlineMockWallet,
                    message: 'Mock wallet enabled for testing'
                };
            }

            // Method 2: Standard window.solana
            if (window.solana) {
                console.log('✅ Standard wallet detection: window.solana found');
                return {
                    available: true,
                    method: 'window.solana',
                    wallet: window.solana,
                    message: 'Phantom wallet detected successfully'
                };
            }

            // Method 3: Check for Phantom extension
            if (window.phantom) {
                console.log('✅ Phantom extension detection: window.phantom found');
                return {
                    available: true,
                    method: 'window.phantom',
                    wallet: window.phantom,
                    message: 'Phantom wallet detected via window.phantom'
                };
            }

            // Method 4: Check for Sollet wallet
            if (window.sollet) {
                console.log('✅ Sollet wallet detection: window.sollet found');
                return {
                    available: true,
                    method: 'window.sollet',
                    wallet: window.sollet,
                    message: 'Sollet wallet detected'
                };
            }

            // Method 5: Check if Phantom is installed but not ready
            const phantomCheck = this.checkPhantomInstallation();
            if (phantomCheck.installed) {
                console.log('⚠️ Phantom installed but not ready:', phantomCheck.message);
                return {
                    available: false,
                    method: 'phantom-installed',
                    message: phantomCheck.message
                };
            }

            // Method 6: Check for other Solana wallets
            const otherWallets = this.checkOtherWallets();
            if (otherWallets.found) {
                console.log('✅ Other wallet detected:', otherWallets);
                return otherWallets;
            }

            console.log('❌ No wallet detected');
            return {
                available: false,
                method: 'none',
                message: 'No wallet detected. You can enable mock mode for testing or install Phantom wallet from https://phantom.app/'
            };
        },

        checkPhantomInstallation() {
            // Check if Phantom extension is installed
            if (typeof window !== 'undefined') {
                // Check for common Phantom indicators
                const hasPhantomIcon = document.querySelector('[data-phantom]');
                const hasPhantomClass = document.querySelector('.phantom');
                const hasPhantomMeta = document.querySelector('meta[name="phantom"]');

                if (hasPhantomIcon || hasPhantomClass || hasPhantomMeta) {
                    return {
                        installed: true,
                        ready: false,
                        message: 'Phantom extension detected but not ready. Please make sure Phantom is enabled and unlocked.'
                    };
                }

                // Check browser extensions
                if (window.chrome && window.chrome.extensions) {
                    // This is a simplified check - in real implementation you'd check installed extensions
                    return {
                        installed: false,
                        message: 'Phantom extension not detected in browser'
                    };
                }
            }

            return {
                installed: false,
                message: 'Please install Phantom wallet extension'
            };
        },

        checkOtherWallets() {
            // Check for other Solana wallets
            const walletChecks = [
                { name: 'Solflare', check: () => window.solflare },
                { name: 'Torpedo', check: () => window.torpedo },
                { name: 'Coin98', check: () => window.coin98 },
                { name: 'MathWallet', check: () => window.mathwallet }
            ];

            for (const wallet of walletChecks) {
                if (wallet.check()) {
                    return {
                        available: true,
                        method: wallet.name,
                        wallet: wallet.check(),
                        message: `${wallet.name} wallet detected`
                    };
                }
            }

            return { found: false };
        },

        async connect() {
            console.log('🔗 Wallet connect initiated');
            update(state => ({ ...state, isConnecting: true, error: null }));

            try {
                // Enhanced wallet detection
                if (typeof window === 'undefined') {
                    throw new Error('Wallet can only be used in browser environment');
                }

                // Multiple detection methods
                const walletDetected = this.detectWallet();
                console.log('🔍 Wallet detection result:', walletDetected);

                if (!walletDetected.available) {
                    throw new Error(`Phantom wallet not found. ${walletDetected.message}`);
                }

                console.log('✅ Wallet detected:', walletDetected);

                // Use detected wallet
                const wallet = walletDetected.wallet;

                // Check if already connected
                if (wallet.isConnected) {
                    console.log('🔄 Wallet already connected');
                    const publicKey = new PublicKey(wallet.publicKey.toString());
                    const balance = await WalletService.getBalance(publicKey.toString());

                    set({
                        connected: true,
                        publicKey,
                        balance,
                        isConnecting: false,
                        error: null,
                        wallet: { ...wallet, isPhantom: true, isCustom: false },
                    });

                    return { success: true };
                }

                // Connect to wallet
                console.log('🔌 Connecting to wallet...');
                const response = await wallet.connect();
                console.log('✅ Wallet connection response:', response);

                if (!response.publicKey) {
                    throw new Error('No public key received from wallet');
                }

                const publicKey = new PublicKey(response.publicKey.toString());
                const balance = await WalletService.getBalance(publicKey.toString());

                console.log('✅ Wallet connected successfully:', publicKey.toString());

                set({
                    connected: true,
                    publicKey,
                    balance,
                    isConnecting: false,
                    error: null,
                    wallet: { ...wallet, isPhantom: true, isCustom: false },
                });

                // Save connection state
                localStorage.setItem('wallet_connected', 'true');

                return { success: true };

            } catch (error) {
                console.error('❌ Wallet connection error:', error);
                update(state => ({
                    ...state,
                    isConnecting: false,
                    error: error instanceof Error ? error.message : 'Connection failed'
                }));
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        },

        async disconnect() {
            console.log('🔌 Wallet disconnect initiated');

            if (typeof window !== 'undefined' && window.solana) {
                try {
                    await window.solana.disconnect();
                    console.log('✅ Wallet disconnected successfully');
                } catch (error) {
                    console.error('❌ Error disconnecting:', error);
                }
            }

            // Clear connection state
            localStorage.removeItem('wallet_connected');

            set({
                connected: false,
                publicKey: null,
                balance: 0,
                isConnecting: false,
                error: null,
                wallet: null,
            });
        },

        async refreshBalance() {
            update(async state => {
                if (state.publicKey && state.connected) {
                    try {
                        const balance = await WalletService.getBalance(state.publicKey.toString());
                        return { ...state, balance };
                    } catch (error) {
                        return { ...state, error: 'Failed to refresh balance' };
                    }
                }
                return state;
            });
        },

        async signMessage(message: string) {
            if (typeof window !== 'undefined' && window.solana) {
                const encodedMessage = new TextEncoder().encode(message);
                return await window.solana.signMessage(encodedMessage);
            }
            throw new Error('Wallet not connected');
        }
    };
}

// Mock wallet reference for UI comparison
const mockWallet = {
    publicKey: { toString: () => '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB' },
    isConnected: true
};

// Export mock wallet reference for UI comparison
export { mockWallet };

export const walletStore = createWalletStore();

// Auto-connect if wallet was previously connected (improved with user intent detection)
if (typeof window !== 'undefined') {
    // Function to check if user wants to use custom wallet
    const checkUserIntent = () => {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('custom') === 'true' || urlParams.get('mode') === 'custom') {
            console.log('🚫 Auto-connect disabled - custom mode detected in URL');
            return true;
        }

        // Check if custom key input exists and has value
        const customKeyInput = document.getElementById('custom-key-input');
        if (customKeyInput && customKeyInput.value && customKeyInput.value.trim()) {
            console.log('🚫 Auto-connect disabled - custom key detected:', customKeyInput.value.slice(0, 8) + '...');
            return true;
        }

        // Check if there's a custom wallet preference in localStorage
        const customWalletPreference = localStorage.getItem('wallet_custom_preference');
        if (customWalletPreference === 'true') {
            console.log('🚫 Auto-connect disabled - custom wallet preference detected');
            return true;
        }

        // Check if user clicked on custom wallet elements
        const customElements = document.querySelectorAll('[data-wallet-mode="custom"]');
        for (const element of customElements) {
            if (element.style.display !== 'none' && element.offsetParent !== null) {
                console.log('🚫 Auto-connect disabled - custom wallet UI detected');
                return true;
            }
        }

        return false;
    };

    // Wait for DOM to be ready and wallet to be available
    const autoConnect = () => {
        const wasConnected = localStorage.getItem('wallet_connected') === 'true';

        // Check user intent before auto-connecting
        if (checkUserIntent()) {
            console.log('🚫 Auto-connect cancelled - user wants custom wallet');
            return;
        }

        if (wasConnected && window.solana && window.solana.isConnected) {
            console.log('🔄 Auto-connecting wallet...');
            // Update state to reflect current connection
            const publicKey = new PublicKey(window.solana.publicKey.toString());
            WalletService.getBalance(publicKey.toString()).then(balance => {
                set({
                    connected: true,
                    publicKey,
                    balance,
                    isConnecting: false,
                    error: null,
                    wallet: { ...window.solana, isPhantom: true, isCustom: false },
                });
            }).catch(error => {
                console.error('❌ Auto-connect balance fetch failed:', error);
                // Still set connected state even if balance fails
                set({
                    connected: true,
                    publicKey,
                    balance: 0,
                    isConnecting: false,
                    error: null,
                    wallet: { ...window.solana, isPhantom: true, isCustom: false },
                });
            });
        }
    };

    // Wait for wallet to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(autoConnect, 500);
        });
    } else {
        setTimeout(autoConnect, 500);
    }
}

// Wallet event handling
function setupWalletEventListeners() {
    if (typeof window !== 'undefined' && window.solana) {
        // Listen for connection events
        window.solana.on('connect', () => {
            console.log('🔗 Wallet connected event received');
            walletStore.connect();
        });

        // Listen for disconnection events
        window.solana.on('disconnect', () => {
            console.log('🔌 Wallet disconnected event received');
            walletStore.disconnect();
        });

        // Listen for account changes
        window.solana.on('accountChanged', (publicKey) => {
            console.log('🔄 Wallet account changed:', publicKey?.toString());
            if (publicKey) {
                walletStore.connect();
            }
        });
    }
}

// Declare Phantom wallet types for TypeScript
declare global {
    interface Window {
        solana?: {
            connect(): Promise<{ publicKey: { toString(): string } }>;
            disconnect(): Promise<void>;
            signMessage(message: Uint8Array): Promise<Uint8Array>;
            publicKey: { toString(): string };
            isConnected: boolean;
            on(event: string, callback: Function): void;
        };
    }
}

// Setup event listeners when wallet is available
if (typeof window !== 'undefined') {
    // Setup listeners when wallet becomes available
    const setupWhenReady = () => {
        if (window.solana) {
            setupWalletEventListeners();
        } else {
            // Check again in 1 second
            setTimeout(setupWhenReady, 1000);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupWhenReady);
    } else {
        setTimeout(setupWhenReady, 500);
    }
}
