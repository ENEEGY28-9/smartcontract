// Boss Battle System for Endless Runner → Multiplayer Boss Battles
// Implements movement-based boss combat with circular arena design

import * as THREE from 'three';

export class BossArena {
    constructor(scene, radius = 50) {
        this.scene = scene;
        this.radius = radius;
        this.center = new THREE.Vector3(0, 0, 0);
        this.platforms = [];
        this.environmentalHazards = [];
        this.spectatorAreas = [];
        this.arenaMesh = null;

        this.createArena();
        this.createPlatforms();
        this.createEnvironmentalHazards();
        this.createSpectatorAreas();
    }

    // Create the main circular arena
    createArena() {
        // Main arena floor - circular with slight elevation
        const arenaGeometry = new THREE.CylinderGeometry(this.radius, this.radius, 2, 64);
        const arenaMaterial = new THREE.MeshLambertMaterial({
            color: 0x2a2a2a,
            emissive: 0x1a1a1a,
            emissiveIntensity: 0.2
        });

        this.arenaMesh = new THREE.Mesh(arenaGeometry, arenaMaterial);
        this.arenaMesh.position.copy(this.center);
        this.arenaMesh.receiveShadow = true;

        // Add arena border/wall
        const borderGeometry = new THREE.TorusGeometry(this.radius + 2, 3, 8, 64);
        const borderMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444,
            emissive: 0x222222,
            emissiveIntensity: 0.1
        });

        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.copy(this.center);
        border.position.y = 1;
        border.castShadow = true;

        this.scene.add(this.arenaMesh);
        this.scene.add(border);

        console.log('🏟️ Created circular arena with radius:', this.radius);
    }

    // Create multi-level platforms for tactical positioning
    createPlatforms() {
        const platformConfigs = [
            // Upper platforms for ranged attacks
            { position: new THREE.Vector3(0, 8, -this.radius * 0.6), size: new THREE.Vector3(15, 2, 8), color: 0x4a90e2 },
            { position: new THREE.Vector3(this.radius * 0.6, 8, 0), size: new THREE.Vector3(8, 2, 15), color: 0xe74c3c },
            { position: new THREE.Vector3(0, 8, this.radius * 0.6), size: new THREE.Vector3(15, 2, 8), color: 0x2ecc71 },
            { position: new THREE.Vector3(-this.radius * 0.6, 8, 0), size: new THREE.Vector3(8, 2, 15), color: 0xf39c12 },

            // Lower platforms for close combat
            { position: new THREE.Vector3(this.radius * 0.4, 3, this.radius * 0.4), size: new THREE.Vector3(10, 1, 10), color: 0x9b59b6 },
            { position: new THREE.Vector3(-this.radius * 0.4, 3, this.radius * 0.4), size: new THREE.Vector3(10, 1, 10), color: 0xe67e22 },
            { position: new THREE.Vector3(this.radius * 0.4, 3, -this.radius * 0.4), size: new THREE.Vector3(10, 1, 10), color: 0x34495e },
            { position: new THREE.Vector3(-this.radius * 0.4, 3, -this.radius * 0.4), size: new THREE.Vector3(10, 1, 10), color: 0x95a5a6 }
        ];

        platformConfigs.forEach((config, index) => {
            const platform = this.createPlatform(config);
            this.platforms.push(platform);
            this.scene.add(platform);

            console.log(`🪜 Created platform ${index + 1} at`, config.position);
        });
    }

    // Create individual platform
    createPlatform(config) {
        const geometry = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
        const material = new THREE.MeshLambertMaterial({
            color: config.color,
            emissive: new THREE.Color(config.color).multiplyScalar(0.2),
            emissiveIntensity: 0.3
        });

        const platform = new THREE.Mesh(geometry, material);
        platform.position.copy(config.position);
        platform.castShadow = true;
        platform.receiveShadow = true;

        // Add platform border
        const borderGeometry = new THREE.BoxGeometry(config.size.x + 1, 0.5, config.size.z + 1);
        const borderMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333,
            emissive: 0x111111,
            emissiveIntensity: 0.1
        });

        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.copy(config.position);
        border.position.y = -0.5;
        platform.add(border);

        return platform;
    }

    // Create environmental hazards
    createEnvironmentalHazards() {
        const hazardConfigs = [
            // Moving platforms
            {
                type: 'moving_platform',
                path: [
                    new THREE.Vector3(0, 5, -this.radius * 0.3),
                    new THREE.Vector3(this.radius * 0.3, 5, 0),
                    new THREE.Vector3(0, 5, this.radius * 0.3),
                    new THREE.Vector3(-this.radius * 0.3, 5, 0)
                ],
                speed: 0.5
            },

            // Rotating spike traps
            {
                type: 'spike_trap',
                position: new THREE.Vector3(this.radius * 0.5, 1, 0),
                rotationSpeed: 1.0
            },

            // Pit traps (visual only for now)
            {
                type: 'pit_trap',
                position: new THREE.Vector3(-this.radius * 0.4, -1, this.radius * 0.3),
                size: 8
            }
        ];

        hazardConfigs.forEach((config, index) => {
            const hazard = this.createHazard(config);
            this.environmentalHazards.push(hazard);
            this.scene.add(hazard);

            console.log(`⚠️ Created ${config.type} hazard ${index + 1}`);
        });
    }

    // Create individual hazard
    createHazard(config) {
        let mesh;

        switch (config.type) {
            case 'moving_platform':
                const platformGeometry = new THREE.BoxGeometry(12, 1, 12);
                const platformMaterial = new THREE.MeshLambertMaterial({
                    color: 0x8b4513,
                    emissive: 0x442200,
                    emissiveIntensity: 0.2
                });
                mesh = new THREE.Mesh(platformGeometry, platformMaterial);
                mesh.position.copy(config.path[0]);
                mesh.userData = {
                    type: 'moving_platform',
                    path: config.path,
                    currentPathIndex: 0,
                    speed: config.speed,
                    targetPosition: config.path[1]
                };
                break;

            case 'spike_trap':
                const spikeGeometry = new THREE.ConeGeometry(3, 6, 8);
                const spikeMaterial = new THREE.MeshLambertMaterial({
                    color: 0x666666,
                    emissive: 0x333333,
                    emissiveIntensity: 0.1
                });
                mesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
                mesh.position.copy(config.position);
                mesh.userData = {
                    type: 'spike_trap',
                    rotationSpeed: config.rotationSpeed,
                    damage: 25
                };
                break;

            case 'pit_trap':
                const pitGeometry = new THREE.CylinderGeometry(config.size, config.size, 2, 16);
                const pitMaterial = new THREE.MeshLambertMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.7
                });
                mesh = new THREE.Mesh(pitGeometry, pitMaterial);
                mesh.position.copy(config.position);
                mesh.userData = {
                    type: 'pit_trap',
                    damage: 50,
                    respawnTime: 5000 // 5 seconds
                };
                break;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    // Create spectator areas
    createSpectatorAreas() {
        // Spectator platforms around the arena
        const spectatorPositions = [
            new THREE.Vector3(this.radius + 10, 10, 0),
            new THREE.Vector3(-this.radius - 10, 10, 0),
            new THREE.Vector3(0, 10, this.radius + 10),
            new THREE.Vector3(0, 10, -this.radius - 10)
        ];

        spectatorPositions.forEach((position, index) => {
            const spectatorArea = this.createSpectatorArea(position, index);
            this.spectatorAreas.push(spectatorArea);
            this.scene.add(spectatorArea);
        });
    }

    // Create individual spectator area
    createSpectatorArea(position, index) {
        const geometry = new THREE.BoxGeometry(20, 2, 20);
        const material = new THREE.MeshLambertMaterial({
            color: 0x34495e,
            transparent: true,
            opacity: 0.8
        });

        const platform = new THREE.Mesh(geometry, material);
        platform.position.copy(position);
        platform.castShadow = true;

        // Add railing
        const railingGeometry = new THREE.BoxGeometry(22, 3, 1);
        const railingMaterial = new THREE.MeshLambertMaterial({
            color: 0x7f8c8d,
            emissive: 0x3f4c4d,
            emissiveIntensity: 0.2
        });

        const railing1 = new THREE.Mesh(railingGeometry, railingMaterial);
        railing1.position.set(position.x, position.y + 1.5, position.z + 10);

        const railing2 = new THREE.Mesh(railingGeometry, railingMaterial);
        railing2.position.set(position.x, position.y + 1.5, position.z - 10);

        const railing3 = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 22), railingMaterial);
        railing3.position.set(position.x + 10, position.y + 1.5, position.z);

        const railing4 = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 22), railingMaterial);
        railing4.position.set(position.x - 10, position.y + 1.5, position.z);

        platform.add(railing1, railing2, railing3, railing4);

        return platform;
    }

    // Update arena elements
    update(deltaTime) {
        // Update moving platforms
        this.environmentalHazards.forEach(hazard => {
            if (hazard.userData.type === 'moving_platform') {
                this.updateMovingPlatform(hazard, deltaTime);
            } else if (hazard.userData.type === 'spike_trap') {
                this.updateSpikeTrap(hazard, deltaTime);
            }
        });
    }

    // Update moving platform position
    updateMovingPlatform(platform, deltaTime) {
        const path = platform.userData.path;
        const speed = platform.userData.speed;

        if (path.length < 2) return;

        const currentPos = platform.position;
        const targetPos = platform.userData.targetPosition;

        // Move towards target
        const direction = targetPos.clone().sub(currentPos).normalize();
        const moveDistance = speed * deltaTime;

        currentPos.add(direction.multiplyScalar(moveDistance));

        // Check if reached target
        const distanceToTarget = currentPos.distanceTo(targetPos);
        if (distanceToTarget < 1.0) {
            // Move to next point in path
            platform.userData.currentPathIndex = (platform.userData.currentPathIndex + 1) % path.length;
            platform.userData.targetPosition = path[platform.userData.currentPathIndex];
        }
    }

    // Update rotating spike trap
    updateSpikeTrap(spikeTrap, deltaTime) {
        spikeTrap.rotation.y += spikeTrap.userData.rotationSpeed * deltaTime;
    }

    // Get safe positions for players (away from hazards)
    getSafePositions() {
        const safePositions = [];

        // Platforms are generally safe
        this.platforms.forEach(platform => {
            safePositions.push({
                position: platform.position.clone().add(new THREE.Vector3(0, 2, 0)),
                type: 'platform',
                description: 'Elevated platform for ranged attacks'
            });
        });

        // Areas around the arena perimeter (but not too close to center)
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const distance = this.radius * 0.7;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            safePositions.push({
                position: new THREE.Vector3(x, 1, z),
                type: 'perimeter',
                description: 'Arena perimeter for movement-based combat'
            });
        }

        return safePositions;
    }

    // Check if position is safe (not in hazard area)
    isPositionSafe(position) {
        // Check distance from environmental hazards
        for (const hazard of this.environmentalHazards) {
            const distance = position.distanceTo(hazard.position);

            if (hazard.userData.type === 'spike_trap' && distance < 5) {
                return false;
            }

            if (hazard.userData.type === 'pit_trap' && distance < hazard.userData.size) {
                return false;
            }
        }

        return true;
    }
}

