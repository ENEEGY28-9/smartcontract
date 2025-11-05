// Events & Seasons System for Boss Battles
// Implements seasonal events, challenges, and tournaments

import * as THREE from 'three';

export class EventsSeasonsSystem {
    constructor() {
        this.currentSeason = this.getCurrentSeason();
        this.activeEvents = new Map();
        this.completedChallenges = new Set();
        this.tournamentBrackets = new Map();
        this.seasonalRewards = new Map();

        this.initializeSeasonalContent();
        this.initializeChallenges();
    }

    // Get current season based on real time
    getCurrentSeason() {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12

        const seasons = {
            'winter': { months: [12, 1, 2], name: 'Winter Frost', theme: 'ice' },
            'spring': { months: [3, 4, 5], name: 'Spring Bloom', theme: 'nature' },
            'summer': { months: [6, 7, 8], name: 'Summer Blaze', theme: 'fire' },
            'autumn': { months: [9, 10, 11], name: 'Autumn Harvest', theme: 'earth' }
        };

        for (const [seasonKey, seasonData] of Object.entries(seasons)) {
            if (seasonData.months.includes(month)) {
                return { ...seasonData, key: seasonKey };
            }
        }

        return seasons.spring; // Default fallback
    }

    // Initialize seasonal content
    initializeSeasonalContent() {
        const seasonalBosses = {
            'winter': {
                name: 'Frost Titan',
                description: 'A massive ice golem that freezes everything in its path',
                specialAttacks: ['ice_shards', 'blizzard', 'frozen_ground'],
                rewards: ['ice_crystal', 'frost_weapon_skin', 'winter_cape'],
                difficulty: 'legendary'
            },
            'spring': {
                name: 'Bloom Behemoth',
                description: 'A nature guardian that controls plant life and regeneration',
                specialAttacks: ['vine_whip', 'poison_cloud', 'regeneration_burst'],
                rewards: ['bloom_petal', 'nature_weapon_skin', 'spring_robe'],
                difficulty: 'legendary'
            },
            'summer': {
                name: 'Inferno Colossus',
                description: 'A blazing giant that scorches the battlefield',
                specialAttacks: ['flame_tornado', 'meteor_rain', 'burning_aura'],
                rewards: ['flame_ember', 'inferno_weapon_skin', 'summer_armor'],
                difficulty: 'legendary'
            },
            'autumn': {
                name: 'Harvest Guardian',
                description: 'An earth spirit that manipulates the ground and harvests souls',
                specialAttacks: ['earth_spike', 'soul_drain', 'ground_fracture'],
                rewards: ['earth_core', 'harvest_weapon_skin', 'autumn_cloak'],
                difficulty: 'legendary'
            }
        };

        this.seasonalBosses = seasonalBosses;
        this.seasonalRewards.set(this.currentSeason.key, seasonalBosses[this.currentSeason.key]);
    }

    // Initialize daily/weekly challenges
    initializeChallenges() {
        this.challenges = [
            {
                id: 'daily_damage_dealer',
                name: 'Damage Dealer',
                description: 'Deal 5000 total damage in boss battles',
                type: 'daily',
                requirement: 5000,
                current: 0,
                rewards: { coins: 100, experience: 50 }
            },
            {
                id: 'daily_perfect_dodge',
                name: 'Perfect Dodge',
                description: 'Successfully dodge 10 boss attacks',
                type: 'daily',
                requirement: 10,
                current: 0,
                rewards: { coins: 150, experience: 75 }
            },
            {
                id: 'weekly_weapon_master',
                name: 'Weapon Master',
                description: 'Use each weapon type at least once in boss battles',
                type: 'weekly',
                requirement: 4, // melee, ranged, magic, support
                current: 0,
                rewards: { coins: 500, experience: 200, weapon_skin: 'master_weapon_skin' }
            },
            {
                id: 'weekly_team_player',
                name: 'Team Player',
                description: 'Complete 5 boss battles with different teammates',
                type: 'weekly',
                requirement: 5,
                current: 0,
                rewards: { coins: 300, experience: 150, team_buff: 'team_cohesion' }
            }
        ];
    }

    // Start seasonal event
    startSeasonalEvent() {
        const seasonalBoss = this.seasonalBosses[this.currentSeason.key];

        const event = {
            id: `seasonal_${this.currentSeason.key}_${Date.now()}`,
            name: `${this.currentSeason.name} Event`,
            description: `Defeat the ${seasonalBoss.name} to earn exclusive rewards!`,
            boss: seasonalBoss,
            startTime: Date.now(),
            endTime: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            participants: new Set(),
            completions: 0,
            isActive: true
        };

        this.activeEvents.set(event.id, event);
        console.log(`🎉 Started seasonal event: ${event.name}`);

        return event;
    }

