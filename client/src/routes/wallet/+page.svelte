<script lang="ts">
    import { ethers } from 'ethers';
    import { onMount, onDestroy } from 'svelte';
    import { Zap, DollarSign, RotateCcw, Lock, Unlock, Globe, Wallet, Download, Upload, Repeat, Plus } from 'lucide-svelte';
    import { pocketbaseService, type WalletData, type EnergyData } from '$lib/services/pocketbaseService';
    import { authStore, authActions } from '$lib/stores/auth';
    import { POCKETBASE_URL } from '$lib/config/pocketbase-config';
    import PocketBaseAuth from '$lib/components/PocketBaseAuth.svelte';
    import { TokenService } from '$lib/services/tokenService';
    import { generateRealSolanaWallet, validateSolanaAddress, canReceiveFromGamePool, requestDevnetAirdrop, checkTransactionStatus, checkFaucetHealth, getWalletBalance } from '$lib/utils/solanaWallet';

    let message = 'Wallet Test - Fixed!';
    let selectedNetwork = 'ethereum';
    let customAddress = '';

    // Reactive: sync wallet when network or wallets change
    $: if (selectedNetwork && userWallets && userWallets.length >= 0) {
        syncWalletWithDatabase();
    }

    // Reactive: update transfer calculations when amount or network fee changes
    $: if (transferData.amount || transferData.networkFee) {
        updateTransferCalculations();
    }

    // Reactive: update swap calculations when amount or tokens change
    $: if (swapData.amount || swapData.fromToken || swapData.toToken || swapData.slippage) {
        updateSwapCalculations();
    }
    let isLoadingBalance = false;
    let balanceError = '';
    let walletInfo = {
        detected: false,
        connected: false,
        address: '',
        type: '',
        balance: '0.0000',
        symbol: 'ETH'
    };

    // Transfer modal state
    let showTransferModal = false;
    let transferData = {
        recipientAddress: '',
        amount: '',
        networkFee: 'medium', // low, medium, high
        estimatedGas: '0.000021', // ETH
        totalCost: '0.000021'
    };
    let transferError = '';
    let isTransferring = false;

    // Swap modal state
    let showSwapModal = false;
    let swapData = {
        fromToken: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC',
        toToken: selectedNetwork === 'ethereum' ? 'USDT' : selectedNetwork === 'solana' ? 'USDC' : 'USDT',
        amount: '',
        slippage: '0.5', // percentage
        estimatedReceive: '0.00',
        exchangeRate: '0.00',
        networkFee: '0.000021',
        minimumReceived: '0.00'
    };
    let swapError = '';
    let isSwapping = false;

    // Tab management
    let currentTab = 'game'; // 'game' or 'wallet' - default to energy tab

    // Fix tab alignment function
    function fixTabAlignment() {
        const buttons = document.querySelectorAll('button.tab-button');
        buttons.forEach(button => {
            button.style.display = 'inline-flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.gap = '0.5rem';
            button.style.flexDirection = 'row';
        });
    }

    // Energy system
    let energyPoints = 0;
    let canConvertEnergy = false; // Admin control for conversion
    let energyConversionRate = 0.001; // 1 E = 0.001 ETH/SOL/BTC

    // Claim energies modal state
    let showClaimModal = false;
    let claimData = {
        amount: '',
        userWallet: '',
        networkFee: 'medium',
        estimatedGas: '0.000005', // SOL base fee
        totalCost: '0.000005'
    };
    let claimError = '';
    let isClaiming = false;
    let claimResult = null;
    let isGeneratingWallet = false;

    // Wallet object type
    interface GeneratedWallet {
        mnemonic: string;
        address: string;
        privateKey: string;
        publicKey: string;
        network: string;
    }

    // New wallet creation variables
    let showCreateWalletModal = false;
    let newWallets: Record<string, GeneratedWallet> | null = null; // Object containing wallets for all networks
    let isCreatingWallet = false;

    // Authentication variables
    let email = '';
    let password = '';
    let confirmPassword = '';
    let isLoginMode = true;
    let error = '';
    let success = '';

    // PocketBase integration
    let userWallets: WalletData[] = [];
    let isLoadingWallets = false;
    let walletHistoryError = '';

    // Energy integration with PocketBase
    let userEnergy: EnergyData | null = null;
    let isLoadingEnergy = false;
    let showWalletHistory = false;
    let isRequestingAirdrop = false;
    let lastTransactionSignature = '';
    let isCheckingTransaction = false;
    let walletBalance = 0;
    let isCheckingBalance = false;

    // Load wallets from PocketBase - improved to prevent race conditions
    let walletLoadingPromise = null;

    // Load energy from PocketBase
    async function loadUserEnergy() {
        try {
            isLoadingEnergy = true;

            // DEBUG: Log current auth state before loading energy
            const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
                const unsubscribe = authStore.subscribe(state => resolve(state));
                unsubscribe();
            });
            console.log('⚡ LOADING ENERGY - AUTH DEBUG:', {
                isAuthenticated: pocketbaseService.isAuthenticated(),
                currentUser: pocketbaseService.getCurrentUser(),
                gatewayAuthState: authState.isAuthenticated ? 'authenticated' : 'not authenticated'
            });

            // Try to get user from different sources
            let userId = null;
            let userEmail = null;

            // First try PocketBase auth
            const pocketbaseUser = pocketbaseService.getCurrentUser();
            if (pocketbaseUser?.id) {
                userId = pocketbaseUser.id;
                userEmail = pocketbaseUser.email;
            } else if (authState.isAuthenticated && currentUser?.id) {
                // Fallback to gateway auth user
                userId = currentUser.id;
                userEmail = currentUser.email;
                console.log('🔄 Using gateway auth user for energy loading:', userEmail);
            }

            if (!userId) {
                console.log('⚠️ No authenticated user found, using local energy fallback');
                userEnergy = null;
                energyPoints = 0; // Reset to 0 when no user
                return; // Don't throw error, just use local fallback
            }

            console.log('⚡ Loading user energy from database for user:', userEmail);

            userEnergy = await pocketbaseService.getOrCreateUserEnergy(userId);
            console.log('✅ User energy loaded:', {
                points: userEnergy.points,
                updated: userEnergy.updated,
                created: userEnergy.created,
                userId: userEnergy.user_id
            });

            // Sync local energyPoints with database
            energyPoints = userEnergy.points;
            console.log('🔄 Synced local energy points:', energyPoints);

        } catch (error) {
            console.error('❌ Error loading user energy:', error);
            // Fallback to local energy if database fails
            userEnergy = null;
            energyPoints = 0; // Reset to 0 on error
            console.log('⚠️ Using local energy fallback due to error');
            // Don't re-throw error - allow the app to continue with local energy
        } finally {
            isLoadingEnergy = false;
        }
    }

    // Authentication loading state
    let isLoading = false;

    // Auto-hide success messages
    let successTimeout = null;

    // Reactive authentication state - now using auth store directly
    let currentUser = null;

    // Reactive wallet display state
    let showWallet = false;

    // Force clear authentication on page load (for testing)
    function forceClearAuth() {
        console.log('🧹 Force clearing authentication state...');
        pocketbaseService.logout();
        currentUser = null;
        walletInfo = {
            detected: false,
            connected: false,
            address: '',
            type: '',
            balance: '0.0000',
            symbol: 'ETH'
        };
        userWallets = [];
        userEnergy = null;
        energyPoints = 0;
        console.log('✅ Auth state cleared');
    }

    // Test login function (for debugging)
    async function testLogin() {
        console.log('🧪 Testing login with admin@eneegy.com...');
        try {
            // Try gateway login first
            console.log('🔐 Trying gateway login...');
            const result = await authActions.login('admin@eneegy.com', '12345678');
            console.log('Gateway login result:', result);

            if (result.success) {
                console.log('✅ Gateway login successful, updating auth state...');
                await updateAuthState();
            } else {
                console.log('❌ Gateway login failed, trying PocketBase authentication...');
                // Try PocketBase authentication as fallback
                try {
                    await pocketbaseService.authenticate('admin@eneegy.com', '12345678');
                    console.log('✅ PocketBase login successful');
                    await updateAuthState();
                } catch (pbError) {
                    console.error('❌ Both login methods failed:', {
                        gateway: result.error,
                        pocketbase: pbError.message
                    });
                }
            }
        } catch (error) {
            console.error('❌ Test login error:', error);
        }
    }

    // Update authentication state
    async function updateAuthState() {
        try {
            console.log('🔄 Updating auth state...');

            // First check auth store (gateway auth system)
            const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
                const unsubscribe = authStore.subscribe(state => resolve(state));
                unsubscribe();
            });

            if (authState.isAuthenticated && authState.user) {
                console.log('✅ User authenticated via gateway auth system');
                currentUser = authState.user;
            } else {
                // Fallback to PocketBase auth for backward compatibility
                console.log('🔍 Checking PocketBase auth as fallback...');
                currentUser = pocketbaseService.getCurrentUser();
            }

            console.log('✅ Auth state updated:', {
                isAuthenticated: authState.isAuthenticated,
                userEmail: currentUser?.email || 'no user',
                source: authState.isAuthenticated ? 'gateway' : 'pocketbase',
                finalState: authState.isAuthenticated ? 'LOGGED_IN' : 'NOT_LOGGED_IN'
            });

            // Auto-load wallets and energy when authenticated
            if (authState.isAuthenticated && currentUser) {
                console.log('📦 Loading user wallets...');
                await loadUserWallets(currentUser?.id);

                console.log('⚡ Loading user energy...');
                await loadUserEnergy();
            } else if (authState.isAuthenticated && !currentUser) {
                // Handle case where gateway auth succeeded but no currentUser (PocketBase not synced)
                console.log('⚠️ Gateway auth successful but no currentUser available');
                // Try to load energy with null userId to trigger fallback
                try {
                    await loadUserEnergy();
                } catch (energyError) {
                    console.log('⚠️ Energy loading failed, using local fallback');
                }
            }
        } catch (error) {
            console.error('❌ Error updating auth state:', error);
            currentUser = null;

            // Clear wallet info when auth state update fails
            walletInfo = {
                detected: false,
                connected: false,
                address: '',
                type: '',
                balance: '0.0000',
                symbol: 'ETH'
            };
            userWallets = [];
            userEnergy = null;
            energyPoints = 0;
            showWallet = false;
        }
    }

    // Sync wallet info with database wallets
    function syncWalletWithDatabase() {
        if (!userWallets || userWallets.length === 0) {
            // Reset wallet info when no wallets are loaded
            walletInfo = {
                detected: false,
                connected: false,
                address: '',
                type: '',
                balance: '0.0000',
                symbol: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC'
            };
            showWallet = false;
            return;
        }

        // Find wallet for current network
        const dbWallet = userWallets.find(wallet => wallet.network === selectedNetwork);

        if (dbWallet) {
            console.log('🔄 Syncing wallet for network:', selectedNetwork);
            console.log('📊 Raw dbWallet.balance:', dbWallet.balance, 'type:', typeof dbWallet.balance);
            console.log('🔍 dbWallet object:', JSON.stringify(dbWallet, null, 2));

            // Ensure balance is a number, default to 0 if invalid
            let balanceValue = 0;

            console.log('🔢 Raw balance from DB:', dbWallet.balance, 'Type:', typeof dbWallet.balance);

            if (dbWallet.balance === null || dbWallet.balance === undefined) {
                console.log('⚠️ Balance is null/undefined, using 0');
                balanceValue = 0;
            } else if (typeof dbWallet.balance === 'number') {
                if (!isNaN(dbWallet.balance)) {
                    balanceValue = dbWallet.balance;
                } else {
                    console.log('⚠️ Balance is NaN number, using 0');
                }
            } else if (typeof dbWallet.balance === 'string') {
                const parsed = parseFloat(dbWallet.balance);
                if (!isNaN(parsed)) {
                    balanceValue = parsed;
                    console.log('✅ Parsed string balance:', parsed);
                } else {
                    console.log('⚠️ Could not parse string balance:', dbWallet.balance);
                }
            } else {
                console.log('⚠️ Balance has unexpected type:', typeof dbWallet.balance, 'Value:', dbWallet.balance);
            }

            console.log('💰 Processed balance:', balanceValue);

            // Update walletInfo with database data
            walletInfo = {
                detected: true,
                connected: true,
                address: dbWallet.address,
                type: dbWallet.wallet_type,
                balance: balanceValue.toString(),
                symbol: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC'
            };
            showWallet = true;
            console.log('✅ Updated walletInfo.balance:', walletInfo.balance, 'type:', typeof walletInfo.balance);
        } else {
            console.log('⚠️ No wallet found for network:', selectedNetwork, '- resetting to 0.0000');
            // Reset to show no wallet for this network
            walletInfo = {
                detected: false,
                connected: false,
                address: '',
                type: '',
                balance: '0.0000',
                symbol: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC'
            };
            showWallet = false;
        }
    }

    // Validation functions
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email) && email.includes('@') && email.includes('.');
        return isValid;
    }

    function validatePassword(password) {
        return password.length >= 6;
    }

    async function handleAuth() {
        // Clear previous messages
        error = '';
        success = '';

        if (!email.trim() || !password.trim()) {
            error = 'Please fill in all fields';
            return;
        }

        if (!validateEmail(email.trim())) {
            error = 'Please enter a valid email address';
            return;
        }

        if (!validatePassword(password)) {
            error = 'Password must be at least 6 characters long';
            return;
        }

        if (!isLoginMode) {
            if (password !== confirmPassword) {
                error = 'Passwords do not match';
                return;
            }
        }

        isLoading = true;
        error = '';
        success = '';

        // Clear any existing timeout
        if (successTimeout) {
            clearTimeout(successTimeout);
            successTimeout = null;
        }

        try {
            if (isLoginMode) {
                await pocketbaseService.authenticate(email.trim(), password);
                success = 'Login successful! Redirecting...';
                error = '';
                // Clear form after successful login
                email = '';
                password = '';
                confirmPassword = '';
                // Update authentication state immediately
                updateAuthState();
                // Dispatch event to notify components
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
                }
            } else {
                await pocketbaseService.register(email.trim(), password, {
                    name: email.split('@')[0]
                });
                success = 'Registration successful! Creating wallets...';
                error = '';

                // Auto-create wallets and energy for new user immediately after registration
                try {
                    console.log('🎯 Auto-creating wallets and energy for newly registered user...');

                    // Small delay to ensure authentication is complete
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Get current user ID after registration
                    const currentUser = pocketbaseService.getCurrentUser();
                    if (!currentUser?.id) {
                        throw new Error('User authentication failed after registration');
                    }

                    console.log('👤 New user authenticated:', currentUser.email, '(ID:', currentUser.id, ')');

                    // Create wallets first (pass current user ID)
                    const walletsCreated = await autoCreateWalletsForUser(currentUser.id);
                    console.log('📦 Wallets creation result:', walletsCreated);

                    // Then create energy record with explicit user ID
                    console.log('⚡ Creating energy record for user:', currentUser.id);
                    const newEnergy = await pocketbaseService.getOrCreateUserEnergy(currentUser.id);
                    console.log('✅ Energy record created:', newEnergy.points, 'points for new user');

                    success = 'Registration successful! Wallets and Energy created automatically.';
                } catch (setupError) {
                    console.error('⚠️ Failed to auto-create wallets/energy:', setupError);
                    console.error('Setup error details:', setupError.message);
                    success = 'Registration successful! Wallets and Energy will be created on first login.';
                }

                // Clear form and switch to login mode
                email = '';
                password = '';
                confirmPassword = '';
                isLoginMode = true;
            }

            // Auto-hide success message after 3 seconds
            successTimeout = setTimeout(() => {
                success = '';
            }, 3000);
        } catch (err) {
            console.error('Auth error:', err);
            if (err.status === 400) {
                if (err.data?.email?.message) {
                    error = `Email: ${err.data.email.message}`;
                } else if (err.data?.password?.message) {
                    error = `Password: ${err.data.password.message}`;
                } else {
                    error = err.message || 'Invalid credentials';
                }
            } else {
                error = err.message || 'Authentication failed';
            }
        } finally {
            isLoading = false;
        }
    }

    function toggleMode() {
        isLoginMode = !isLoginMode;
        error = '';
        success = '';
        confirmPassword = '';
    }

    async function loadUserWallets(userId?: string) {
        // Skip if PocketBase is not available
        try {
            // Check authentication through auth store
            const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
                const unsubscribe = authStore.subscribe(state => resolve(state));
                unsubscribe();
            });
            if (!authState.isAuthenticated) {
                console.log('User not authenticated, skipping wallet loading');
                return;
            }
        } catch (error) {
            console.log('PocketBase not available, running in offline mode');
            return;
        }

        // Prevent multiple concurrent requests
        if (isLoadingWallets && walletLoadingPromise) {
            console.log('Wallet loading already in progress, skipping...');
            return walletLoadingPromise;
        }

        isLoadingWallets = true;
        walletHistoryError = '';

        try {
            walletLoadingPromise = pocketbaseService.getUserWallets(userId);
            userWallets = await walletLoadingPromise;
            console.log('📦 Loaded wallets from PocketBase:', userWallets);
            console.log('🔍 Total wallets count:', userWallets.length);
            console.log('🔍 Raw userWallets data:', JSON.stringify(userWallets, null, 2));
            
            if (userWallets.length === 0) {
                console.log('⚠️⚠️⚠️ USER HAS NO WALLETS - Should show "Create Wallet" message ⚠️⚠️⚠️');
            } else {
                console.log('✅ User has wallets for these networks:', userWallets.map(w => w.network).join(', '));
            }

            // Sync wallet info with loaded database wallets
            syncWalletWithDatabase();

            walletLoadingPromise = null;
        } catch (error) {
            console.error('Error loading wallets:', error);
            // Handle specific error types gracefully
            if (error.name === 'AbortError' || error.message?.includes('autocancelled')) {
                console.log('🔄 Wallet loading was cancelled, this is normal');
                userWallets = []; // Set empty array instead of error state
            } else if (error.name === 'ClientResponseError') {
                console.log('🔄 PocketBase client error, user may not be authenticated yet');
                userWallets = []; // Set empty array instead of error state
            } else {
                console.log('🔄 Network or other error, falling back to offline mode');
                userWallets = []; // Set empty array instead of error state
            }
            walletLoadingPromise = null;
        } finally {
            isLoadingWallets = false;
        }
    }

    // Save wallet to PocketBase
    async function saveWalletToPocketBase(walletData, userId) {
        try {
            console.log('Saving wallet to PocketBase:', walletData);

            // Check if wallet already exists
            const existingWallet = await pocketbaseService.getWalletByAddress(
                walletData.address,
                walletData.network
            );

            if (existingWallet) {
                console.log('Wallet already exists, skipping save');
                return existingWallet;
            }

            // Save new wallet
            const savedWallet = await pocketbaseService.createWallet(walletData, userId);
            console.log('Wallet saved to PocketBase:', savedWallet);
            return savedWallet;
        } catch (error) {
            console.error('Error saving wallet to PocketBase:', error);
            throw error;
        }
    }

    async function connectToWallet() {
        console.log('Connecting to wallet for network:', selectedNetwork);

        try {
            if (selectedNetwork === 'ethereum') {
                if (typeof window !== 'undefined' && window.ethereum) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();

            walletInfo = {
                detected: true,
                connected: true,
                        address: address,
                    type: 'MetaMask',
                    balance: '0.0000',
                    symbol: 'ETH'
                };

                    // Get balance
        isLoadingBalance = true;
        balanceError = '';
        try {
                        const balance = await provider.getBalance(address);
                        const formattedBalance = ethers.formatEther(balance);
                        walletInfo.balance = parseFloat(formattedBalance).toFixed(4);
                    } catch (balanceErr) {
                        console.error('Error getting balance:', balanceErr);
                        balanceError = 'Failed to load balance';
                    } finally {
                                isLoadingBalance = false;
                    }

                    console.log('Connected to MetaMask:', address);
                            } else {
                    alert('MetaMask not found. Please install MetaMask extension.');
                }
            } else if (selectedNetwork === 'solana') {
                if (typeof window !== 'undefined' && window.solana) {
                    try {
                        await window.solana.connect();
                        const address = window.solana.publicKey.toString();

                    walletInfo = {
                        detected: true,
                        connected: true,
                        address: address,
                        type: 'Phantom',
                            balance: '0.0000',
                        symbol: 'SOL'
                    };

                        console.log('Connected to Phantom:', address);
                    } catch (err) {
                        console.error('Phantom connection failed:', err);
                        alert('Failed to connect to Phantom wallet');
                    }
                } else {
                    alert('Phantom wallet not found. Please install Phantom extension.');
            }
        } else {
                alert(`${selectedNetwork} wallet connection not implemented yet`);
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    }

    // Auto-create wallets for new users
    async function autoCreateWalletsForUser(userId) {
        try {
            console.log('🎯 Auto-creating wallet for user:', userId);

            // Create a random wallet using ethers v6
            const baseWallet = ethers.Wallet.createRandom();
            const mnemonic = baseWallet.mnemonic.phrase;

            // Create wallets for all networks (Ethereum, Solana, Bitcoin)
            const walletsToCreate = [
                {
                    user_id: userId,
                    address: baseWallet.address,
                    private_key: baseWallet.privateKey,
                    mnemonic: mnemonic,
                    wallet_type: 'generated',
                    network: 'ethereum',
                    balance: 0,
                    is_connected: false
                },
                {
                    user_id: userId,
                    address: 'So' + ethers.Wallet.createRandom().address.slice(2, 40),
                    private_key: ethers.Wallet.createRandom().privateKey,
                    mnemonic: mnemonic,
                    wallet_type: 'generated',
                    network: 'solana',
                    balance: 0,
                    is_connected: false
                },
                {
                    user_id: userId,
                    address: 'sui' + ethers.Wallet.createRandom().address.slice(2, 42),
                    private_key: ethers.Wallet.createRandom().privateKey,
                    mnemonic: mnemonic,
                    wallet_type: 'generated',
                    network: 'sui',
                    balance: 0,
                    is_connected: false
                }
            ];

            // Save all wallets to PocketBase
            for (const walletData of walletsToCreate) {
                await saveWalletToPocketBase(walletData, userId);
                console.log(`✅ Created ${walletData.network} wallet: ${walletData.address}`);
            }

            console.log('🎉 Auto-created 3 wallets for new user');
            return true;
        } catch (error) {
            console.error('❌ Error auto-creating wallets:', error);
            return false;
        }
    }

    async function createNewWallet() {
        // Mark as creating
        isCreatingWallet = true;
        // Kiểm tra authentication trước khi tạo ví
        const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
            const unsubscribe = authStore.subscribe(state => resolve(state));
            unsubscribe();
        });
        if (!authState.isAuthenticated || !currentUser?.id) {
            alert('Vui lòng đăng nhập trước khi tạo ví!');
            console.error('❌ Cannot create wallet: User not authenticated');
            return;
        }

        isCreatingWallet = true;
        try {
            // Create a random wallet using ethers v6
            const baseWallet = ethers.Wallet.createRandom();

            // Generate 12-word mnemonic from the wallet
            const mnemonic = baseWallet.mnemonic.phrase;
            console.log('Generated mnemonic:', mnemonic);

            // Create wallets for all networks using the same seed
            const wallets: Record<string, GeneratedWallet> = {};

            // Ethereum wallet
            wallets.ethereum = {
                mnemonic: mnemonic,
                address: baseWallet.address,
                privateKey: baseWallet.privateKey,
                publicKey: baseWallet.publicKey,
                network: 'ethereum'
            };

            // Solana wallet - REAL Ed25519 keypair
            const realSolanaWallet = await generateRealSolanaWallet();
            wallets.solana = {
                mnemonic: mnemonic,
                address: realSolanaWallet.address, // Real Solana address
                privateKey: realSolanaWallet.privateKey, // Real private key
                publicKey: realSolanaWallet.publicKey, // Real public key
                network: 'solana'
            };

            // SUI wallet (derived from same seed)
            const suiWallet = ethers.Wallet.createRandom();
            wallets.sui = {
                mnemonic: mnemonic,
                address: 'sui' + suiWallet.address.slice(2, 42), // Demo format
                privateKey: suiWallet.privateKey,
                publicKey: suiWallet.publicKey,
                network: 'sui'
            };

            newWallets = wallets;
            console.log('Created newWallets:', newWallets);
            const walletData = newWallets as Record<string, GeneratedWallet>;
            console.log('Ethereum address:', walletData.ethereum?.address || 'N/A');
            console.log('Solana address:', walletData.solana?.address || 'N/A');
            console.log('SUI address:', walletData.sui?.address || 'N/A');
            showCreateWalletModal = true;

            // Save all generated wallets to PocketBase
            for (const [network, wallet] of Object.entries(wallets)) {
                const walletData = wallet as GeneratedWallet;
                await saveWalletToPocketBase({
                    address: walletData.address,
                    private_key: walletData.privateKey,
                    mnemonic: walletData.mnemonic,
                    wallet_type: 'generated',
                    network: network,
                    balance: 0,
                    is_connected: false
                }, currentUser?.id);
            }

            // Dispatch event to refresh wallet summary
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
            }

            // Update wallet info to show the current selected network wallet
            const currentWallet = wallets[selectedNetwork];
            walletInfo = {
                detected: true,
                connected: true,
                address: currentWallet.address,
                type: 'Generated Wallet',
                balance: '0.0000',
                symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'ethereum' ? 'ETH' : 'SUI'
            };
            showWallet = true;

            customAddress = currentWallet.address;

            // Reload user wallets to sync with database
            await loadUserWallets(currentUser?.id);

        } catch (error) {
            console.error('Error creating wallet:', error);
            alert('Error creating wallet: ' + error.message);
        } finally {
            isCreatingWallet = false;
        }
    }

    async function testCustomAddress() {
        if (!customAddress.trim()) {
            alert('Please enter an address to test');
            return;
        }

        isLoadingBalance = true;
        balanceError = '';

        try {
            if (selectedNetwork === 'ethereum') {
                const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
                const balance = await provider.getBalance(customAddress);
                const formattedBalance = ethers.formatEther(balance);

                walletInfo = {
                    detected: true,
                    connected: false,
                    address: customAddress,
                    type: 'Custom Address',
                    balance: parseFloat(formattedBalance).toFixed(4),
                    symbol: 'ETH'
                };
            } else {
                // For demo purposes, show random balance
                walletInfo = {
                    detected: true,
                    connected: false,
                    address: customAddress,
                    type: 'Custom Address',
                    balance: (Math.random() * 10).toFixed(selectedNetwork === 'sui' ? 8 : 4),
                    symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'sui' ? 'SUI' : 'ETH'
                };
            }
        } catch (error) {
            console.error('Error testing address:', error);
            balanceError = 'Invalid address or network error';
            walletInfo = {
                detected: false,
                connected: false,
                address: customAddress,
                type: 'Invalid Address',
                balance: '0.0000',
                symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'ethereum' ? 'ETH' : 'BTC'
            };
        } finally {
            isLoadingBalance = false;
        }
    }

    function updateWalletInfo() {
        // Update wallet info based on current selection
        if (newWallets && newWallets[selectedNetwork]) {
            const currentWallet = newWallets[selectedNetwork];
            walletInfo = {
                detected: true,
                connected: true,
                address: currentWallet.address,
                type: 'Generated Wallet',
                balance: '0.0000',
                symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'ethereum' ? 'ETH' : 'BTC'
            };
        }
    }

    async function handleLogout() {
        try {
            console.log('🚪 Starting logout process...');
            await pocketbaseService.logout();

            // Clear user data immediately
            currentUser = null;
            userWallets = [];
            userEnergy = null;
            energyPoints = 0; // Reset local energy points
            currentTab = 'wallet'; // Reset to wallet tab

                // Clear wallet info to hide wallet display
            walletInfo = {
                detected: false,
                connected: false,
                address: '',
                type: '',
                balance: '0.0000',
                symbol: 'ETH'
            };
            showWallet = false;

            console.log('✅ Logout completed, auth state cleared');

            // Dispatch event to notify other components
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pocketbase-auth-logout'));
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Even if logout fails, clear local state
            currentUser = null;
            userWallets = [];
            userEnergy = null;
            energyPoints = 0;
            currentTab = 'wallet';

            // Clear wallet info even on logout error
            walletInfo = {
                detected: false,
                connected: false,
                address: '',
                type: '',
                balance: '0.0000',
                symbol: 'ETH'
            };
            showWallet = false;
        }
    }

    // Copy to clipboard function
    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                fallbackCopyTextToClipboard(text);
            });
        } else {
            fallbackCopyTextToClipboard(text);
        }
    }

    // Claim energies functions
    async function openClaimModal() {
        // Try to connect Phantom wallet automatically
        if (typeof window !== 'undefined' && window.solana && !window.solana.isConnected) {
            try {
                console.log('🔗 Auto-connecting Phantom wallet for claim...');
                await window.solana.connect();
                const address = window.solana.publicKey.toString();
                console.log('✅ Auto-connected Phantom wallet:', address);
                claimData.userWallet = address;
            } catch (err) {
                console.log('⚠️ Auto-connect failed, user will need to enter address manually');
            }
        } else if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
            // Already connected
            const address = window.solana.publicKey.toString();
            claimData.userWallet = address;
        } else {
            // Fallback: Use saved wallet address if available
            const userWallet = userWallets.find(w => w.network === 'solana' && w.is_connected);
            if (userWallet) {
                claimData.userWallet = userWallet.address;
            }
        }

        // Auto-fill max energy amount
        claimData.amount = energyPoints.toString();

        updateClaimCalculations();
        showClaimModal = true;
        claimError = '';
        claimResult = null;
    }

    function closeClaimModal() {
        showClaimModal = false;
        claimData.amount = '';
        claimData.userWallet = '';
        claimError = '';
        claimResult = null;
    }

    function updateClaimCalculations() {
        // Update total cost based on network fee
        const baseFee = 0.000005; // SOL base fee
        const priorityFee = claimData.networkFee === 'low' ? 0.000001 :
                           claimData.networkFee === 'high' ? 0.00001 : 0.000005;
        claimData.estimatedGas = (baseFee + priorityFee).toFixed(6);
        claimData.totalCost = claimData.estimatedGas;
    }

    async function claimEnergies() {
        if (!claimData.amount || !claimData.userWallet) {
            claimError = 'Please fill in all fields';
            return;
        }

        // Validate Solana wallet address format
        if (!validateSolanaAddress(claimData.userWallet)) {
            claimError = 'Invalid Solana wallet address format';
            return;
        }

        // Check if wallet can receive from game pool
        const walletCheck = await canReceiveFromGamePool(claimData.userWallet);
        if (!walletCheck.valid) {
            claimError = walletCheck.reason || 'Wallet cannot receive tokens';
            return;
        }

        const amount = parseInt(claimData.amount);
        if (amount <= 0) {
            claimError = 'Amount must be greater than 0';
            return;
        }

        if (amount > energyPoints) {
            claimError = `Insufficient energies. You have ${energyPoints} E but requested ${amount} E`;
            return;
        }

        isClaiming = true;
        claimError = '';

        try {
            console.log('🔄 Claiming energies to wallet:', { amount, wallet: claimData.userWallet });

            const result = await TokenService.claimEnergiesToWallet(amount, claimData.userWallet);

            if (result.success) {
                claimResult = {
                    success: true,
                    tx_signature: result.tx_signature,
                    claimed_amount: result.claimed_amount,
                    remaining_energies: result.remaining_energies
                };

                // Update local energy balance
                energyPoints = result.remaining_energies || 0;

                // Reload energy from database
                await loadUserEnergy();

                console.log('✅ Successfully claimed energies:', result);

                // Auto-close modal after 3 seconds
                setTimeout(() => {
                    closeClaimModal();
                }, 3000);

            } else {
                claimError = result.error || 'Claim failed';
            }
        } catch (error) {
            console.error('❌ Claim energies error:', error);
            claimError = error instanceof Error ? error.message : 'Network error';
        } finally {
            isClaiming = false;
        }
    }

    // Generate a new Solana wallet specifically for claiming
    async function generateNewWalletForClaim() {
        try {
            isGeneratingWallet = true;
            claimError = ''; // Clear any previous errors

            console.log('🎯 Generating REAL Solana Devnet wallet for claiming...');

            // Generate REAL Solana Devnet wallet with Web3.js
            const newWallet = await generateRealSolanaWallet();

            // Set the wallet address in the form
            claimData.userWallet = newWallet.address;

            // Show success message with Devnet info
            console.log('✅ Generated REAL Solana Devnet wallet:', {
                address: newWallet.address,
                cluster: 'devnet',
                canInteractWith: 'https://explorer.solana.com/address/BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19?cluster=devnet'
            });

            // Show detailed notification with Devnet information
            const walletInfo = `
🎉 REAL Solana Devnet Wallet Generated!

📍 Address: ${newWallet.address}
🌐 Network: Solana Devnet
🔗 Explorer: https://explorer.solana.com/address/${newWallet.address}?cluster=devnet

⚠️ CRITICAL SECURITY WARNING:
🔑 Private Key: ${newWallet.privateKey}

💰 To use this wallet:
1. Fund it with SOL from https://faucet.solana.com/
2. Use private key to import into wallet apps
3. Can interact with token: BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19

⚠️ NEVER share your private key with anyone!
⚠️ Store it securely - lost keys cannot be recovered!

Click OK to copy private key to clipboard.
            `;

            // Copy private key to clipboard and show alert
            await navigator.clipboard.writeText(newWallet.privateKey);
            alert(walletInfo + '\n\n✅ Private key copied to clipboard!');

        } catch (error) {
            console.error('❌ Failed to generate wallet:', error);
            claimError = 'Failed to generate new wallet';
        } finally {
            isGeneratingWallet = false;
        }
    }

    async function requestAirdropDirectly() {
        if (!claimData.userWallet) {
            alert('❌ No wallet address available. Generate a wallet first!');
            return;
        }

        try {
            isRequestingAirdrop = true;
            console.log(`🪂 Requesting 1 SOL airdrop for: ${claimData.userWallet}`);

            // Check faucet health first
            console.log('🔍 Checking faucet health...');
            const isHealthy = await checkFaucetHealth();

            if (!isHealthy) {
                console.log('🚨 Faucet is rate-limited, skipping direct airdrop...');
                alert(`⏳ Devnet faucet is rate-limited!\n\n🔄 Opening web faucet automatically...\n\n📋 Your wallet address will be pre-filled.`);
                setTimeout(() => {
                    openFaucetWithWallet('official');
                }, 500);
                return;
            }

            const signature = await requestDevnetAirdrop(claimData.userWallet, 1);

            // Store signature for checking
            lastTransactionSignature = signature;

            console.log('✅ Airdrop successful! Transaction:', signature);

            alert(`🎉 Airdrop successful!\n\n📋 Transaction Signature:\n${signature}\n\n💰 1 SOL has been sent to your wallet.\n\n🔍 Check on Explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet\n\n💡 Note: May take 10-30 seconds to appear on explorer.`);

            // Refresh balance after airdrop
            setTimeout(() => {
                // Could add balance refresh logic here if needed
            }, 2000);

        } catch (error) {
            console.error('❌ Airdrop failed:', error);

            const errorMessage = error.message || error;

            // Handle rate limiting - skip retries and go straight to web faucet
            if (errorMessage.includes('RATE_LIMITED') ||
                errorMessage.includes('rate-limited') ||
                errorMessage.includes('Too Many Requests') ||
                errorMessage.includes('429')) {
                console.log('🚨 Rate limited detected, opening web faucet...');

                alert(`⏳ Devnet faucet is rate-limited!\n\n🔄 Opening web faucet automatically...\n\n📋 Your wallet address will be pre-filled.`);

                setTimeout(() => {
                    openFaucetWithWallet('official');
                }, 500);
                return; // Don't proceed to finally block yet
            }

            // Handle other types of errors
            alert(`❌ Airdrop failed: ${errorMessage}\n\n💡 Try using the web faucets above.`);
        } finally {
            isRequestingAirdrop = false;
        }
    }

    // Enhanced faucet opening with wallet pre-fill
    function openFaucetWithWallet(faucetType = 'official') {
        const walletAddress = claimData.userWallet;
        if (!walletAddress) {
            alert('❌ No wallet address available!');
            return;
        }

        let faucetUrl = '';

        switch (faucetType) {
            case 'official':
                faucetUrl = 'https://faucet.solana.com/';
                break;
            case 'quicknode':
                faucetUrl = 'https://faucet.quicknode.com/solana';
                break;
            case 'solanaTracker':
                faucetUrl = 'https://www.solanatracker.io/faucet';
                break;
            default:
                faucetUrl = 'https://faucet.solana.com/';
        }

        console.log(`🔗 Opening ${faucetType} faucet for wallet: ${walletAddress}`);

        // Open faucet in new tab
        window.open(faucetUrl, '_blank', 'noopener,noreferrer');

        // Show copy instruction
        setTimeout(() => {
            navigator.clipboard.writeText(walletAddress).then(() => {
                alert(`✅ Faucet opened!\n\n📋 Wallet address copied to clipboard:\n${walletAddress}\n\n💰 Paste the address and request 1-2 SOL\n\n🔍 Check balance after funding:\nhttps://explorer.solana.com/address/${walletAddress}?cluster=devnet`);
            }).catch(() => {
                alert(`✅ Faucet opened!\n\n📋 Copy this wallet address:\n${walletAddress}\n\n💰 Paste the address and request 1-2 SOL\n\n🔍 Check balance after funding:\nhttps://explorer.solana.com/address/${walletAddress}?cluster=devnet`);
            });
        }, 1000);
    }

    async function checkLastTransaction() {
        if (!lastTransactionSignature) {
            alert('❌ No transaction signature available. Please request an airdrop first.');
            return;
        }

        try {
            isCheckingTransaction = true;
            console.log('🔍 Checking transaction status:', lastTransactionSignature);

            const transaction = await checkTransactionStatus(lastTransactionSignature);

            if (transaction) {
                alert(`✅ Transaction Confirmed!\n\n📋 Signature: ${lastTransactionSignature}\n\n📅 Slot: ${transaction.slot}\n\n⏱️ Status: Confirmed\n\n💰 Amount: 1 SOL\n\n🔍 View: https://explorer.solana.com/tx/${lastTransactionSignature}?cluster=devnet`);
            } else {
                alert(`⏳ Transaction Pending\n\n📋 Signature: ${lastTransactionSignature}\n\n💡 Status: Still processing (may take 10-30 seconds)\n\n🔍 Check manually: https://explorer.solana.com/tx/${lastTransactionSignature}?cluster=devnet`);
            }

        } catch (error) {
            console.error('❌ Failed to check transaction:', error);
            alert(`❌ Transaction Check Failed: ${error.message || error}\n\nTry checking manually on the explorer.`);
        } finally {
            isCheckingTransaction = false;
        }
    }

    async function checkWalletBalance() {
        if (!claimData.userWallet) {
            alert('❌ No wallet address available. Generate a wallet first!');
            return;
        }

        try {
            isCheckingBalance = true;
            console.log('💰 Checking balance for:', claimData.userWallet);

            const balance = await getWalletBalance(claimData.userWallet);
            walletBalance = balance;

            console.log(`✅ Balance updated: ${balance} SOL`);

            alert(`💰 Wallet Balance:\n\n📍 Address: ${claimData.userWallet}\n💰 SOL Balance: ${balance} SOL\n\n🌐 Network: Solana Devnet\n\n${balance > 0 ? '🎉 Ready for transactions!' : '💡 Request SOL from faucet if balance is 0'}`);

        } catch (error) {
            console.error('❌ Failed to check balance:', error.message || error);
            alert(`❌ Failed to check balance: ${error.message || error}\n\nTry again or check manually on explorer.`);
        } finally {
            isCheckingBalance = false;
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
                alert('Copied to clipboard!');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    }

    function closeCreateWalletModal() {
        console.log('🚪 Closing wallet info modal - Sensitive data will be cleared');
        showCreateWalletModal = false;
        isCreatingWallet = false; // Reset creating state
        // Clear sensitive data permanently
        newWallets = null;
        console.log('🗑️ Wallet sensitive data cleared - Cannot be viewed again!');
    }

    // Transfer functions
    function openTransferModal() {
        transferData = {
            recipientAddress: '',
            amount: '',
            networkFee: 'medium',
            estimatedGas: calculateGasFee('medium'),
            totalCost: '0.000021'
        };
        transferError = '';
        showTransferModal = true;
    }

    function openGamePoolTransferModal() {
        transferData = {
            recipientAddress: 'BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19', // Game Pool address
            amount: '',
            networkFee: 'medium',
            estimatedGas: calculateGasFee('medium'),
            totalCost: '0.000021'
        };
        transferError = '';
        showTransferModal = true;
    }

    function closeTransferModal() {
        showTransferModal = false;
        transferData = {
            recipientAddress: '',
            amount: '',
            networkFee: 'medium',
            estimatedGas: '0.000021',
            totalCost: '0.000021'
        };
        transferError = '';
    }

    function calculateGasFee(level) {
        // Simulate gas fee calculation based on network and fee level
        const baseFees = {
            ethereum: { low: 0.000015, medium: 0.000021, high: 0.000035 },
            solana: { low: 0.000005, medium: 0.00001, high: 0.00002 },
            sui: { low: 0.0001, medium: 0.0002, high: 0.0005 }
        };

        return baseFees[selectedNetwork]?.[level] || 0.000021;
    }

    function updateTransferCalculations() {
        const gasFee = calculateGasFee(transferData.networkFee);
        const amount = parseFloat(transferData.amount) || 0;
        const total = gasFee + amount;

        transferData.estimatedGas = gasFee.toString();
        transferData.totalCost = total.toFixed(6);
    }


    async function executeTransfer() {
        transferError = '';

        // Validation
        if (!transferData.recipientAddress.trim()) {
            transferError = 'Please enter recipient address';
            return;
        }

        if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
            transferError = 'Please enter a valid amount';
            return;
        }

        const transferAmount = parseFloat(transferData.amount);
        const availableBalance = parseFloat(walletInfo.balance);
        const totalCost = parseFloat(transferData.totalCost);

        if (totalCost > availableBalance) {
            transferError = 'Insufficient balance for this transaction';
            return;
        }

        // Basic address validation
        if (selectedNetwork === 'ethereum' && !transferData.recipientAddress.startsWith('0x')) {
            transferError = 'Invalid Ethereum address format';
            return;
        }

        isTransferring = true;

        try {
            // Special case: Real transfer to Game Pool
            const gamePoolAddress = 'BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19';
            if (transferData.recipientAddress === gamePoolAddress && selectedNetwork === 'solana') {
                console.log('🎮 Executing real transfer to Game Pool:', {
                    from: walletInfo.address,
                    to: gamePoolAddress,
                    amount: transferAmount
                });

                // Get Solana wallet
                const solanaWallet = userWallets.find(w => w.network === 'solana' && w.wallet_type === 'generated');
                if (!solanaWallet || !solanaWallet.private_key) {
                    transferError = 'No Solana wallet found or missing private key for real transfer';
                    return;
                }

                // Convert private key string to Uint8Array for Solana
                let secretKeyArray;
                try {
                    // If it's stored as comma-separated string, convert back to array
                    if (solanaWallet.private_key.includes(',')) {
                        secretKeyArray = new Uint8Array(solanaWallet.private_key.split(',').map(Number));
                    } else {
                        // If it's base64 or other format, handle accordingly
                        secretKeyArray = new Uint8Array(JSON.parse(`[${solanaWallet.private_key}]`));
                    }
                } catch (e) {
                    transferError = 'Invalid private key format';
                    return;
                }

                // Import WalletService and perform real transfer
                const { WalletService } = await import('$lib/services/walletService');
                const result = await WalletService.transferTokensToGamePool(
                    solanaWallet.address,
                    secretKeyArray,
                    transferAmount
                );

                if (result.success) {
                    // Update local balance
                    const newBalance = (availableBalance - transferAmount).toFixed(4);
                    walletInfo.balance = newBalance;

                    // Update database balance
                    await pocketbaseService.updateWalletBalance(solanaWallet.id, parseFloat(newBalance));
                    await loadUserWallets(currentUser?.id); // Refresh data

                    alert(`✅ Real transfer to Game Pool successful!\nSent ${transferAmount} Game Tokens\nTransaction: ${result.signature}`);
                    closeTransferModal();
                } else {
                    transferError = result.error || 'Real transfer to Game Pool failed';
                }
            } else {
                // Simulate transfer for other cases
                console.log('🔄 Executing simulated transfer:', {
                    from: walletInfo.address,
                    to: transferData.recipientAddress,
                    amount: transferAmount,
                    network: selectedNetwork,
                    gasFee: transferData.estimatedGas
                });

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Update local balance (simulation)
                const newBalance = (availableBalance - totalCost).toFixed(4);
                walletInfo.balance = newBalance;

                // Update database balance
                const dbWallet = userWallets.find(wallet => wallet.network === selectedNetwork);
                if (dbWallet) {
                    await pocketbaseService.updateWalletBalance(dbWallet.id, parseFloat(newBalance));
                    await loadUserWallets(currentUser?.id); // Refresh data
                }

                alert(`✅ Transfer successful!\nSent ${transferAmount} ${walletInfo.symbol} to ${transferData.recipientAddress.slice(0, 10)}...`);
                closeTransferModal();
            }

        } catch (error) {
            console.error('Transfer failed:', error);
            transferError = 'Transfer failed. Please try again.';
        } finally {
            isTransferring = false;
        }
    }

    // Swap functions
    function openSwapModal() {
        // Reset swap data with current network
        swapData = {
            fromToken: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC',
            toToken: selectedNetwork === 'ethereum' ? 'USDT' : selectedNetwork === 'solana' ? 'USDC' : 'USDT',
            amount: '',
            slippage: '0.5',
            estimatedReceive: '0.00',
            exchangeRate: '0.00',
            networkFee: '0.000021',
            minimumReceived: '0.00'
        };
        swapError = '';
        showSwapModal = true;
    }

    function closeSwapModal() {
        showSwapModal = false;
        swapData = {
            fromToken: selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC',
            toToken: selectedNetwork === 'ethereum' ? 'USDT' : selectedNetwork === 'solana' ? 'USDC' : 'USDT',
            amount: '',
            slippage: '0.5',
            estimatedReceive: '0.00',
            exchangeRate: '0.00',
            networkFee: '0.000021',
            minimumReceived: '0.00'
        };
        swapError = '';
    }

    function swapTokens() {
        const temp = swapData.fromToken;
        swapData.fromToken = swapData.toToken;
        swapData.toToken = temp;
        updateSwapCalculations();
    }

    function getMockExchangeRate(fromToken, toToken) {
        // Mock exchange rates for demo
        const rates = {
            'ETH-USDT': 3200,
            'ETH-USDC': 3200,
            'SOL-USDT': 180,
            'SOL-USDC': 180,
            'BTC-USDT': 95000,
            'BTC-USDC': 95000,
            'USDT-ETH': 1/3200,
            'USDC-ETH': 1/3200,
            'USDT-SOL': 1/180,
            'USDC-SOL': 1/180,
            'USDT-BTC': 1/95000,
            'USDC-BTC': 1/95000
        };

        const key = `${fromToken}-${toToken}`;
        return rates[key] || 1;
    }

    function updateSwapCalculations() {
        const amount = parseFloat(swapData.amount) || 0;
        const rate = getMockExchangeRate(swapData.fromToken, swapData.toToken);
        const estimatedReceive = amount * rate;
        const slippagePercent = parseFloat(swapData.slippage) / 100;
        const minimumReceived = estimatedReceive * (1 - slippagePercent);

        swapData.estimatedReceive = estimatedReceive.toFixed(6);
        swapData.exchangeRate = `1 ${swapData.fromToken} = ${rate.toFixed(6)} ${swapData.toToken}`;
        swapData.minimumReceived = minimumReceived.toFixed(6);
    }

    async function executeSwap() {
        swapError = '';

        // Validation
        if (!swapData.amount || parseFloat(swapData.amount) <= 0) {
            swapError = 'Please enter a valid amount';
            return;
        }

        const swapAmount = parseFloat(swapData.amount);
        const availableBalance = parseFloat(walletInfo.balance);

        if (swapAmount > availableBalance) {
            swapError = 'Insufficient balance for this swap';
            return;
        }

        isSwapping = true;

        try {
            // Simulate swap process
            console.log('🔄 Executing swap:', {
                from: swapData.fromToken,
                to: swapData.toToken,
                amount: swapAmount,
                estimatedReceive: swapData.estimatedReceive,
                network: selectedNetwork
            });

            // Simulate DEX processing time
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Update balance (simulate receiving new token)
            const receivedAmount = parseFloat(swapData.estimatedReceive);

            // For demo, we'll just show the swap was successful
            alert(`✅ Swap successful!\nSwapped ${swapAmount} ${swapData.fromToken} for ${receivedAmount.toFixed(4)} ${swapData.toToken}`);

            closeSwapModal();

        } catch (error) {
            console.error('Swap failed:', error);
            swapError = 'Swap failed. Please try again.';
        } finally {
            isSwapping = false;
        }
    }

    // Energy functions - simplified

    async function convertEnergyToCrypto() {
        if (!canConvertEnergy) {
            alert('Energy conversion is currently disabled. Please wait for admin approval.');
            return;
        }

        if (energyPoints <= 0) {
            alert('No energy points to convert.');
            return;
        }

        const energyToConvert = Math.floor(energyPoints); // Store before conversion (ensure integer)
        const cryptoAmount = energyToConvert * energyConversionRate;
        const confirmMessage = `Convert ${energyToConvert} E to ${cryptoAmount.toFixed(6)} ${walletInfo.symbol}?\n\nRate: 1 E = ${energyConversionRate} ${walletInfo.symbol}`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            console.log('🔄 Converting energy to crypto...');
            const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
                const unsubscribe = authStore.subscribe(state => resolve(state));
                unsubscribe();
            });
            console.log('📊 Current state:', {
                selectedNetwork,
                energyPoints,
                energyToConvert,
                cryptoAmount,
                walletInfo_symbol: walletInfo.symbol,
                userWallets_count: userWallets.length,
                isAuthenticated: authState.isAuthenticated
            });

            // Simulate conversion processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update wallet balance in database
            const dbWallet = userWallets.find(wallet => wallet.network === selectedNetwork);
            if (dbWallet && dbWallet.id) {
                try {
                    const currentBalance = parseFloat(dbWallet.balance?.toString() || '0') || 0;
                    const newBalance = Number(currentBalance + cryptoAmount);

                    await pocketbaseService.updateWalletBalance(dbWallet.id, newBalance);
                    console.log('✅ Updated wallet balance in database');

                    // Reload wallets to sync UI
                    await loadUserWallets(currentUser?.id);
                    console.log('✅ Reloaded wallets after balance update');
                } catch (walletError) {
                    console.error('❌ Failed to update wallet balance:', walletError);
                    throw new Error(`Wallet balance update failed: ${walletError.message}`);
                }
            } else {
                console.warn('⚠️ No wallet found for network:', selectedNetwork);
            }

            // Deduct converted energy from database
            try {
                await pocketbaseService.subtractEnergyPoints(energyToConvert);
                console.log('✅ Deducted energy points from database');
            } catch (energyError) {
                console.error('❌ Failed to subtract energy points:', energyError);
                throw new Error(`Energy subtraction failed: ${energyError.message}`);
            }

            // Reload energy to sync UI
            try {
                console.log('🔄 Reloading energy data...');
                await loadUserEnergy();
                console.log('✅ Reloaded energy data, new energyPoints:', energyPoints);
            } catch (reloadError) {
                console.error('❌ Failed to reload energy data:', reloadError);
                console.error('❌ Reload error details:', reloadError);
                // Don't throw here - allow conversion to complete even if reload fails
                // throw new Error(`Energy reload failed: ${reloadError.message}`);
            }

            alert(`✅ Successfully converted ${energyToConvert} E to ${cryptoAmount.toFixed(6)} ${walletInfo.symbol}!`);

        } catch (error) {
            console.error('Energy conversion failed:', error);
            alert('Energy conversion failed. Please try again.');
        }
    }

    // Admin function to enable/disable energy conversion
    function toggleEnergyConversion() {
        canConvertEnergy = !canConvertEnergy;
        console.log('Energy conversion', canConvertEnergy ? 'enabled' : 'disabled');
    }

    // Convert crypto to energy
    async function convertCryptoToEnergy() {
        if (!walletInfo.address || parseFloat(walletInfo.balance) <= 0) {
            alert('No crypto balance to convert.');
            return;
        }

        const cryptoAmount = parseFloat(walletInfo.balance);
        const energyAmount = cryptoAmount / energyConversionRate;
        const confirmMessage = `Convert ${cryptoAmount.toFixed(6)} ${walletInfo.symbol} to ${Math.floor(energyAmount)} E?\n\nRate: 1 ${walletInfo.symbol} = ${1/energyConversionRate} E`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            console.log('🔄 Converting crypto to energy...');

            // Simulate conversion processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update wallet balance in database (subtract)
            const dbWallet = userWallets.find(wallet => wallet.network === selectedNetwork);
            if (dbWallet && dbWallet.id) {
                const currentBalance = parseFloat(dbWallet.balance?.toString() || '0') || 0;
                const newBalance = Number(Math.max(0, currentBalance - cryptoAmount));

                await pocketbaseService.updateWalletBalance(dbWallet.id, newBalance);
                console.log('✅ Updated wallet balance in database');

                // Reload wallets to sync UI
                await loadUserWallets(currentUser?.id);
            }

            // Add energy points to database
            await pocketbaseService.addEnergyPoints(Math.floor(energyAmount));
            console.log('✅ Added energy points to database');

            // Reload energy to sync UI
            await loadUserEnergy();

            alert(`✅ Successfully converted ${cryptoAmount.toFixed(6)} ${walletInfo.symbol} to ${Math.floor(energyAmount)} E!`);

        } catch (error) {
            console.error('Crypto to energy conversion failed:', error);
            alert('Conversion failed. Please try again.');
        }
    }

    // Add energy points (for testing/admin purposes)
    async function addEnergyForTesting(points: number) {
        try {
            await pocketbaseService.addEnergyPoints(points);
            await loadUserEnergy();
            console.log(`✅ Added ${points} energy points for testing`);
        } catch (error) {
            console.error('Failed to add energy points:', error);
        }
    }

    async function testEnergyOperations() {
        try {
            console.log('🧪 Testing energy operations...');

            // Test getting current energy
            console.log('1. Testing get current energy...');
            const currentEnergy = await pocketbaseService.getOrCreateUserEnergy();
            console.log('Current energy:', currentEnergy);

            // Test direct update to different integer values
            console.log('2. Testing direct update to 10...');
            try {
                const updateResult1 = await pocketbaseService.updateEnergyPoints(10, null);
                console.log('Update to 10 result:', updateResult1);
            } catch (e) {
                console.error('❌ Update to 10 failed:', e);
            }

            console.log('3. Testing direct update to 5...');
            try {
                const updateResult2 = await pocketbaseService.updateEnergyPoints(5, null);
                console.log('Update to 5 result:', updateResult2);
            } catch (e) {
                console.error('❌ Update to 5 failed:', e);
            }

            console.log('4. Testing direct update to 2...');
            try {
                const updateResult3 = await pocketbaseService.updateEnergyPoints(2, null);
                console.log('Update to 2 result:', updateResult3);
            } catch (e) {
                console.error('❌ Update to 2 failed:', e);
            }

            console.log('5. Testing direct update to 1...');
            try {
                const updateResult4 = await pocketbaseService.updateEnergyPoints(1, null);
                console.log('Update to 1 result:', updateResult4);
            } catch (e) {
                console.error('❌ Update to 1 failed:', e);
            }

            // Reload to verify
            await loadUserEnergy();

            alert('✅ Energy operations test completed! Check console for details.');
        } catch (error) {
            console.error('❌ Energy operations test failed:', error);
            alert('❌ Energy operations test failed: ' + error.message);
        }
    }

    // Initialize authentication state and listen for auth changes
    onMount(() => {
        console.log('🚀 Initializing STEPN Wallet...');

        // Check authentication state
        updateAuthState().then(async () => {
            const authState = await new Promise<import('$lib/stores/auth').AuthState>(resolve => {
                const unsubscribe = authStore.subscribe(state => resolve(state));
                unsubscribe();
            });
            console.log('✅ Auth state initialized:', { isAuthenticated: authState.isAuthenticated, currentUser: currentUser?.email });
            // Fix tab alignment after auth state is initialized
            setTimeout(fixTabAlignment, 100);
        });

        // Listen for authentication events
        if (typeof window !== 'undefined') {
            window.addEventListener('pocketbase-auth-success', updateAuthState);
            window.addEventListener('pocketbase-auth-logout', updateAuthState);
        }

        // Listen for auth store changes (for logout from other components)
        const unsubscribe = authStore.subscribe((authState) => {
            console.log('🔄 Auth store changed in wallet page:', authState.isAuthenticated);
            if (!authState.isAuthenticated) {
                // User logged out, clear wallet display immediately
                console.log('🚪 User logged out via auth store, clearing wallet display');
                currentUser = null;
                walletInfo = {
                    detected: false,
                    connected: false,
                    address: '',
                    type: '',
                    balance: '0.0000',
                    symbol: 'ETH'
                };
                userWallets = [];
                userEnergy = null;
                energyPoints = 0;
                showWallet = false;
            }
        });

        // Change favicon to wallet emoji
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23000" rx="2"/><text x="8" y="12" font-family="Arial" font-size="12" fill="%23fff" text-anchor="middle">👛</text></svg>';
        document.head.appendChild(link);

        return () => {
            // Cleanup event listeners
            if (typeof window !== 'undefined') {
                window.removeEventListener('pocketbase-auth-success', updateAuthState);
                window.removeEventListener('pocketbase-auth-logout', updateAuthState);
            }
            // Cleanup auth store subscription
            unsubscribe();
        };
    });