// Movement-Based Combat System
export class MovementCombatSystem {
    constructor(arena) {
        this.arena = arena;
        this.playerSpeed = 12; // Base movement speed
        this.runSpeedMultiplier = 1.8; // Speed boost when running
        this.attackRange = 8; // Distance for melee attacks
        this.dodgeDistance = 15; // Distance to dodge attacks
        this.momentumThreshold = 8; // Speed threshold for momentum attacks

        this.playerStates = new Map(); // Track player movement states
    }

    // Update player movement and combat state
    updatePlayer(playerId, position, velocity, input) {
        const speed = velocity.length();

        // Determine combat state based on movement
        let combatState = 'idle';

        if (speed > this.momentumThreshold) {
            combatState = 'running';
        } else if (speed > 2) {
            combatState = 'moving';
        }

        // Check for attack opportunities
        const bossPosition = this.arena.center;
        const distanceToBoss = position.distanceTo(bossPosition);

        if (distanceToBoss <= this.attackRange && input.attack) {
            combatState = 'attacking';
        }

        // Check for dodge opportunities
        if (input.dodge && speed > this.momentumThreshold) {
            combatState = 'dodging';
        }

        // Update player state
        this.playerStates.set(playerId, {
            position,
            velocity,
            speed,
            combatState,
            distanceToBoss,
            canAttack: distanceToBoss <= this.attackRange,
            canDodge: speed > this.momentumThreshold
        });

        return this.playerStates.get(playerId);
    }

