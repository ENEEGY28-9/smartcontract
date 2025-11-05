// Final Polish System for Boss Battles
// Implements tutorials, settings, and achievements showcase

export class TutorialSystem {
    constructor() {
        this.tutorials = this.initializeTutorials();
        this.currentTutorial = null;
        this.tutorialStep = 0;
        this.completedTutorials = new Set();
    }

    // Initialize tutorial content
    initializeTutorials() {
        return {
            'boss_battle_basics': {
                id: 'boss_battle_basics',
                name: 'Boss Battle Basics',
                description: 'Learn the fundamentals of boss combat',
                steps: [
                    {
                        title: 'Welcome to Boss Battles',
                        content: 'You have entered the boss arena! Here you will face powerful enemies in epic combat.',
                        target: 'arena',
                        action: 'none',
                        duration: 3000
                    },
                    {
                        title: 'Movement System',
                        content: 'Use WASD keys to move around the circular arena. Stay mobile to avoid attacks!',
                        target: 'movement',
                        action: 'move',
                        duration: 5000
                    },
                    {
                        title: 'Weapon System',
                        content: 'Press 1-5 to switch between your equipped weapons. Each weapon has unique abilities.',
                        target: 'weapons',
                        action: 'switch_weapon',
                        duration: 4000
                    },
                    {
                        title: 'Combat Mechanics',
                        content: 'Press SPACE to attack. Position matters - get close for melee, stay back for ranged!',
                        target: 'combat',
                        action: 'attack',
                        duration: 5000
                    },
                    {
                        title: 'Boss Patterns',
                        content: 'Watch the boss carefully. Each boss has unique attack patterns you must learn to survive.',
                        target: 'boss',
                        action: 'observe',
                        duration: 4000
                    },
                    {
                        title: 'Environmental Hazards',
                        content: 'Be aware of moving platforms, spike traps, and other arena hazards that can help or hinder you.',
                        target: 'hazards',
                        action: 'none',
                        duration: 4000
                    },
                    {
                        title: 'You\'re Ready!',
                        content: 'You now know the basics! Use your skills, weapons, and the environment to defeat the boss!',
                        target: 'complete',
                        action: 'none',
                        duration: 3000
                    }
                ]
            },
            'advanced_combat': {
                id: 'advanced_combat',
                name: 'Advanced Combat Techniques',
                description: 'Master advanced boss fighting strategies',
                steps: [
                    {
                        title: 'Weak Point Targeting',
                        content: 'Different boss phases expose different weak points. Target them for massive damage!',
                        target: 'weak_points',
                        action: 'none',
                        duration: 4000
                    },
                    {
                        title: 'Environmental Interactions',
                        content: 'Use the arena environment to your advantage. Jump on platforms, avoid hazards!',
                        target: 'environment',
                        action: 'none',
                        duration: 4000
                    },
                    {
                        title: 'Team Synergies',
                        content: 'Coordinate with teammates. Different weapon combinations create powerful synergies!',
                        target: 'teamwork',
                        action: 'none',
                        duration: 4000
                    },
                    {
                        title: 'Ultimate Abilities',
                        content: 'Charge your ultimate abilities for devastating attacks when the moment is right.',
                        target: 'ultimate',
                        action: 'none',
                        duration: 4000
                    }
                ]
            }
        };
    }

    // Start tutorial
    startTutorial(tutorialId) {
        const tutorial = this.tutorials[tutorialId];
        if (!tutorial) return false;

        this.currentTutorial = tutorial;
        this.tutorialStep = 0;

        console.log(`📚 Started tutorial: ${tutorial.name}`);

        // Show first step
        this.showTutorialStep();

        return true;
    }

    // Show current tutorial step
    showTutorialStep() {
        if (!this.currentTutorial || this.tutorialStep >= this.currentTutorial.steps.length) {
            this.endTutorial();
            return;
        }

        const step = this.currentTutorial.steps[this.tutorialStep];

        // Emit tutorial step event for UI
        const event = new CustomEvent('tutorialStep', {
            detail: {
                tutorial: this.currentTutorial,
                step: step,
                stepNumber: this.tutorialStep + 1,
                totalSteps: this.currentTutorial.steps.length
            }
        });

        window.dispatchEvent(event);

        console.log(`📋 Tutorial step ${this.tutorialStep + 1}: ${step.title}`);
    }

    // Advance to next tutorial step
    nextStep() {
        if (!this.currentTutorial) return;

        this.tutorialStep++;

        if (this.tutorialStep >= this.currentTutorial.steps.length) {
            this.completeTutorial();
        } else {
            this.showTutorialStep();
        }
    }

    // Skip current tutorial step
    skipStep() {
        // Mark current step as completed and move to next
        this.nextStep();
    }

