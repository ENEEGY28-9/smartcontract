/**
 * Game - Main game coordinator
 * Initializes and manages all game systems and modules
 */

class Game {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;

        this.modules = {
            core: null,
            graphics: null,
            audio: null,
            input: null,
            ui: null,
            save: null,
            performance: null
        };

        this.gameLoop = null;
        this.debugMode = false;

        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('🚀 Initializing Subway Surfers Game...');

        // Add a small delay to ensure all modules are loaded
        setTimeout(() => {
            try {
                // Initialize core systems first
                this.initializeCore();
                this.initializeGraphics();
                this.initializeAudio();
                this.initializeInput();
                this.initializeUI();
                this.initializeSaveSystem();
                this.initializePerformanceMonitor();

                // Setup interconnections between modules
                this.setupModuleConnections();

                // Load saved game data
                this.loadGameData();

                // Start the game loop
                this.startGameLoop();

                this.isInitialized = true;
                console.log('✅ Game initialized successfully');

                // Show main menu
                this.modules.ui.showMainMenu();

            } catch (error) {
                console.error('❌ Failed to initialize game:', error);
                this.showErrorScreen(error);
            }
        }, 100); // Small delay to ensure modules are loaded
    }

    initializeCore() {
        console.log('Initializing core systems...');

        // Initialize GameCore (loaded via script tag)
        this.modules.core = new GameCore();

        // Initialize PlayerController (loaded via script tag)
        window.playerController = new PlayerController(this.modules.core);

        // Initialize PhysicsEngine (loaded via script tag)
        window.physicsEngine = new PhysicsEngine(this.modules.core);

        console.log('✅ Core systems initialized');
    }

    initializeGraphics() {
        console.log('Initializing graphics engine...');

        // Initialize GraphicsEngine (loaded via script tag)
        this.modules.graphics = new GraphicsEngine('game3d-container');

        // Initialize synchronously for now
        if (!this.modules.graphics.initialize()) {
            throw new Error('Failed to initialize graphics engine');
        }

        console.log('✅ Graphics engine initialized');
    }

    initializeAudio() {
        console.log('Initializing audio system...');

        // Initialize AudioManager (loaded via script tag)
        this.modules.audio = new AudioManager();
        window.audioManager = this.modules.audio;

        // Initialize synchronously for now
        if (!this.modules.audio.initialize()) {
            console.warn('Audio initialization failed, continuing without audio');
        }

        console.log('✅ Audio system initialized');
    }

    initializeInput() {
        console.log('Initializing input system...');

        // Initialize InputManager (loaded via script tag)
        this.modules.input = new InputManager(this.modules.core);
        window.inputManager = this.modules.input;

        console.log('✅ Input system initialized');
    }

    initializeUI() {
        console.log('Initializing UI system...');

        // Initialize UIManager (loaded via script tag)
        this.modules.ui = new UIManager(this.modules.core);
        window.uiManager = this.modules.ui;

        console.log('✅ UI system initialized');
    }

    initializeSaveSystem() {
        console.log('Initializing save system...');

        // Initialize SaveManager (loaded via script tag)
        this.modules.save = new SaveManager();
        window.saveManager = this.modules.save;

        console.log('✅ Save system initialized');
    }

    initializePerformanceMonitor() {
        console.log('Initializing performance monitor...');

        // Initialize PerformanceMonitor (loaded via script tag)
        this.modules.performance = new PerformanceMonitor();
        window.performanceMonitor = this.modules.performance;

        this.modules.performance.startMonitoring();

        console.log('✅ Performance monitor initialized');
    }

    setupModuleConnections() {
        console.log('Setting up module connections...');

        // Connect core events to other systems
        this.modules.core.on('gameStarted', () => {
            this.modules.audio.playBackgroundMusic();
            this.modules.performance.onGameStart();
        });

        this.modules.core.on('gameOver', (data) => {
            this.modules.audio.stopBackgroundMusic();
            this.modules.save.saveGame();
            this.modules.performance.onGameEnd(data);
        });

        this.modules.core.on('scoreUpdated', (score) => {
            this.modules.performance.trackScore(score);
        });

        this.modules.core.on('coinsChanged', (coins) => {
            this.modules.performance.trackCoins(coins);
        });

        // Connect UI events
        this.modules.core.on('restartGame', () => {
            this.restart();
        });

        console.log('✅ Module connections established');
    }

    loadGameData() {
        console.log('Loading game data...');

        const saveData = this.modules.save.loadGame();
        if (saveData) {
            this.modules.save.applyGameData(saveData);
            console.log('✅ Game data loaded');
        } else {
            console.log('ℹ️ No save data found, starting fresh');
        }
    }

    startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }

        const loop = (currentTime) => {
            this.gameLoop = requestAnimationFrame(loop);

            const deltaTime = (currentTime - this.lastFrameTime) / 1000;
            this.lastFrameTime = currentTime;

            if (deltaTime < 0.1) { // Cap at 10fps minimum
                this.update(deltaTime);
                this.render();
            }

            this.frameCount++;
        };

        this.gameLoop = requestAnimationFrame(loop);
        console.log('🎮 Game loop started');
    }

    update(deltaTime) {
        if (!this.isInitialized) return;

        try {
            // Update core game logic
            this.modules.core.update(deltaTime);

            // Update player controller
            if (window.playerController) {
                window.playerController.update(deltaTime);
            }

            // Update physics
            if (window.physicsEngine) {
                window.physicsEngine.update(deltaTime);
            }

            // Update graphics
            if (this.modules.graphics) {
                // Graphics updates are handled in the render loop
            }

        } catch (error) {
            console.error('Error in game update:', error);
            this.handleError(error);
        }
    }

    render() {
        if (!this.isInitialized) return;

        try {
            // Render graphics
            if (this.modules.graphics) {
                this.modules.graphics.render();
            }

        } catch (error) {
            console.error('Error in game render:', error);
            this.handleError(error);
        }
    }

    // Public game control methods
    start() {
        if (this.isInitialized) {
            this.modules.core.startGame();
        }
    }

    pause() {
        if (this.isInitialized) {
            this.modules.core.pauseGame();
        }
    }

    restart() {
        if (this.isInitialized) {
            this.modules.core.emit('restartGame');
            // Additional restart logic can be added here
        }
    }

    // Error handling
    handleError(error) {
        console.error('Game error:', error);

        // In debug mode, show error details
        if (this.debugMode) {
            this.showErrorDetails(error);
        }

        // Attempt recovery
        this.attemptRecovery(error);
    }

    showErrorScreen(error) {
        const errorScreen = document.createElement('div');
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: monospace;
        `;

        errorScreen.innerHTML = `
            <h2 style="color: #ff6b35; margin-bottom: 20px;">Game Initialization Failed</h2>
            <p style="text-align: center; max-width: 600px; margin-bottom: 20px;">${error.message}</p>
            <button onclick="location.reload()" style="
                background: #4a9eff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Reload Game</button>
        `;

        document.body.appendChild(errorScreen);
    }

    showErrorDetails(error) {
        console.group('🚨 Game Error Details');
        console.error('Error:', error);
        console.error('Stack:', error.stack);

        // Log module states
        console.log('Module states:');
        Object.entries(this.modules).forEach(([name, module]) => {
            console.log(`${name}:`, module ? 'initialized' : 'not initialized');
        });

        console.groupEnd();
    }

    attemptRecovery(error) {
        // Simple recovery: try to restart graphics if that's the issue
        if (error.message.includes('WebGL') || error.message.includes('context')) {
            console.log('Attempting graphics recovery...');
            setTimeout(() => {
                if (this.modules.graphics) {
                    this.modules.graphics.dispose();
                    this.initializeGraphics();
                }
            }, 1000);
        }
    }

    // Debug and development methods
    enableDebugMode() {
        this.debugMode = true;
        console.log('🔧 Debug mode enabled');

        // Add debug UI
        this.addDebugPanel();

        // Enable debug logging
        this.enableDebugLogging();
    }

    addDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            max-width: 300px;
            z-index: 1000;
        `;

        document.body.appendChild(debugPanel);
        this.debugPanel = debugPanel;

        // Update debug panel periodically
        setInterval(() => {
            this.updateDebugPanel();
        }, 1000);
    }

    updateDebugPanel() {
        if (!this.debugPanel) return;

        const coreInfo = this.modules.core ? this.modules.core.getDebugInfo() : {};
        const graphicsInfo = this.modules.graphics ? this.modules.graphics.getDebugInfo() : {};
        const performanceInfo = this.modules.performance ? this.modules.performance.getStats() : {};

        this.debugPanel.innerHTML = `
            <div><strong>Game Debug Panel</strong></div>
            <div>FPS: ${performanceInfo.fps || 'N/A'}</div>
            <div>Frame Time: ${performanceInfo.frameTime || 'N/A'}ms</div>
            <div>Score: ${coreInfo.gameState?.score || 'N/A'}</div>
            <div>Objects: ${graphicsInfo.scene?.objects || 'N/A'}</div>
            <div>Memory: ${Math.round(performanceInfo.memory || 0)}MB</div>
        `;
    }

    enableDebugLogging() {
        // Override console methods to add game context
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            originalLog('🎮 [GAME]', ...args);
        };

        console.error = (...args) => {
            originalError('❌ [GAME]', ...args);
        };

        console.warn = (...args) => {
            originalWarn('⚠️ [GAME]', ...args);
        };
    }

    // Performance monitoring
    getPerformanceReport() {
        return {
            initialized: this.isInitialized,
            frameCount: this.frameCount,
            uptime: Date.now() - this.startTime,
            moduleStatus: Object.entries(this.modules).map(([name, module]) => ({
                name,
                status: module ? 'loaded' : 'not loaded',
                debugInfo: module?.getDebugInfo ? module.getDebugInfo() : null
            })),
            performance: this.modules.performance?.getStats(),
            save: this.modules.save?.getDebugInfo()
        };
    }

    // Cleanup and destruction
    destroy() {
        console.log('🛑 Destroying game...');

        // Stop game loop
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }

        // Destroy modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Remove debug panel
        if (this.debugPanel) {
            this.debugPanel.remove();
        }

        this.isInitialized = false;
        console.log('✅ Game destroyed');
    }

    // Development helpers
    async reload() {
        this.destroy();
        await this.init();
    }

    // Export/Import for development
    exportState() {
        const state = {
            gameState: this.modules.core?.getDebugInfo(),
            performance: this.getPerformanceReport(),
            timestamp: Date.now()
        };

        Utils.downloadFile(
            JSON.stringify(state, null, 2),
            `game-state-${new Date().toISOString().split('T')[0]}.json`,
            'application/json'
        );
    }

    // Mobile optimization
    optimizeForMobile() {
        if (Utils.getDeviceInfo().isMobile) {
            console.log('📱 Optimizing for mobile...');

            // Reduce quality settings
            if (this.modules.graphics) {
                this.modules.graphics.optimizeForPerformance(30);
            }

            // Adjust UI for touch
            if (this.modules.ui) {
                this.modules.ui.enableTouchMode();
            }

            console.log('✅ Mobile optimization applied');
        }
    }

    // Accessibility features
    enableAccessibility() {
        console.log('♿ Enabling accessibility features...');

        // Add high contrast mode
        document.body.classList.add('high-contrast');

        // Add keyboard navigation
        this.setupKeyboardNavigation();

        // Add screen reader support
        this.addScreenReaderSupport();

        console.log('✅ Accessibility features enabled');
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                // Handle tab navigation
                this.handleTabNavigation(e);
            }
        });
    }

    handleTabNavigation(event) {
        // Custom tab navigation logic
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        // Implement custom focus management
        console.log('Tab navigation:', focusableElements.length, 'elements');
    }

    addScreenReaderSupport() {
        // Add ARIA labels and descriptions
        document.querySelectorAll('button').forEach(button => {
            if (!button.getAttribute('aria-label')) {
                button.setAttribute('aria-label', button.textContent.trim());
            }
        });
    }
}

// Create global game instance
window.game = new Game();

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM loaded, starting game initialization...');

    // Start game initialization
    window.game.init().then(() => {
        console.log('🚀 Game ready!');

        // Auto-optimize for mobile if needed
        window.game.optimizeForMobile();

        // Show welcome message
        setTimeout(() => {
            console.log('🎮 Welcome to Subway Surfers! Use WASD or arrow keys to move, Space to jump, Shift to slide.');
        }, 1000);
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