    // Calculate damage based on position and movement
    calculateDamage(playerState, weaponType = 'melee') {
        let baseDamage = 25;

        // Position-based damage modifiers
        if (playerState.distanceToBoss < this.attackRange * 0.5) {
            baseDamage *= 1.5; // Close range bonus
        } else if (playerState.distanceToBoss > this.attackRange * 1.5) {
            baseDamage *= 0.7; // Long range penalty
        }

        // Movement-based damage modifiers
        if (playerState.combatState === 'running' && playerState.speed > this.momentumThreshold) {
            baseDamage *= 1.3; // Momentum bonus
        }

        // Weapon type modifiers
        const weaponModifiers = {
            'melee': 1.0,
            'ranged': 0.8,
            'magic': 1.2
        };

        baseDamage *= weaponModifiers[weaponType] || 1.0;

        return Math.floor(baseDamage);
    }

    // Check if attack hits based on position and movement
    checkAttackHit(playerState, bossState) {
        const hitChance = 0.7; // Base hit chance

        // Position affects hit chance
        const distance = playerState.distanceToBoss;
        let positionModifier = 1.0;

        if (distance < this.attackRange * 0.3) {
            positionModifier = 1.3; // Very close = easier to hit
        } else if (distance > this.attackRange * 1.2) {
            positionModifier = 0.6; // Too far = harder to hit
        }

        // Movement affects hit chance
        let movementModifier = 1.0;
        if (playerState.combatState === 'running') {
            movementModifier = 1.2; // Running attacks are more accurate
        } else if (playerState.combatState === 'idle') {
            movementModifier = 0.8; // Stationary attacks are less accurate
        }

        const finalHitChance = Math.min(0.95, hitChance * positionModifier * movementModifier);

        return Math.random() < finalHitChance;
    }

