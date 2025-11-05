import { writable } from 'svelte/store';
import { PublicKey } from '@solana/web3.js';
import { WalletService } from '$lib/services/walletService';

interface WalletState {
    connected: boolean;
    publicKey: PublicKey | null;
    balance: number;
    isConnecting: boolean;
    error: string | null;
    wallet: any | null;
    address: string | null;
}

function createWalletStore() {
    const { subscribe, set, update } = writable<WalletState>({
        connected: false,
        publicKey: null,
        balance: 0,
        isConnecting: false,
        error: null,
        wallet: null,
        address: null,
    });

    return {
        subscribe,

        async connect(customPublicKey: string | null = null) {
            console.log('🔗 Connecting to wallet...', customPublicKey ? `Custom key: ${customPublicKey.slice(0, 8)}...` : 'Phantom wallet');
            update(state => ({ ...state, isConnecting: true, error: null }));

            try {
                if (typeof window === 'undefined') {
                    throw new Error('Wallet can only be used in browser environment');
                }

                // If custom public key is provided, test with that instead of Phantom
                if (customPublicKey) {
                    console.log('🧪 Testing custom public key:', customPublicKey);

                    // Validate public key format
                    if (customPublicKey.length < 32 || customPublicKey.length > 44) {
                        throw new Error('Invalid public key length. Solana addresses are 32-44 characters long.');
                    }

                    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
                    if (!base58Regex.test(customPublicKey)) {
                        throw new Error('Invalid public key format. Solana addresses use alphanumeric characters only.');
                    }

                    // Test with Solana Web3.js
                    const { PublicKey, Connection } = await import('@solana/web3.js');
                    const connection = new Connection('https://api.devnet.solana.com');
                    const publicKey = new PublicKey(customPublicKey);

                    const balanceLamports = await connection.getBalance(publicKey);
                    const balance = balanceLamports / 1_000_000_000; // Convert lamports to SOL

                    console.log('✅ Custom wallet connected successfully');
                    console.log('💰 Balance:', balance, 'SOL');

                    set({
                        connected: true,
                        publicKey,
                        balance,
                        isConnecting: false,
                        error: null,
                        wallet: { publicKey, connect: async () => ({ publicKey }), isCustom: true, isPhantom: false },
                        address: customPublicKey,
                    });

                    return { success: true, isCustom: true };
                }

                // Original Phantom wallet connection logic
                // Check for wallet with retry mechanism
                let walletAttempts = 0;
                const maxWalletAttempts = 5;

                while (!window.solana && walletAttempts < maxWalletAttempts) {
                    console.log(`🔄 Checking for wallet (attempt ${walletAttempts + 1}/${maxWalletAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    walletAttempts++;
                }

                if (!window.solana) {
                    throw new Error('Phantom wallet not found. Please install Phantom wallet from https://phantom.app/');
                }

                console.log('✅ Phantom wallet detected');
                console.log('🔍 Wallet state:', {
                    isConnected: window.solana.isConnected,
                    publicKey: window.solana.publicKey?.toString(),
                    isPhantom: window.solana.isPhantom
                });

                // Wait a bit for wallet to be fully ready
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check if already connected
                if (window.solana.isConnected && window.solana.publicKey) {
                    console.log('🔄 Wallet already connected');
                    try {
                        const publicKeyString = window.solana.publicKey.toString();
                        console.log('📍 Current public key:', publicKeyString);

                        const publicKey = new PublicKey(publicKeyString);
                        let balance = 0;
                        try {
                            balance = await WalletService.getBalance(publicKeyString);
                        } catch (balanceError) {
                            console.warn('⚠️ Could not get balance:', balanceError);
                            balance = 0;
                        }

                        console.log('✅ Got balance:', balance);

                        set({
                            connected: true,
                            publicKey,
                            balance,
                            isConnecting: false,
                            error: null,
                            wallet: { ...window.solana, isPhantom: true, isCustom: false },
                            address: publicKeyString,
                        });

                        return { success: true };
                    } catch (error) {
                        console.error('❌ Error with existing connection:', error);
                        // Reset connection state if there's an error
                        window.solana.isConnected = false;
                        window.solana.publicKey = null;
                    }
                }

                // Connect to wallet with comprehensive error handling and retry
                console.log('🔌 Requesting wallet connection...');

                let response;
                let connectionAttempts = 0;
                const maxConnectionAttempts = 3;

                while (connectionAttempts < maxConnectionAttempts) {
                    try {
                        // Check wallet state before connecting
                        console.log('🔍 Pre-connection wallet state:', {
                            isConnected: window.solana.isConnected,
                            publicKey: window.solana.publicKey?.toString(),
                            isPhantom: window.solana.isPhantom
                        });

                        response = await window.solana.connect();
                        console.log('📥 Connect response:', response);
                        break; // Success, exit retry loop

                    } catch (connectError) {
                        connectionAttempts++;
                        console.error(`❌ Connection attempt ${connectionAttempts} failed:`, connectError);

                        if (connectionAttempts >= maxConnectionAttempts) {
                            // All attempts failed, handle error
                            console.error('❌ All connection attempts failed, processing error...');
                            console.error('❌ Phantom connect error:', connectError);
                            console.error('❌ Error details:', {
                                name: connectError.name,
                                message: connectError.message,
                                code: connectError.code,
                                stack: connectError.stack
                            });

                            // Handle specific Phantom error codes
                            if (connectError.code === 4001 || connectError.message?.includes('User rejected')) {
                                throw new Error('Connection rejected by user. Please approve the connection in Phantom wallet.');
                            }

                            if (connectError.code === -32002 || connectError.message?.includes('locked')) {
                                throw new Error('Phantom wallet is locked or not ready. Please unlock your wallet and try again.');
                            }

                            if (connectError.code === -32603 || connectError.message?.includes('Internal error')) {
                                throw new Error('Internal error in Phantom wallet. Please try again or restart Phantom extension.');
                            }

                            // Handle unexpected errors (like 'Oe: Unexpected error')
                            if (connectError.message?.includes('Unexpected error') || connectError.message?.includes('Oe:')) {
                                throw new Error('Unexpected error from Phantom wallet.\n\n💡 Troubleshooting:\n• Make sure Phantom wallet is up to date\n• Try refreshing the page\n• Restart Phantom extension\n• Check if Phantom is connected to the correct network (Devnet)\n• Try disabling other wallet extensions temporarily\n• Clear browser cache and cookies for localhost');
                            }

                            // Network-related errors
                            if (connectError.message?.includes('network') || connectError.message?.includes('Network')) {
                                throw new Error('Network error. Please make sure Phantom is connected to Solana Devnet.');
                            }

                            // CORS or cross-origin errors
                            if (connectError.message?.includes('CORS') || connectError.message?.includes('cross-origin') || connectError.message?.includes('origin')) {
                                throw new Error('CORS error. Please make sure Phantom wallet allows connections from localhost:5173.\n\nTroubleshooting:\n• Refresh the page\n• Restart Phantom extension\n• Try a different browser\n• Check if other wallet extensions are interfering');
                            }

                            // Generic error with helpful instructions
                            throw new Error(`Phantom wallet error: ${connectError.message || connectError.toString()}\n\n💡 Troubleshooting:\n• Make sure Phantom wallet is unlocked\n• Check if Phantom is connected to Devnet\n• Try refreshing the page\n• Try disabling other wallet extensions\n• Restart Phantom extension\n• Clear browser cache`);
                        } else {
                            // Wait before retry
                            console.log(`⏳ Waiting 2 seconds before retry ${connectionAttempts + 1}/${maxConnectionAttempts}...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }

                if (!response) {
                    throw new Error('No response received from wallet');
                }

                if (!response.publicKey) {
                    throw new Error('No public key received from wallet');
                }

                const publicKeyString = response.publicKey.toString();
                console.log('📍 New public key:', publicKeyString);

                if (!publicKeyString || publicKeyString.length === 0) {
                    throw new Error('Invalid public key received from wallet');
                }

                let publicKey;
                try {
                    publicKey = new PublicKey(publicKeyString);
                } catch (keyError) {
                    throw new Error(`Invalid public key format: ${keyError.message}`);
                }

                // Get balance with error handling
                let balance = 0;
                try {
                    balance = await WalletService.getBalance(publicKeyString);
                    console.log('✅ Got balance:', balance);
                } catch (balanceError) {
                    console.warn('⚠️ Could not get balance:', balanceError);
                    // Continue without balance rather than failing
                    balance = 0;
                }

                console.log('✅ Wallet connected successfully:', publicKeyString);

                set({
                    connected: true,
                    publicKey,
                    balance,
                    isConnecting: false,
                    error: null,
                    wallet: { ...window.solana, isPhantom: true, isCustom: false },
                    address: publicKeyString,
                });

                return { success: true };

            } catch (error) {
                console.error('❌ Wallet connection error:', error);
                console.error('❌ Error stack:', error instanceof Error ? error.stack : error);
                update(state => ({
                    ...state,
                    isConnecting: false,
                    error: error instanceof Error ? error.message : 'Connection failed'
                }));
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        },

        async disconnect() {
            console.log('🔌 Disconnecting wallet...');

            if (typeof window !== 'undefined' && window.solana) {
                try {
                    await window.solana.disconnect();
                    console.log('✅ Wallet disconnected successfully');
                } catch (error) {
                    console.error('❌ Error disconnecting:', error);
                }
            }

            set({
                connected: false,
                publicKey: null,
                balance: 0,
                isConnecting: false,
                error: null,
                wallet: null,
                address: null,
            });
        },

        async refreshBalance() {
            update(async state => {
                if (state.publicKey && state.connected) {
                    try {
                        const balance = await WalletService.getBalance(state.publicKey.toString());
                        return { ...state, balance };
                    } catch (error) {
                        console.error('❌ Error refreshing balance:', error);
                        return { ...state, error: 'Failed to refresh balance' };
                    }
                }
                return state;
            });
        },

        async getWalletInfo() {
            update(async state => {
                if (state.address) {
                    try {
                        const info = await WalletService.getWalletInfo(state.address);
                        return {
                            ...state,
                            balance: info.balance,
                            error: info.error || null
                        };
                    } catch (error) {
                        console.error('❌ Error getting wallet info:', error);
                        return { ...state, error: 'Failed to get wallet info' };
                    }
                }
                return state;
            });
        }
    };
}

export const walletStore = createWalletStore();

// Auto-connect if wallet was previously connected (disabled by default for testing)
if (typeof window !== 'undefined') {
    // Store user intent to use custom wallet
    let userWantsCustomWallet = false;

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
        const customEthInput = document.getElementById('custom-ethereum-input');
        if ((customKeyInput && customKeyInput.value && customKeyInput.value.trim()) ||
            (customEthInput && customEthInput.value && customEthInput.value.trim())) {
            console.log('🚫 Auto-connect disabled - custom key detected');
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

        // Check if we're on wallet-test page - disable auto-connect by default
        if (window.location.pathname.includes('wallet-test')) {
            console.log('🚫 Auto-connect disabled - wallet test page detected');
            return true;
        }

        return false;
    };

    // Check for wallet with multiple attempts
    let autoConnectAttempts = 0;
    const maxAutoConnectAttempts = 3; // Reduced attempts

    const attemptAutoConnect = () => {
        autoConnectAttempts++;
        console.log(`🔄 Auto-connect attempt ${autoConnectAttempts}/${maxAutoConnectAttempts}`);

        if (window.solana && window.solana.isConnected) {
            console.log('🔄 Auto-connecting existing wallet...');

            // Check user intent before auto-connecting
            if (checkUserIntent()) {
                console.log('🚫 Auto-connect cancelled - user wants custom wallet');
                return;
            }

            console.log('✅ Auto-connecting to Phantom wallet...');
            walletStore.connect();
            return;
        }

        if (autoConnectAttempts < maxAutoConnectAttempts) {
            setTimeout(attemptAutoConnect, 2000); // Increased delay
        } else {
            console.log('⚠️ Auto-connect disabled - waiting for manual connection');
        }
    };

    // Only auto-connect if no custom key input exists or is empty and user doesn't want custom wallet
    setTimeout(() => {
        if (!checkUserIntent()) {
            attemptAutoConnect();
        } else {
            console.log('🚫 Auto-connect disabled - user intent to use custom wallet detected');
        }
    }, 2000); // Delay auto-connect

    // Monitor for changes in user intent
    let intentCheckInterval = setInterval(() => {
        const wantsCustom = checkUserIntent();
        if (wantsCustom !== userWantsCustomWallet) {
            userWantsCustomWallet = wantsCustom;
            console.log('🔄 User intent changed:', userWantsCustomWallet ? 'custom wallet' : 'phantom wallet');
        }
    }, 1000);

    // Clear interval after 30 seconds to prevent memory leaks
    setTimeout(() => {
        clearInterval(intentCheckInterval);
        console.log('✅ Intent monitoring stopped');
    }, 30000);
}

// Enhanced Phantom wallet types for TypeScript
declare global {
    interface Window {
        solana?: {
            connect(): Promise<{ publicKey: { toString(): string } }>;
            disconnect(): Promise<void>;
            signMessage(message: Uint8Array): Promise<Uint8Array>;
            publicKey: { toString(): string } | null;
            isConnected: boolean;
            isPhantom?: boolean;
            on(event: string, callback: Function): void;
            // Additional properties that might be available
            signTransaction?(transaction: any): Promise<any>;
            signAllTransactions?(transactions: any[]): Promise<any[]>;
        };
    }
}

