/**
 * PlayerController - Handles player movement and interactions
 * Manages player position, jumping, sliding, and lane switching
 */

class PlayerController {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.player = null;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isGrounded = true;
        this.jumpStartY = 0;
        this.slideStartTime = 0;
        this.laneChangeProgress = 0;
        this.targetLane = 1;

        this.settings = {
            moveSpeed: 15.0,
            jumpHeight: 3.0,
            jumpDuration: 0.6,
            slideDuration: 0.8,
            laneSwitchDuration: 0.3
        };

        this.animations = {
            isRunning: true,
            isJumping: false,
            isSliding: false,
            isChangingLane: false
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.gameCore.on('playerJumped', () => this.onJump());
        this.gameCore.on('playerSlid', () => this.onSlide());
        this.gameCore.on('laneChanged', (lane) => this.onLaneChange(lane));
        this.gameCore.on('slideEnded', () => this.onSlideEnd());
    }

    initialize(playerObject) {
        this.player = playerObject;
        this.targetLane = this.gameCore.getCurrentLane();
        this.updatePlayerPosition();
    }

    update(deltaTime) {
        if (!this.player || this.gameCore.isGameOver() || this.gameCore.isPaused()) {
            return;
        }

        this.updateMovement(deltaTime);
        this.updateAnimations(deltaTime);
        this.updatePlayerPosition();
    }

    updateMovement(deltaTime) {
        // Horizontal movement (lane switching)
        if (this.animations.isChangingLane) {
            this.updateLaneSwitch(deltaTime);
        }

        // Vertical movement (jumping/falling)
        if (this.animations.isJumping) {
            this.updateJump(deltaTime);
        } else if (!this.isGrounded) {
            this.applyGravity(deltaTime);
        }

        // Apply movement to player object
        if (this.player) {
            this.player.position.x += this.velocity.x * deltaTime;
            this.player.position.y += this.velocity.y * deltaTime;
            this.player.position.z += this.velocity.z * deltaTime;
        }
    }

    updateJump(deltaTime) {
        if (!this.animations.isJumping) return;

        const elapsed = (Date.now() - this.jumpStartTime) / 1000;
        const progress = Math.min(elapsed / this.settings.jumpDuration, 1.0);

        if (progress < 1.0) {
            // Parabolic jump curve
            const height = this.settings.jumpHeight * Math.sin(progress * Math.PI);
            this.velocity.y = height * 10; // Convert to velocity

            // Check if jump is complete
            if (progress >= 1.0) {
                this.animations.isJumping = false;
                this.velocity.y = 0;
            }
        } else {
            this.animations.isJumping = false;
            this.velocity.y = 0;
        }
    }

    applyGravity(deltaTime) {
        this.velocity.y += this.gameCore.constants.GRAVITY * deltaTime;

        // Terminal velocity
        if (this.velocity.y < -20) {
            this.velocity.y = -20;
        }

        // Ground collision
        if (this.player && this.player.position.y <= 0) {
            this.player.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.animations.isJumping = false;
        }
    }

    updateLaneSwitch(deltaTime) {
        if (!this.animations.isChangingLane) return;

        const elapsed = (Date.now() - this.laneChangeStartTime) / 1000;
        const progress = Math.min(elapsed / this.settings.laneSwitchDuration, 1.0);

        if (progress < 1.0) {
            const startX = this.gameCore.getLanePosition(this.previousLane);
            const targetX = this.gameCore.getLanePosition(this.targetLane);
            const currentX = this.gameCore.lerp(startX, targetX, progress);

            if (this.player) {
                this.player.position.x = currentX;
            }
        } else {
            // Lane switch complete
            this.animations.isChangingLane = false;
            this.gameCore.gameState.currentLane = this.targetLane;
            this.velocity.x = 0;
        }
    }

    updateAnimations(deltaTime) {
        if (!this.player) return;

        // Running animation
        if (this.animations.isRunning && !this.animations.isSliding) {
            const time = Date.now() * 0.01;
            const legSwing = Math.sin(time * 8) * 0.3;
            const armSwing = Math.sin(time * 6) * 0.2;

            // Apply to player children (legs and arms)
            this.animateLimbs('leg', legSwing);
            this.animateLimbs('arm', armSwing);
        }

        // Sliding animation
        if (this.animations.isSliding) {
            const slideProgress = Math.min((Date.now() - this.slideStartTime) / (this.settings.slideDuration * 1000), 1.0);

            // Tilt body forward
            if (this.player) {
                this.player.rotation.z = slideProgress * -0.3;

                // Animate arms back
                this.animateLimbs('arm', -0.5 + slideProgress * 0.3);
            }
        } else if (this.player) {
            // Reset rotation when not sliding
            this.player.rotation.z = 0;
        }
    }