    // Create tournament bracket
    createTournament(teamCount = 8) {
        const tournamentId = `tournament_${Date.now()}`;

        const tournament = {
            id: tournamentId,
            name: `Boss Battle Tournament #${Math.floor(Math.random() * 1000)}`,
            maxTeams: teamCount,
            currentRound: 1,
            totalRounds: Math.ceil(Math.log2(teamCount)),
            teams: [],
            matches: [],
            prizes: {
                1: { coins: 2000, weapon_skin: 'champion_skin', title: 'Tournament Champion' },
                2: { coins: 1000, weapon_skin: 'runner_up_skin', title: 'Tournament Runner-up' },
                3: { coins: 500, experience: 300 }
            },
            startTime: Date.now(),
            endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
            isActive: true
        };

        this.tournamentBrackets.set(tournamentId, tournament);
        console.log(`🏆 Created tournament: ${tournament.name}`);

        return tournament;
    }

    // Join tournament
    joinTournament(tournamentId, team) {
        const tournament = this.tournamentBrackets.get(tournamentId);
        if (!tournament || !tournament.isActive) {
            return { success: false, error: 'Tournament not found or inactive' };
        }

        if (tournament.teams.length >= tournament.maxTeams) {
            return { success: false, error: 'Tournament is full' };
        }

        tournament.teams.push(team);
        console.log(`👥 Team joined tournament: ${tournament.name}`);

        return { success: true };
    }

    // Update challenge progress
    updateChallenge(challengeId, amount = 1) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        challenge.current = Math.min(challenge.current + amount, challenge.requirement);

        if (challenge.current >= challenge.requirement && !this.completedChallenges.has(challengeId)) {
            this.completeChallenge(challengeId);
        }
    }

    // Complete challenge and award rewards
    completeChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        this.completedChallenges.add(challengeId);

        // Award rewards (this would need access to player data)
        console.log(`🏆 Challenge completed: ${challenge.name}`);
        console.log(`🎁 Rewards:`, challenge.rewards);

        return challenge.rewards;
    }

    // Start limited-time challenge
    startLimitedTimeChallenge() {
        const challengeTypes = [
            {
                name: 'Speed Run',
                description: 'Defeat the boss in under 2 minutes',
                duration: 120000, // 2 minutes
                rewards: { coins: 300, experience: 150, speed_buff: 'lightning_fast' }
            },
            {
                name: 'No Damage',
                description: 'Complete boss battle without taking damage',
                duration: 300000, // 5 minutes
                rewards: { coins: 500, experience: 250, defensive_buff: 'iron_skin' }
            },
            {
                name: 'Weapon Mastery',
                description: 'Use only one weapon type for the entire battle',
                duration: 300000, // 5 minutes
                rewards: { coins: 400, experience: 200, weapon_buff: 'master_specialist' }
            }
        ];

        const randomChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];

        const challenge = {
            id: `limited_${Date.now()}`,
            ...randomChallenge,
            startTime: Date.now(),
            endTime: Date.now() + randomChallenge.duration,
            isActive: true
        };

        console.log(`⚡ Limited-time challenge started: ${challenge.name}`);
        return challenge;
    }

    // Update all events and challenges
    update(deltaTime) {
        const currentTime = Date.now();

        // Update active events
        for (const [eventId, event] of this.activeEvents.entries()) {
            if (currentTime >= event.endTime) {
                event.isActive = false;
                console.log(`⏰ Event ended: ${event.name}`);
            }
        }

        // Update tournaments
        for (const [tournamentId, tournament] of this.tournamentBrackets.entries()) {
            if (currentTime >= tournament.endTime) {
                this.endTournament(tournamentId);
            }
        }

        // Update limited-time challenges
        // This would check for active limited challenges and update them

        // Check for daily/weekly challenge resets
        this.checkChallengeResets();
    }

    // End tournament and award prizes
    endTournament(tournamentId) {
        const tournament = this.tournamentBrackets.get(tournamentId);
        if (!tournament) return;

        tournament.isActive = false;

        // Simulate tournament results (in real implementation, this would be based on actual match results)
        const winners = tournament.teams.slice(0, 3); // Top 3 teams

        winners.forEach((team, index) => {
            const prize = tournament.prizes[index + 1];
            if (prize) {
                console.log(`🏆 Tournament ${index + 1}st place: ${team.name}`);
                console.log(`🎁 Prize:`, prize);
                // Award prizes to team members
            }
        });

        console.log(`🏁 Tournament ended: ${tournament.name}`);
    }

    // Check if daily/weekly challenges should reset
    checkChallengeResets() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const hour = now.getHours();

        // Reset daily challenges at midnight
        if (hour === 0) {
            this.challenges.filter(c => c.type === 'daily').forEach(challenge => {
                challenge.current = 0;
                this.completedChallenges.delete(challenge.id);
            });
            console.log('🌅 Daily challenges reset');
        }

        // Reset weekly challenges on Sunday at midnight
        if (dayOfWeek === 0 && hour === 0) {
            this.challenges.filter(c => c.type === 'weekly').forEach(challenge => {
                challenge.current = 0;
                this.completedChallenges.delete(challenge.id);
            });
            console.log('📅 Weekly challenges reset');
        }
    }

    // Get seasonal content for current season
    getSeasonalContent() {
        return {
            season: this.currentSeason,
            boss: this.seasonalBosses[this.currentSeason.key],
            rewards: this.seasonalRewards.get(this.currentSeason.key),
            events: Array.from(this.activeEvents.values()).filter(e => e.isActive)
        };
    }

    // Get active events
    getActiveEvents() {
        return Array.from(this.activeEvents.values()).filter(event => event.isActive);
    }

    // Get active tournaments
    getActiveTournaments() {
        return Array.from(this.tournamentBrackets.values()).filter(tournament => tournament.isActive);
    }

    // Get player challenges
    getPlayerChallenges() {
        return this.challenges.map(challenge => ({
            ...challenge,
            completed: this.completedChallenges.has(challenge.id),
            progress: (challenge.current / challenge.requirement) * 100
        }));
    }

    // Get seasonal event boss configuration
    getSeasonalBossConfig() {
        const seasonalBoss = this.seasonalBosses[this.currentSeason.key];

        return {
            name: seasonalBoss.name,
            description: seasonalBoss.description,
            health: 2000, // Higher health for seasonal boss
            attackPower: 50,
            speed: 5,
            specialAttacks: seasonalBoss.specialAttacks,
            theme: this.currentSeason.theme,
            rewards: seasonalBoss.rewards
        };
    }

    // Create seasonal event instance
    createSeasonalEventInstance() {
        const bossConfig = this.getSeasonalBossConfig();

        return {
            type: 'seasonal_boss',
            config: bossConfig,
            spawnPosition: new THREE.Vector3(0, 5, 0),
            eventDuration: 20 * 60 * 1000, // 20 minutes
            maxParticipants: 20,
            currentParticipants: 0,
            rewards: bossConfig.rewards
        };
    }

    // Award seasonal rewards
    awardSeasonalRewards(playerId, bossDefeated) {
        if (!bossDefeated) return null;

        const rewards = this.seasonalBosses[this.currentSeason.key].rewards;

        console.log(`🎁 Awarded seasonal rewards to player ${playerId}:`, rewards);

        return {
            rewards: rewards,
            season: this.currentSeason.name,
            bossDefeated: this.seasonalBosses[this.currentSeason.key].name
        };
    }
}

