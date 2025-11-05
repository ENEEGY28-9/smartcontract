// Game UI Implementation for Eneegy Token System
class EneegyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.player = document.getElementById('player');
        this.notifications = document.getElementById('notifications');
        this.connectWalletBtn = document.getElementById('connectWalletBtn');

        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.playerX = window.innerWidth / 2;
        this.playerY = window.innerHeight - 100;
        this.playerSpeed = 5;

        // Particle system
        this.particles = [];
        this.maxParticles = 15;
        this.particleSpawnRate = 2000; // ms
        this.lastSpawnTime = 0;

        // Game stats
        this.score = 0;
        this.tokens = 0;
        this.combo = 0;
        this.sessionTokens = 0;
        this.gamePoolBalance = 0;
        this.ownerBalance = 0;

        // Leaderboard
        this.leaderboard = [
            { name: 'Player 1', score: 1250 },
            { name: 'Player 2', score: 980 },
            { name: 'Player 3', score: 750 },
            { name: 'You', score: 0 }
        ];

        // Wallet connection
        this.walletConnected = false;
        this.walletAddress = null;
        this.walletAdapter = null;

        // Blockchain integration
        this.blockchain = null;

        // Event listeners
        this.keys = {};
        this.initEventListeners();

        // Initialize blockchain integration
        this.initBlockchain();

        // Game loop
        this.gameLoop();

        // Particle spawning
        this.spawnParticles();
    }

    async initBlockchain() {
        try {
            // Load blockchain integration script
            if (!window.BlockchainIntegration) {
                await this.loadScript('blockchain_integration.js');
            }

            // Initialize blockchain integration
            this.blockchain = new BlockchainIntegration(this);

            // Setup UI event listeners for blockchain events
            this.setupBlockchainEventListeners();

        } catch (error) {
            console.error('Blockchain integration failed:', error);
            this.showNotification('Running in demo mode - blockchain features limited', 'error');
        }
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupBlockchainEventListeners() {
        if (!this.blockchain) return;

        // Listen for UI updates from blockchain
        this.blockchain.addEventListener('UITokenMinted', (event) => {
            this.handleUITokenMinted(event);
        });

        this.blockchain.addEventListener('UIBalanceUpdate', (event) => {
            this.handleUIBalanceUpdate(event);
        });

        this.blockchain.addEventListener('UIParticleSpawned', (event) => {
            this.handleUIParticleSpawned(event);
        });
    }

    handleUITokenMinted(event) {
        // Update UI with blockchain event data
        this.tokens += event.amount;
        this.sessionTokens = event.session_tokens || this.sessionTokens + 1;

        // Show special notification for blockchain events
        this.showNotification(`🎉 Token minted on blockchain! +${event.amount} tokens`, 'success');

        this.updateUI();
    }

    handleUIBalanceUpdate(event) {
        // Update balance displays
        if (event.type === 'gamePool') {
            this.gamePoolBalance = event.balance;
        } else if (event.type === 'owner') {
            this.ownerBalance = event.balance;
        }

        console.log(`Balance updated - ${event.type}: ${event.balance} tokens`);
    }

    handleUIParticleSpawned(event) {
        // Create particle from blockchain event
        if (event.location) {
            this.createParticleAt(event.location.x, event.location.y, event.value || 1);
        }
    }

    initEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Game control buttons
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseGameBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resetGameBtn').addEventListener('click', () => this.resetGame());

        // Mobile controls
        document.getElementById('leftBtn').addEventListener('touchstart', () => this.keys['ArrowLeft'] = true);
        document.getElementById('leftBtn').addEventListener('touchend', () => this.keys['ArrowLeft'] = false);
        document.getElementById('rightBtn').addEventListener('touchstart', () => this.keys['ArrowRight'] = true);
        document.getElementById('rightBtn').addEventListener('touchend', () => this.keys['ArrowRight'] = false);

        // Wallet connection
        this.connectWalletBtn.addEventListener('click', () => this.connectWallet());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Prevent context menu on game canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startGame() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.gamePaused = false;
            this.showNotification('Game Started! Collect energy particles to earn tokens!', 'success');
            document.getElementById('startGameBtn').textContent = 'Running...';
        }
    }

    pauseGame() {
        this.gamePaused = !this.gamePaused;
        const btn = document.getElementById('pauseGameBtn');
        if (this.gamePaused) {
            btn.textContent = 'Resume';
            this.showNotification('Game Paused', 'error');
        } else {
            btn.textContent = 'Pause';
            this.showNotification('Game Resumed!', 'success');
        }
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.tokens = 0;
        this.combo = 0;
        this.sessionTokens = 0;
        this.particles = [];
        this.playerX = window.innerWidth / 2;

        this.updateUI();
        document.getElementById('startGameBtn').textContent = 'Start Game';
        this.showNotification('Game Reset!', 'success');
    }

    gameLoop() {
        if (this.gameRunning && !this.gamePaused) {
            this.updatePlayer();
            this.updateParticles();
            this.checkCollisions();
        }

        this.updateUI();
        requestAnimationFrame(() => this.gameLoop());
    }

    updatePlayer() {
        let newX = this.playerX;

        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            newX -= this.playerSpeed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            newX += this.playerSpeed;
        }

        // Boundary checks
        const playerWidth = 40;
        newX = Math.max(0, Math.min(window.innerWidth - playerWidth, newX));

        this.playerX = newX;
        this.player.style.left = this.playerX + 'px';
        this.player.style.top = this.playerY + 'px';

        // Add movement animation
        if (this.keys['ArrowLeft'] || this.keys['ArrowRight'] || this.keys['KeyA'] || this.keys['KeyD']) {
            this.player.style.transform = 'scaleX(' + (this.keys['ArrowLeft'] || this.keys['KeyA'] ? -1 : 1) + ')';
        }
    }

    spawnParticles() {
        const now = Date.now();

        if (this.gameRunning && !this.gamePaused &&
            now - this.lastSpawnTime > this.particleSpawnRate &&
            this.particles.length < this.maxParticles) {

            this.createParticle();
            this.lastSpawnTime = now;
        }

        // Dynamic spawn rate based on score
        if (this.score > 100) {
            this.particleSpawnRate = 1500;
        } else if (this.score > 50) {
            this.particleSpawnRate = 1800;
        }

        setTimeout(() => this.spawnParticles(), 100);
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.id = 'particle-' + Date.now();

        // Random position at top of screen
        const x = Math.random() * (window.innerWidth - 20);
        const y = -20;

        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        // Random fall speed
        particle.fallSpeed = 2 + Math.random() * 3;
        particle.x = x;
        particle.y = y;
        particle.collected = false;

        this.particles.push(particle);
        this.canvas.appendChild(particle);
    }

    updateParticles() {
        this.particles.forEach((particle, index) => {
            if (!particle.collected) {
                particle.y += particle.fallSpeed;
                particle.style.top = particle.y + 'px';

                // Remove particles that fall off screen
                if (particle.y > window.innerHeight + 50) {
                    particle.remove();
                    this.particles.splice(index, 1);
                }
            }
        });
    }

    checkCollisions() {
        const playerRect = this.player.getBoundingClientRect();

        this.particles.forEach((particle, index) => {
            if (!particle.collected) {
                const particleRect = particle.getBoundingClientRect();

                if (this.rectsCollide(playerRect, particleRect)) {
                    this.collectParticle(particle, index);
                }
            }
        });
    }

    rectsCollide(rect1, rect2) {
        return !(rect1.right < rect2.left ||
                rect1.left > rect2.right ||
                rect1.bottom < rect2.top ||
                rect1.top > rect2.bottom);
    }

    collectParticle(particle, index) {
        particle.collected = true;
        particle.classList.add('collected');

        // Update stats
        this.score += 10;
        this.tokens += 1;
        this.sessionTokens += 1;
        this.combo += 1;

        // Show score popup
        this.showScorePopup(particle.x + 10, particle.y);

        // Show combo if applicable
        if (this.combo >= 5) {
            this.showComboIndicator(this.combo);
        }

        // Simulate blockchain transaction
        this.simulateTokenMint(particle.x, particle.y);

        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
            this.particles.splice(index, 1);
        }, 500);
    }

    showScorePopup(x, y) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = '+10';
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';

        this.canvas.appendChild(popup);

        setTimeout(() => popup.remove(), 1000);
    }

    showComboIndicator(combo) {
        const comboDiv = document.createElement('div');
        comboDiv.className = 'combo-indicator';
        comboDiv.textContent = `COMBO ×${combo}!`;
        this.canvas.appendChild(comboDiv);

        setTimeout(() => comboDiv.remove(), 1000);
    }

    simulateTokenMint(particleX, particleY) {
        // Use blockchain integration if available
        if (this.blockchain) {
            this.blockchain.mintTokenOnChain([Math.floor(particleX), Math.floor(particleY)]);
        } else {
            // Fallback to simulated event
            const particleLocation = [Math.floor(particleX), Math.floor(particleY)];

            // Emit TokenMintedEvent (simulated)
            this.emitTokenMintedEvent({
                player: this.walletAddress || 'demo-player',
                game_amount: 1,
                owner_amount: 1,
                particle_location: particleLocation,
                timestamp: Date.now(),
                session_tokens: this.sessionTokens
            });

            // Show blockchain notification
            this.showNotification(`Token minted! Particle at (${particleLocation[0]}, ${particleLocation[1]})`, 'success');
        }
    }

    createParticleAt(x, y, value = 1) {
        const particle = document.createElement('div');
        particle.className = 'particle special-particle';
        particle.id = 'particle-' + Date.now() + '-blockchain';

        // Position at specified location
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        // Special styling for blockchain-spawned particles
        particle.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        particle.style.animation = 'pulse 1s infinite';

        // Particle properties
        particle.fallSpeed = 1 + Math.random() * 2;
        particle.x = x;
        particle.y = y;
        particle.collected = false;
        particle.value = value;

        this.particles.push(particle);
        this.canvas.appendChild(particle);

        this.showNotification(`⚡ Blockchain particle spawned at (${x}, ${y})!`, 'success');
    }

    emitTokenMintedEvent(eventData) {
        // In real implementation, this would be emitted by smart contract
        console.log('TokenMintedEvent:', eventData);

        // Update leaderboard
        this.updateLeaderboard();

        // Reset combo after some time
        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => {
            this.combo = 0;
            this.updateUI();
        }, 3000);
    }

    updateLeaderboard() {
        // Update player's score in leaderboard
        const playerEntry = this.leaderboard.find(entry => entry.name === 'You');
        if (playerEntry) {
            playerEntry.score = this.score;
        }

        // Sort leaderboard
        this.leaderboard.sort((a, b) => b.score - a.score);

        // Update UI
        const leaderboardContent = document.getElementById('leaderboardContent');
        leaderboardContent.innerHTML = this.leaderboard.map(entry => `
            <div class="leaderboard-item ${entry.name === 'You' ? 'current' : ''}">
                <span>${entry.name}</span>
                <span>${entry.score}</span>
            </div>
        `).join('');
    }

    updateUI() {
        document.getElementById('tokenBalance').textContent = this.tokens;
        document.getElementById('currentScore').textContent = this.score;
        document.getElementById('comboCount').textContent = this.combo;
        document.getElementById('yourScore').textContent = this.score;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notifications.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    async connectWallet() {
        try {
            // Check if Phantom is installed
            if (!window.solana) {
                this.showNotification('Please install Phantom wallet!', 'error');
                window.open('https://phantom.app/', '_blank');
                return;
            }

            // Connect to wallet
            const response = await window.solana.connect();
            this.walletAddress = response.publicKey.toString();

            this.walletConnected = true;
            this.connectWalletBtn.textContent = 'Disconnect';
            this.connectWalletBtn.classList.add('disconnect-wallet');

            document.getElementById('walletInfo').innerHTML = `
                <span>${this.walletAddress.substring(0, 6)}...${this.walletAddress.slice(-4)}</span>
            `;

            this.showNotification('Wallet connected successfully!', 'success');

        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showNotification('Wallet connection failed!', 'error');
        }
    }

    handleResize() {
        // Update player position on resize
        this.playerX = Math.min(this.playerX, window.innerWidth - 40);
        this.player.style.left = this.playerX + 'px';
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new EneegyGame();

    // Add some demo particles for testing
    setTimeout(() => {
        if (!game.gameRunning) {
            game.showNotification('Click "Start Game" to begin collecting energy particles!', 'success');
        }
    }, 1000);
});

// Export for potential use in other modules
window.EneegyGame = EneegyGame;
