/**
 * SaveManager - Handles game data persistence and encryption
 * Manages save/load operations with data compression and security
 */

class SaveManager {
    constructor() {
        this.saveKey = 'subwaySurfersEnhanced';
        this.encryptionKey = 'SubwaySurfers2024!@#Enhanced';
        this.compressionEnabled = true;

        this.autoSaveInterval = null;
        this.autoSaveDelay = 5000; // 5 seconds

        this.setupAutoSave();
    }

    setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (window.gameCore && window.gameCore.isGameRunning()) {
                this.saveGame();
            }
        }, this.autoSaveDelay);
    }

    saveGame(customData = null) {
        try {
            const gameState = customData || this.collectGameData();

            const dataToSave = {
                ...gameState,
                timestamp: Date.now(),
                version: '2.0',
                checksum: this.generateChecksum(gameState)
            };

            const jsonString = JSON.stringify(dataToSave);

            let processedData = jsonString;
            if (this.compressionEnabled) {
                processedData = this.compress(jsonString);
            }

            const encrypted = this.encrypt(processedData);

            const success = Utils.saveToLocalStorage(this.saveKey, encrypted);

            if (success) {
                console.log('Game saved successfully');
                return true;
            } else {
                console.error('Failed to save game');
                return false;
            }

        } catch (error) {
            console.error('Error saving game:', error);
            return false;
        }
    }

    loadGame() {
        try {
            const encrypted = Utils.loadFromLocalStorage(this.saveKey);
            if (!encrypted) {
                console.log('No save data found');
                return null;
            }

            const decrypted = this.decrypt(encrypted);

            let decompressed = decrypted;
            if (this.compressionEnabled) {
                decompressed = this.decompress(decrypted);
            }

            const data = JSON.parse(decompressed);

            // Verify checksum
            if (data.checksum && data.checksum !== this.generateChecksum(data)) {
                console.warn('Save data checksum mismatch - data may be corrupted');
                return null;
            }

            // Version compatibility check
            if (data.version !== '2.0') {
                this.migrateData(data);
            }

            console.log('Game loaded successfully');
            return data;

        } catch (error) {
            console.error('Error loading game:', error);
            return null;
        }
    }

    collectGameData() {
        const data = {
            gameCore: {
                score: window.gameCore ? window.gameCore.getScore() : 0,
                distance: window.gameCore ? window.gameCore.getDistance() : 0,
                coins: window.gameCore ? window.gameCore.getCoins() : 0,
                speed: window.gameCore ? window.gameCore.getSpeed() : 1.0,
                currentLane: window.gameCore ? window.gameCore.getCurrentLane() : 1,
                highScore: Utils.loadFromLocalStorage('highScore', 0),
                totalCoins: Utils.loadFromLocalStorage('totalCoins', 0),
                totalKeys: Utils.loadFromLocalStorage('totalKeys', 0)
            },

            player: {
                unlockedCharacters: Utils.loadFromLocalStorage('unlockedCharacters', ['jake']),
                selectedCharacter: Utils.loadFromLocalStorage('selectedCharacter', 'jake'),
                characterLevels: Utils.loadFromLocalStorage('characterLevels', {}),
                unlockedHoverboards: Utils.loadFromLocalStorage('unlockedHoverboards', []),
                selectedHoverboard: Utils.loadFromLocalStorage('selectedHoverboard', null)
            },

            progression: {
                completedMissions: Utils.loadFromLocalStorage('completedMissions', []),
                currentMissions: Utils.loadFromLocalStorage('currentMissions', []),
                achievements: Utils.loadFromLocalStorage('achievements', {}),
                statistics: Utils.loadFromLocalStorage('statistics', {
                    gamesPlayed: 0,
                    totalDistance: 0,
                    totalCoinsCollected: 0,
                    totalPowerUpsUsed: 0,
                    totalJumps: 0,
                    totalSlides: 0,
                    bestCombo: 0
                })
            },

            settings: Utils.loadFromLocalStorage('gameSettings', {
                masterVolume: 50,
                musicVolume: 30,
                sfxVolume: 50,
                vibrationEnabled: true,
                paintTrailsEnabled: true,
                quality: 'medium'
            }),

            purchases: {
                premiumUser: Utils.loadFromLocalStorage('premiumUser', false),
                purchasedItems: Utils.loadFromLocalStorage('purchasedItems', []),
                coinsPurchased: Utils.loadFromLocalStorage('coinsPurchased', 0),
                keysPurchased: Utils.loadFromLocalStorage('keysPurchased', 0)
            },

            analytics: {
                sessionStartTime: Date.now(),
                totalPlayTime: Utils.loadFromLocalStorage('totalPlayTime', 0),
                lastPlayDate: Utils.loadFromLocalStorage('lastPlayDate', null)
            }
        };

        return data;
    }

    applyGameData(data) {
        if (!data) return false;

        try {
            // Apply game core data
            if (data.gameCore && window.gameCore) {
                window.gameCore.gameState.score = data.gameCore.score;
                window.gameCore.gameState.distance = data.gameCore.distance;
                window.gameCore.gameState.coins = data.gameCore.coins;
                window.gameCore.gameState.speed = data.gameCore.speed;
                window.gameCore.gameState.currentLane = data.gameCore.currentLane;

                Utils.saveToLocalStorage('highScore', data.gameCore.highScore);
                Utils.saveToLocalStorage('totalCoins', data.gameCore.totalCoins);
                Utils.saveToLocalStorage('totalKeys', data.gameCore.totalKeys);
            }

            // Apply player data
            if (data.player) {
                Utils.saveToLocalStorage('unlockedCharacters', data.player.unlockedCharacters);
                Utils.saveToLocalStorage('selectedCharacter', data.player.selectedCharacter);
                Utils.saveToLocalStorage('characterLevels', data.player.characterLevels);
                Utils.saveToLocalStorage('unlockedHoverboards', data.player.unlockedHoverboards);
                Utils.saveToLocalStorage('selectedHoverboard', data.player.selectedHoverboard);
            }

            // Apply progression data
            if (data.progression) {
                Utils.saveToLocalStorage('completedMissions', data.progression.completedMissions);
                Utils.saveToLocalStorage('currentMissions', data.progression.currentMissions);
                Utils.saveToLocalStorage('achievements', data.progression.achievements);
                Utils.saveToLocalStorage('statistics', data.progression.statistics);
            }

            // Apply settings
            if (data.settings) {
                Utils.saveToLocalStorage('gameSettings', data.settings);
            }

            // Apply purchases
            if (data.purchases) {
                Utils.saveToLocalStorage('premiumUser', data.purchases.premiumUser);
                Utils.saveToLocalStorage('purchasedItems', data.purchases.purchasedItems);
                Utils.saveToLocalStorage('coinsPurchased', data.purchases.coinsPurchased);
                Utils.saveToLocalStorage('keysPurchased', data.purchases.keysPurchased);
            }

            console.log('Game data applied successfully');
            return true;

        } catch (error) {
            console.error('Error applying game data:', error);
            return false;
        }
    }

    // Encryption methods
    encrypt(text) {
        try {
            // Simple XOR encryption (replace with proper encryption in production)
            const key = this.encryptionKey;
            let encrypted = '';

            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                encrypted += String.fromCharCode(charCode);
            }

            return btoa(encrypted); // Base64 encode
        } catch (error) {
            console.error('Encryption failed:', error);
            return text;
        }
    }

    decrypt(encryptedText) {
        try {
            const key = this.encryptionKey;
            const decoded = atob(encryptedText); // Base64 decode
            let decrypted = '';

            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedText;
        }
    }

    // Compression methods (simple run-length encoding)
    compress(text) {
        if (typeof text !== 'string') return text;

        let compressed = '';
        let count = 1;
        let current = text[0];

        for (let i = 1; i < text.length; i++) {
            if (text[i] === current && count < 255) {
                count++;
            } else {
                if (count > 3 || current === '~') {
                    compressed += `~${current}${String.fromCharCode(count)}`;
                } else {
                    compressed += current.repeat(count);
                }
                current = text[i];
                count = 1;
            }
        }

        if (count > 3 || current === '~') {
            compressed += `~${current}${String.fromCharCode(count)}`;
        } else {
            compressed += current.repeat(count);
        }

        return compressed;
    }

    decompress(compressed) {
        if (typeof compressed !== 'string') return compressed;

        let decompressed = '';
        let i = 0;

        while (i < compressed.length) {
            if (compressed[i] === '~') {
                const char = compressed[i + 1];
                const count = compressed.charCodeAt(i + 2);
                decompressed += char.repeat(count);
                i += 3;
            } else {
                decompressed += compressed[i];
                i++;
            }
        }

        return decompressed;
    }

    // Checksum generation for data integrity
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return hash.toString(36);
    }

    // Data migration for version compatibility
    migrateData(oldData) {
        console.log('Migrating save data from version', oldData.version, 'to 2.0');

        // Add any necessary data transformations here
        // For example, if new fields were added in version 2.0

        oldData.version = '2.0';

        // Add default values for new fields
        if (!oldData.gameCore) {
            oldData.gameCore = {
                score: 0,
                distance: 0,
                coins: 0,
                speed: 1.0,
                currentLane: 1,
                highScore: 0,
                totalCoins: 0,
                totalKeys: 0
            };
        }

        // Add other missing sections...
        if (!oldData.player) oldData.player = {};
        if (!oldData.progression) oldData.progression = {};
        if (!oldData.settings) oldData.settings = {};
        if (!oldData.purchases) oldData.purchases = {};
        if (!oldData.analytics) oldData.analytics = {};

        return oldData;
    }

    // Export/Import functionality
    exportGameData() {
        const data = this.collectGameData();
        const jsonString = JSON.stringify(data, null, 2);

        Utils.downloadFile(jsonString, `subway-surfers-save-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }

    async importGameData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.version && data.checksum) {
                this.applyGameData(data);
                this.showNotification('Game data imported successfully!', 'success');
                return true;
            } else {
                throw new Error('Invalid save file format');
            }
        } catch (error) {
            console.error('Failed to import game data:', error);
            this.showNotification('Failed to import game data. Please check the file format.', 'error');
            return false;
        }
    }

    // Cloud save simulation (would integrate with actual backend)
    async saveToCloud(userId) {
        const data = this.collectGameData();

        // Simulate cloud save
        console.log('Saving to cloud for user:', userId);

        // In a real implementation, this would send data to a server
        // For now, we'll just store it locally with a cloud prefix
        Utils.saveToLocalStorage(`cloud_${userId}`, data);

        return true;
    }

    async loadFromCloud(userId) {
        const data = Utils.loadFromLocalStorage(`cloud_${userId}`);

        if (data) {
            this.applyGameData(data);
            console.log('Loaded from cloud for user:', userId);
            return true;
        }

        return false;
    }

    // Backup management
    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `backup_${timestamp}`;

        const data = this.collectGameData();
        Utils.saveToLocalStorage(backupKey, data);

        console.log('Backup created:', backupKey);
        return backupKey;
    }

    listBackups() {
        const backups = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('backup_')) {
                backups.push(key);
            }
        }

        return backups.sort().reverse(); // Most recent first
    }

    restoreBackup(backupKey) {
        const data = Utils.loadFromLocalStorage(backupKey);
        if (data) {
            this.applyGameData(data);
            console.log('Restored from backup:', backupKey);
            return true;
        }
        return false;
    }

    deleteBackup(backupKey) {
        Utils.clearLocalStorage(backupKey);
        console.log('Deleted backup:', backupKey);
    }

    // Statistics and analytics
    getSaveStatistics() {
        const data = this.collectGameData();

        return {
            fileSize: Utils.getObjectSize(data),
            lastSaveTime: data.timestamp,
            version: data.version,
            dataSections: Object.keys(data).length,
            hasEncryption: true,
            hasCompression: this.compressionEnabled
        };
    }

    // Error handling and recovery
    validateSaveData(data) {
        try {
            // Basic validation
            if (!data || typeof data !== 'object') {
                return false;
            }

            // Check required fields
            const requiredFields = ['gameCore', 'player', 'progression', 'settings'];
            for (const field of requiredFields) {
                if (!(field in data)) {
                    console.warn(`Missing required field: ${field}`);
                    return false;
                }
            }

            // Check checksum if present
            if (data.checksum && data.checksum !== this.generateChecksum(data)) {
                console.warn('Checksum validation failed');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Save data validation failed:', error);
            return false;
        }
    }

    recoverFromCorruption() {
        console.log('Attempting to recover from corrupted save data...');

        // Try to load the most recent backup
        const backups = this.listBackups();
        if (backups.length > 0) {
            const success = this.restoreBackup(backups[0]);
            if (success) {
                this.showNotification('Recovered from backup!', 'success');
                return true;
            }
        }

        // If no backup available, reset to defaults
        this.resetSaveData();
        this.showNotification('Save data reset due to corruption', 'warning');
        return false;
    }

    resetSaveData() {
        localStorage.clear();
        console.log('All save data reset');
    }

    // Utility methods
    showNotification(message, type = 'info') {
        if (window.uiManager) {
            window.uiManager.showNotification(message, type);
        } else {
            console.log(`SaveManager: ${message}`);
        }
    }

    // Debug methods
    getDebugInfo() {
        const stats = this.getSaveStatistics();
        const backups = this.listBackups();

        return {
            saveKey: this.saveKey,
            encryptionEnabled: true,
            compressionEnabled: this.compressionEnabled,
            autoSaveInterval: this.autoSaveDelay,
            statistics: stats,
            backupCount: backups.length,
            recentBackups: backups.slice(0, 5)
        };
    }

    // Cleanup methods
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }

        console.log('SaveManager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveManager;
}

// Make SaveManager available globally
if (typeof window !== 'undefined') {
    window.SaveManager = SaveManager;
}