    animateLimbs(type, rotation) {
        if (!this.player) return;

        // Find limb objects (this assumes specific naming/structure)
        this.player.children.forEach(child => {
            if (child.userData && child.userData.type === type) {
                child.rotation.x = rotation;
            }
        });
    }

    updatePlayerPosition() {
        if (!this.player) return;

        // Ensure player stays in correct lane
        const laneX = this.gameCore.getLanePosition(this.gameCore.getCurrentLane());
        this.player.position.x = laneX;

        // Move forward with game speed
        this.player.position.z = this.gameCore.getDistance();
    }

    onJump() {
        if (this.isGrounded && !this.animations.isJumping) {
            this.animations.isJumping = true;
            this.animations.isRunning = false;
            this.isGrounded = false;
            this.jumpStartTime = Date.now();
            this.velocity.y = this.settings.jumpHeight * 10; // Initial jump velocity

            // Play jump sound (if audio manager exists)
            if (window.audioManager) {
                window.audioManager.playSound('jump');
            }
        }
    }

    onSlide() {
        if (this.isGrounded && !this.animations.isSliding) {
            this.animations.isSliding = true;
            this.animations.isRunning = false;
            this.slideStartTime = Date.now();

            // Play slide sound
            if (window.audioManager) {
                window.audioManager.playSound('slide');
            }
        }
    }

    onSlideEnd() {
        this.animations.isSliding = false;
        this.animations.isRunning = true;
    }

    onLaneChange(newLane) {
        if (newLane !== this.gameCore.getCurrentLane()) {
            this.previousLane = this.gameCore.getCurrentLane();
            this.targetLane = newLane;
            this.animations.isChangingLane = true;
            this.laneChangeStartTime = Date.now();

            // Play lane change sound
            if (window.audioManager) {
                window.audioManager.playSound('laneChange');
            }
        }
    }

    // Public methods for input handling
    jump() {
        return this.gameCore.jump();
    }

    slide() {
        return this.gameCore.slide();
    }

    moveLeft() {
        return this.gameCore.moveLeft();
    }

    moveRight() {
        return this.gameCore.moveRight();
    }

    // Collision handling
    onCollision(obstacleType) {
        switch (obstacleType) {
            case 'train':
            case 'barrier':
                if (this.animations.isSliding) {
                    // Successfully slid under - no damage
                    this.gameCore.emit('nearMiss');
                } else {
                    this.takeDamage(obstacleType);
                }
                break;

            case 'coin':
                this.collectCoin();
                break;

            case 'powerup':
                this.collectPowerUp();
                break;
        }
    }

    takeDamage(obstacleType) {
        // Check if invincible (power-up effect)
        if (this.gameCore.activePowerUps && this.gameCore.activePowerUps.has('invincibility')) {
            return;
        }

        // Check if hoverboard is active (absorbs one hit)
        if (this.gameCore.hoverboardActive) {
            this.gameCore.hoverboardActive = false;
            this.gameCore.emit('hoverboardBroken');
            return;
        }

        // Game over
        this.gameCore.gameOver(`Hit ${obstacleType}`);
    }

    collectCoin() {
        this.gameCore.addCoins(1);

        if (window.audioManager) {
            window.audioManager.playSound('coin');
        }

        this.gameCore.emit('coinCollected');
    }

    collectPowerUp() {
        // This would be handled by PowerUpSystem
        if (window.audioManager) {
            window.audioManager.playSound('powerup');
        }
    }

    // Getters for external use
    getPosition() {
        return this.player ? this.player.position.clone() : null;
    }

    getLane() {
        return this.gameCore.getCurrentLane();
    }

    isJumping() {
        return this.animations.isJumping;
    }

    isSliding() {
        return this.animations.isSliding;
    }

    isGrounded() {
        return this.isGrounded;
    }

    // Debug methods
    getDebugInfo() {
        return {
            position: this.getPosition(),
            velocity: this.velocity,
            animations: this.animations,
            lane: this.getLane(),
            grounded: this.isGrounded
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerController;
}

// Make PlayerController available globally
if (typeof window !== 'undefined') {
    window.PlayerController = PlayerController;
}