    // Complete current tutorial
    completeTutorial() {
        if (!this.currentTutorial) return;

        this.completedTutorials.add(this.currentTutorial.id);
        console.log(`✅ Tutorial completed: ${this.currentTutorial.name}`);

        // Emit tutorial completion event
        const event = new CustomEvent('tutorialCompleted', {
            detail: {
                tutorialId: this.currentTutorial.id,
                tutorialName: this.currentTutorial.name
            }
        });

        window.dispatchEvent(event);

        this.endTutorial();
    }

    // End current tutorial
    endTutorial() {
        this.currentTutorial = null;
        this.tutorialStep = 0;

        // Emit tutorial end event
        const event = new CustomEvent('tutorialEnded', {});
        window.dispatchEvent(event);

        console.log('📚 Tutorial ended');
    }

    // Check if tutorial is completed
    isTutorialCompleted(tutorialId) {
        return this.completedTutorials.has(tutorialId);
    }

    // Get tutorial progress
    getTutorialProgress() {
        return {
            currentTutorial: this.currentTutorial ? {
                id: this.currentTutorial.id,
                name: this.currentTutorial.name,
                currentStep: this.tutorialStep + 1,
                totalSteps: this.currentTutorial.steps.length
            } : null,
            completedTutorials: Array.from(this.completedTutorials),
            availableTutorials: Object.keys(this.tutorials)
        };
    }
}

// Settings System
export class SettingsSystem {
    constructor() {
        this.settings = this.loadSettings();
        this.categories = {
            'graphics': {
                name: 'Graphics',
                icon: '🎨',
                settings: {
                    renderQuality: { name: 'Render Quality', type: 'slider', min: 0.3, max: 1.5, step: 0.1, default: 1.0 },
                    shadowQuality: { name: 'Shadow Quality', type: 'slider', min: 0.1, max: 1.2, step: 0.1, default: 1.0 },
                    particleCount: { name: 'Particle Effects', type: 'slider', min: 0.2, max: 1.5, step: 0.1, default: 1.0 },
                    lodDistance: { name: 'LOD Distance', type: 'slider', min: 0.4, max: 1.2, step: 0.1, default: 1.0 }
                }
            },
            'audio': {
                name: 'Audio',
                icon: '🔊',
                settings: {
                    masterVolume: { name: 'Master Volume', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.7 },
                    musicVolume: { name: 'Music Volume', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.5 },
                    sfxVolume: { name: 'SFX Volume', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.8 },
                    voiceVolume: { name: 'Voice Volume', type: 'slider', min: 0, max: 1, step: 0.1, default: 0.6 }
                }
            },
            'controls': {
                name: 'Controls',
                icon: '🎮',
                settings: {
                    mouseSensitivity: { name: 'Mouse Sensitivity', type: 'slider', min: 0.1, max: 3.0, step: 0.1, default: 1.0 },
                    invertMouse: { name: 'Invert Mouse Y', type: 'toggle', default: false },
                    autoRun: { name: 'Auto Run', type: 'toggle', default: false },
                    showDamageNumbers: { name: 'Show Damage Numbers', type: 'toggle', default: true }
                }
            },
            'gameplay': {
                name: 'Gameplay',
                icon: '⚙️',
                settings: {
                    difficulty: { name: 'Difficulty', type: 'select', options: ['Easy', 'Normal', 'Hard', 'Expert'], default: 'Normal' },
                    autoSave: { name: 'Auto Save', type: 'toggle', default: true },
                    showTips: { name: 'Show Tips', type: 'toggle', default: true },
                    adaptiveDifficulty: { name: 'Adaptive Difficulty', type: 'toggle', default: true }
                }
            }
        };
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }

        return this.getDefaultSettings();
    }

    // Get default settings
    getDefaultSettings() {
        const defaults = {};

        Object.values(this.categories).forEach(category => {
            Object.entries(category.settings).forEach(([key, setting]) => {
                defaults[key] = setting.default;
            });
        });

        return defaults;
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
            console.log('💾 Settings saved');
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    // Get setting value
    getSetting(key) {
        return this.settings[key];
    }

    // Set setting value
    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();

        // Emit setting change event
        const event = new CustomEvent('settingChanged', {
            detail: { key, value }
        });
        window.dispatchEvent(event);

        console.log(`⚙️ Setting changed: ${key} = ${value}`);
    }

    // Reset all settings to default
    resetSettings() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();

        const event = new CustomEvent('settingsReset', {});
        window.dispatchEvent(event);

        console.log('🔄 Settings reset to default');
    }

    // Get settings for UI
    getSettingsForUI() {
        const uiSettings = {};

        Object.entries(this.categories).forEach(([categoryKey, category]) => {
            uiSettings[categoryKey] = {
                name: category.name,
                icon: category.icon,
                settings: Object.entries(category.settings).map(([key, setting]) => ({
                    key,
                    name: setting.name,
                    type: setting.type,
                    value: this.settings[key],
                    min: setting.min,
                    max: setting.max,
                    step: setting.step,
                    options: setting.options
                }))
            };
        });

        return uiSettings;
    }

    // Export settings
    exportSettings() {
        return {
            settings: this.settings,
            categories: this.categories,
            exportDate: new Date().toISOString()
        };
    }

    // Import settings
    importSettings(data) {
        try {
            if (data.settings) {
                this.settings = { ...this.getDefaultSettings(), ...data.settings };
                this.saveSettings();

                const event = new CustomEvent('settingsImported', {
                    detail: data
                });
                window.dispatchEvent(event);

                console.log('📥 Settings imported successfully');
                return { success: true };
            }
        } catch (error) {
            console.warn('Failed to import settings:', error);
        }

        return { success: false, error: 'Invalid settings data' };
    }
}

