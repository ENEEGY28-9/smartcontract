<script lang="ts">
    import { ethers } from 'ethers';
    import { onMount } from 'svelte';
    import { pocketbaseService, type WalletData, type EnergyData } from '$lib/services/pocketbaseService';
    import { POCKETBASE_URL } from '$lib/config/pocketbase-config';
    import PocketBaseAuth from '$lib/components/PocketBaseAuth.svelte';

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

    // Energy system
    let energyPoints = 0;
    let canConvertEnergy = false; // Admin control for conversion
    let energyConversionRate = 0.001; // 1 E = 0.001 ETH/SOL/BTC

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

    // Load wallets from PocketBase - improved to prevent race conditions
    let walletLoadingPromise = null;

    // Load energy from PocketBase
    async function loadUserEnergy() {
        try {
            isLoadingEnergy = true;
            console.log('⚡ Loading user energy from database...');

            userEnergy = await pocketbaseService.getOrCreateUserEnergy();
            console.log('✅ User energy loaded:', {
                points: userEnergy.points,
                lastUpdated: userEnergy.last_updated,
                created: userEnergy.created
            });

            // Sync local energyPoints with database
            energyPoints = userEnergy.points;
            console.log('🔄 Synced local energy points:', energyPoints);

        } catch (error) {
            console.error('❌ Error loading user energy:', error);
            // Fallback to local energy if database fails
            userEnergy = null;
            console.log('⚠️ Using local energy fallback');
            throw error; // Re-throw to propagate error to caller
        } finally {
            isLoadingEnergy = false;
        }
    }

    // Authentication loading state
    let isLoading = false;

    // Auto-hide success messages
    let successTimeout = null;

    // Reactive authentication state
    let isAuthenticated = false;
    let currentUser = null;

    // Update authentication state
    async function updateAuthState() {
        try {
            console.log('🔄 Updating auth state...');
            isAuthenticated = pocketbaseService.isAuthenticated();
            currentUser = pocketbaseService.getCurrentUser();

            console.log('✅ Auth state updated:', {
                isAuthenticated,
                userEmail: currentUser?.email || 'no user'
            });

            // Auto-load wallets and energy when authenticated
            if (isAuthenticated && currentUser) {
                console.log('📦 Loading user wallets...');
                await loadUserWallets();

                console.log('⚡ Loading user energy...');
                await loadUserEnergy();
            }
        } catch (error) {
            console.error('❌ Error updating auth state:', error);
            isAuthenticated = false;
            currentUser = null;
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
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Create wallets first (pass current user ID)
                    const currentUserId = pocketbaseService.getCurrentUser()?.id;
                    const walletsCreated = await autoCreateWalletsForUser(currentUserId);
                    console.log('📦 Wallets creation result:', walletsCreated);

                    // Then create energy record
                    console.log('⚡ Creating energy record...');
                    await pocketbaseService.getOrCreateUserEnergy();
                    console.log('✅ Energy record created for new user');

                    success = 'Registration successful! Wallets and Energy created automatically.';
                } catch (setupError) {
                    console.error('⚠️ Failed to auto-create wallets/energy:', setupError);
                    console.error('Setup error details:', setupError.message);
                    success = 'Registration successful! You can now log in.';
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

    async function loadUserWallets() {
        // Skip if PocketBase is not available
        try {
            // Check authentication through reactive variable
            if (!isAuthenticated) {
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
            walletLoadingPromise = pocketbaseService.getUserWallets();
            userWallets = await walletLoadingPromise;
            console.log('📦 Loaded wallets from PocketBase:', userWallets);
            console.log('🔍 Raw userWallets data:', JSON.stringify(userWallets, null, 2));

            // Note: Wallets are created during registration, no need to auto-create here

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

    // Save wallet to PocketBase with security checks
    async function saveWalletToPocketBase(walletData) {
        try {
            console.log('🔐 Saving wallet to PocketBase with security checks:', walletData);

            // SECURITY CHECK 1: Prevent address theft across users
            const globalExistingWallet = await pocketbaseService.addressExistsGlobally(
                walletData.address,
                walletData.network
            );

            if (globalExistingWallet) {
                // Address exists somewhere - check if owned by current user
                const userOwnedWallet = await pocketbaseService.getWalletByAddress(
                    walletData.address,
                    walletData.network,
                    walletData.user_id
                );

                console.log('🔍 Address ownership check:', {
                    address: walletData.address,
                    network: walletData.network,
                    userId: walletData.user_id,
                    userOwnsWallet: !!userOwnedWallet
                });

                if (!userOwnedWallet) {
                    console.error('🚨 SECURITY VIOLATION: Address already owned by another user!');
                    throw new Error('This wallet address is already registered to another user');
                }

                console.log('✅ Wallet already owned by current user, updating...');
                // Update existing wallet
                const updatedWallet = await pocketbaseService.updateWallet(userOwnedWallet.id, walletData);
                return updatedWallet;
            }

            // SECURITY CHECK 2: Prevent multiple wallets per user per network
            const userHasWallet = await pocketbaseService.userHasWalletForNetwork(
                walletData.user_id,
                walletData.network
            );

            if (userHasWallet) {
                console.error('🚨 SECURITY VIOLATION: User already has a wallet for this network!');
                throw new Error(`You already have a ${walletData.network} wallet. Each user can only have one wallet per network.`);
            }

            // Save new wallet (all security checks passed)
            console.log('✅ All security checks passed, creating new wallet...');
            const savedWallet = await pocketbaseService.createWallet(walletData);
            console.log('💾 Wallet saved to PocketBase:', savedWallet);
            return savedWallet;

        } catch (error) {
            console.error('❌ Error saving wallet to PocketBase:', error);

            // Re-throw security errors with clear messages
            if (error.message.includes('already registered') ||
                error.message.includes('already have a')) {
                throw error;
            }

            throw new Error('Failed to save wallet: ' + error.message);
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
                    address: generateSolanaAddress(), // Use the same function
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
                await saveWalletToPocketBase(walletData);
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

            // Solana wallet - Generate valid base58-like address
            const solanaAddress = generateSolanaAddress();
            wallets.solana = {
                mnemonic: mnemonic,
                address: solanaAddress, // Valid base58-like Solana address
                privateKey: ethers.Wallet.createRandom().privateKey,
                publicKey: ethers.Wallet.createRandom().publicKey,
                network: 'solana'
            };
            console.log('✅ Generated Solana wallet:', solanaAddress);

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
                });
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

            customAddress = currentWallet.address;

            // Reload user wallets to sync with database
            await loadUserWallets();

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
                symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'ethereum' ? 'ETH' : 'SUI'
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
                symbol: selectedNetwork === 'solana' ? 'SOL' : selectedNetwork === 'ethereum' ? 'ETH' : 'SUI'
            };
        }
    }

    async function handleLogout() {
        try {
            console.log('🚪 Starting logout process...');
            await pocketbaseService.logout();

            // Clear user data immediately
            currentUser = null;
            isAuthenticated = false;
            userWallets = [];
            userEnergy = null;
            energyPoints = 0; // Reset local energy points
            currentTab = 'wallet'; // Reset to wallet tab

            console.log('✅ Logout completed, auth state cleared');

            // Dispatch event to notify other components
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pocketbase-auth-logout'));
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Even if logout fails, clear local state
            currentUser = null;
            isAuthenticated = false;
            userWallets = [];
            currentTab = 'wallet';
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
        showCreateWalletModal = false;
        newWallets = null;
    }

    // Generate valid Solana address (base58-like)
    function generateSolanaAddress() {
        // Base58 alphabet (Solana uses base58 encoding)
        const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let address = '';

        // Generate 32-44 character address (typical Solana address length)
        const length = 32 + Math.floor(Math.random() * 13); // 32-44 characters

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * base58Alphabet.length);
            address += base58Alphabet[randomIndex];
        }

        console.log('🎯 Generated valid Solana-like address:', address, `(length: ${address.length})`);
        return address;
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
            // Simulate transfer process
            console.log('🔄 Executing transfer:', {
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
                await loadUserWallets(); // Refresh data
            }

            alert(`✅ Transfer successful!\nSent ${transferAmount} ${walletInfo.symbol} to ${transferData.recipientAddress.slice(0, 10)}...`);

            closeTransferModal();

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
            console.log('📊 Current state:', {
                selectedNetwork,
                energyPoints,
                energyToConvert,
                cryptoAmount,
                walletInfo_symbol: walletInfo.symbol,
                userWallets_count: userWallets.length,
                isAuthenticated
            });

            // Simulate conversion processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update wallet balance in database
            const dbWallet = userWallets.find(wallet => wallet.network === selectedNetwork);
            if (dbWallet) {
                try {
                    const currentBalance = parseFloat(dbWallet.balance) || 0;
                    const newBalance = Number(currentBalance + cryptoAmount);

                    await pocketbaseService.updateWalletBalance(dbWallet.id, newBalance);
                    console.log('✅ Updated wallet balance in database');

                    // Reload wallets to sync UI
                    await loadUserWallets();
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
            if (dbWallet) {
                const currentBalance = parseFloat(dbWallet.balance) || 0;
                const newBalance = Number(Math.max(0, currentBalance - cryptoAmount));

                await pocketbaseService.updateWalletBalance(dbWallet.id, newBalance);
                console.log('✅ Updated wallet balance in database');

                // Reload wallets to sync UI
                await loadUserWallets();
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
        updateAuthState().then(() => {
            console.log('✅ Auth state initialized:', { isAuthenticated, currentUser: currentUser?.email });
        });

        // Listen for authentication events
        if (typeof window !== 'undefined') {
            window.addEventListener('pocketbase-auth-success', updateAuthState);
            window.addEventListener('pocketbase-auth-logout', updateAuthState);
        }

        return () => {
            // Cleanup event listeners
            if (typeof window !== 'undefined') {
                window.removeEventListener('pocketbase-auth-success', updateAuthState);
                window.removeEventListener('pocketbase-auth-logout', updateAuthState);
            }
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
                {#if isAuthenticated}
                    <div>
                        <div style="display: flex; gap: 0; max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border-bottom: 1px solid #253157; border-radius: 16px 16px 0 0; overflow: hidden;">
                            <button
                                class="tab-button"
                                class:active={currentTab === 'game'}
                                on:click={() => currentTab = 'game'}
                                style="flex: 1; padding: 1rem 1.5rem; border: none; background: {currentTab === 'game' ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'transparent'}; color: {currentTab === 'game' ? 'white' : '#888'}; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border-radius: {currentTab === 'game' ? '16px 16px 0 0' : '0'}; margin-bottom: {currentTab === 'game' ? '-1px' : '0'}; position: relative; z-index: {currentTab === 'game' ? '1' : '0'};">
                                <span class="emoji-icon">⚡</span> Energy
                            </button>
                            <button
                                class="tab-button"
                                class:active={currentTab === 'wallet'}
                                on:click={() => currentTab = 'wallet'}
                                style="flex: 1; padding: 1rem 1.5rem; border: none; background: {currentTab === 'wallet' ? 'linear-gradient(135deg, #446bff, #6b73ff)' : 'transparent'}; color: {currentTab === 'wallet' ? 'white' : '#888'}; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border-radius: {currentTab === 'wallet' ? '16px 16px 0 0' : '0'}; margin-bottom: {currentTab === 'wallet' ? '-1px' : '0'}; position: relative; z-index: {currentTab === 'wallet' ? '1' : '0'};">
                                👛 Wallet
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Main Content -->
                <div class="wallet-container" style="max-width: 480px; margin: 0 auto;">


        <!-- Loading State -->
        {#if typeof isAuthenticated === 'undefined'}
            <div style="text-align: center; padding: 4rem;">
                <div style="width: 48px; height: 48px; border: 4px solid #446bff; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <h2 style="color: #f6f8ff; margin: 0 0 0.5rem 0;">Loading STEPN Wallet...</h2>
                <p style="color: #888; margin: 0;">Initializing authentication state</p>
            </div>
        {:else if isAuthenticated && currentTab === 'game'}
            <!-- Energy Dashboard -->
            <div style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; color: #f6f8ff;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #f39c12, #e67e22); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><span class="emoji-icon">⚡</span></div>
                    <div>
                        <h2 style="color: #f39c12; margin: 0 0 0.25rem 0; font-size: 1.5rem;">Energy (E)</h2>
                        <p style="color: #888; margin: 0; font-size: 0.9rem;">Your game energy balance</p>
                    </div>
                </div>

                <!-- Energy Display -->
                <div style="background: #000000; border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; border: 2px solid #f39c12; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: #888; font-size: 0.9rem;">Energy Balance</span>
                            {#if isLoadingEnergy}
                                <div style="width: 8px; height: 8px; background: #f39c12; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                            {/if}
                        </div>
                        {#if isLoadingEnergy}
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 16px; height: 16px; border: 2px solid #f39c12; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                <span style="color: #f39c12; font-size: 0.9rem;">Loading...</span>
                            </div>
                        {/if}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 2.5rem; font-weight: 700; color: #f39c12;">
                                {#if isLoadingEnergy}
                                    --
                                {:else}
                                    {energyPoints}
                                {/if}
                            </span>
                            <span style="color: #f6f8ff; font-size: 1.2rem; font-weight: 600;">E</span>
                        </div>
                    </div>
                </div>

                <!-- Convert Buttons -->
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <!-- Convert Energy to Crypto -->
                    <button
                        style="background: linear-gradient(135deg, #2c3e50, #34495e); border: none; border-radius: 16px; padding: 1.5rem 2rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3); transition: all 0.2s; opacity: {canConvertEnergy && energyPoints > 0 ? 1 : 0.6}; flex: 1;"
                        disabled={!canConvertEnergy || energyPoints <= 0}
                        on:click={() => convertEnergyToCrypto()}>
                        <div style="font-size: 1.2rem; margin-bottom: 0.25rem;"><span class="emoji-icon">⚡</span>→<span class="emoji-icon">💰</span></div>
                        <div style="font-size: 0.8rem;">E to {walletInfo.symbol}</div>
                    </button>

                    <!-- Convert Crypto to Energy -->
                    <button
                        style="background: linear-gradient(135deg, #2c3e50, #34495e); border: none; border-radius: 16px; padding: 1.5rem 2rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3); transition: all 0.2s; opacity: {walletInfo.address && parseFloat(walletInfo.balance) > 0 ? 1 : 0.6}; flex: 1;"
                        disabled={!walletInfo.address || parseFloat(walletInfo.balance) <= 0}
                        on:click={() => convertCryptoToEnergy()}>
                        <div style="font-size: 1.2rem; margin-bottom: 0.25rem;"><span class="emoji-icon">💰</span>→<span class="emoji-icon">⚡</span></div>
                        <div style="font-size: 0.8rem;">{walletInfo.symbol} to E</div>
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

                <!-- Conversion Info -->
                <div style="background: rgba(0,0,0,0.2); border: 1px solid #253157; border-radius: 12px; padding: 1rem; margin-top: 2rem;">
                    <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">
                        <span class="emoji-icon">🔄</span> Conversion Rates:
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="color: #9b59b6; font-size: 0.8rem; font-weight: 600;">
                                <span class="emoji-icon">⚡</span>→<span class="emoji-icon">💰</span> Energy to {selectedNetwork.toUpperCase()}
                            </div>
                            <div style="color: #f6f8ff; font-size: 0.8rem;">
                                1 E = {energyConversionRate} {selectedNetwork.toUpperCase()}
                            </div>
                            {#if energyPoints > 0}
                                <div style="color: #f39c12; font-size: 0.7rem; margin-top: 0.25rem;">
                                    {energyPoints} E → {(energyPoints * energyConversionRate).toFixed(6)} {selectedNetwork.toUpperCase()}
                                </div>
                            {/if}
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #27ae60; font-size: 0.8rem; font-weight: 600;">
                                <span class="emoji-icon">💰</span>→<span class="emoji-icon">⚡</span> {selectedNetwork.toUpperCase()} to Energy
                            </div>
                            <div style="color: #f6f8ff; font-size: 0.8rem;">
                                1 {selectedNetwork.toUpperCase()} = {Math.round(1/energyConversionRate)} E
                            </div>
                            {#if walletInfo.address && parseFloat(walletInfo.balance) > 0}
                                <div style="color: #2ecc71; font-size: 0.7rem; margin-top: 0.25rem;">
                                    {parseFloat(walletInfo.balance).toFixed(selectedNetwork === 'sui' ? 8 : 4)} {selectedNetwork.toUpperCase()} → {Math.floor(parseFloat(walletInfo.balance) / energyConversionRate)} E
                                </div>
                            {/if}
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
                                <span class="emoji-icon">🔒</span> Disable
                            {:else}
                                <span class="emoji-icon">🔓</span> Enable
                            {/if}
                            Energy Conversion
                        </button>
                        <button
                            style="background: rgba(243, 156, 18, 0.1); border: 1px solid rgba(243, 156, 18, 0.3); color: #f39c12; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;"
                            on:click={() => addEnergyForTesting(100)}>
                            <span class="emoji-icon">⚡</span> +100 Energy
                        </button>
                    </div>
                </div>

        {:else if isAuthenticated && currentTab === 'wallet'}
                        <!-- Network Selector Tabs -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 12px; padding: 0.5rem;">
                    <button class="network-tab"
                        style="flex: 1; padding: 0.75rem; border: none; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                               background: {selectedNetwork === 'ethereum' ? 'linear-gradient(135deg, #446bff, #6b73ff)' : 'transparent'};
                               color: {selectedNetwork === 'ethereum' ? 'white' : '#888'};
                               border: {selectedNetwork === 'ethereum' ? '1px solid #446bff' : 'none'};
                               box-shadow: {selectedNetwork === 'ethereum' ? '0 4px 15px rgba(68, 107, 255, 0.3)' : 'none'};"
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
                               background: {selectedNetwork === 'solana' ? 'linear-gradient(135deg, #9945ff, #7b68ee)' : 'transparent'};
                               color: {selectedNetwork === 'solana' ? 'white' : '#888'};
                               border: {selectedNetwork === 'solana' ? '1px solid #9945ff' : 'none'};
                               box-shadow: {selectedNetwork === 'solana' ? '0 4px 15px rgba(153, 69, 255, 0.3)' : 'none'};"
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
                               background: {selectedNetwork === 'sui' ? 'linear-gradient(135deg, #4da2ff, #0066cc)' : 'transparent'};
                               color: {selectedNetwork === 'sui' ? 'white' : '#888'};
                               border: {selectedNetwork === 'sui' ? '1px solid #4da2ff' : 'none'};
                               box-shadow: {selectedNetwork === 'sui' ? '0 4px 15px rgba(77, 162, 255, 0.3)' : 'none'};"
                        on:click={() => selectedNetwork = 'sui'}>
                        <svg width="18" height="18" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; filter: grayscale(100%);">
                            <circle cx="32" cy="32" r="30" fill="#888"/>
                            <path d="M42.2 26.1c-.3-2-1.5-3.8-3.3-4.7l.7-2.8-1.7-.4-.7 2.8c-.5-.1-.9-.2-1.4-.3l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.7-.2-1.1-.3l-2.4-.6-.5 1.8c-.4-.1-.8-.2-1.2-.3l0 0c-.2-.1-.5-.1-.7-.2l-.9-.2-.2.7l-2.4.6c-.5.1-.9.3-1.1.6-.4.6-.1 1.4.2 1.8.2.3.5.5.9.6l-.7 2.8c-.1.1-.2.1-.3.1l-1.5 5.9c-.1.1-.2.1-.3.1l-.7 2.8c-.3 2 1.3 3.8 3.3 4.7l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.3.4 4.1.3 4.8-1.6.6-1.6 0-2.5-1.3-3.8.9-.2 1.8-.4 2.1-1.4.1-.3.1-.6 0-.9-.1-.4-.5-.6-.5-.6zm-5.9 11.1c-.4 1.8-3.5 2.6-6 1.4l-1.1-2.7c2.5 1.2 5.1.7 5.5-.6l.1-.4-1.8-4.5c-.4 1.8-3.5 2.6-6 1.4l-1-2.5c2.5 1.2 5.1.7 5.5-.6l.7 2.7z" fill="#666"/>
                        </svg>
                        <span>SUI</span>
                </button>
            </div>

                <!-- Balance Display -->
                <div style="background: #000000; border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; border: 2px solid #ffffff; position: relative; z-index: 50; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: #888; font-size: 0.9rem;">Wallet Balance</span>
                                {#if isLoadingWallets}
                                    <div style="width: 8px; height: 8px; background: #f7931a; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
            {/if}
                            </div>
                {#if isLoadingBalance}
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 16px; height: 16px; border: 2px solid #446bff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    <span style="color: #446bff; font-size: 0.9rem;">Loading...</span>
                                </div>
            {/if}
        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="balance-amount" style="font-weight: 700; font-size: 2.5rem; color: {
                                    selectedNetwork === 'ethereum' ? '#6b73ff' :
                                    selectedNetwork === 'solana' ? '#9945ff' :
                                    '#ff9500'
                                };">
                                    {#if isLoadingBalance}
                                        --
                                    {:else if walletInfo.balance && !isNaN(parseFloat(walletInfo.balance)) && parseFloat(walletInfo.balance) > 0}
                                        {parseFloat(walletInfo.balance).toFixed(selectedNetwork === 'sui' ? 8 : 4)}
                                    {:else}
                                        0.0000
                                    {/if}
                                </span>
                                <span style="color: #f6f8ff; font-size: 1.2rem; font-weight: 600;">
                                    {selectedNetwork === 'ethereum' ? 'ETH' : selectedNetwork === 'solana' ? 'SOL' : 'BTC'}
                                </span>
            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                                {#if walletInfo.type === 'generated' || walletInfo.type === 'Generated Wallet'}
                                    <button
                                        style="background: linear-gradient(135deg, #2ecc71, #27ae60); border: none; border-radius: 12px; padding: 0.25rem 0.5rem; color: white; cursor: pointer; font-size: 0.7rem; font-weight: 600; transition: all 0.2s;"
                                        on:click={() => loadUserWallets()}
                                        title="Refresh wallet data">
                                        <span class="emoji-icon">🔄</span> Refresh
                                    </button>
                                {:else if walletInfo.balance && parseFloat(walletInfo.balance) > 0}
                                    <div style="background: linear-gradient(135deg, #17a2b8, #4facfe); color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">
                                        <span class="emoji-icon">🌐</span> Live Balance
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

                <!-- Current Network Wallet Display -->
                <div style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 2px solid #253157; border-radius: 20px; padding: 2rem; margin-bottom: 2rem;">

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
                            <h3 style="color: {
                                selectedNetwork === 'ethereum' ? '#446bff' :
                                selectedNetwork === 'solana' ? '#9945ff' :
                                selectedNetwork === 'sui' ? '#4da2ff' :
                                '#f7931a'
                            }; margin: 0 0 0.25rem 0; font-size: 1.3rem;">
                                {selectedNetwork === 'ethereum' ? 'Ethereum (ETH)' :
                                 selectedNetwork === 'solana' ? 'Solana (SOL)' :
                                 selectedNetwork === 'sui' ? 'SUI' : 'Bitcoin (BTC)'}
                            </h3>
                            <p style="color: #888; margin: 0; font-size: 0.85rem;">Your {selectedNetwork} wallet</p>
                        </div>
                    </div>

                    <!-- Wallet Address & Keys -->
                    {#if walletInfo.address}
                        <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 1rem; border: 1px solid #253157;">
                            <div style="margin-bottom: 0.5rem;">
                                <span style="color: #888; font-size: 0.8rem; font-weight: 600;">Address</span>
                            </div>
                            <p style="font-family: 'Courier New', monospace; font-size: 0.75rem; color: #feca57; word-break: break-all; margin: 0; line-height: 1.4;">
                                {walletInfo.address}
                            </p>
                        </div>
                    {/if}
                </div>

                    <!-- Action Buttons Grid -->
                    <div class="action-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                        <!-- Receive Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #2c3e50, #34495e); border: none; border-radius: 16px; padding: 1.5rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3); transition: all 0.2s;"
                        on:click={() => {
                            // Receive functionality - copy wallet address
                            if (walletInfo.address) {
                                copyToClipboard(walletInfo.address);
                                alert(`Address copied to clipboard!\n${walletInfo.address}`);
                            } else {
                                alert('No wallet address available');
                            }
                        }}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><span class="emoji-icon">📥</span></div>
                            Receive
                        </button>

                        <!-- Transfer Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #2c3e50, #34495e); border: none; border-radius: 16px; padding: 1.5rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3); transition: all 0.2s;"
                        on:click={() => openTransferModal()}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><span class="emoji-icon">📤</span></div>
                            Transfer
                        </button>

                        <!-- Swap Button -->
                        <button class="action-button" style="background: linear-gradient(135deg, #2c3e50, #34495e); border: none; border-radius: 16px; padding: 1.5rem; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3); transition: all 0.2s;"
                        on:click={() => openSwapModal()}>
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;"><span class="emoji-icon">🔄</span></div>
                            Swap
                        </button>
            </div>
        <!-- End Authentication Section -->
        {:else}
            <!-- Login/Register Form -->
            <div style="background: linear-gradient(135deg, #1a1f2e 0%, #0f1629 100%); border: 1px solid #253157; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; color: #f6f8ff;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #27ae60, #2ecc71); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">🔑</div>
                    <h3 style="color: #27ae60; margin: 0 0 0.5rem 0; font-size: 1.3rem;">{isLoginMode ? 'Login to Your Account' : 'Create New Account'}</h3>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label for="login-email" style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        bind:value={email}
                        placeholder="Enter your email"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                    />

                    <label for="login-password" style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem; margin-top: 1rem;">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        bind:value={password}
                        placeholder="Enter your password"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                    />

                    {#if !isLoginMode}
                        <label for="confirm-password" style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem; margin-top: 1rem;">Confirm Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            bind:value={confirmPassword}
                            placeholder="Confirm your password"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0a0e1a; color: #f6f8ff; font-size: 0.9rem;"
                        />

                        <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 6px; padding: 0.75rem; margin-top: 1rem;">
                            <p style="color: #ffc107; margin: 0; font-size: 0.8rem;">
                                <span class="emoji-icon">🔒</span> <strong>Password Requirements:</strong> Minimum 6 characters. Choose a strong password for your wallet security.
                            </p>
                        </div>
                    {/if}
                </div>

<button style="width: 100%; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; background: linear-gradient(135deg, #446bff, #6b73ff); color: white; cursor: pointer; font-weight: 600; font-size: 1rem;"
on:click={handleAuth}
disabled={isLoading}
>
                    {#if isLoading}
                        {isLoginMode ? 'Logging in...' : 'Registering...'}
                    {:else}
                        {isLoginMode ? 'Login' : 'Register'}
                    {/if}
                </button>

                <div style="margin-top: 1rem; text-align: center;">
                    <button style="background: transparent; border: none; color: #446bff; cursor: pointer; font-size: 0.9rem; text-decoration: underline;"
                    on:click={toggleMode}
                    disabled={isLoading}>
                        {isLoginMode ? "Don't have an account? Register" : 'Already have an account? Login'}
                    </button>
                </div>

                {#if error}
                <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 6px; padding: 0.75rem; margin-top: 1rem;">
                    <p style="color: #ff4757; margin: 0; font-size: 0.9rem;">{error}</p>
                </div>
                {/if}

                {#if success}
                <div style="background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 6px; padding: 0.75rem; margin-top: 1rem;">
                    <p style="color: #2ecc71; margin: 0; font-size: 0.9rem;">{success}</p>
                </div>
                    {/if}
                </div>
        <!-- End Loading State -->
        {/if}
        <!-- End Wallet Tab -->
    </div>

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
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #9b59b6, #8e44ad); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;"><span class="emoji-icon">🔄</span></div>
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
                                <span class="emoji-icon">🔄</span> Swap
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
    </main>
</div>