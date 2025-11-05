/**
 * MissionSystem - Manages daily missions and challenges
 * Handles mission progress tracking and completion
 */

class MissionSystem {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.missions = [];
        this.completedMissions = [];

        this.initializeMissions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.gameCore.on('coinCollected', () => this.onCoinCollected());
        this.gameCore.on('distanceTraveled', (distance) => this.onDistanceTraveled(distance));
        this.gameCore.on('powerUpUsed', () => this.onPowerUpUsed());
        this.gameCore.on('gameStarted', () => this.onGameStarted());
    }

    initializeMissions() {
        this.missions = [
            {
                id: 'daily_coins',
                title: 'Coin Collector',
                description: 'Collect 500 coins',
                type: 'coins',
                target: 500,
                progress: 0,
                reward: { coins: 200, keys: 1 },
                completed: false
            },
            {
                id: 'daily_distance',
                title: 'Marathon Runner',
                description: 'Run 2000 meters',
                type: 'distance',
                target: 2000,
                progress: 0,
                reward: { coins: 300, keys: 2 },
                completed: false
            },
            {
                id: 'daily_powerups',
                title: 'Power User',
                description: 'Use 5 power-ups',
                type: 'powerups',
                target: 5,
                progress: 0,
                reward: { coins: 150, keys: 1 },
                completed: false
            }
        ];

        // Load progress from save data
        this.loadMissionProgress();
    }

    onCoinCollected() {
        this.updateMissionProgress('coins', 1);
    }

    onDistanceTraveled(distance) {
        this.updateMissionProgress('distance', Math.floor(distance));
    }

    onPowerUpUsed() {
        this.updateMissionProgress('powerups', 1);
    }

    onGameStarted() {
        // Reset daily mission progress if it's a new day
        const today = new Date().toDateString();
        const lastPlayDate = Utils.loadFromLocalStorage('lastPlayDate', '');

        if (lastPlayDate !== today) {
            this.resetDailyProgress();
            Utils.saveToLocalStorage('lastPlayDate', today);
        }
    }

    updateMissionProgress(type, amount) {
        this.missions.forEach(mission => {
            if (mission.type === type && !mission.completed) {
                mission.progress = Math.min(mission.progress + amount, mission.target);

                if (mission.progress >= mission.target) {
                    this.completeMission(mission);
                }

                this.saveMissionProgress();
            }
        });
    }

    completeMission(mission) {
        mission.completed = true;
        this.completedMissions.push(mission);

        // Award rewards
        if (window.gameCore) {
            window.gameCore.addCoins(mission.reward.coins);
        }

        // Show completion notification
        if (window.uiManager) {
            window.uiManager.showNotification(
                `Mission Complete: ${mission.title}!`,
                'achievement'
            );
        }

        console.log(`Mission completed: ${mission.title}`);
    }

    resetDailyProgress() {
        this.missions.forEach(mission => {
            mission.progress = 0;
            mission.completed = false;
        });
        this.completedMissions = [];
        this.saveMissionProgress();
    }

    loadMissionProgress() {
        const saved = Utils.loadFromLocalStorage('missionProgress', {});
        if (saved.missions) {
            this.missions = saved.missions;
        }
        if (saved.completed) {
            this.completedMissions = saved.completed;
        }
    }

    saveMissionProgress() {
        const data = {
            missions: this.missions,
            completed: this.completedMissions
        };
        Utils.saveToLocalStorage('missionProgress', data);
    }

    // Public methods
    getActiveMissions() {
        return this.missions ? this.missions.filter(m => !m.completed) : [];
    }

    getCompletedMissions() {
        return this.completedMissions;
    }

    getMissionById(id) {
        return this.missions ? this.missions.find(m => m.id === id) : null;
    }

    claimMissionRewards(missionId) {
        const mission = this.getMissionById(missionId);
        if (mission && mission.completed && !mission.rewardClaimed) {
            // Award rewards (already done in completeMission)
            mission.rewardClaimed = true;
            this.saveMissionProgress();
            return mission.reward;
        }
        return null;
    }

    // Debug methods
    getDebugInfo() {
        return {
            activeMissions: this.getActiveMissions(),
            completedMissions: this.completedMissions,
            totalMissions: this.missions ? this.missions.length : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionSystem;
}

// Make MissionSystem available globally
if (typeof window !== 'undefined') {
    window.MissionSystem = MissionSystem;
}
