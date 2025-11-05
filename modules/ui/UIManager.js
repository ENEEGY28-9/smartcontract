/**
 * UIManager - Handles all user interface elements and interactions
 * Manages menus, HUD, overlays, and UI state
 */

class UIManager {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.elements = new Map();
        this.currentScreen = 'menu';
        this.isAnimating = false;

        this.setupEventListeners();
        this.createUIElements();
        this.setupResponsiveDesign();
    }

    setupEventListeners() {
        this.gameCore.on('gameStarted', () => this.onGameStart());
        this.gameCore.on('gameOver', (data) => this.onGameOver(data));
        this.gameCore.on('gamePaused', (isPaused) => this.onGamePause(isPaused));
        this.gameCore.on('scoreUpdated', (score) => this.updateScore(score));
        this.gameCore.on('coinsChanged', (coins) => this.updateCoins(coins));
        this.gameCore.on('laneChanged', (lane) => this.updateLaneIndicator(lane));
    }

    createUIElements() {
        this.createMainMenu();
        this.createGameHUD();
        this.createGameOverScreen();
        this.createPauseMenu();
        this.createShopModal();
        this.createSettingsModal();
        this.createNotificationSystem();
    }

    createMainMenu() {
        const menu = Utils.createElement('div', {
            'class': 'main-menu screen',
            'id': 'mainMenu'
        });

        menu.innerHTML = `
            <div class="menu-content">
                <h1 class="game-title">Subway Surfers</h1>
                <div class="menu-buttons">
                    <button class="btn btn-primary" id="startGameBtn">Start Game</button>
                    <button class="btn btn-secondary" id="shopBtn">Shop</button>
                    <button class="btn btn-secondary" id="settingsBtn">Settings</button>
                    <button class="btn btn-secondary" id="leaderboardBtn">Leaderboard</button>
                </div>
                <div class="character-preview">
                    <div class="character-model" id="characterPreview"></div>
                </div>
            </div>
        `;

        document.body.appendChild(menu);
        this.elements.set('mainMenu', menu);

        // Add event listeners
        menu.querySelector('#startGameBtn').addEventListener('click', () => this.startGame());
        menu.querySelector('#shopBtn').addEventListener('click', () => this.showShop());
        menu.querySelector('#settingsBtn').addEventListener('click', () => this.showSettings());
        menu.querySelector('#leaderboardBtn').addEventListener('click', () => this.showLeaderboard());
    }

    createGameHUD() {
        const hud = Utils.createElement('div', {
            'class': 'game-hud screen hidden',
            'id': 'gameHUD'
        });

        hud.innerHTML = `
            <div class="hud-top">
                <div class="score-display">
                    <span class="score-label">Score:</span>
                    <span class="score-value" id="scoreValue">0</span>
                </div>
                <div class="coins-display">
                    <span class="coin-icon">🪙</span>
                    <span class="coins-value" id="coinsValue">0</span>
                </div>
            </div>
            <div class="hud-center">
                <div class="lane-indicator">
                    <div class="lane-dot" data-lane="0"></div>
                    <div class="lane-dot active" data-lane="1"></div>
                    <div class="lane-dot" data-lane="2"></div>
                </div>
                <div class="multiplier-display" id="multiplierDisplay" style="display: none;">
                    <span class="multiplier-text">x2</span>
                </div>
            </div>
            <div class="hud-controls">
                <button class="control-btn" id="jumpBtn" title="Jump (Space/W/↑)">⬆️</button>
                <button class="control-btn" id="slideBtn" title="Slide (S/↓/Shift)">⬇️</button>
                <button class="control-btn" id="leftBtn" title="Left (A/←)">⬅️</button>
                <button class="control-btn" id="rightBtn" title="Right (D/→)">➡️</button>
                <button class="control-btn" id="pauseBtn" title="Pause (P/Esc)">⏸️</button>
            </div>
            <div class="powerup-indicators" id="powerupIndicators"></div>
        `;

        document.body.appendChild(hud);
        this.elements.set('gameHUD', hud);

        // Add event listeners
        hud.querySelector('#jumpBtn').addEventListener('click', () => this.gameCore.jump());
        hud.querySelector('#slideBtn').addEventListener('click', () => this.gameCore.slide());
        hud.querySelector('#leftBtn').addEventListener('click', () => this.gameCore.moveLeft());
        hud.querySelector('#rightBtn').addEventListener('click', () => this.gameCore.moveRight());
        hud.querySelector('#pauseBtn').addEventListener('click', () => this.gameCore.pauseGame());
    }

    createGameOverScreen() {
        const gameOver = Utils.createElement('div', {
            'class': 'game-over-overlay screen hidden',
            'id': 'gameOverScreen'
        });

        gameOver.innerHTML = `
            <div class="game-over-content">
                <h2>Game Over!</h2>
                <div class="final-stats">
                    <div class="final-score">
                        Final Score: <span id="finalScore">0</span>
                    </div>
                    <div class="final-coins">
                        Coins Collected: <span id="finalCoins">0</span>
                    </div>
                    <div class="final-distance">
                        Distance: <span id="finalDistance">0m</span>
                    </div>
                </div>
                <div class="game-over-actions">
                    <button class="btn btn-primary" id="restartBtn">Play Again</button>
                    <button class="btn btn-secondary" id="mainMenuBtn">Main Menu</button>
                    <button class="btn btn-secondary" id="shareBtn">Share Score</button>
                </div>
                <div class="high-score" id="highScoreDisplay">
                    High Score: <span id="highScoreValue">0</span>
                </div>
            </div>
        `;

        document.body.appendChild(gameOver);
        this.elements.set('gameOverScreen', gameOver);

        // Add event listeners
        gameOver.querySelector('#restartBtn').addEventListener('click', () => this.restartGame());
        gameOver.querySelector('#mainMenuBtn').addEventListener('click', () => this.showMainMenu());
        gameOver.querySelector('#shareBtn').addEventListener('click', () => this.shareScore());
    }

    createPauseMenu() {
        const pauseMenu = Utils.createElement('div', {
            'class': 'pause-overlay screen hidden',
            'id': 'pauseMenu'
        });

        pauseMenu.innerHTML = `
            <div class="pause-content">
                <h2>Game Paused</h2>
                <div class="pause-actions">
                    <button class="btn btn-primary" id="resumeBtn">Resume</button>
                    <button class="btn btn-secondary" id="restartFromPauseBtn">Restart</button>
                    <button class="btn btn-secondary" id="settingsFromPauseBtn">Settings</button>
                    <button class="btn btn-secondary" id="mainMenuFromPauseBtn">Main Menu</button>
                </div>
            </div>
        `;

        document.body.appendChild(pauseMenu);
        this.elements.set('pauseMenu', pauseMenu);

        // Add event listeners
        pauseMenu.querySelector('#resumeBtn').addEventListener('click', () => this.resumeGame());
        pauseMenu.querySelector('#restartFromPauseBtn').addEventListener('click', () => this.restartGame());
        pauseMenu.querySelector('#settingsFromPauseBtn').addEventListener('click', () => this.showSettings());
        pauseMenu.querySelector('#mainMenuFromPauseBtn').addEventListener('click', () => this.showMainMenu());
    }

    createShopModal() {
        const shop = Utils.createElement('div', {
            'class': 'shop-modal screen hidden',
            'id': 'shopModal'
        });

        shop.innerHTML = `
            <div class="shop-content">
                <div class="shop-header">
                    <h2>Shop</h2>
                    <div class="shop-header-actions">
                        <button class="reset-data-btn" id="resetDataBtn">Reset Data</button>
                        <button class="close-shop-btn" id="closeShopBtn">×</button>
                    </div>
                </div>
                <div class="shop-body">
                    <div class="shop-section">
                        <h3>Characters</h3>
                        <div class="character-shop-grid" id="characterShopGrid"></div>
                    </div>
                    <div class="shop-section">
                        <h3>Power-ups</h3>
                        <div class="powerup-shop-grid" id="powerupShopGrid"></div>
                    </div>
                    <div class="shop-section">
                        <h3>Hoverboards</h3>
                        <div class="hoverboard-shop-grid" id="hoverboardShopGrid"></div>
                    </div>
                </div>
                <div class="shop-footer">
                    <div class="currency-display">
                        <span class="coins-display">🪙 <span id="shopCoinsValue">0</span></span>
                        <span class="keys-display">🗝️ <span id="shopKeysValue">0</span></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(shop);
        this.elements.set('shopModal', shop);

        // Add event listeners
        shop.querySelector('#closeShopBtn').addEventListener('click', () => this.hideShop());
        shop.querySelector('#resetDataBtn').addEventListener('click', () => this.resetGameData());
    }

    createSettingsModal() {
        const settings = Utils.createElement('div', {
            'class': 'settings-modal screen hidden',
            'id': 'settingsModal'
        });

        settings.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="close-settings-btn" id="closeSettingsBtn">×</button>
                </div>
                <div class="settings-body">
                    <div class="setting-group">
                        <label>Master Volume</label>
                        <input type="range" id="masterVolume" min="0" max="100" value="50">
                    </div>
                    <div class="setting-group">
                        <label>Music Volume</label>
                        <input type="range" id="musicVolume" min="0" max="100" value="30">
                    </div>
                    <div class="setting-group">
                        <label>SFX Volume</label>
                        <input type="range" id="sfxVolume" min="0" max="100" value="50">
                    </div>
                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="vibrationEnabled" checked>
                            Enable Vibration
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="paintTrailsEnabled" checked>
                            Enable Paint Trails
                        </label>
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
                    <button class="btn btn-secondary" id="resetSettingsBtn">Reset to Default</button>
                </div>
            </div>
        `;

        document.body.appendChild(settings);
        this.elements.set('settingsModal', settings);

        // Add event listeners
        settings.querySelector('#closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        settings.querySelector('#saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        settings.querySelector('#resetSettingsBtn').addEventListener('click', () => this.resetSettings());
    }

    createNotificationSystem() {
        const notifications = Utils.createElement('div', {
            'class': 'notifications-container',
            'id': 'notificationsContainer'
        });

        document.body.appendChild(notifications);
        this.elements.set('notificationsContainer', notifications);
    }

    setupResponsiveDesign() {
        // Add responsive CSS classes
        const responsiveCSS = `
            @media (max-width: 768px) {
                .main-menu .menu-content {
                    padding: 1rem;
                }

                .game-hud .hud-controls {
                    bottom: 10px;
                    left: 10px;
                    right: 10px;
                }

                .shop-content {
                    margin: 10px;
                    max-height: 90vh;
                }

                .settings-content {
                    margin: 10px;
                    max-height: 90vh;
                }
            }

            @media (max-width: 480px) {
                .game-hud .hud-top {
                    font-size: 0.8rem;
                }

                .game-hud .hud-controls {
                    gap: 5px;
                }

                .control-btn {
                    width: 40px;
                    height: 40px;
                    font-size: 1rem;
                }
            }
        `;

        const style = document.createElement('style');
        style.textContent = responsiveCSS;
        document.head.appendChild(style);
    }

    // Screen management methods
    showScreen(screenName) {
        if (this.isAnimating) return;

        this.isAnimating = true;

        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenName;
        }

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    showMainMenu() {
        this.showScreen('mainMenu');
    }

    showGameHUD() {
        this.showScreen('gameHUD');
    }

    showGameOver(data) {
        this.updateGameOverStats(data);
        this.showScreen('gameOverScreen');
    }

    showPauseMenu() {
        this.showScreen('pauseMenu');
    }

    showShop() {
        this.updateShopContent();
        this.showScreen('shopModal');
    }

    hideShop() {
        document.getElementById('shopModal').classList.add('hidden');
        this.currentScreen = 'gameHUD';
    }

    showSettings() {
        this.updateSettingsValues();
        this.showScreen('settingsModal');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
        this.currentScreen = 'gameHUD';
    }

    // Game state event handlers
    onGameStart() {
        this.showGameHUD();
        this.updateScore(0);
        this.updateCoins(0);
        this.updateLaneIndicator(1);
    }

    onGameOver(data) {
        this.showGameOver(data);
    }

    onGamePause(isPaused) {
        if (isPaused) {
            this.showPauseMenu();
        } else {
            this.showGameHUD();
        }
    }

    // UI update methods
    updateScore(score) {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            Utils.animateNumber(scoreElement, parseInt(scoreElement.textContent) || 0, score, 500);
        }
    }

    updateCoins(coins) {
        const coinsElement = document.getElementById('coinsValue');
        if (coinsElement) {
            Utils.animateNumber(coinsElement, parseInt(coinsElement.textContent) || 0, coins, 500);
        }

        // Update shop coins display too
        const shopCoinsElement = document.getElementById('shopCoinsValue');
        if (shopCoinsElement) {
            shopCoinsElement.textContent = coins;
        }
    }

    updateLaneIndicator(lane) {
        const dots = document.querySelectorAll('.lane-dot');
        dots.forEach((dot, index) => {
            if (index === lane) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    updateGameOverStats(data) {
        document.getElementById('finalScore').textContent = Utils.formatNumber(data.score);
        document.getElementById('finalCoins').textContent = data.coins;
        document.getElementById('finalDistance').textContent = Utils.formatNumber(Math.floor(data.distance)) + 'm';

        const highScore = Utils.loadFromLocalStorage('highScore', 0);
        document.getElementById('highScoreValue').textContent = Utils.formatNumber(highScore);

        if (data.score > highScore) {
            Utils.saveToLocalStorage('highScore', data.score);
            this.showNotification('New High Score!', 'achievement');
        }
    }

    updateShopContent() {
        // This would be populated with actual shop items
        // For now, just update currency displays
        const coins = this.gameCore.getCoins();
        document.getElementById('shopCoinsValue').textContent = coins;
    }

    updateSettingsValues() {
        const settings = Utils.loadFromLocalStorage('gameSettings', {
            masterVolume: 50,
            musicVolume: 30,
            sfxVolume: 50,
            vibrationEnabled: true,
            paintTrailsEnabled: true
        });

        document.getElementById('masterVolume').value = settings.masterVolume;
        document.getElementById('musicVolume').value = settings.musicVolume;
        document.getElementById('sfxVolume').value = settings.sfxVolume;
        document.getElementById('vibrationEnabled').checked = settings.vibrationEnabled;
        document.getElementById('paintTrailsEnabled').checked = settings.paintTrailsEnabled;
    }

    // Action methods
    startGame() {
        this.gameCore.startGame();
    }

    restartGame() {
        this.gameCore.emit('restartGame');
    }

    resumeGame() {
        this.gameCore.pauseGame();
    }

    shareScore() {
        const score = this.gameCore.getScore();
        const text = `I scored ${Utils.formatNumber(score)} points in Subway Surfers! Can you beat my score?`;

        if (navigator.share) {
            navigator.share({
                title: 'Subway Surfers Score',
                text: text,
                url: window.location.href
            });
        } else {
            Utils.copyToClipboard(text);
            this.showNotification('Score copied to clipboard!');
        }
    }

    saveSettings() {
        const settings = {
            masterVolume: parseInt(document.getElementById('masterVolume').value),
            musicVolume: parseInt(document.getElementById('musicVolume').value),
            sfxVolume: parseInt(document.getElementById('sfxVolume').value),
            vibrationEnabled: document.getElementById('vibrationEnabled').checked,
            paintTrailsEnabled: document.getElementById('paintTrailsEnabled').checked
        };

        Utils.saveToLocalStorage('gameSettings', settings);

        if (window.audioManager) {
            window.audioManager.setMasterVolume(settings.masterVolume / 100);
        }

        this.hideSettings();
        this.showNotification('Settings saved!');
    }

    resetSettings() {
        const defaultSettings = {
            masterVolume: 50,
            musicVolume: 30,
            sfxVolume: 50,
            vibrationEnabled: true,
            paintTrailsEnabled: true
        };

        document.getElementById('masterVolume').value = defaultSettings.masterVolume;
        document.getElementById('musicVolume').value = defaultSettings.musicVolume;
        document.getElementById('sfxVolume').value = defaultSettings.sfxVolume;
        document.getElementById('vibrationEnabled').checked = defaultSettings.vibrationEnabled;
        document.getElementById('paintTrailsEnabled').checked = defaultSettings.paintTrailsEnabled;
    }

    resetGameData() {
        if (confirm('Are you sure you want to reset all game data? This cannot be undone.')) {
            localStorage.clear();
            this.showNotification('Game data reset!');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // Notification system
    showNotification(message, type = 'info') {
        const notification = Utils.createElement('div', {
            'class': `notification notification-${type}`,
            'style': 'animation: slideIn 0.3s ease-out;'
        }, message);

        const container = document.getElementById('notificationsContainer');
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Debug methods
    getDebugInfo() {
        return {
            currentScreen: this.currentScreen,
            visibleElements: Array.from(this.elements.keys()),
            isAnimating: this.isAnimating
        };
    }

    // Cleanup methods
    destroy() {
        // Remove all UI elements
        this.elements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        this.elements.clear();
        console.log('UIManager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

// Make UIManager available globally
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