    // Get optimal position for attack
    getOptimalAttackPosition(targetPosition, preferredDistance = this.attackRange) {
        const direction = targetPosition.clone().sub(this.arena.center).normalize();
        return this.arena.center.clone().add(direction.multiplyScalar(preferredDistance));
    }

    // Get safe dodge position
    getDodgePosition(playerPosition, bossAttackDirection) {
        // Calculate perpendicular direction to dodge
        const perpendicular = new THREE.Vector3(-bossAttackDirection.z, 0, bossAttackDirection.x).normalize();
        return playerPosition.clone().add(perpendicular.multiplyScalar(this.dodgeDistance));
    }
}

// Basic Boss Framework with AI State Management
export class Boss {
    constructor(arena, config = {}) {
        this.arena = arena;
        this.position = arena.center.clone();
        this.rotation = 0;

        // Boss stats
        this.maxHealth = config.maxHealth || 1000;
        this.currentHealth = this.maxHealth;
        this.attackPower = config.attackPower || 30;
        this.speed = config.speed || 3;

        // Boss states
        this.currentPhase = 1;
        this.state = 'idle'; // idle, attacking, charging, vulnerable, defeated
        this.targetPlayer = null;

        // Attack patterns
        this.attackPatterns = config.attackPatterns || this.getDefaultAttackPatterns();
        this.currentAttack = null;
        this.attackCooldown = 0;

        // Boss mesh (placeholder)
        this.mesh = this.createBossMesh();
        this.arena.scene.add(this.mesh);

        console.log('👹 Created boss with', this.maxHealth, 'HP');
    }