</script>

<style>
    /* Minimalist Tech Design - Black Background, White Text */

    .wallet-page {
        width: 100%;
        min-height: 100vh;
        background: #000000;
        font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .page-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
    }

    .page-header {
        text-align: center;
        padding: 4rem 2rem;
        max-width: 800px;
        margin: 0 auto;
    }

    .page-header h1 {
        font-size: 3rem;
        font-weight: 300;
        margin-bottom: 1.5rem;
        color: #ffffff;
        letter-spacing: -0.02em;
        line-height: 1.1;
        position: relative;
    }

    .page-header h1::after {
        content: '';
        position: absolute;
        bottom: -0.5rem;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 1px;
        background: #ffffff;
        opacity: 0.3;
    }

    .page-header p {
        font-size: 1.2rem;
        font-weight: 400;
        color: #b0b0b0;
        margin-bottom: 4rem;
        line-height: 1.6;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }

    /* Make all SVG icons gray */
    .wallet-page svg {
        filter: grayscale(100%) brightness(0.7);
    }
    
    .wallet-page svg * {
        fill: #888 !important;
    }
    
    /* Make emojis gray - apply filter to elements with emoji class */
    .wallet-page .emoji-icon {
        filter: grayscale(100%) brightness(0.85);
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 0.5rem;
        vertical-align: middle;
    }

    /* Tab button alignment - ensure both Energy and Wallet tabs are aligned */
    .tab-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
        flex-direction: row !important;
    }

    /* Override any conflicting styles */
    .wallet-page .tab-button,
    .wallet-page .nav-link {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
        flex-direction: row !important;
    }

    /* Wallet empty state icons */
    .wallet-empty-icon {
        width: 32px !important;
        height: 32px !important;
        color: white !important;
        stroke-width: 1.5 !important;
    }

    .plus-icon {
        width: 18px !important;
        height: 18px !important;
        stroke-width: 2 !important;
    }

    /* Focus effect for all buttons */
    .wallet-page button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
    }

    /* Hover effect for all buttons */
    .wallet-page button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
        opacity: 1 !important;
    }

    .wallet-page button:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    }

    /* Specific hover effects for different button types */
    .wallet-page button[style*="linear-gradient"]:hover:not(:disabled) {
        filter: brightness(1.1);
    }

    .wallet-page button[style*="rgba(255, 71, 87"]:hover:not(:disabled) {
        background: rgba(255, 71, 87, 0.2) !important;
        border-color: rgba(255, 71, 87, 0.4) !important;
    }

    .wallet-page button[style*="rgba(155, 89, 182"]:hover:not(:disabled) {
        background: rgba(155, 89, 182, 0.2) !important;
        border-color: rgba(155, 89, 182, 0.4) !important;
    }

    .wallet-page button[style*="transparent"]:hover:not(:disabled) {
        opacity: 0.8;
    }

    /* Authentication styles */
    .auth-required {
        background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .page-content {
            padding: 1rem;
        }

        .page-header {
            padding: 2rem 1rem;
        }

        .page-header h1 {
            font-size: 2.2rem;
        }

        .page-header p {
            font-size: 1rem;
            margin-bottom: 3rem;
        }
    }

    @media (max-width: 480px) {
        .page-content {
            padding: 0.75rem;
        }

        .page-header {
            padding: 1.5rem 1rem;
        }

        .page-header h1 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
        }

        .page-header p {
            font-size: 0.95rem;
            margin-bottom: 2rem;
        }
    }
