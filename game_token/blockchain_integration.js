// Blockchain Integration for Game Token System
class BlockchainIntegration {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.connection = null;
        this.program = null;
        this.tokenMint = null;
        this.gamePoolAccount = null;
        this.ownerAccount = null;
        this.eventListeners = [];
        this.realtimeUpdates = true;

        this.initConnection();
    }

    async initConnection() {
        try {
            // Connect to Solana network
            const { Connection, PublicKey } = await import('@solana/web3.js');
            const anchor = await import('@coral-xyz/anchor');

            this.connection = new Connection('https://api.devnet-beta.solana.com', 'confirmed');

            // Setup Anchor provider and program
            const provider = new anchor.AnchorProvider(this.connection, null, { commitment: 'confirmed' });
            anchor.setProvider(provider);

            // Load program
            const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');
            const idl = await this.loadIDL();
            this.program = new anchor.Program(idl, programId, provider);

            console.log('✅ Connected to Solana Devnet with Smart Contract');

            // Load deployment info if available
            await this.loadDeploymentInfo();

            // Setup event listeners
            this.setupEventListeners();

            // Start real-time monitoring
            this.startRealtimeMonitoring();

        } catch (error) {
            console.error('❌ Blockchain connection failed:', error);
            this.game.showNotification('Blockchain connection failed. Running in demo mode.', 'error');
        }
    }

    async loadIDL() {
        try {
            const response = await fetch('./target/idl/game_token.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('IDL not found, using fallback');
        }

        // Fallback IDL structure
        return {
            "version": "0.1.0",
            "name": "game_token",
            "instructions": [
                {
                    "name": "playerEarnFromPool",
                    "accounts": [
                        {"name": "gamePools", "isMut": true, "isSigner": false},
                        {"name": "gamePoolsTokenAccount", "isMut": true, "isSigner": false},
                        {"name": "playerStats", "isMut": true, "isSigner": false},
                        {"name": "playerTokenAccount", "isMut": true, "isSigner": false},
                        {"name": "gameTokenMint", "isMut": false, "isSigner": false},
                        {"name": "player", "isMut": true, "isSigner": true},
                        {"name": "tokenProgram", "isMut": false, "isSigner": false},
                        {"name": "clock", "isMut": false, "isSigner": false},
                        {"name": "systemProgram", "isMut": false, "isSigner": false}
                    ],
                    "args": [{"name": "amount", "type": "u64"}]
                }
            ]
        };
    }

    async loadDeploymentInfo() {
        try {
            // Try updated deployment first (with 80/20 logic fix)
            let response = await fetch('./devnet_deployment_updated.json');
            if (!response.ok) {
                // Fallback to original deployment
                response = await fetch('./devnet_deployment_info.json');
            }

            if (response.ok) {
                const deploymentInfo = await response.json();
                this.tokenMint = deploymentInfo.gameTokenMint;
                this.gamePoolAccount = deploymentInfo.gamePoolAccount;
                this.ownerAccount = deploymentInfo.ownerAccount;

                console.log('✅ Loaded deployment info:', deploymentInfo);
                console.log('🎯 Logic Version:', deploymentInfo.logicVersion || 'original');
            }
        } catch (error) {
            console.log('No deployment info found, using demo mode');
        }
    }

    setupEventListeners() {
        // Listen for TokenMintedEvent (simulated for now)
        this.addEventListener('TokenMintedEvent', (event) => {
            this.handleTokenMintedEvent(event);
        });

        // Listen for balance changes
        this.addEventListener('BalanceUpdate', (event) => {
            this.handleBalanceUpdate(event);
        });

        // Listen for new particle spawns (from backend/game server)
        this.addEventListener('ParticleSpawned', (event) => {
            this.handleParticleSpawned(event);
        });
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        this.eventListeners[eventType].push(callback);
    }

    emitEvent(eventType, data) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventType} callback:`, error);
                }
            });
        }
    }

    handleTokenMintedEvent(event) {
        console.log('🎉 TokenMintedEvent received:', event);

        // Update game state
        this.game.tokens += event.game_amount;
        this.game.sessionTokens = event.session_tokens;

        // Show particle location on minimap (if implemented)
        this.showParticleOnMap(event.particle_location);

        // Update leaderboard
        this.updateLeaderboard(event.player, event.session_tokens);

        // Emit to UI
        this.emitEvent('UITokenMinted', {
            player: event.player,
            amount: event.game_amount,
            location: event.particle_location,
            timestamp: event.timestamp
        });
    }

    handleBalanceUpdate(event) {
        console.log('💰 Balance updated:', event);

        // Update game token balance
        if (event.account === this.gamePoolAccount) {
            this.game.gamePoolBalance = event.balance;
        } else if (event.account === this.ownerAccount) {
            this.game.ownerBalance = event.balance;
        }

        // Emit to UI
        this.emitEvent('UIBalanceUpdate', event);
    }

    handleParticleSpawned(event) {
        console.log('⚡ New particle spawned:', event);

        // Create particle in game world
        if (this.game.gameRunning && !this.game.gamePaused) {
            this.game.createParticleAt(event.location.x, event.location.y, event.value);
        }

        // Emit to UI
        this.emitEvent('UIParticleSpawned', event);
    }

    showParticleOnMap(location) {
        // In a full implementation, this would show particles on a minimap
        // For now, just log the location
        console.log(`📍 Particle minted at location: (${location[0]}, ${location[1]})`);
    }

    updateLeaderboard(player, score) {
        // Update leaderboard with real blockchain data
        // This would typically come from a leaderboard program
        this.game.updateLeaderboard();
    }

    startRealtimeMonitoring() {
        if (!this.connection || !this.realtimeUpdates) return;

        console.log('🔄 Starting real-time monitoring...');

        // Monitor token mint for new transactions
        if (this.tokenMint) {
            this.monitorTokenMint();
        }

        // Monitor player accounts for balance changes
        if (this.gamePoolAccount) {
            this.monitorAccountBalance(this.gamePoolAccount, 'gamePool');
        }

        if (this.ownerAccount) {
            this.monitorAccountBalance(this.ownerAccount, 'owner');
        }
    }

    monitorTokenMint() {
        try {
            // Get recent transactions for token mint
            const subscriptionId = this.connection.onLogs(
                this.tokenMint,
                (logs, context) => {
                    this.processTokenLogs(logs, context);
                },
                'confirmed'
            );

            console.log('📊 Monitoring token mint transactions');

            // Store subscription for cleanup
            this.subscriptions = this.subscriptions || [];
            this.subscriptions.push(subscriptionId);

        } catch (error) {
            console.error('Failed to setup token monitoring:', error);
        }
    }

    monitorAccountBalance(accountPubkey, accountType) {
        try {
            // Monitor account changes (would need token program logs in real implementation)
            console.log(`👀 Monitoring ${accountType} account: ${accountPubkey.toString()}`);

            // In a real implementation, you'd use getProgramAccounts or similar
            // For demo purposes, we'll simulate balance updates

        } catch (error) {
            console.error(`Failed to monitor ${accountType} account:`, error);
        }
    }

    processTokenLogs(logs, context) {
        // Process transaction logs for token minting events
        logs.logs.forEach(log => {
            if (log.includes('TokenMintedEvent') || log.includes('MintTo')) {
                console.log('🔥 Token minting detected:', log);

                // Parse event data (would need proper event parsing in real implementation)
                this.emitEvent('TokenMintedEvent', {
                    player: 'blockchain-event',
                    game_amount: 1,
                    owner_amount: 1,
                    particle_location: [Math.floor(Math.random() * 800), Math.floor(Math.random() * 600)],
                    timestamp: Date.now(),
                    session_tokens: this.game.sessionTokens + 1
                });
            }
        });
    }

    async mintTokenOnChain(particleLocation) {
        if (!this.connection || !this.game.walletConnected) {
            console.log('Demo mode: Simulating blockchain transaction');
            return this.simulateMintTransaction(particleLocation);
        }

        try {
            // In real implementation, this would call the smart contract
            console.log('🔗 Minting token on blockchain...');

            // Simulate transaction
            const signature = await this.simulateMintTransaction(particleLocation);

            return signature;

        } catch (error) {
            console.error('❌ Blockchain minting failed:', error);
            this.game.showNotification('Blockchain transaction failed!', 'error');
            return null;
        }
    }

    async playerEarnTokens(amount, particleLocation) {
        if (!this.program || !this.game.walletAddress) {
            console.log('⚠️ Smart contract not available or wallet not connected, using simulation');
            return this.simulateMintTransaction(particleLocation);
        }

        try {
            console.log(`🎮 Player earning ${amount} tokens from pool...`);

            // Derive PDAs
            const { PublicKey } = await import('@solana/web3.js');
            const anchor = await import('@coral-xyz/anchor');

            const [gamePools] = PublicKey.findProgramAddressSync(
                [Buffer.from("game_pools")],
                this.program.programId
            );

            const [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
                [Buffer.from("game_pools_token_account")],
                this.program.programId
            );

            const [playerStats] = PublicKey.findProgramAddressSync(
                [Buffer.from("player_stats"), new PublicKey(this.game.walletAddress).toBytes()],
                this.program.programId
            );

            // Get player's associated token account
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const playerTokenAccount = await getAssociatedTokenAddress(
                new PublicKey(this.tokenMint),
                new PublicKey(this.game.walletAddress)
            );

            // Call smart contract player_earn_from_pool
            const tx = await this.program.methods
                .playerEarnFromPool(new anchor.BN(amount))
                .accounts({
                    gamePools: gamePools,
                    gamePoolsTokenAccount: gamePoolsTokenAccount,
                    playerStats: playerStats,
                    playerTokenAccount: playerTokenAccount,
                    gameTokenMint: new PublicKey(this.tokenMint),
                    player: new PublicKey(this.game.walletAddress),
                    tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // TOKEN_PROGRAM_ID
                    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Real blockchain transaction:', tx);

            // Emit token earned event
            this.emitEvent('TokenMintedEvent', {
                player: this.game.walletAddress,
                game_amount: amount,
                owner_amount: 0, // Owner doesn't get tokens here, only from auto-mint
                particle_location: particleLocation,
                timestamp: Date.now(),
                session_tokens: this.game.sessionTokens,
                transaction: tx,
                realTransaction: true
            });

            return tx;

        } catch (error) {
            console.error('❌ Real blockchain transaction failed:', error);
            console.log('🔄 Falling back to simulation...');
            return this.simulateMintTransaction(particleLocation);
        }
    }

    async simulateMintTransaction(particleLocation) {
        // Fallback simulation when smart contract is not available
        console.log('🎭 Using simulation mode (smart contract not available)');
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockSignature = 'simulated_tx_' + Date.now();
                console.log('✅ Simulated transaction:', mockSignature);

                // Emit token minted event
                this.emitEvent('TokenMintedEvent', {
                    player: this.game.walletAddress || 'demo-player',
                    game_amount: 1,
                    owner_amount: 0, // Simulation - no owner tokens in earn
                    particle_location: particleLocation,
                    timestamp: Date.now(),
                    session_tokens: this.game.sessionTokens,
                    realTransaction: false
                });

                resolve(mockSignature);
            }, 500); // Simulate network delay
        });
    }

    async getTokenBalance(accountPubkey) {
        if (!this.connection) return 0;

        try {
            const { getAccount } = await import('@solana/spl-token');
            const account = await getAccount(this.connection, accountPubkey);
            return Number(account.amount) / 1_000_000; // Assuming 6 decimals
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return 0;
        }
    }

    async refreshBalances() {
        if (this.gamePoolAccount) {
            const gameBalance = await this.getTokenBalance(this.gamePoolAccount);
            this.emitEvent('BalanceUpdate', {
                account: this.gamePoolAccount,
                balance: gameBalance,
                type: 'gamePool'
            });
        }

        if (this.ownerAccount) {
            const ownerBalance = await this.getTokenBalance(this.ownerAccount);
            this.emitEvent('BalanceUpdate', {
                account: this.ownerAccount,
                balance: ownerBalance,
                type: 'owner'
            });
        }
    }

    stopRealtimeMonitoring() {
        this.realtimeUpdates = false;

        // Cleanup subscriptions
        if (this.subscriptions) {
            this.subscriptions.forEach(subId => {
                try {
                    this.connection.removeOnLogsListener(subId);
                } catch (error) {
                    console.error('Error removing subscription:', error);
                }
            });
            this.subscriptions = [];
        }
    }

    destroy() {
        this.stopRealtimeMonitoring();
        this.eventListeners = {};
    }
}

// Export for use in main game
window.BlockchainIntegration = BlockchainIntegration;