    // Create boss visual representation
    createBossMesh() {
        const group = new THREE.Group();

        // Main body - large imposing figure
        const bodyGeometry = new THREE.CylinderGeometry(4, 6, 8, 16);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B0000,
            emissive: 0x440000,
            emissiveIntensity: 0.3
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 4;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(3, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({
            color: 0x660000,
            emissive: 0x330000,
            emissiveIntensity: 0.2
        });

        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 9;
        head.castShadow = true;
        group.add(head);

        // Glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 1.0
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-1.5, 9, 2.5);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(1.5, 9, 2.5);

        group.add(leftEye, rightEye);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.8, 0.8, 6, 8);
        const armMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B0000,
            emissive: 0x440000,
            emissiveIntensity: 0.3
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-5, 6, 0);
        leftArm.rotation.z = Math.PI / 6;

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(5, 6, 0);
        rightArm.rotation.z = -Math.PI / 6;

        group.add(leftArm, rightArm);

        return group;
    }

    // Default attack patterns
    getDefaultAttackPatterns() {
        return [
            {
                name: 'spin_attack',
                damage: 40,
                range: 15,
                cooldown: 3000,
                description: 'Spinning attack that hits all nearby players'
            },
            {
                name: 'charge_attack',
                damage: 60,
                range: 25,
                cooldown: 5000,
                description: 'Charges at a target player'
            },
            {
                name: 'area_pulse',
                damage: 25,
                range: 20,
                cooldown: 4000,
                description: 'Area attack that damages all players in range'
            }
        ];
    }

    // Update boss AI
    update(deltaTime, players) {
        this.attackCooldown -= deltaTime * 1000;

        // Find target player (closest or most threatening)
        this.updateTargetPlayer(players);

        // Update boss state machine
        this.updateState(deltaTime, players);

        // Execute current attack if active
        if (this.currentAttack) {
            this.executeAttack(deltaTime, players);
        }

        // Update boss rotation (slowly rotate to face target)
        if (this.targetPlayer) {
            const direction = this.targetPlayer.position.clone().sub(this.position).normalize();
            const targetRotation = Math.atan2(direction.x, direction.z);
            this.rotation += (targetRotation - this.rotation) * 0.02;
        }

        this.mesh.rotation.y = this.rotation;
    }

    // Find the best target player
    updateTargetPlayer(players) {
        if (players.length === 0) {
            this.targetPlayer = null;
            return;
        }

        // Find closest player as primary target
        let closestPlayer = null;
        let closestDistance = Infinity;

        players.forEach(player => {
            const distance = player.position.distanceTo(this.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPlayer = player;
            }
        });

        this.targetPlayer = closestPlayer;
    }

    // Update boss state based on health and situation
    updateState(deltaTime, players) {
        const healthPercentage = this.currentHealth / this.maxHealth;

        // Phase transitions based on health
        if (healthPercentage < 0.25 && this.currentPhase === 2) {
            this.currentPhase = 3;
            this.state = 'vulnerable';
            console.log('👹 Boss entered phase 3 (vulnerable)');
        } else if (healthPercentage < 0.6 && this.currentPhase === 1) {
            this.currentPhase = 2;
            this.state = 'attacking';
            console.log('👹 Boss entered phase 2 (aggressive)');
        }

        // State transitions
        switch (this.state) {
            case 'idle':
                if (players.length > 0 && this.attackCooldown <= 0) {
                    this.startRandomAttack();
                }
                break;

            case 'attacking':
                if (this.currentAttack && this.currentAttack.finished) {
                    this.state = 'idle';
                    this.attackCooldown = this.currentAttack.cooldown;
                }
                break;

            case 'charging':
                if (this.currentAttack && this.currentAttack.finished) {
                    this.state = 'idle';
                }
                break;

            case 'vulnerable':
                // Boss is stunned, more vulnerable to attacks
                break;
        }
    }

    // Start a random attack
    startRandomAttack() {
        if (this.attackCooldown > 0 || !this.targetPlayer) return;

        const availableAttacks = this.attackPatterns.filter(attack => attack.cooldown <= 0);
        if (availableAttacks.length === 0) return;

        const randomAttack = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
        this.currentAttack = {
            ...randomAttack,
            startTime: Date.now(),
            finished: false
        };

        this.state = 'attacking';
        console.log(`👹 Boss starting ${randomAttack.name} attack`);

        // Reset attack cooldown
        this.attackPatterns.find(attack => attack.name === randomAttack.name).cooldown = randomAttack.cooldown;
    }

    // Execute current attack
    executeAttack(deltaTime, players) {
        if (!this.currentAttack || this.currentAttack.finished) return;

        const attack = this.currentAttack;
        const elapsed = Date.now() - attack.startTime;

        switch (attack.name) {
            case 'spin_attack':
                this.executeSpinAttack(elapsed, players);
                break;
            case 'charge_attack':
                this.executeChargeAttack(elapsed, players);
                break;
            case 'area_pulse':
                this.executeAreaPulse(elapsed, players);
                break;
        }
    }

    // Execute spin attack
    executeSpinAttack(elapsed, players) {
        const duration = 2000; // 2 second spin

        if (elapsed >= duration) {
            // Attack finished, damage nearby players
            players.forEach(player => {
                const distance = player.position.distanceTo(this.position);
                if (distance <= 15) {
                    this.damagePlayer(player, 40);
                }
            });

            this.currentAttack.finished = true;
            return;
        }

        // Rotate faster during spin
        this.mesh.rotation.y += 0.3;
    }

    // Execute charge attack
    executeChargeAttack(elapsed, players) {
        const chargeDuration = 1500;
        const chargeSpeed = 20;

        if (elapsed >= chargeDuration) {
            // Charge finished
            this.currentAttack.finished = true;
            return;
        }

        // Move towards target during charge
        if (this.targetPlayer && elapsed < chargeDuration) {
            const direction = this.targetPlayer.position.clone().sub(this.position).normalize();
            this.position.add(direction.multiplyScalar(chargeSpeed * 0.016)); // 60fps
        }
    }

    // Execute area pulse attack
    executeAreaPulse(elapsed, players) {
        const pulseDuration = 1000;

        if (elapsed >= pulseDuration) {
            // Pulse attack finished, damage players in range
            players.forEach(player => {
                const distance = player.position.distanceTo(this.position);
                if (distance <= 20) {
                    this.damagePlayer(player, 25);
                }
            });

            this.currentAttack.finished = true;
            return;
        }

        // Visual pulse effect (scale boss slightly)
        const pulseScale = 1 + Math.sin(elapsed / 100) * 0.1;
        this.mesh.scale.setScalar(pulseScale);
    }

    // Damage a player
    damagePlayer(player, damage) {
        // This would trigger player damage in the main game system
        console.log(`💥 Boss dealt ${damage} damage to player`);
        // player.takeDamage(damage);
    }

    // Take damage from player attack
    takeDamage(damage, playerState) {
        // Position-based damage modifier
        let damageModifier = 1.0;

        if (playerState.distanceToBoss < this.arena.radius * 0.3) {
            damageModifier = 1.5; // Back attacks do more damage
        } else if (playerState.distanceToBoss > this.arena.radius * 0.7) {
            damageModifier = 0.8; // Front attacks do less damage
        }

        const actualDamage = Math.floor(damage * damageModifier);
        this.currentHealth -= actualDamage;

        console.log(`💔 Boss took ${actualDamage} damage, health: ${this.currentHealth}/${this.maxHealth}`);

        // Check if boss is defeated
        if (this.currentHealth <= 0) {
            this.state = 'defeated';
            console.log('💀 Boss defeated!');
        }

        return actualDamage;
    }

    // Get boss attack area for visualization
    getAttackArea() {
        if (!this.currentAttack) return null;

        const attack = this.currentAttack;

        switch (attack.name) {
            case 'spin_attack':
                return {
                    center: this.position,
                    radius: 15,
                    type: 'circular'
                };
            case 'charge_attack':
                return {
                    center: this.position,
                    direction: this.targetPlayer ? this.targetPlayer.position.clone().sub(this.position).normalize() : new THREE.Vector3(0, 0, 1),
                    length: 25,
                    width: 6,
                    type: 'cone'
                };
            case 'area_pulse':
                return {
                    center: this.position,
                    radius: 20,
                    type: 'circular'
                };
            default:
                return null;
        }
    }

    // Environmental interactions
    interactWithEnvironment(arena) {
        // Boss can interact with environmental hazards
        arena.environmentalHazards.forEach(hazard => {
            const distance = this.position.distanceTo(hazard.position);

            if (hazard.userData.type === 'moving_platform' && distance < 10) {
                // Boss can jump on moving platforms for advantage
                if (this.state === 'attacking' && Math.random() < 0.3) {
                    this.position.y = Math.min(this.position.y + 2, 8);
                    console.log('🦘 Boss jumped on moving platform!');
                }
            }
        });
    }

    // Get weak points for targeting
    getWeakPoints() {
        const weakPoints = [];

        // Phase-based weak points
        switch (this.currentPhase) {
            case 1:
                weakPoints.push({
                    position: this.position.clone().add(new THREE.Vector3(0, 6, 0)),
                    type: 'head',
                    multiplier: 2.0,
                    description: 'Head shot - critical damage'
                });
                break;
            case 2:
                weakPoints.push(
                    {
                        position: this.position.clone().add(new THREE.Vector3(-3, 3, 0)),
                        type: 'left_arm',
                        multiplier: 1.5,
                        description: 'Left arm - reduces attack speed'
                    },
                    {
                        position: this.position.clone().add(new THREE.Vector3(3, 3, 0)),
                        type: 'right_arm',
                        multiplier: 1.5,
                        description: 'Right arm - reduces attack power'
                    }
                );
                break;
            case 3:
                weakPoints.push({
                    position: this.position.clone().add(new THREE.Vector3(0, 2, 0)),
                    type: 'core',
                    multiplier: 3.0,
                    description: 'Core - massive damage when vulnerable'
                });
                break;
        }

        return weakPoints;
    }

    // Take damage with weak point targeting
    takeDamage(damage, playerState, targetWeakPoint = null) {
        let damageMultiplier = 1.0;

        if (targetWeakPoint) {
            damageMultiplier = targetWeakPoint.multiplier;

            // Special effects based on weak point
            switch (targetWeakPoint.type) {
                case 'head':
                    this.attackCooldown += 1000; // Stun effect
                    console.log('💫 Head shot! Boss stunned!');
                    break;
                case 'left_arm':
                    this.speed *= 0.7; // Slow movement
                    console.log('🦵 Left arm hit! Movement slowed!');
                    break;
                case 'right_arm':
                    this.attackPower *= 0.8; // Reduce damage
                    console.log('💪 Right arm hit! Attack power reduced!');
                    break;
                case 'core':
                    // Already handled by multiplier
                    console.log('💥 Core hit! Massive damage!');
                    break;
            }
        }

        const actualDamage = Math.floor(damage * damageMultiplier);
        this.currentHealth -= actualDamage;

        console.log(`💔 Boss took ${actualDamage} damage (${damageMultiplier}x multiplier), health: ${this.currentHealth}/${this.maxHealth}`);

        // Check if boss is defeated
        if (this.currentHealth <= 0) {
            this.state = 'defeated';
            console.log('💀 Boss defeated!');
        }

        return actualDamage;
    }
}

