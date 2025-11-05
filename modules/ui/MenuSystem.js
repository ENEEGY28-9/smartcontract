/**
 * MenuSystem - Handles menu navigation and interactions
 * Manages menu state, transitions, and user interactions
 */

class MenuSystem {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentMenu = 'main';
        this.menuStack = [];
        this.isTransitioning = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for menu navigation events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-menu]')) {
                this.navigateTo(e.target.getAttribute('data-menu'));
            }

            if (e.target.matches('[data-action]')) {
                this.handleAction(e.target.getAttribute('data-action'), e.target);
            }
        });
    }

    navigateTo(menuId) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        const previousMenu = this.currentMenu;

        // Hide current menu
        this.hideMenu(previousMenu);

        // Show new menu
        this.showMenu(menuId);

        this.currentMenu = menuId;
        this.isTransitioning = false;

        console.log(`Navigated from ${previousMenu} to ${menuId}`);
    }

    showMenu(menuId) {
        const menuElement = document.getElementById(menuId);
        if (menuElement) {
            menuElement.classList.remove('hidden');
            Utils.fadeIn(menuElement, 300);
        }
    }

    hideMenu(menuId) {
        const menuElement = document.getElementById(menuId);
        if (menuElement) {
            Utils.fadeOut(menuElement, 300);
            setTimeout(() => {
                menuElement.classList.add('hidden');
            }, 300);
        }
    }

    handleAction(action, element) {
        switch (action) {
            case 'startGame':
                this.startGame();
                break;
            case 'showShop':
                this.showShop();
                break;
            case 'showSettings':
                this.showSettings();
                break;
            case 'showLeaderboard':
                this.showLeaderboard();
                break;
            case 'pauseGame':
                this.pauseGame();
                break;
            case 'resumeGame':
                this.resumeGame();
                break;
            case 'restartGame':
                this.restartGame();
                break;
            case 'mainMenu':
                this.showMainMenu();
                break;
            case 'closeModal':
                this.closeModal(element.closest('.modal'));
                break;
        }
    }

    startGame() {
        if (window.game) {
            window.game.start();
        }
        this.navigateTo('gameHUD');
    }

    showShop() {
        this.navigateTo('shopModal');
        if (window.uiManager) {
            window.uiManager.updateShopContent();
        }
    }

    showSettings() {
        this.navigateTo('settingsModal');
        if (window.uiManager) {
            window.uiManager.updateSettingsValues();
        }
    }

    showLeaderboard() {
        this.navigateTo('leaderboardModal');
        // Load leaderboard data here
    }

    pauseGame() {
        if (window.game) {
            window.game.pause();
        }
        this.navigateTo('pauseMenu');
    }

    resumeGame() {
        if (window.game) {
            window.game.pause();
        }
        this.navigateTo('gameHUD');
    }

    restartGame() {
        if (window.game) {
            window.game.restart();
        }
        this.navigateTo('gameHUD');
    }

    showMainMenu() {
        this.navigateTo('mainMenu');
    }

    closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('hidden');
            this.currentMenu = 'gameHUD'; // Return to game HUD
        }
    }

    // Menu state management
    pushMenu(menuId) {
        this.menuStack.push(this.currentMenu);
        this.navigateTo(menuId);
    }

    popMenu() {
        const previousMenu = this.menuStack.pop();
        if (previousMenu) {
            this.navigateTo(previousMenu);
        }
    }

    // Dynamic menu content
    updateMenuContent(menuId, content) {
        const menuElement = document.getElementById(menuId);
        if (menuElement && content) {
            // Update menu content dynamically
            console.log(`Updated content for menu: ${menuId}`);
        }
    }

    // Responsive menu handling
    handleResponsiveChanges() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            this.enableMobileMenu();
        } else {
            this.enableDesktopMenu();
        }
    }

    enableMobileMenu() {
        // Add mobile-specific menu behaviors
        document.body.classList.add('mobile-menu');
    }

    enableDesktopMenu() {
        // Add desktop-specific menu behaviors
        document.body.classList.remove('mobile-menu');
    }

    // Menu animations
    addMenuAnimation(menuId, animationType) {
        const menuElement = document.getElementById(menuId);
        if (menuElement) {
            menuElement.classList.add(`menu-${animationType}`);
        }
    }

    // Debug methods
    getDebugInfo() {
        return {
            currentMenu: this.currentMenu,
            menuStack: this.menuStack,
            isTransitioning: this.isTransitioning
        };
    }

    // Initialization
    initialize() {
        // Set up responsive handling
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResponsiveChanges();
        }, 250));

        // Initialize responsive state
        this.handleResponsiveChanges();

        console.log('MenuSystem initialized');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuSystem;
}

// Make MenuSystem available globally
if (typeof window !== 'undefined') {
    window.MenuSystem = MenuSystem;
}
