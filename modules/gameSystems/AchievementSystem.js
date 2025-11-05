/**
 * AchievementSystem - Manages achievements and progression tracking
 * Handles unlocking achievements and awarding rewards
 */

class AchievementSystem {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.achievements = [];
        this.unlockedAchievements = [];

        this.initializeAchievements();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.gameCore.on('scoreUpdated', (score) => this.checkScoreAchievements(score));
        this.gameCore.on('coinsChanged', (coins) => this.checkCoinAchievements(coins));
        this.gameCore.on('distanceTraveled', (distance) => this.checkDistanceAchievements(distance));
        this.gameCore.on('gameStarted', () => this.onGameStarted());
    }

    initializeAchievements() {
        this.achievements = [
            {
                id: 'first_steps',
                title: 'First Steps',
                description: 'Run 100 meters',
                icon: '👟',
                category: 'distance',
                requirement: { type: 'distance', value: 100 },
                reward: { coins: 50 },
                unlocked: false
            },
            {
                id: 'coin_collector',
                title: 'Coin Collector',
                description: 'Collect 1,000 coins',
                icon: '🪙',
                category: 'coins',
                requirement: { type: 'coins', value: 1000 },
                reward: { coins: 200 },
                unlocked: false
            },
            {
                id: 'high_scorer',
                title: 'High Scorer',
                description: 'Reach 10,000 points',
                icon: '🏆',
                category: 'score',
                requirement: { type: 'score', value: 10000 },
                reward: { coins: 500 },
                unlocked: false
            },
            {
                id: 'marathon_runner',
                title: 'Marathon Runner',
                description: 'Run 10,000 meters',
                icon: '🏃',
                category: 'distance',
                requirement: { type: 'distance', value: 10000 },
                reward: { coins: 1000 },
                unlocked: false
            }
        ];

        // Load unlocked achievements
        this.loadAchievementProgress();
    }

    onGameStarted() {
        // Reset daily achievements if needed
        // (This would depend on achievement types)
    }

    checkScoreAchievements(score) {
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked &&
                achievement.requirement.type === 'score' &&
                score >= achievement.requirement.value) {
                this.unlockAchievement(achievement);
            }
        });
    }

    checkCoinAchievements(coins) {
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked &&
                achievement.requirement.type === 'coins' &&
                coins >= achievement.requirement.value) {
                this.unlockAchievement(achievement);
            }
        });
    }

    checkDistanceAchievements(distance) {
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked &&
                achievement.requirement.type === 'distance' &&
                distance >= achievement.requirement.value) {
                this.unlockAchievement(achievement);
            }
        });
    }

    unlockAchievement(achievement) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        this.unlockedAchievements.push(achievement);

        // Award rewards
        if (window.gameCore && achievement.reward) {
            window.gameCore.addCoins(achievement.reward.coins);
        }

        // Show notification
        if (window.uiManager) {
            window.uiManager.showNotification(
                `Achievement Unlocked: ${achievement.title}!`,
                'achievement'
            );
        }

        // Save progress
        this.saveAchievementProgress();

        console.log(`Achievement unlocked: ${achievement.title}`);
    }

    loadAchievementProgress() {
        const saved = Utils.loadFromLocalStorage('achievementProgress', {});
        if (saved.unlockedAchievements) {
            this.unlockedAchievements = saved.unlockedAchievements;
            // Mark achievements as unlocked
            this.unlockedAchievements.forEach(unlocked => {
                const achievement = this.achievements.find(a => a.id === unlocked.id);
                if (achievement) {
                    achievement.unlocked = true;
                    achievement.unlockedAt = unlocked.unlockedAt;
                }
            });
        }
    }

    saveAchievementProgress() {
        const data = {
            unlockedAchievements: this.unlockedAchievements.map(a => ({
                id: a.id,
                unlockedAt: a.unlockedAt
            }))
        };
        Utils.saveToLocalStorage('achievementProgress', data);
    }

    // Public methods
    getAllAchievements() {
        return this.achievements;
    }

    getUnlockedAchievements() {
        return this.unlockedAchievements;
    }

    getLockedAchievements() {
        return this.achievements ? this.achievements.filter(a => !a.unlocked) : [];
    }

    getAchievementById(id) {
        return this.achievements ? this.achievements.find(a => a.id === id) : null;
    }

    getCompletionPercentage() {
        if (!this.achievements || this.achievements.length === 0) return 0;
        return (this.unlockedAchievements.length / this.achievements.length) * 100;
    }

    // Debug methods
    getDebugInfo() {
        return {
            totalAchievements: this.achievements ? this.achievements.length : 0,
            unlockedAchievements: this.unlockedAchievements.length,
            completionPercentage: this.getCompletionPercentage(),
            achievements: this.achievements ? this.achievements.map(a => ({
                id: a.id,
                title: a.title,
                unlocked: a.unlocked
            })) : []
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementSystem;
}

// Make AchievementSystem available globally
if (typeof window !== 'undefined') {
    window.AchievementSystem = AchievementSystem;
}
