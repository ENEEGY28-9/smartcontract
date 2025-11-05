/**
 * InputManager - Handles all user input (keyboard, touch, mouse)
 * Provides unified input system across different platforms
 */

class InputManager {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.keys = new Set();
        this.touches = new Map();
        this.mouse = { x: 0, y: 0, buttons: 0 };

        this.settings = {
            swipeThreshold: 50,
            longPressThreshold: 500,
            doubleTapThreshold: 300,
            touchCooldown: 100
        };

        this.gestureData = {
            lastTapTime: 0,
            tapCount: 0,
            isSwipeInProgress: false,
            swipeStartPos: { x: 0, y: 0 },
            lastTouchTime: 0
        };

        this.bindings = {
            // Keyboard bindings
            jump: ['Space', 'ArrowUp', 'KeyW'],
            slide: ['ShiftLeft', 'ArrowDown', 'KeyS'],
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            pause: ['Escape', 'KeyP'],
            restart: ['KeyR'],

            // Touch bindings (swipe directions)
            touchJump: 'swipe_up',
            touchSlide: 'swipe_down',
            touchLeft: 'swipe_left',
            touchRight: 'swipe_right'
        };

        this.isMobile = this.detectMobile();
        this.setupEventListeners();
        this.setupPlayerControllerBindings();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse events
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Touch events
        if (this.isMobile) {
            document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
            document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
            document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        }

        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }, { passive: false });

        // Window events
        window.addEventListener('blur', () => this.onWindowBlur());
        window.addEventListener('focus', () => this.onWindowFocus());
    }

    setupPlayerControllerBindings() {
        // Listen for player controller events
        if (window.playerController) {
            this.gameCore.on('playerJumped', () => this.onPlayerJump());
            this.gameCore.on('playerSlid', () => this.onPlayerSlide());
            this.gameCore.on('laneChanged', (lane) => this.onLaneChange(lane));
        }
    }

    // Keyboard event handlers
    onKeyDown(event) {
        this.keys.add(event.code);

        // Prevent default for game keys
        if (this.isGameKey(event.code)) {
            event.preventDefault();
        }

        this.handleKeyAction(event.code, true);
    }

    onKeyUp(event) {
        this.keys.delete(event.code);
        this.handleKeyAction(event.code, false);
    }

    // Mouse event handlers
    onMouseDown(event) {
        this.mouse.buttons |= (1 << event.button);

        if (event.button === 0) { // Left click
            this.handleTap({ x: event.clientX, y: event.clientY });
        }
    }

    onMouseUp(event) {
        this.mouse.buttons &= ~(1 << event.button);
    }

    onMouseMove(event) {
        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;
    }

    // Touch event handlers
    onTouchStart(event) {
        const now = Date.now();

        // Prevent rapid touches
        if (now - this.gestureData.lastTouchTime < this.settings.touchCooldown) {
            return;
        }

        this.gestureData.lastTouchTime = now;

        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            const touchId = touch.identifier;

            this.touches.set(touchId, {
                id: touchId,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: now,
                currentX: touch.clientX,
                currentY: touch.clientY,
                isLongPress: false,
                isSwipe: false
            });

            // Check for long press
            setTimeout(() => {
                const touchData = this.touches.get(touchId);
                if (touchData && !touchData.isSwipe) {
                    touchData.isLongPress = true;
                    this.handleLongPress(touchData);
                }
            }, this.settings.longPressThreshold);
        }
    }

    onTouchMove(event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;
            const touchData = this.touches.get(touchId);

            if (touchData) {
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;

                const deltaX = touchData.currentX - touchData.startX;
                const deltaY = touchData.currentY - touchData.startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > this.settings.swipeThreshold) {
                    touchData.isSwipe = true;
                    touchData.isLongPress = false;
                }
            }
        }
    }

    onTouchEnd(event) {
        const now = Date.now();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;
            const touchData = this.touches.get(touchId);

            if (touchData) {
                // Check for double tap
                const deltaTime = now - this.gestureData.lastTapTime;
                if (deltaTime < this.settings.doubleTapThreshold) {
                    this.gestureData.tapCount++;
                } else {
                    this.gestureData.tapCount = 1;
                }

                this.gestureData.lastTapTime = now;

                if (touchData.isLongPress) {
                    this.handleLongPressEnd(touchData);
                } else if (touchData.isSwipe) {
                    this.handleSwipe(touchData);
                } else {
                    if (this.gestureData.tapCount >= 2) {
                        this.handleDoubleTap(touchData);
                    } else {
                        this.handleTap(touchData);
                    }
                }

                this.touches.delete(touchId);
            }
        }
    }

    // Input action handlers
    handleKeyAction(keyCode, isPressed) {
        if (!isPressed) return;

        switch (keyCode) {
            case 'Space':
            case 'ArrowUp':
            case 'KeyW':
                this.gameCore.jump();
                break;

            case 'ShiftLeft':
            case 'ArrowDown':
            case 'KeyS':
                this.gameCore.slide();
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.gameCore.moveLeft();
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.gameCore.moveRight();
                break;

            case 'Escape':
            case 'KeyP':
                this.gameCore.pauseGame();
                break;

            case 'KeyR':
                this.restartGame();
                break;
        }
    }

    handleTap(touchData) {
        // Single tap - could be used for jump or UI interaction
        const screenHeight = window.innerHeight;
        const tapY = touchData.startY;

        // Tap in upper half = jump, lower half = slide
        if (tapY < screenHeight / 2) {
            this.gameCore.jump();
        } else {
            this.gameCore.slide();
        }
    }

    handleDoubleTap(touchData) {
        // Double tap - could be used for special actions
        this.gameCore.emit('doubleTap', touchData);
    }

    handleSwipe(touchData) {
        const deltaX = touchData.currentX - touchData.startX;
        const deltaY = touchData.currentY - touchData.startY;

        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > this.settings.swipeThreshold) {
                this.gameCore.moveRight();
            } else if (deltaX < -this.settings.swipeThreshold) {
                this.gameCore.moveLeft();
            }
        } else {
            // Vertical swipe
            if (deltaY > this.settings.swipeThreshold) {
                this.gameCore.slide();
            } else if (deltaY < -this.settings.swipeThreshold) {
                this.gameCore.jump();
            }
        }
    }

    handleLongPress(touchData) {
        // Long press - could be used for pause or special actions
        this.gameCore.pauseGame();
    }

    handleLongPressEnd(touchData) {
        // Long press ended
        console.log('Long press ended');
    }

    // Player controller event handlers
    onPlayerJump() {
        // Play jump feedback
        if (window.audioManager) {
            window.audioManager.playSound('jump');
        }
    }

    onPlayerSlide() {
        // Play slide feedback
        if (window.audioManager) {
            window.audioManager.playSound('slide');
        }
    }

    onLaneChange(lane) {
        // Play lane change feedback
        if (window.audioManager) {
            window.audioManager.playSound('laneChange');
        }
    }

    // Window event handlers
    onWindowBlur() {
        // Pause game when window loses focus
        if (this.gameCore.isGameRunning()) {
            this.gameCore.pauseGame();
        }
    }

    onWindowFocus() {
        // Could resume game or show pause menu
    }

    // Public methods for external control
    isKeyPressed(keyCode) {
        return this.keys.has(keyCode);
    }

    isAnyKeyPressed(keyCodes) {
        return keyCodes.some(code => this.keys.has(code));
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    isMouseButtonPressed(button) {
        return (this.mouse.buttons & (1 << button)) !== 0;
    }

    // Game control methods
    restartGame() {
        this.gameCore.emit('restartGame');
    }

    // Input binding management
    addBinding(action, keyCodes) {
        this.bindings[action] = keyCodes;
    }

    removeBinding(action) {
        delete this.bindings[action];
    }

    // Debug methods
    getDebugInfo() {
        return {
            platform: {
                isMobile: this.isMobile,
                userAgent: navigator.userAgent.substring(0, 50) + '...',
                touchPoints: navigator.maxTouchPoints,
                screenSize: `${screen.width}x${screen.height}`
            },
            input: {
                keysPressed: Array.from(this.keys),
                touchCount: this.touches.size,
                mousePosition: this.mouse,
                gestureData: this.gestureData
            },
            bindings: this.bindings
        };
    }

    // Cleanup methods
    destroy() {
        // Remove all event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('mousemove', this.onMouseMove);

        if (this.isMobile) {
            document.removeEventListener('touchstart', this.onTouchStart);
            document.removeEventListener('touchmove', this.onTouchMove);
            document.removeEventListener('touchend', this.onTouchEnd);
        }

        window.removeEventListener('blur', this.onWindowBlur);
        window.removeEventListener('focus', this.onWindowFocus);

        // Clear data structures
        this.keys.clear();
        this.touches.clear();

        console.log('InputManager destroyed');
    }

    // Utility methods
    isGameKey(keyCode) {
        const gameKeys = [
            'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Escape', 'KeyP', 'KeyR'
        ];
        return gameKeys.includes(keyCode);
    }

    vibrate(pattern = [50]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    playHapticFeedback() {
        if (this.isMobile && 'vibrate' in navigator) {
            this.vibrate([20]);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputManager;
}

// Make InputManager available globally
if (typeof window !== 'undefined') {
    window.InputManager = InputManager;
}