// Advanced Boss with Multi-Transformation Mechanics
export class AdvancedBoss extends Boss {
    constructor(arena, config = {}) {
        super(arena, config);

        this.transformations = [
            {
                name: 'enraged_form',
                triggerHealth: 0.7,
                newStats: {
                    speed: 6,
                    attackPower: 45,
                    size: 1.2
                },
                abilities: ['ground_slam', 'fire_breath']
            },
            {
                name: 'final_form',
                triggerHealth: 0.3,
                newStats: {
                    speed: 8,
                    attackPower: 60,
                    size: 1.5
                },
                abilities: ['meteor_strike', 'earthquake']
            }
        ];

        this.currentTransformation = null;
        this.transformationEffects = new Map();
    }

    // Update with transformation logic
    update(deltaTime, players) {
        super.update(deltaTime, players);

        // Check for transformations
        this.checkTransformations();

        // Apply transformation effects
        this.applyTransformationEffects();
    }

    // Check if boss should transform
    checkTransformations() {
        const healthPercentage = this.currentHealth / this.maxHealth;

        for (const transformation of this.transformations) {
            if (healthPercentage <= transformation.triggerHealth &&
                !this.currentTransformation &&
                this.currentPhase >= 2) {

                this.transform(transformation);
                break;
            }
        }
    }