// Achievement System
export class AchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
        this.unlockedAchievements = new Set();
        this.achievementProgress = new Map();
    }

    // Initialize achievements
    initializeAchievements() {
        return {
            // Combat Achievements
            'first_blood': {
                id: 'first_blood',
                name: 'First Blood',
                description: 'Deal your first damage to a boss',
                category: 'combat',
                icon: '🩸',
                requirement: { type: 'damage_dealt', value: 1 },
                rewards: { coins: 50, title: 'Boss Hunter' }
            },
            'damage_master': {
                id: 'damage_master',
                name: 'Damage Master',
                description: 'Deal 100,000 total damage',
                category: 'combat',
                icon: '💥',
                requirement: { type: 'damage_dealt', value: 100000 },
                rewards: { coins: 500, weapon_skin: 'damage_master_skin' }
            },
            'weak_point_expert': {
                id: 'weak_point_expert',
                name: 'Weak Point Expert',
                description: 'Hit 50 weak points',
                category: 'combat',
                icon: '🎯',
                requirement: { type: 'weak_points_hit', value: 50 },
                rewards: { coins: 300, experience: 200 }
            },

            // Weapon Achievements
            'weapon_collector': {
                id: 'weapon_collector',
                name: 'Weapon Collector',
                description: 'Collect 10 different weapons',
                category: 'weapons',
                icon: '🗡️',
                requirement: { type: 'weapons_collected', value: 10 },
                rewards: { coins: 400, weapon_slot: 'extra_slot' }
            },
            'crafting_master': {
                id: 'crafting_master',
                name: 'Crafting Master',
                description: 'Craft 5 different weapons',
                category: 'weapons',
                icon: '🔨',
                requirement: { type: 'weapons_crafted', value: 5 },
                rewards: { coins: 600, crafting_discount: 0.1 }
            },

            // Event Achievements
            'seasonal_champion': {
                id: 'seasonal_champion',
                name: 'Seasonal Champion',
                description: 'Complete all seasonal events',
                category: 'events',
                icon: '🏆',
                requirement: { type: 'seasonal_events_completed', value: 4 },
                rewards: { coins: 1000, seasonal_title: 'Champion of Seasons' }
            },
            'tournament_veteran': {
                id: 'tournament_veteran',
                name: 'Tournament Veteran',
                description: 'Win 10 tournaments',
                category: 'events',
                icon: '🥇',
                requirement: { type: 'tournaments_won', value: 10 },
                rewards: { coins: 800, tournament_title: 'Tournament Legend' }
            },

            // Challenge Achievements
            'challenge_seeker': {
                id: 'challenge_seeker',
                name: 'Challenge Seeker',
                description: 'Complete 50 daily challenges',
                category: 'challenges',
                icon: '🏅',
                requirement: { type: 'daily_challenges_completed', value: 50 },
                rewards: { coins: 500, challenge_buff: 'bonus_rewards' }
            },
            'perfectionist': {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Complete a boss battle without taking damage',
                category: 'challenges',
                icon: '💎',
                requirement: { type: 'perfect_runs', value: 1 },
                rewards: { coins: 1000, perfect_title: 'Flawless Fighter' }
            },

            // Exploration Achievements
            'environmentalist': {
                id: 'environmentalist',
                name: 'Environmentalist',
                description: 'Use environmental hazards to defeat a boss',
                category: 'exploration',
                icon: '🌍',
                requirement: { type: 'environmental_kills', value: 1 },
                rewards: { coins: 200, environment_buff: 'hazard_mastery' }
            },
            'platform_master': {
                id: 'platform_master',
                name: 'Platform Master',
                description: 'Use all platform types in a single battle',
                category: 'exploration',
                icon: '🪜',
                requirement: { type: 'platforms_used', value: 4 },
                rewards: { coins: 300, platform_buff: 'platform_expert' }
            },

            // Social Achievements
            'team_player': {
                id: 'team_player',
                name: 'Team Player',
                description: 'Win 20 battles with teammates',
                category: 'social',
                icon: '🤝',
                requirement: { type: 'team_wins', value: 20 },
                rewards: { coins: 400, social_buff: 'team_cohesion' }
            },
            'mentor': {
                id: 'mentor',
                name: 'Mentor',
                description: 'Help 10 new players complete their first boss battle',
                category: 'social',
                icon: '👨‍🏫',
                requirement: { type: 'players_mentored', value: 10 },
                rewards: { coins: 600, mentor_title: 'Wise Guide' }
            }
        };
    }

    // Update achievement progress
    updateAchievement(type, amount = 1) {
        this.achievements.forEach(achievement => {
            if (achievement.requirement.type === type) {
                if (!this.achievementProgress.has(achievement.id)) {
                    this.achievementProgress.set(achievement.id, 0);
                }

                const current = this.achievementProgress.get(achievement.id);
                this.achievementProgress.set(achievement.id, current + amount);

                // Check if achievement is unlocked
                if (this.achievementProgress.get(achievement.id) >= achievement.requirement.value &&
                    !this.unlockedAchievements.has(achievement.id)) {
                    this.unlockAchievement(achievement.id);
                }
            }
        });
    }

    // Unlock achievement
    unlockAchievement(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        this.unlockedAchievements.add(achievementId);

        // Award rewards
        this.awardAchievementRewards(achievement);

        // Emit achievement unlock event
        const event = new CustomEvent('achievementUnlocked', {
            detail: {
                achievement: achievement,
                totalUnlocked: this.unlockedAchievements.size
            }
        });

        window.dispatchEvent(event);

        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
    }

    // Award achievement rewards
    awardAchievementRewards(achievement) {
        // This would integrate with the player's inventory/currency system
        console.log(`🎁 Achievement rewards:`, achievement.rewards);

        // Award coins, experience, titles, etc.
        if (achievement.rewards.coins) {
            // player.addCoins(achievement.rewards.coins);
        }
        if (achievement.rewards.experience) {
            // player.addExperience(achievement.rewards.experience);
        }
        if (achievement.rewards.weapon_skin) {
            // player.unlockWeaponSkin(achievement.rewards.weapon_skin);
        }
        if (achievement.rewards.title) {
            // player.unlockTitle(achievement.rewards.title);
        }
    }

    // Get achievements for UI
    getAchievementsForUI() {
        return this.achievements.map(achievement => ({
            ...achievement,
            unlocked: this.unlockedAchievements.has(achievement.id),
            progress: this.achievementProgress.get(achievement.id) || 0,
            maxProgress: achievement.requirement.value,
            percentage: Math.min(100, ((this.achievementProgress.get(achievement.id) || 0) / achievement.requirement.value) * 100)
        }));
    }

    // Get achievement statistics
    getAchievementStats() {
        const totalAchievements = this.achievements.length;
        const unlockedCount = this.unlockedAchievements.size;
        const completionPercentage = (unlockedCount / totalAchievements) * 100;

        return {
            totalAchievements,
            unlockedCount,
            completionPercentage: Math.round(completionPercentage),
            categories: this.getCategoryStats()
        };
    }

    // Get achievement stats by category
    getCategoryStats() {
        const categories = {};

        this.achievements.forEach(achievement => {
            if (!categories[achievement.category]) {
                categories[achievement.category] = {
                    total: 0,
                    unlocked: 0,
                    percentage: 0
                };
            }

            categories[achievement.category].total++;
            if (this.unlockedAchievements.has(achievement.id)) {
                categories[achievement.category].unlocked++;
            }
        });

        // Calculate percentages
        Object.keys(categories).forEach(category => {
            categories[category].percentage = Math.round(
                (categories[category].unlocked / categories[category].total) * 100
            );
        });

        return categories;
    }

    // Save achievement progress
    saveProgress() {
        try {
            const data = {
                unlockedAchievements: Array.from(this.unlockedAchievements),
                achievementProgress: Object.fromEntries(this.achievementProgress)
            };
            localStorage.setItem('achievementProgress', JSON.stringify(data));
            console.log('💾 Achievement progress saved');
        } catch (error) {
            console.warn('Failed to save achievement progress:', error);
        }
    }

    // Load achievement progress
    loadProgress() {
        try {
            const saved = localStorage.getItem('achievementProgress');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedAchievements = new Set(data.unlockedAchievements || []);
                this.achievementProgress = new Map(Object.entries(data.achievementProgress || {}));

                console.log('📂 Achievement progress loaded');
            }
        } catch (error) {
            console.warn('Failed to load achievement progress:', error);
        }
    }
}
