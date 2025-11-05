/**
 * PowerUpSystem - Manages power-ups and special abilities
 * Handles power-up activation, duration, and effects
 */

class PowerUpSystem {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.activePowerUps = new Map();
        this.powerUpData = new Map();

        this.initializePowerUps();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.gameCore.on('activatePowerUp', (type) => this.activatePowerUp(type));
        this.gameCore.on('update', (deltaTime) => this.updatePowerUps(deltaTime));
    }

    initializePowerUps() {
        this.powerUpData.set('jetpack', {
            name: 'Jetpack',
            duration: 10,
            icon: '🚀',
            color: '#ff4444',
            description: 'Fly through the air!'
        });

        this.powerUpData.set('magnet', {
            name: 'Coin Magnet',
            duration: 15,
            icon: '🧲',
            color: '#4444ff',
            description: 'Attract coins from afar!'
        });

        this.powerUpData.set('multiplier', {
            name: '2x Multiplier',
            duration: 20,
            icon: '✨',
            color: '#44ff44',
            description: 'Double your score!'
        });

        this.powerUpData.set('sneakers', {
            name: 'Super Sneakers',
            duration: 12,
            icon: '👟',
            color: '#ffaa00',
            description: 'Jump higher and longer!'
        });

        this.powerUpData.set('hoverboard', {
            name: 'Hoverboard',
            duration: 30,
            icon: '🛹',
            color: '#aa44ff',
            description: 'Invincible for 30 seconds!'
        });
    }

    activatePowerUp(type) {
        if (!this.powerUpData.has(type)) {
            console.warn(`Unknown power-up type: ${type}`);
            return false;
        }

        const powerUpInfo = this.powerUpData.get(type);

        // Remove existing power-up of same type
        if (this.activePowerUps.has(type)) {
            this.deactivatePowerUp(type);
        }

        // Activate new power-up
        const powerUp = {
            type: type,
            startTime: Date.now(),
            duration: powerUpInfo.duration * 1000, // Convert to milliseconds
            info: powerUpInfo
        };

        this.activePowerUps.set(type, powerUp);

        // Apply power-up effects
        this.applyPowerUpEffect(type, true);

        // Show notification
        if (window.uiManager) {
            window.uiManager.showNotification(`${powerUpInfo.icon} ${powerUpInfo.name} activated!`, 'powerup');
        }

        console.log(`Power-up activated: ${type}`);
        return true;
    }

    deactivatePowerUp(type) {
        if (!this.activePowerUps.has(type)) return;

        // Remove power-up effects
        this.applyPowerUpEffect(type, false);

        // Remove from active list
        this.activePowerUps.delete(type);

        console.log(`Power-up deactivated: ${type}`);
    }

    updatePowerUps(deltaTime) {
        const now = Date.now();

        this.activePowerUps.forEach((powerUp, type) => {
            const elapsed = now - powerUp.startTime;

            if (elapsed >= powerUp.duration) {
                this.deactivatePowerUp(type);
            } else {
                // Update power-up specific logic
                this.updatePowerUpEffect(type, elapsed / powerUp.duration);
            }
        });
    }

    applyPowerUpEffect(type, activate) {
        switch (type) {
            case 'jetpack':
                this.applyJetpackEffect(activate);
                break;
            case 'magnet':
                this.applyMagnetEffect(activate);
                break;
            case 'multiplier':
                this.applyMultiplierEffect(activate);
                break;
            case 'sneakers':
                this.applySneakersEffect(activate);
                break;
            case 'hoverboard':
                this.applyHoverboardEffect(activate);
                break;
        }
    }

    applyJetpackEffect(activate) {
        if (window.playerController) {
            if (activate) {
                window.playerController.enableJetpack();
            } else {
                window.playerController.disableJetpack();
            }
        }
    }

    applyMagnetEffect(activate) {
        if (window.physicsEngine) {
            if (activate) {
                window.physicsEngine.enableCoinMagnet();
            } else {
                window.physicsEngine.disableCoinMagnet();
            }
        }
    }

    applyMultiplierEffect(activate) {
        if (window.gameCore) {
            if (activate) {
                window.gameCore.setScoreMultiplier(2.0);
            } else {
                window.gameCore.setScoreMultiplier(1.0);
            }
        }
    }

    applySneakersEffect(activate) {
        if (window.playerController) {
            if (activate) {
                window.playerController.enableSuperJump();
            } else {
                window.playerController.disableSuperJump();
            }
        }
    }

    applyHoverboardEffect(activate) {
        if (window.gameCore) {
            window.gameCore.hoverboardActive = activate;

            if (window.playerController) {
                if (activate) {
                    window.playerController.showHoverboard();
                } else {
                    window.playerController.hideHoverboard();
                }
            }
        }
    }

    updatePowerUpEffect(type, progress) {
        // Update visual effects based on progress
        switch (type) {
            case 'multiplier':
                // Pulsing effect for multiplier
                const intensity = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
                if (window.uiManager) {
                    window.uiManager.updateMultiplierEffect(intensity);
                }
                break;
        }
    }

    // Public methods
    isPowerUpActive(type) {
        return this.activePowerUps.has(type);
    }

    getActivePowerUps() {
        return Array.from(this.activePowerUps.entries()).map(([type, powerUp]) => ({
            type,
            ...powerUp.info,
            remainingTime: Math.max(0, (powerUp.duration - (Date.now() - powerUp.startTime)) / 1000)
        }));
    }

    getPowerUpInfo(type) {
        return this.powerUpData.get(type);
    }

    getAllPowerUpTypes() {
        return Array.from(this.powerUpData.keys());
    }

    // Debug methods
    getDebugInfo() {
        return {
            activePowerUps: this.getActivePowerUps(),
            powerUpTypes: this.getAllPowerUpTypes(),
            powerUpData: Object.fromEntries(this.powerUpData)
        };
    }

    // Cleanup
    clearAllPowerUps() {
        this.activePowerUps.forEach((_, type) => {
            this.deactivatePowerUp(type);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PowerUpSystem;
}

// Make PowerUpSystem available globally
if (typeof window !== 'undefined') {
    window.PowerUpSystem = PowerUpSystem;
}