    // Execute transformation
    transform(transformation) {
        console.log(`🔄 Boss transforming to ${transformation.name}!`);

        this.currentTransformation = transformation;

        // Apply new stats
        Object.assign(this, transformation.newStats);

        // Update visual appearance
        this.updateTransformationVisuals(transformation);

        // Add new abilities
        this.attackPatterns.push(...transformation.abilities.map(ability => ({
            name: ability,
            damage: 50 + (transformation.newStats.attackPower - 30),
            range: 25,
            cooldown: 4000,
            description: `${ability.replace('_', ' ')} attack`
        })));

        // Special transformation effects
        this.createTransformationEffects(transformation);
    }

    // Update boss visuals for transformation
    updateTransformationVisuals(transformation) {
        const scale = transformation.newStats.size || 1.0;
        this.mesh.scale.setScalar(scale);

        // Color changes based on transformation
        const colors = {
            'enraged_form': 0xFF4500, // Orange-red
            'final_form': 0x8B0000   // Dark red
        };

        if (colors[transformation.name]) {
            this.mesh.children.forEach(child => {
                if (child.material && child.material.color) {
                    child.material.color.setHex(colors[transformation.name]);
                    child.material.emissive.setHex(colors[transformation.name]);
                    child.material.emissiveIntensity = 0.5;
                }
            });
        }
    }