// Tournament System
export class TournamentSystem {
    constructor() {
        this.activeTournaments = new Map();
        this.completedTournaments = [];
        this.playerStats = new Map();
    }

    // Create new tournament
    createTournament(config) {
        const tournamentId = `tournament_${Date.now()}`;

        const tournament = {
            id: tournamentId,
            name: config.name || `Boss Battle Tournament #${Math.floor(Math.random() * 1000)}`,
            description: config.description || 'Compete against other teams in epic boss battles!',
            maxTeams: config.maxTeams || 8,
            entryFee: config.entryFee || 100,
            prizePool: config.prizePool || 1000,
            currentRound: 1,
            totalRounds: Math.ceil(Math.log2(config.maxTeams || 8)),
            teams: [],
            matches: [],
            status: 'registering', // registering, in_progress, completed
            startTime: config.startTime || Date.now() + (5 * 60 * 1000), // 5 minutes from now
            endTime: null,
            brackets: null,
            winners: []
        };

        this.activeTournaments.set(tournamentId, tournament);
        console.log(`🏆 Created tournament: ${tournament.name}`);

        return tournament;
    }

    // Register team for tournament
    registerTeam(tournamentId, team) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            return { success: false, error: 'Tournament not found' };
        }

        if (tournament.status !== 'registering') {
            return { success: false, error: 'Tournament registration closed' };
        }

        if (tournament.teams.length >= tournament.maxTeams) {
            return { success: false, error: 'Tournament is full' };
        }

        // Check if team can afford entry fee
        if (team.coins < tournament.entryFee) {
            return { success: false, error: 'Insufficient coins for entry fee' };
        }

        // Deduct entry fee
        team.coins -= tournament.entryFee;
        tournament.prizePool += tournament.entryFee;

        tournament.teams.push(team);

        console.log(`👥 Team "${team.name}" registered for tournament: ${tournament.name}`);

        return { success: true };
    }

    // Start tournament
    startTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament || tournament.teams.length < 2) {
            return { success: false, error: 'Not enough teams or tournament not found' };
        }

        tournament.status = 'in_progress';
        tournament.startTime = Date.now();
        tournament.endTime = Date.now() + (tournament.teams.length * 10 * 60 * 1000); // 10 minutes per team

        // Generate tournament brackets
        this.generateBrackets(tournament);

        console.log(`🚀 Tournament started: ${tournament.name} with ${tournament.teams.length} teams`);

        return { success: true };
    }

    // Generate tournament brackets
    generateBrackets(tournament) {
        const teams = [...tournament.teams];
        this.shuffleArray(teams);

        const brackets = [];
        let round = 1;

        while (teams.length > 1) {
            const roundMatches = [];

            for (let i = 0; i < teams.length; i += 2) {
                if (i + 1 < teams.length) {
                    roundMatches.push({
                        id: `match_${round}_${i / 2}`,
                        round: round,
                        team1: teams[i],
                        team2: teams[i + 1],
                        winner: null,
                        status: 'pending'
                    });
                } else {
                    // Odd team out gets bye
                    roundMatches.push({
                        id: `match_${round}_${i}`,
                        round: round,
                        team1: teams[i],
                        team2: null,
                        winner: teams[i],
                        status: 'bye'
                    });
                }
            }

            brackets.push({
                round: round,
                matches: roundMatches
            });

            // Prepare for next round (winners only)
            teams.length = 0;
            roundMatches.forEach(match => {
                if (match.winner) {
                    teams.push(match.winner);
                }
            });

            round++;
        }

        tournament.brackets = brackets;
    }

    // Update tournament match results
    updateMatchResult(tournamentId, matchId, winnerTeam) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return { success: false, error: 'Tournament not found' };

        // Find and update match
        for (const round of tournament.brackets) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
                match.winner = winnerTeam;
                match.status = 'completed';

                // Update team statistics
                this.updateTeamStats(winnerTeam, 'win');
                if (match.team1 && match.team1.id !== winnerTeam.id) {
                    this.updateTeamStats(match.team1, 'loss');
                }
                if (match.team2 && match.team2.id !== winnerTeam.id) {
                    this.updateTeamStats(match.team2, 'loss');
                }

                // Check if tournament should advance to next round
                this.checkTournamentProgression(tournament);

                return { success: true };
            }
        }

        return { success: false, error: 'Match not found' };
    }

    // Update team statistics
    updateTeamStats(team, result) {
        if (!this.playerStats.has(team.id)) {
            this.playerStats.set(team.id, {
                wins: 0,
                losses: 0,
                tournamentsPlayed: 0
            });
        }

        const stats = this.playerStats.get(team.id);
        stats.tournamentsPlayed++;

        if (result === 'win') {
            stats.wins++;
        } else if (result === 'loss') {
            stats.losses++;
        }
    }

    // Check tournament progression
    checkTournamentProgression(tournament) {
        const currentRound = tournament.brackets.find(round => round.round === tournament.currentRound);

        if (currentRound) {
            const completedMatches = currentRound.matches.filter(match => match.status === 'completed');

            if (completedMatches.length === currentRound.matches.length) {
                // Round completed, move to next round
                tournament.currentRound++;

                if (tournament.currentRound > tournament.totalRounds) {
                    // Tournament finished
                    this.finishTournament(tournament);
                }
            }
        }
    }

    // Finish tournament and award prizes
    finishTournament(tournament) {
        tournament.status = 'completed';

        // Determine final rankings
        const finalMatch = tournament.brackets[tournament.brackets.length - 1].matches[0];
        tournament.winners = [finalMatch.winner];

        // Award prizes
        const prizeDistribution = [
            { place: 1, percentage: 0.5 },
            { place: 2, percentage: 0.3 },
            { place: 3, percentage: 0.2 }
        ];

        prizeDistribution.forEach((prize, index) => {
            if (tournament.winners[index]) {
                const prizeAmount = Math.floor(tournament.prizePool * prize.percentage);
                tournament.winners[index].coins += prizeAmount;

                console.log(`🏆 ${prize.place}st place: ${tournament.winners[index].name} - ${prizeAmount} coins`);
            }
        });

        console.log(`🏁 Tournament completed: ${tournament.name}`);

        // Move to completed tournaments
        this.completedTournaments.push(tournament);
        this.activeTournaments.delete(tournament.id);
    }

    // Get tournament leaderboard
    getTournamentLeaderboard(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return [];

        return tournament.teams
            .map(team => ({
                name: team.name,
                wins: this.playerStats.get(team.id)?.wins || 0,
                losses: this.playerStats.get(team.id)?.losses || 0,
                winRate: this.playerStats.get(team.id) ?
                    (this.playerStats.get(team.id).wins / this.playerStats.get(team.id).tournamentsPlayed) : 0
            }))
            .sort((a, b) => b.winRate - a.winRate);
    }

    // Utility function to shuffle array
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