</style>

<svelte:head>
    <title>STEPN Wallet</title>
</svelte:head>

<div class="wallet-page" style="min-height: 100vh; background: #000000; color: #ffffff; font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

    <main class="page-content">

                <!-- Tab Navigation -->
                {#if $authStore.isAuthenticated}
                    <div>
                        <div style="display: flex; gap: 0; max-width: 480px; margin: 0 auto; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px 16px 0 0; overflow: hidden;">
                            <button
                                class="tab-button"
                                class:active={currentTab === 'game'}
                                on:click={() => currentTab = 'game'}
                                style="flex: 1; padding: 1rem 1.5rem; border: none; background: {currentTab === 'game' ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'transparent'}; color: {currentTab === 'game' ? '#000000' : '#b0b0b0'}; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border-radius: {currentTab === 'game' ? '16px 16px 0 0' : '0'}; margin-bottom: {currentTab === 'game' ? '-1px' : '0'}; position: relative; z-index: {currentTab === 'game' ? '1' : '0'}; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <Zap class="emoji-icon" /> Energy
                            </button>
                            <button
                                class="tab-button"
                                class:active={currentTab === 'wallet'}
                                on:click={() => currentTab = 'wallet'}
                                style="flex: 1; padding: 1rem 1.5rem; border: none; background: {currentTab === 'wallet' ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'transparent'}; color: {currentTab === 'wallet' ? '#000000' : '#b0b0b0'}; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border-radius: {currentTab === 'wallet' ? '16px 16px 0 0' : '0'}; margin-bottom: {currentTab === 'wallet' ? '-1px' : '0'}; position: relative; z-index: {currentTab === 'wallet' ? '1' : '0'}; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <Wallet class="emoji-icon" /> Wallet
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Main Content -->
                <!-- DEBUG: Authentication state -->
                <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; z-index: 9999;">
                    Auth: {$authStore.isAuthenticated ? '✅ TRUE' : '❌ FALSE'} | User: {$authStore.user?.email || 'none'}
                    <button style="margin-left: 10px; background: #446bff; color: white; border: none; border-radius: 3px; padding: 2px 5px; font-size: 10px; cursor: pointer;" on:click={updateAuthState}>
                        Refresh
                    </button>
                    <button style="margin-left: 5px; background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 5px; font-size: 10px; cursor: pointer;" on:click={forceClearAuth}>
                        Clear
                    </button>
                    <button style="margin-left: 5px; background: #44ff44; color: white; border: none; border-radius: 3px; padding: 2px 5px; font-size: 10px; cursor: pointer;" on:click={testLogin}>
                        Test Login
                    </button>
                </div>

                {#if $authStore.isAuthenticated}
                    <div class="wallet-container" style="max-width: 480px; margin: 0 auto;">


        <!-- Loading State -->
        {#if typeof $authStore.isAuthenticated === 'undefined'}
            <div style="text-align: center; padding: 4rem;">
                <div style="width: 48px; height: 48px; border: 4px solid #446bff; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <h2 style="color: #f6f8ff; margin: 0 0 0.5rem 0;">Loading STEPN Wallet...</h2>
                <p style="color: #888; margin: 0;">Initializing authentication state</p>
            </div>
        {:else if $authStore.isAuthenticated && currentTab === 'game'}
            <!-- Energy Dashboard -->
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; color: #ffffff;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #f39c12, #e67e22); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><Zap class="emoji-icon" /></div>
                    <div>
                        <h2 style="color: #ffffff; margin: 0 0 0.25rem 0; font-size: 1.5rem;">Energy (E)</h2>
                        <p style="color: #b0b0b0; margin: 0; font-size: 0.9rem;">Your game energy balance</p>
                    </div>
                </div>

                <!-- Energy Display -->
                <div style="background: rgba(255, 255, 255, 0.02); border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid rgba(255, 255, 255, 0.08); position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: #b0b0b0; font-size: 0.9rem;">Energy Balance</span>
                            {#if isLoadingEnergy}
                                <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                            {/if}
                        </div>
                        {#if isLoadingEnergy}
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <span style="color: #ffffff; font-size: 0.9rem;">Loading...</span>
                            </div>
                        {/if}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 2.5rem; font-weight: 700; color: #ffffff;">
                                {#if isLoadingEnergy}
                                    --
                                {:else}
                                    {energyPoints}
                                {/if}
                            </span>
                            <span style="color: #ffffff; font-size: 1.2rem; font-weight: 600;">E</span>
                        </div>
                    </div>
                </div>

                <!-- Convert Buttons -->
                <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
                    <!-- Convert Energy to Crypto -->
                    <button
                        style="background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%); border: none; border-radius: 16px; padding: 1.5rem 2rem; color: #000000; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); transition: all 0.2s; opacity: {canConvertEnergy && energyPoints > 0 ? 1 : 0.6}; flex: 1;"
                        disabled={!canConvertEnergy || energyPoints <= 0}
                        on:click={() => convertEnergyToCrypto()}>
                        <div style="font-size: 1.2rem; margin-bottom: 0.25rem;"><Zap class="emoji-icon" />→<DollarSign class="emoji-icon" /></div>
                        <div style="font-size: 0.8rem;">E to {walletInfo.symbol}</div>
                    </button>

                    <!-- Convert Crypto to Energy -->
                    <button
                        style="background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%); border: none; border-radius: 16px; padding: 1.5rem 2rem; color: #000000; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); transition: all 0.2s; opacity: {walletInfo.address && parseFloat(walletInfo.balance) > 0 ? 1 : 0.6}; flex: 1;"
                        disabled={!walletInfo.address || parseFloat(walletInfo.balance) <= 0}
                        on:click={() => convertCryptoToEnergy()}>
                        <div style="font-size: 1.2rem; margin-bottom: 0.25rem;"><DollarSign class="emoji-icon" />→<Zap class="emoji-icon" /></div>
                        <div style="font-size: 0.8rem;">{walletInfo.symbol} to E</div>
                    </button>
                </div>

                <!-- Claim Energies Button -->
                <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                    <button
                        style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); border: none; border-radius: 16px; padding: 1rem 3rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); transition: all 0.2s; opacity: {energyPoints > 0 ? 1 : 0.6};"
                        disabled={energyPoints <= 0}
                        on:click={() => openClaimModal()}>
                        <div style="font-size: 1.2rem; margin-bottom: 0.25rem;"><Zap class="emoji-icon" />→<Wallet class="emoji-icon" /></div>
                        <div style="font-size: 0.8rem;">Claim E to Wallet</div>
                    </button>
                </div>
                    {#if !canConvertEnergy}
                        <p style="color: #888; font-size: 0.8rem; margin-top: 1rem;">
                            ⚠️ Energy conversion is currently disabled. Please wait for admin approval.
                        </p>
                    {/if}
                    {#if energyPoints === 0}
                        <p style="color: #888; font-size: 0.8rem; margin-top: 1rem;">
                            <span class="emoji-icon">💡</span> You need Energy points to convert. Play games to earn E!
                        </p>
                    {/if}
                </div>

                <!-- Conversion Rates -->
                <div style="background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.75rem; margin-top: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <RotateCcw class="emoji-icon" style="font-size: 0.8rem;" />
                        <span style="color: #b0b0b0; font-size: 0.75rem; font-weight: 500;">Conversion Rates</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <!-- Energy to Crypto -->
                        <div style="text-align: center; padding: 0.5rem; background: rgba(255, 255, 255, 0.02); border-radius: 6px;">
                            <div style="color: #ffffff; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem;">
                                E → {selectedNetwork.toUpperCase()}
                            </div>
                            <div style="color: #b0b0b0; font-size: 0.65rem;">
                                1 E = {energyConversionRate} {selectedNetwork.toUpperCase()}
                            </div>
                        </div>
                        <!-- Crypto to Energy -->
                        <div style="text-align: center; padding: 0.5rem; background: rgba(255, 255, 255, 0.02); border-radius: 6px;">
                            <div style="color: #ffffff; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.25rem;">
                                {selectedNetwork.toUpperCase()} → E
                            </div>
                            <div style="color: #b0b0b0; font-size: 0.65rem;">
                                1 {selectedNetwork.toUpperCase()} = {Math.round(1/energyConversionRate)} E
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Admin Controls (only show for demo) -->
                <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #253157;">
                    <h4 style="color: #f6f8ff; margin: 0 0 1rem 0; font-size: 0.9rem;">Admin Controls</h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button
                            style="background: rgba(155, 89, 182, 0.1); border: 1px solid rgba(155, 89, 182, 0.3); color: #9b59b6; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;"
                            on:click={() => toggleEnergyConversion()}>
                            {#if canConvertEnergy}
                                <Lock class="emoji-icon" /> Disable
                            {:else}
                                <Unlock class="emoji-icon" /> Enable
                            {/if}
                            Energy Conversion
                        </button>
                        <button
                            style="background: rgba(243, 156, 18, 0.1); border: 1px solid rgba(243, 156, 18, 0.3); color: #f39c12; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;"
                            on:click={() => addEnergyForTesting(100)}>
                            <Zap class="emoji-icon" /> +100 Energy
                        </button>
                    </div>
                </div>

        {:else if $authStore.isAuthenticated && currentTab === 'wallet'}
                {#if !isCreatingWallet}
                        <!-- Network Selector Tabs -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 0.5rem;">
                    <button class="network-tab"
                        style="flex: 1; padding: 0.75rem; border: none; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                               background: {selectedNetwork === 'ethereum' ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'transparent'};
                               color: {selectedNetwork === 'ethereum' ? '#000000' : '#b0b0b0'};
                               border: {selectedNetwork === 'ethereum' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
                               box-shadow: {selectedNetwork === 'ethereum' ? '0 4px 15px rgba(255, 255, 255, 0.1)' : 'none'};"
                        on:click={() => selectedNetwork = 'ethereum'}>
                        <svg width="18" height="18" viewBox="0 0 784.37 1277.39" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; filter: grayscale(100%);">
                            <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" fill="#888"/>
                            <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" fill="#888" opacity="0.6"/>
                            <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" fill="#888" opacity="0.6"/>
                            <polygon points="392.07,1277.38 392.07,956.52 0,724.89" fill="#888" opacity="0.4"/>
                            <polygon points="392.07,882.29 784.13,650.54 392.07,472.33" fill="#888" opacity="0.3"/>
                            <polygon points="0,650.54 392.07,882.29 392.07,472.33" fill="#888" opacity="0.3"/>
                        </svg>
                        <span>ETH</span>
                </button>
                    <button class="network-tab"
                        style="flex: 1; padding: 0.75rem; border: none; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                               background: {selectedNetwork === 'solana' ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'transparent'};
                               color: {selectedNetwork === 'solana' ? '#000000' : '#b0b0b0'};
                               border: {selectedNetwork === 'solana' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
                               box-shadow: {selectedNetwork === 'solana' ? '0 4px 15px rgba(255, 255, 255, 0.1)' : 'none'};"
                        on:click={() => selectedNetwork = 'solana'}>
                        <svg width="18" height="18" viewBox="0 0 398 393" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; filter: grayscale(100%);">
                            <defs>
                                <linearGradient id="solana-gradient-tab" x1="99.5%" y1="43.1%" x2=".5%" y2="56.9%">
                                    <stop offset="0%" stop-color="#888"/>
                                    <stop offset="100%" stop-color="#888"/>
                                </linearGradient>
                            </defs>
                            <path d="M64.6 237.9c3.4-3.5 8.7-3.5 12.1 0l89.2 91.2c3.4 3.5 3.4 9.1 0 12.6L76.7 393c-3.4 3.5-8.7 3.5-12.1 0l-89.2-91.2c-3.4-3.5-3.4-9.1 0-12.6l89.2-91.2z" fill="#888"/>
                            <path d="M64.6 162.7c3.4-3.5 8.7-3.5 12.1 0l89.2 91.2c3.4 3.5 3.4 9.1 0 12.6L76.7 317.8c-3.4 3.5-8.7 3.5-12.1 0l-89.2-91.2c-3.4-3.5-3.4-9.1 0-12.6l89.2-91.2z" fill="#888" opacity="0.8"/>
                            <path d="M64.6 87.5c3.4-3.5 8.7-3.5 12.1 0l89.2 91.2c3.4 3.5 3.4 9.1 0 12.6L76.7 242.6c-3.4 3.5-8.7 3.5-12.1 0l-89.2-91.2c-3.4-3.5-3.4-9.1 0-12.6l89.2-91.2z" fill="#888" opacity="0.6"/>
                            <path d="M64.6 12.3c3.4-3.5 8.7-3.5 12.1 0l89.2 91.2c3.4 3.5 3.4 9.1 0 12.6L76.7 167.4c-3.4 3.5-8.7 3.5-12.1 0l-89.2-91.2c-3.4-3.5-3.4-9.1 0-12.6l89.2-91.2z" fill="#888" opacity="0.4"/>
                        </svg>
                        <span>SOL</span>
                </button>
                    <button class="network-tab"
                        style="flex: 1; padding: 0.75rem; border: none; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                               background: {selectedNetwork === 'sui' ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' : 'transparent'};
                               color: {selectedNetwork === 'sui' ? '#000000' : '#b0b0b0'};
                               border: {selectedNetwork === 'sui' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
                               box-shadow: {selectedNetwork === 'sui' ? '0 4px 15px rgba(255, 255, 255, 0.1)' : 'none'};"
                        on:click={() => selectedNetwork = 'sui'}>
                        <svg width="18" height="18" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; filter: grayscale(100%);">
                            <circle cx="32" cy="32" r="30" fill="#888"/>
                            <path d="M42.2 26.1c-.3-2-1.5-3.8-3.3-4.7l.7-2.8-1.7-.4-.7 2.8c-.5-.1-.9-.2-1.4-.3l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.7-.2-1.1-.3l-2.4-.6-.5 1.8c-.4-.1-.8-.2-1.2-.3l0 0c-.2-.1-.5-.1-.7-.2l-.9-.2-.2.7l-2.4.6c-.5.1-.9.3-1.1.6-.4.6-.1 1.4.2 1.8.2.3.5.5.9.6l-.7 2.8c-.1.1-.2.1-.3.1l-1.5 5.9c-.1.1-.2.1-.3.1l-.7 2.8c-.3 2 1.3 3.8 3.3 4.7l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.3.4 4.1.3 4.8-1.6.6-1.6 0-2.5-1.3-3.8.9-.2 1.8-.4 2.1-1.4.1-.3.1-.6 0-.9-.1-.4-.5-.6-.5-.6zm-5.9 11.1c-.4 1.8-3.5 2.6-6 1.4l-1.1-2.7c2.5 1.2 5.1.7 5.5-.6l.1-.4-1.8-4.5c-.4 1.8-3.5 2.6-6 1.4l-1-2.5c2.5 1.2 5.1.7 5.5-.6l.7 2.7z" fill="#666"/>
                        </svg>
                        <span>SUI</span>
                </button>
            </div>

                <!-- Balance Display -->
                {#if showWallet}
                <div style="background: rgba(255, 255, 255, 0.02); border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid rgba(255, 255, 255, 0.08); position: relative; z-index: 50; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: #b0b0b0; font-size: 0.9rem;">Wallet Balance</span>
                                {#if isLoadingWallets}
                                    <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                                {/if}
                            </div>
                {#if isLoadingBalance}
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    <span style="color: #ffffff; font-size: 0.9rem;">Loading...</span>
                                </div>
                {/if}
        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="balance-amount" style="font-weight: 700; font-size: 2.5rem; color: #ffffff;">
                                    {#if isLoadingBalance}
                                        --
                                    {:else if walletInfo.balance && !isNaN(parseFloat(walletInfo.balance)) && parseFloat(walletInfo.balance) > 0}
                                        {parseFloat(walletInfo.balance).toFixed(selectedNetwork === 'sui' ? 8 : 4)}
                                    {:else}
                                        0.0000
                                    {/if}
                                </span>
                                <span style="color: #ffffff; font-size: 1.2rem; font-weight: 600;">
                                    {selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'SUI'}
                                </span>
            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                                {#if walletInfo.type === 'generated' || walletInfo.type === 'Generated Wallet'}
                                    <button
                                        style="background: linear-gradient(135deg, #2ecc71, #27ae60); border: none; border-radius: 12px; padding: 0.25rem 0.5rem; color: white; cursor: pointer; font-size: 0.7rem; font-weight: 600; transition: all 0.2s;"
                                        on:click={() => loadUserWallets(currentUser?.id)}
                                        title="Refresh wallet data">
                                        <RotateCcw class="emoji-icon" />
                                    </button>
                                {:else if walletInfo.balance && parseFloat(walletInfo.balance) > 0}
                                    <div style="background: linear-gradient(135deg, #17a2b8, #4facfe); color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">
                                        <Globe class="emoji-icon" /> Live Balance
                </div>
            {:else}
                                    <button
                                        style="background: {selectedNetwork === 'ethereum' ? '#446bff' : selectedNetwork === 'solana' ? '#9945ff' : '#f7931a'}; border: none; border-radius: 8px; padding: 0.5rem 1rem; color: white; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;"
                                        on:click={() => {
                                            customAddress = 'demo_address_' + Math.random().toString(36).substr(2, 9);
                                            testCustomAddress();
                                        }}>
                                        Load Demo Balance
                                    </button>
                                {/if}
                            </div>
                        </div>
                        {#if balanceError}
                            <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 10px; padding: 0.5rem; margin-top: 1rem; font-size: 0.8rem;">
                                ⚠️ {balanceError}
                </div>
                    {/if}
                </div>
                {/if}

                <!-- Current Network Wallet Display -->
                <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 2rem; margin-bottom: 2rem;">

                    <!-- Network Header -->
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg,
                            {selectedNetwork === 'ethereum' ? '#446bff, #6b73ff' :
                             selectedNetwork === 'solana' ? '#9945ff, #7b68ee' :
                             selectedNetwork === 'sui' ? '#4da2ff, #0066cc' :
                             '#f7931a, #ff9500'}
                        ); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                            {selectedNetwork === 'ethereum' ? 'Ξ' : selectedNetwork === 'solana' ? '◎' : selectedNetwork === 'sui' ? '🔵' : '₿'}
                        </div>
                        <div>
                            <h3 style="color: #ffffff; margin: 0 0 0.25rem 0; font-size: 1.3rem;">
                                {selectedNetwork === 'ethereum' ? 'Ethereum (ETH)' :
                                 selectedNetwork === 'solana' ? 'Solana (SOL)' :
                                 selectedNetwork === 'sui' ? 'SUI' : 'Bitcoin (BTC)'}
                            </h3>
                            <p style="color: #b0b0b0; margin: 0; font-size: 0.85rem;">Your {selectedNetwork} wallet</p>
                        </div>
                    </div>

                    <!-- Wallet Address & Keys -->
                    {#if showWallet}
                        <div style="background: rgba(255, 255, 255, 0.02); border-radius: 12px; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.08);">
                            <div style="margin-bottom: 0.5rem;">
                                <span style="color: #b0b0b0; font-size: 0.8rem; font-weight: 600;">Address</span>
                            </div>
                            <p style="font-family: 'Courier New', monospace; font-size: 0.75rem; color: #ffffff; word-break: break-all; margin: 0; line-height: 1.4;">
                                {walletInfo.address}
                            </p>
                        </div>
                    {:else if $authStore.isAuthenticated && !walletInfo.address}
                        <!-- No Wallet Message -->
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2rem; text-align: center;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg,
                                {selectedNetwork === 'ethereum' ? '#446bff, #6b73ff' :
                                 selectedNetwork === 'solana' ? '#9945ff, #7b68ee' :
                                 '#f7931a, #ff9500'}
                            ); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                                <Wallet class="wallet-empty-icon" />
                            </div>
                            <h4 style="color: #ffffff; margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 600;">Chưa có ví</h4>
                            <p style="color: #b0b0b0; margin: 0 0 2rem 0; font-size: 0.9rem; line-height: 1.5;">
                                Bạn chưa có ví {selectedNetwork === 'ethereum' ? 'Ethereum' : selectedNetwork === 'solana' ? 'Solana' : 'Bitcoin'}. Hãy tạo ví mới để bắt đầu!
                            </p>
                            <button
                                class="create-wallet-btn"
                                on:click={createNewWallet}>
                                <Plus class="plus-icon" />
                                Tạo ví mới
                            </button>
                        </div>
                    {:else}
                        <!-- Not Authenticated Message -->
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2rem; text-align: center;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ff6b6b, #ee5a52); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <circle cx="12" cy="16" r="1"></circle>
                                    <path d="m7 11 5-5 5 5"></path>
                                </svg>
                            </div>
                            <h4 style="color: #ffffff; margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 600;">Yêu cầu đăng nhập</h4>
                            <p style="color: #b0b0b0; margin: 0 0 2rem 0; font-size: 0.9rem; line-height: 1.5;">
                                Bạn cần đăng nhập để tạo và quản lý ví của mình.
                            </p>
                        </div>
                    {/if}
                </div>

                    <!-- Action Buttons Grid -->
                    {#if showWallet}
                    <div class="action-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                        <!-- Receive Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%); border: none; border-radius: 16px; padding: 1.5rem; color: #000000; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); transition: all 0.2s;"
                        on:click={() => {
                            // Receive functionality - copy wallet address
                            if (walletInfo.address) {
                                copyToClipboard(walletInfo.address);
                                alert(`Address copied to clipboard!\n${walletInfo.address}`);
                            } else {
                                alert('No wallet address available');
                            }
                        }}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><Download class="emoji-icon" /></div>
                            Receive
                        </button>

                        <!-- Transfer Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%); border: none; border-radius: 16px; padding: 1.5rem; color: #000000; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); transition: all 0.2s;"
                        on:click={() => openTransferModal()}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><Upload class="emoji-icon" /></div>
                            Transfer
                        </button>

                        <!-- Game Pool Transfer Button (Solana only) -->
                        {#if selectedNetwork === 'solana'}
                        <button class="action-button" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); border: none; border-radius: 16px; padding: 1.5rem; color: #ffffff; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); transition: all 0.2s;"
                        on:click={() => openGamePoolTransferModal()}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><Zap class="emoji-icon" /></div>
                            To Game Pool
                        </button>
                        {/if}

                        <!-- Swap Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%); border: none; border-radius: 16px; padding: 1.5rem; color: #000000; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); transition: all 0.2s;"
                        on:click={() => openSwapModal()}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><Repeat class="emoji-icon" /></div>
                            Swap
                        </button>
            </div>
            {/if}
                {:else}
                    <!-- Creating Wallet Loading -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center;">
                        <div style="width: 80px; height: 80px; border: 4px solid rgba(255, 255, 255, 0.1); border-top: 4px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 2rem;"></div>
                        <h2 style="color: #ffffff; font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0;">Đang tạo ví...</h2>
                        <p style="color: #a0a0a0; font-size: 1rem; margin: 0;">Vui lòng đợi, đang tạo ví cho bạn</p>
                    </div>
                {/if}
        <!-- End Authentication Section -->
        {:else}
            <!-- Not Logged In - Simple Message -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; text-align: center; padding: 2rem;">
                <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #ffffff, #e0e0e0); border: 3px solid rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
                    <Lock style="font-size: 4rem;" />
                </div>
                
                <h2 style="color: #ffffff; font-size: 2rem; font-weight: 700; margin: 0 0 1rem 0;">Vui lòng đăng nhập</h2>
                
                <p style="color: #a0a0a0; font-size: 1.1rem; max-width: 480px; margin: 0 0 2rem 0; line-height: 1.6;">
                    Bạn cần đăng nhập để quản lý ví và tạo ví mới của mình
                </p>

                <div style="background: rgba(68, 107, 255, 0.1); border: 1px solid rgba(68, 107, 255, 0.3); border-radius: 12px; padding: 1.5rem; max-width: 480px;">
                    <p style="color: #6b73ff; margin: 0; font-size: 0.95rem; line-height: 1.6;">
                        💡 <strong>Tip:</strong> Sử dụng nút "Đăng nhập" hoặc "Đăng ký" trên thanh công cụ phía trên để bắt đầu
                    </p>
                </div>
            </div>
        <!-- End Not Logged In Message -->
        {/if}
        <!-- End Wallet Tab -->
    </div>

    <!-- Claim Energies Modal -->
    {#if showClaimModal}
        <div class="modal-overlay" role="dialog" aria-modal="true" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px);" on:click={() => closeClaimModal()}>
            <div class="claim-modal" style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 20px; padding: 2rem; max-width: 480px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);" on:click|stopPropagation>

                <!-- Modal Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><span class="emoji-icon">⚡</span></div>
                        <div>
                            <h2 style="color: #ff6b6b; margin: 0 0 0.25rem 0; font-size: 1.5rem;">Claim Energies</h2>
                            <p style="color: #888; margin: 0; font-size: 0.9rem;">Convert E to SOL tokens</p>
                        </div>
                    </div>
                    <button style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); color: #ff4757; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;" on:click={() => closeClaimModal()}>
                        ✕
                    </button>
                </div>

                {#if claimResult && claimResult.success}
                    <!-- Success Result -->
                    <div style="background: rgba(39, 174, 96, 0.1); border: 1px solid rgba(39, 174, 96, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                        <h3 style="color: #27ae60; margin: 0 0 0.5rem 0; font-size: 1.3rem;">Claim Successful!</h3>
                        <p style="color: #f6f8ff; margin: 0 0 1rem 0;">
                            Successfully claimed <strong>{claimResult.claimed_amount} E</strong> to your wallet
                        </p>
                        <p style="color: #4ade80; margin: 0 0 1rem 0; font-size: 0.9rem;">
                            You received <strong>{(claimResult.claimed_amount * 0.001).toFixed(6)} SOL</strong>
                        </p>
                        {#if claimResult.tx_signature}
                            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem;">
                                <div style="color: #b0b0b0; font-size: 0.8rem; margin-bottom: 0.25rem;">Transaction Signature:</div>
                                <div style="font-family: 'Courier New', monospace; font-size: 0.7rem; color: #f6f8ff; word-break: break-all;">
                                    {claimResult.tx_signature}
                                </div>
                            </div>
                        {/if}
                        <p style="color: #b0b0b0; font-size: 0.8rem;">
                            Remaining energies: <strong>{claimResult.remaining_energies} E</strong>
                        </p>
                    </div>
                {:else}
                    <!-- Claim Form -->
                    {#if claimError}
                        <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                            <p style="color: #e74c3c; margin: 0; font-size: 0.9rem;">❌ {claimError}</p>
                        </div>
                    {/if}

                    <!-- Amount Input -->
                    <div style="margin-bottom: 1.5rem;">
                        <label for="claim-amount" style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Amount to Claim</label>
                        <div style="position: relative;">
                            <input
                                id="claim-amount"
                                type="number"
                                bind:value={claimData.amount}
                                placeholder="0"
                                step="1"
                                min="1"
                                max={energyPoints}
                                style="width: 100%; padding: 0.75rem 4rem 0.75rem 0.75rem; border: 1px solid #253157; border-radius: 8px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                                on:input={updateClaimCalculations}
                            />
                            <span style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #888; font-weight: 600;">E</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                            <span style="color: #888; font-size: 0.8rem;">Available: {energyPoints} E</span>
                            <button style="background: transparent; border: none; color: #446bff; cursor: pointer; font-size: 0.8rem; text-decoration: underline;" on:click={() => { claimData.amount = energyPoints.toString(); updateClaimCalculations(); }}>
                                Use Max
                            </button>
                        </div>
                    </div>

                    <!-- Wallet Address Input -->
                    <div style="margin-bottom: 1.5rem;">
                        <label for="claim-wallet" style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Solana Wallet Address</label>
                        <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
                            <input
                                id="claim-wallet"
                                type="text"
                                bind:value={claimData.userWallet}
                                placeholder="Enter your Solana wallet address..."
                                style="flex: 1; padding: 0.75rem; border: 1px solid #253157; border-radius: 8px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem; font-family: 'Courier New', monospace;"
                            />
                            <button
                                type="button"
                                on:click={generateNewWalletForClaim}
                                disabled={isGeneratingWallet}
                                style="padding: 0.75rem 1rem; border: 1px solid #446bff; border-radius: 8px; background: #446bff; color: white; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; {isGeneratingWallet ? 'opacity: 0.6; cursor: not-allowed;' : ''}"
                            >
                                {#if isGeneratingWallet}
                                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="width: 12px; height: 12px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                        Generating...
                                    </span>
                                {:else}
                                    🎯 New Wallet
                                {/if}
                            </button>
                        </div>
                        <p style="color: #888; font-size: 0.7rem; margin: 0.5rem 0 0 0;">
                            💡 Enter your Solana wallet address or generate a new one to receive tokens
                        </p>

                        <!-- Devnet Wallet Info Section -->
                        {#if claimData.userWallet && validateSolanaAddress(claimData.userWallet)}
                            <div style="background: rgba(68, 107, 255, 0.1); border: 1px solid rgba(68, 107, 255, 0.3); border-radius: 12px; padding: 1rem; margin-top: 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600;">🌐 Solana Devnet Wallet</span>
                                    <span style="color: #4ade80; font-size: 0.7rem; background: rgba(74, 222, 128, 0.2); padding: 0.2rem 0.5rem; border-radius: 4px;">REAL WALLET</span>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="color: #b0b0b0; font-size: 0.8rem;">Address:</span>
                                    <a
                                        href={`https://explorer.solana.com/address/${claimData.userWallet}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style="color: #60a5fa; font-size: 0.7rem; text-decoration: underline;"
                                    >
                                        {claimData.userWallet.substring(0, 8)}...{claimData.userWallet.substring(claimData.userWallet.length - 8)}
                                    </a>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="color: #b0b0b0; font-size: 0.8rem;">Network:</span>
                                    <span style="color: #f6f8ff; font-size: 0.8rem; font-weight: 500;">Solana Devnet</span>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #b0b0b0; font-size: 0.8rem;">Can interact with:</span>
                                    <a
                                        href="https://explorer.solana.com/address/BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19?cluster=devnet"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style="color: #fbbf24; font-size: 0.7rem; text-decoration: underline;"
                                    >
                                        Game Token Contract
                                    </a>
                                </div>

                                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(68, 107, 255, 0.3);">
                                    <div style="display: flex; gap: 0.5rem;">
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem; flex: 1;">
                                            <button
                                                class="wallet-action-btn wallet-action-btn-green"
                                                on:click={() => openFaucetWithWallet('official')}
                                                type="button"
                                            >
                                                🪂 Official Faucet
                                            </button>
                                            <button
                                                class="wallet-action-btn wallet-action-btn-green"
                                                on:click={() => openFaucetWithWallet('quicknode')}
                                                type="button"
                                                style="font-size: 0.65rem; padding: 0.4rem;"
                                            >
                                                🔄 QuickNode Faucet
                                            </button>
                                        </div>
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem; flex: 1;">
                                            <button
                                                class="wallet-action-btn wallet-action-btn-blue"
                                                on:click={async () => await requestAirdropDirectly()}
                                                disabled={isRequestingAirdrop}
                                            >
                                                {isRequestingAirdrop ? '⏳ Requesting...' : '💰 Request 1 SOL'}
                                            </button>
                                            <p style="color: #a0a0a0; font-size: 0.6rem; margin: 0.25rem 0 0 0; text-align: center;">
                                                💡 Auto-fallback to web faucet on rate limit
                                            </p>
                                            <button
                                                class="wallet-action-btn wallet-action-btn-blue"
                                                on:click={() => openFaucetWithWallet('official')}
                                                style="font-size: 0.6rem; padding: 0.35rem; margin-top: 0.25rem;"
                                                type="button"
                                            >
                                                🚀 Skip & Go to Faucet
                                            </button>
                                            <button
                                                class="wallet-action-btn wallet-action-btn-green"
                                                on:click={async () => await checkWalletBalance()}
                                                disabled={isCheckingBalance}
                                                style="font-size: 0.6rem; padding: 0.35rem;"
                                                type="button"
                                            >
                                                {isCheckingBalance ? '⏳ Checking...' : `💰 Balance: ${walletBalance.toFixed(4)} SOL`}
                                            </button>
                                            <button
                                                class="wallet-action-btn wallet-action-btn-blue"
                                                on:click={async () => await checkLastTransaction()}
                                                disabled={isCheckingTransaction || !lastTransactionSignature}
                                                style="font-size: 0.65rem; padding: 0.4rem;"
                                            >
                                                {isCheckingTransaction ? '⏳ Checking...' : '🔍 Check Transaction'}
                                            </button>
                                        </div>
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem; flex: 1;">
                                            <a
                                                href={`https://explorer.solana.com/address/${claimData.userWallet}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="wallet-action-btn wallet-action-btn-blue"
                                                style="font-size: 0.65rem; padding: 0.4rem;"
                                            >
                                                🔍 View on Explorer
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <p style="color: #fbbf24; font-size: 0.6rem; margin: 0.5rem 0 0 0; text-align: center;">
                                    ⚠️ This is a REAL blockchain wallet. Fund it with SOL to use for transactions.<br>
                                    💡 <strong>Smart airdrop: Auto-retry on rate limit, fallback to web faucets!</strong>
                                </p>
                            </div>
                        {/if}
                    </div>

                    <!-- Network Fee Selection -->
                    <div style="margin-bottom: 2rem;">
                        <label style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Network Fee</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                            <button
                                class="fee-button"
                                class:active={claimData.networkFee === 'low'}
                                on:click={() => { claimData.networkFee = 'low'; updateClaimCalculations(); }}
                                style="padding: 0.75rem; border: 1px solid {claimData.networkFee === 'low' ? '#27ae60' : '#253157'}; border-radius: 8px; background: {claimData.networkFee === 'low' ? 'rgba(39, 174, 96, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">🐌 Low</div>
                                <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('low').toFixed(6)} SOL</div>
                            </button>

                            <button
                                class="fee-button"
                                class:active={claimData.networkFee === 'medium'}
                                on:click={() => { claimData.networkFee = 'medium'; updateClaimCalculations(); }}
                                style="padding: 0.75rem; border: 1px solid {claimData.networkFee === 'medium' ? '#f39c12' : '#253157'}; border-radius: 8px; background: {claimData.networkFee === 'medium' ? 'rgba(243, 156, 18, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">⚡ Standard</div>
                                <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('medium').toFixed(6)} SOL</div>
                            </button>

                            <button
                                class="fee-button"
                                class:active={claimData.networkFee === 'high'}
                                on:click={() => { claimData.networkFee = 'high'; updateClaimCalculations(); }}
                                style="padding: 0.75rem; border: 1px solid {claimData.networkFee === 'high' ? '#e74c3c' : '#253157'}; border-radius: 8px; background: {claimData.networkFee === 'high' ? 'rgba(231, 76, 60, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">🚀 High</div>
                                <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('high').toFixed(6)} SOL</div>
                            </button>
                        </div>
                    </div>

                    <!-- Transaction Summary -->
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem; margin-bottom: 2rem;">
                        <h3 style="color: #f6f8ff; margin: 0 0 1rem 0; font-size: 1rem;">Transaction Summary</h3>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: #888; font-size: 0.9rem;">Claiming</span>
                            <span style="color: #f6f8ff; font-size: 0.9rem;">{claimData.amount || '0'} E</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: #888; font-size: 0.9rem;">You will receive</span>
                            <span style="color: #4ade80; font-size: 0.9rem;">{(claimData.amount || 0) * 0.001} SOL</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="color: #888; font-size: 0.9rem;">Network Fee</span>
                            <span style="color: #f6f8ff; font-size: 0.9rem;">{claimData.estimatedGas} SOL</span>
                        </div>

                        <hr style="border: none; border-top: 1px solid #253157; margin: 1rem 0;">

                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600;">Total Cost</span>
                            <span style="color: #ff6b6b; font-size: 0.9rem; font-weight: 600;">{claimData.totalCost} SOL</span>
                        </div>
                    </div>

                    <!-- Warning -->
                    <div style="background: rgba(243, 156, 18, 0.1); border: 1px solid rgba(243, 156, 18, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 2rem;">
                        <p style="color: #f39c12; margin: 0; font-size: 0.85rem; line-height: 1.4;">
                            ⚠️ <strong>Important:</strong> You will pay the network fee in SOL. Make sure your wallet has enough SOL to cover the transaction cost.
                        </p>
                    </div>
                {/if}

                <!-- Modal Actions -->
                {#if !claimResult || !claimResult.success}
                    <div style="display: flex; gap: 1rem;">
                        <button
                            style="flex: 1; background: rgba(255, 255, 255, 0.1); border: 1px solid #253157; color: #f6f8ff; padding: 0.875rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                            on:click={() => closeClaimModal()}>
                            Cancel
                        </button>
                        <button
                            style="flex: 1; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); border: none; color: white; padding: 0.875rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; opacity: {isClaiming ? 0.6 : 1};"
                            disabled={isClaiming}
                            on:click={() => claimEnergies()}>
                            {#if isClaiming}
                                <span style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    Claiming...
                                </span>
                            {:else}
                                Claim Energies
                            {/if}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Transfer Modal -->
    {#if showTransferModal}
        <div class="modal-overlay" role="dialog" aria-modal="true" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px);" on:click={() => closeTransferModal()}>
            <div class="transfer-modal" style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 20px; padding: 2rem; max-width: 480px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);" on:click|stopPropagation>

                <!-- Modal Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><span class="emoji-icon">📤</span></div>
                        <div>
                            <h2 style="color: #e74c3c; margin: 0 0 0.25rem 0; font-size: 1.5rem;">Send {walletInfo.symbol}</h2>
                            <p style="color: #888; margin: 0; font-size: 0.9rem;">Transfer crypto to another address</p>
                        </div>
                    </div>
                    <button style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); color: #ff4757; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;" on:click={() => closeTransferModal()}>
                        ✕
                    </button>
                </div>

                <!-- Recipient Address Input -->
                <div style="margin-bottom: 1.5rem;">
                    <label for="recipient-address" style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Recipient Address</label>
                    <input
                        id="recipient-address"
                        type="text"
                        bind:value={transferData.recipientAddress}
                        placeholder={selectedNetwork === 'ethereum' ? '0x...' : selectedNetwork === 'solana' ? 'Solana address...' : 'Bitcoin address...'}
                        style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 8px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem; font-family: 'Courier New', monospace;"
                    />
                </div>

                <!-- Amount Input -->
                <div style="margin-bottom: 1.5rem;">
                    <label for="transfer-amount" style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Amount</label>
                    <div style="position: relative;">
                        <input
                            id="transfer-amount"
                            type="number"
                            bind:value={transferData.amount}
                            placeholder="0.00"
                            step="0.000001"
                            min="0"
                            style="width: 100%; padding: 0.75rem 4rem 0.75rem 0.75rem; border: 1px solid #253157; border-radius: 8px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                        />
                        <span style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #888; font-weight: 600;">{walletInfo.symbol}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                        <span style="color: #888; font-size: 0.8rem;">Available: {walletInfo.balance} {walletInfo.symbol}</span>
                        <button style="background: transparent; border: none; color: #446bff; cursor: pointer; font-size: 0.8rem; text-decoration: underline;" on:click={() => transferData.amount = walletInfo.balance}>
                            Use Max
                        </button>
                    </div>
                </div>

                <!-- Network Fee Selection -->
                <div style="margin-bottom: 2rem;">
                    <label style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Network Fee</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                        <button
                            class="fee-button"
                            class:active={transferData.networkFee === 'low'}
                            on:click={() => transferData.networkFee = 'low'}
                            style="padding: 0.75rem; border: 1px solid {transferData.networkFee === 'low' ? '#27ae60' : '#253157'}; border-radius: 8px; background: {transferData.networkFee === 'low' ? 'rgba(39, 174, 96, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">🐌 Slow</div>
                            <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('low').toFixed(6)} {walletInfo.symbol}</div>
                        </button>

                        <button
                            class="fee-button"
                            class:active={transferData.networkFee === 'medium'}
                            on:click={() => transferData.networkFee = 'medium'}
                            style="padding: 0.75rem; border: 1px solid {transferData.networkFee === 'medium' ? '#f39c12' : '#253157'}; border-radius: 8px; background: {transferData.networkFee === 'medium' ? 'rgba(243, 156, 18, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">⚡ Standard</div>
                            <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('medium').toFixed(6)} {walletInfo.symbol}</div>
                        </button>

                        <button
                            class="fee-button"
                            class:active={transferData.networkFee === 'high'}
                            on:click={() => transferData.networkFee = 'high'}
                            style="padding: 0.75rem; border: 1px solid {transferData.networkFee === 'high' ? '#e74c3c' : '#253157'}; border-radius: 8px; background: {transferData.networkFee === 'high' ? 'rgba(231, 76, 60, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">🚀 Fast</div>
                            <div style="font-size: 0.7rem; color: #888;">{calculateGasFee('high').toFixed(6)} {walletInfo.symbol}</div>
                        </button>
                    </div>
                </div>

                <!-- Transaction Summary -->
                <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem; margin-bottom: 2rem;">
                    <h3 style="color: #f6f8ff; margin: 0 0 1rem 0; font-size: 1rem;">Transaction Summary</h3>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #888; font-size: 0.9rem;">Amount</span>
                        <span style="color: #f6f8ff; font-size: 0.9rem;">{transferData.amount || '0.00'} {walletInfo.symbol}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #888; font-size: 0.9rem;">Network Fee</span>
                        <span style="color: #f6f8ff; font-size: 0.9rem;">{transferData.estimatedGas} {walletInfo.symbol}</span>
                    </div>

                    <hr style="border: none; border-top: 1px solid #253157; margin: 1rem 0;">

                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span style="color: #f6f8ff; font-size: 0.9rem;">Total Cost</span>
                        <span style="color: {parseFloat(transferData.totalCost) > parseFloat(walletInfo.balance) ? '#ff4757' : '#f6f8ff'}; font-size: 0.9rem;">{transferData.totalCost} {walletInfo.symbol}</span>
                    </div>
                </div>

                <!-- Error Message -->
                {#if transferError}
                    <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 1.5rem;">
                        <p style="color: #ff4757; margin: 0; font-size: 0.9rem;">⚠️ {transferError}</p>
                    </div>
                {/if}

                <!-- Action Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button
                        style="padding: 0.75rem 1.5rem; border: 1px solid #253157; border-radius: 8px; background: transparent; color: #888; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                        on:click={() => closeTransferModal()}>
                        Cancel
                    </button>

                    <button
                        style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; cursor: pointer; font-weight: 600; transition: all 0.2s; opacity: {isTransferring ? 0.6 : 1};"
                        disabled={isTransferring}
                        on:click={() => executeTransfer()}>
                        {#if isTransferring}
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                Sending...
                            </div>
                        {:else}
                            Send {walletInfo.symbol}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Swap Modal -->
    {#if showSwapModal}
        <div class="modal-overlay" role="dialog" aria-modal="true" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px);" on:click={() => closeSwapModal()}>
            <div class="swap-modal" style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 20px; padding: 2rem; max-width: 480px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);" on:click|stopPropagation>

                <!-- Modal Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #9b59b6, #8e44ad); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><RotateCcw class="emoji-icon" /></div>
                        <div>
                            <h2 style="color: #9b59b6; margin: 0 0 0.25rem 0; font-size: 1.5rem;">Swap Tokens</h2>
                            <p style="color: #888; margin: 0; font-size: 0.9rem;">Exchange cryptocurrencies instantly</p>
                        </div>
                    </div>
                    <button style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); color: #ff4757; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;" on:click={() => closeSwapModal()}>
                        ✕
                    </button>
                </div>

                <!-- Token Selection -->
                <div style="margin-bottom: 2rem;">
                    <!-- From Token -->
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <span style="color: #888; font-size: 0.8rem; font-weight: 600;">From</span>
                            <button style="background: rgba(155, 89, 182, 0.1); border: 1px solid rgba(155, 89, 182, 0.3); color: #9b59b6; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.7rem;" on:click={() => swapTokens()}>
                                <RotateCcw class="emoji-icon" /> Swap
                            </button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #446bff, #6b73ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">
                                {swapData.fromToken.slice(0, 2)}
                            </div>
                            <div style="flex: 1;">
                                <div style="color: #f6f8ff; font-weight: 600; margin-bottom: 0.25rem;">{swapData.fromToken}</div>
                                <input
                                    id="swap-amount"
                                    type="number"
                                    bind:value={swapData.amount}
                                    placeholder="0.00"
                                    step="0.000001"
                                    min="0"
                                    style="width: 100%; padding: 0.5rem; border: 1px solid #253157; border-radius: 6px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Swap Arrow -->
                    <div style="display: flex; justify-content: center; margin: 1rem 0;">
                        <button style="background: linear-gradient(135deg, #9b59b6, #8e44ad); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);" on:click={() => swapTokens()}>
                            ⇅
                        </button>
                    </div>

                    <!-- To Token -->
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <span style="color: #888; font-size: 0.8rem; font-weight: 600;">To</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">
                                {swapData.toToken.slice(0, 2)}
                            </div>
                            <div style="flex: 1;">
                                <div style="color: #f6f8ff; font-weight: 600; margin-bottom: 0.25rem;">{swapData.toToken}</div>
                                <div style="color: #f6f8ff; font-size: 1rem; font-weight: 600;">{swapData.estimatedReceive}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Slippage Settings -->
                <div style="margin-bottom: 2rem;">
                    <label style="color: #f6f8ff; font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Slippage Tolerance</label>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                        <button
                            class="slippage-btn"
                            class:active={swapData.slippage === '0.1'}
                            on:click={() => swapData.slippage = '0.1'}
                            style="padding: 0.5rem; border: 1px solid {swapData.slippage === '0.1' ? '#9b59b6' : '#253157'}; border-radius: 6px; background: {swapData.slippage === '0.1' ? 'rgba(155, 89, 182, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem;">
                            0.1%
                        </button>
                        <button
                            class="slippage-btn"
                            class:active={swapData.slippage === '0.5'}
                            on:click={() => swapData.slippage = '0.5'}
                            style="padding: 0.5rem; border: 1px solid {swapData.slippage === '0.5' ? '#9b59b6' : '#253157'}; border-radius: 6px; background: {swapData.slippage === '0.5' ? 'rgba(155, 89, 182, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem;">
                            0.5%
                        </button>
                        <button
                            class="slippage-btn"
                            class:active={swapData.slippage === '1.0'}
                            on:click={() => swapData.slippage = '1.0'}
                            style="padding: 0.5rem; border: 1px solid {swapData.slippage === '1.0' ? '#9b59b6' : '#253157'}; border-radius: 6px; background: {swapData.slippage === '1.0' ? 'rgba(155, 89, 182, 0.1)' : '#0a0e1a'}; color: #f6f8ff; cursor: pointer; font-size: 0.8rem;">
                            1.0%
                        </button>
                        <input
                            type="number"
                            bind:value={swapData.slippage}
                            placeholder="2.0"
                            step="0.1"
                            min="0.1"
                            max="50"
                            style="padding: 0.5rem; border: 1px solid #253157; border-radius: 6px; background: #0a0e1a; color: #f6f8ff; font-size: 0.8rem; text-align: center;"
                        />
                    </div>
                </div>

                <!-- Swap Summary -->
                <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem; margin-bottom: 2rem;">
                    <h3 style="color: #f6f8ff; margin: 0 0 1rem 0; font-size: 1rem;">Swap Summary</h3>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #888; font-size: 0.9rem;">Exchange Rate</span>
                        <span style="color: #f6f8ff; font-size: 0.9rem;">{swapData.exchangeRate}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #888; font-size: 0.9rem;">Minimum Received</span>
                        <span style="color: #f6f8ff; font-size: 0.9rem;">{swapData.minimumReceived} {swapData.toToken}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #888; font-size: 0.9rem;">Network Fee</span>
                        <span style="color: #f6f8ff; font-size: 0.9rem;">{swapData.networkFee} {walletInfo.symbol}</span>
                    </div>

                    <hr style="border: none; border-top: 1px solid #253157; margin: 1rem 0;">

                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span style="color: #f6f8ff; font-size: 0.9rem;">You'll receive</span>
                        <span style="color: #27ae60; font-size: 0.9rem;">{swapData.estimatedReceive} {swapData.toToken}</span>
                    </div>
                </div>

                <!-- Error Message -->
                {#if swapError}
                    <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 1.5rem;">
                        <p style="color: #ff4757; margin: 0; font-size: 0.9rem;">⚠️ {swapError}</p>
                    </div>
                {/if}

                <!-- Action Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button
                        style="padding: 0.75rem 1.5rem; border: 1px solid #253157; border-radius: 8px; background: transparent; color: #888; cursor: pointer; font-weight: 600; transition: all 0.2s;"
                        on:click={() => closeSwapModal()}>
                        Cancel
                    </button>

                    <button
                        style="padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; cursor: pointer; font-weight: 600; transition: all 0.2s; opacity: {isSwapping ? 0.6 : 1};"
                        disabled={isSwapping || !swapData.amount || parseFloat(swapData.amount) <= 0}
                        on:click={() => executeSwap()}>
                        {#if isSwapping}
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                Swapping...
                            </div>
                        {:else}
                            Swap Tokens
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Wallet Created Successfully Modal - ONE TIME DISPLAY -->
    {#if showCreateWalletModal && newWallets}
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(16px); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 2rem; animation: fadeIn 0.3s ease;" on:click={(e) => {
            if (e.target === e.currentTarget) {
                if (confirm('Bạn chắc chắn muốn đóng? Thông tin này sẽ KHÔNG THỂ xem lại!')) {
                    closeCreateWalletModal();
                }
            }
        }}>
            <div class="wallet-info-modal" style="background: #000000; border: 2px solid #ffffff; border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(255, 255, 255, 0.1);" on:click={(e) => e.stopPropagation()}>
                
                <!-- Warning Header -->
                <div style="background: linear-gradient(135deg, #ffffff, #e0e0e0); padding: 1.5rem; text-align: center; border-radius: 14px 14px 0 0; border-bottom: 2px solid #ffffff;">
                    <h2 style="color: #000000; font-size: 1.8rem; font-weight: 700; margin: 0 0 0.5rem 0;">
                        🎉 Ví đã được tạo thành công!
                    </h2>
                    <p style="color: #000000; font-size: 1rem; margin: 0; font-weight: 600;">
                        ⚠️ THÔNG TIN NÀY CHỈ HIỂN THỊ MỘT LẦN DUY NHẤT
                    </p>
                </div>

                <!-- Modal Body -->
                <div style="padding: 2rem;">
                    
                    <!-- Critical Warning -->
                    <div style="background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                        <h3 style="color: #ffffff; font-size: 1.1rem; margin: 0 0 1rem 0; font-weight: 700;">
                            🚨 CỰC KỲ QUAN TRỌNG
                        </h3>
                        <ul style="color: #e0e0e0; margin: 0; padding-left: 1.5rem; line-height: 1.8;">
                            <li><strong>Sao chép và lưu trữ thông tin này NGAY BÂY GIỜ</strong></li>
                            <li>Đây là <strong>LẦN DUY NHẤT</strong> bạn thấy Private Key và Mnemonic</li>
                            <li><strong>KHÔNG BAO GIỜ</strong> chia sẻ với ai</li>
                            <li>Nếu mất → <strong>MẤT VÍ VÀ TÀI SẢN</strong></li>
                        </ul>
                    </div>

                    <!-- Mnemonic Section -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="color: #ffffff; font-size: 1.1rem; margin: 0 0 1rem 0; font-weight: 700;">
                            🔑 Mnemonic Phrase (12 từ - Dùng chung cho cả 3 ví)
                        </h3>
                        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                            <p style="color: #ffffff; font-family: 'Monaco', 'Courier New', monospace; font-size: 1rem; line-height: 1.8; margin: 0; word-break: break-word;">
                                {newWallets.ethereum?.mnemonic || ''}
                            </p>
                        </div>
                        <button 
                            style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #ffffff, #e0e0e0); border: 2px solid #ffffff; border-radius: 8px; color: #000000; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                            on:click={() => copyToClipboard(newWallets.ethereum?.mnemonic || '')}>
                            📋 Sao chép Mnemonic
                        </button>
                    </div>

                    <!-- Wallets Info -->
                    {#each Object.entries(newWallets) as [network, wallet]}
                        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                            <h3 style="color: #ffffff; font-size: 1.1rem; margin: 0 0 1rem 0; font-weight: 700;">
                                {network === 'ethereum' ? '⟠ Ethereum' : network === 'solana' ? '◎ Solana' : network === 'sui' ? '🔵 SUI' : '₿ Bitcoin'}
                            </h3>

                            <!-- Address -->
                            <div style="margin-bottom: 1rem;">
                                <label style="color: #a0a0a0; font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">Địa chỉ:</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <div style="flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 0.75rem;">
                                        <p style="color: #ffffff; font-family: 'Monaco', 'Courier New', monospace; font-size: 0.85rem; margin: 0; word-break: break-all;">
                                            {wallet.address}
                                        </p>
                                    </div>
                                    <button 
                                        style="padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 6px; color: #ffffff; cursor: pointer; white-space: nowrap; transition: all 0.2s;"
                                        on:click={() => copyToClipboard(wallet.address)}>
                                        📋
                                    </button>
                                </div>
                            </div>

                            <!-- Private Key -->
                            <div style="margin-bottom: 0;">
                                <label style="color: #a0a0a0; font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">Private Key:</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <div style="flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 0.75rem;">
                                        <p style="color: #e0e0e0; font-family: 'Monaco', 'Courier New', monospace; font-size: 0.75rem; margin: 0; word-break: break-all;">
                                            {wallet.privateKey}
                                        </p>
                                    </div>
                                    <button 
                                        style="padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 6px; color: #ffffff; cursor: pointer; white-space: nowrap; transition: all 0.2s;"
                                        on:click={() => copyToClipboard(wallet.privateKey)}>
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}

                    <!-- Close Button -->
                    <div style="margin-top: 2rem;">
                        <button 
                            style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #ffffff, #e0e0e0); border: 2px solid #ffffff; border-radius: 12px; color: #000000; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);"
                            on:click={closeCreateWalletModal}>
                            ✓ Tôi đã lưu thông tin an toàn
                        </button>
                        <p style="color: #a0a0a0; font-size: 0.85rem; text-align: center; margin: 1rem 0 0 0;">
                            Sau khi đóng cửa sổ này, bạn sẽ KHÔNG THỂ xem lại thông tin này!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    {:else}
        <!-- Simple Authentication Message -->
        <div style="max-width: 480px; margin: 0 auto; text-align: center; padding: 6rem 2rem;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #446bff, #6b73ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 2rem; margin: 0 auto 2rem;">
                <Lock class="emoji-icon" />
            </div>
            <h2 style="color: #f6f8ff; margin: 0 0 1.5rem 0; font-size: 1.8rem; font-weight: 700;">
                Hãy đăng nhập để xem ví
            </h2>
            <p style="color: #a0a0a0; margin: 0 0 1rem 0; font-size: 1rem; line-height: 1.6;">
                Bạn cần đăng nhập hoặc đăng ký tài khoản để truy cập ví.
            </p>
            
        </div>
    {/if}

    </main>

    <style>
        .wallet-action-btn {
            flex: 1;
            padding: 0.5rem;
            border-radius: 6px;
            text-decoration: none;
            text-align: center;
            font-size: 0.7rem;
            font-weight: 500;
            transition: all 0.2s;
            border: 1px solid transparent;
        }

        .wallet-action-btn-green {
            background: rgba(74, 222, 128, 0.2);
            border-color: rgba(74, 222, 128, 0.5);
            color: #4ade80;
        }

        .wallet-action-btn-green:hover {
            background: rgba(74, 222, 128, 0.3);
        }

        .wallet-action-btn-blue {
            background: rgba(96, 165, 250, 0.2);
            border-color: rgba(96, 165, 250, 0.5);
            color: #60a5fa;
        }

        .wallet-action-btn-blue:hover {
            background: rgba(96, 165, 250, 0.3);
        }
    </style>
</div>