    // Create transformation visual effects
    createTransformationEffects(transformation) {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 5;
            const x = this.position.x + Math.cos(angle) * radius;
            const z = this.position.z + Math.sin(angle) * radius;
            const y = this.position.y + 3;

            // Create transformation particles
            const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF4500,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(x, y, z);

            // Add upward velocity with spread
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    Math.random() * 0.4 + 0.2,
                    (Math.random() - 0.5) * 0.3
                ),
                life: 2.0,
                decay: 0.02
            };

            this.arena.scene.add(particle);
            this.transformationEffects.set(`particle_${i}`, particle);
        }
    }

    // Apply ongoing transformation effects
    applyTransformationEffects() {
        if (!this.currentTransformation) return;

        // Update transformation particles
        this.transformationEffects.forEach((particle, key) => {
            particle.userData.velocity.y -= 0.01; // Gravity
            particle.position.add(particle.userData.velocity);

            particle.userData.life -= particle.userData.decay;
            if (particle.material) {
                particle.material.opacity = particle.userData.life;
            }

            if (particle.userData.life <= 0) {
                this.arena.scene.remove(particle);
                this.transformationEffects.delete(key);
            }
        });

        // Special transformation behaviors
        switch (this.currentTransformation.name) {
            case 'enraged_form':
                // Increased aggression - faster attacks
                this.attackCooldown = Math.max(0, this.attackCooldown - 0.5);
                break;
            case 'final_form':
                // Massive presence - area effects
                if (Math.random() < 0.02) { // 2% chance per frame
                    this.createAreaEffect();
                }
                break;
        }
    }

    // Create area effect for final form
    createAreaEffect() {
        const effectGeometry = new THREE.RingGeometry(3, 5, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B0000,
            transparent: true,
            opacity: 0.6
        });

        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(this.position);
        effect.position.y = 0.1;
        effect.rotation.x = -Math.PI / 2;

        effect.userData = {
            life: 1.0,
            decay: 0.02
        };

        this.arena.scene.add(effect);

        // Damage players in area
        const players = this.getNearbyPlayers(5);
        players.forEach(player => {
            this.damagePlayer(player, 30);
        });

        console.log('💥 Final form area effect!');
    }

    // Get players within range
    getNearbyPlayers(range) {
        // This would need access to player positions
        // For now, return mock data
        return [];
    }

    // Override attack execution for advanced attacks
    executeAttack(deltaTime, players) {
        if (!this.currentAttack || this.currentAttack.finished) return;

        const attack = this.currentAttack;
        const elapsed = Date.now() - attack.startTime;

        // Handle advanced attacks
        switch (attack.name) {
            case 'ground_slam':
                this.executeGroundSlam(elapsed, players);
                break;
            case 'fire_breath':
                this.executeFireBreath(elapsed, players);
                break;
            case 'meteor_strike':
                this.executeMeteorStrike(elapsed, players);
                break;
            case 'earthquake':
                this.executeEarthquake(elapsed, players);
                break;
            default:
                super.executeAttack(deltaTime, players);
                break;
        }
    }

    // Ground slam attack
    executeGroundSlam(elapsed, players) {
        const duration = 3000;

        if (elapsed >= duration) {
            // Slam effect
            const slamRadius = 12;
            players.forEach(player => {
                const distance = player.position.distanceTo(this.position);
                if (distance <= slamRadius) {
                    this.damagePlayer(player, 55);
                    // Knockback effect
                    const knockback = player.position.clone().sub(this.position).normalize().multiplyScalar(10);
                    player.position.add(knockback);
                }
            });

            this.currentAttack.finished = true;
            return;
        }

        // Visual charging effect
        const chargeProgress = elapsed / duration;
        this.mesh.position.y = 2 + Math.sin(chargeProgress * Math.PI * 4) * 0.5;
    }

    // Fire breath attack
    executeFireBreath(elapsed, players) {
        const duration = 4000;

        if (elapsed >= duration) {
            this.currentAttack.finished = true;
            return;
        }

        // Continuous fire breath in target direction
        if (this.targetPlayer && elapsed % 200 < 50) { // Every 200ms for 50ms
            const direction = this.targetPlayer.position.clone().sub(this.position).normalize();
            this.createFireProjectile(this.position, direction);
        }
    }

    // Create fire projectile
    createFireProjectile(position, direction) {
        const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF4500,
            emissive: 0xFF4500,
            emissiveIntensity: 0.8
        });

        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(position);
        projectile.position.y += 2;

        projectile.userData = {
            velocity: direction.multiplyScalar(25),
            damage: 35,
            life: 3.0,
            fire: true
        };

        this.arena.scene.add(projectile);
        return projectile;
    }

    // Meteor strike attack
    executeMeteorStrike(elapsed, players) {
        const duration = 5000;

        if (elapsed >= duration) {
            this.currentAttack.finished = true;
            return;
        }

        // Spawn meteors at random locations
        if (elapsed % 1000 < 100) { // Every second
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 15;
            const meteorPosition = new THREE.Vector3(
                Math.cos(angle) * distance,
                15,
                Math.sin(angle) * distance
            );

            this.createMeteor(meteorPosition);
        }
    }

    // Create meteor
    createMeteor(position) {
        const meteorGeometry = new THREE.SphereGeometry(1, 12, 12);
        const meteorMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B0000,
            emissive: 0xFF4500,
            emissiveIntensity: 0.5
        });

        const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
        meteor.position.copy(position);

        meteor.userData = {
            velocity: new THREE.Vector3(0, -20, 0),
            damage: 70,
            explosionRadius: 8,
            groundPosition: position.y
        };

        this.arena.scene.add(meteor);
        return meteor;
    }

    // Earthquake attack
    executeEarthquake(elapsed, players) {
        const duration = 4000;

        if (elapsed >= duration) {
            this.currentAttack.finished = true;
            return;
        }

        // Screen shake and ground deformation
        if (elapsed % 500 < 100) { // Every 500ms
            // Apply earthquake effects to all players
            players.forEach(player => {
                const distance = player.position.distanceTo(this.position);
                if (distance <= 25) {
                    this.damagePlayer(player, 25);
                    // Stun effect
                    player.stunned = true;
                    setTimeout(() => player.stunned = false, 1000);
                }
            });

            console.log('🌋 Earthquake! Players stunned!');
        }
    }
}
