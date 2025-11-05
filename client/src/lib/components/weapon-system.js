// Weapon System for Boss Battles
// Implements weapon categories, purchasing, inventory, and durability mechanics

import * as THREE from 'three';

export class Weapon {
    constructor(config) {
        this.id = config.id || 'weapon_' + Date.now();
        this.name = config.name || 'Unknown Weapon';
        this.type = config.type || 'melee'; // melee, ranged, magic, support, environmental
        this.category = config.category || 'standard';

        // Combat stats
        this.damage = config.damage || 25;
        this.range = config.range || 8;
        this.fireRate = config.fireRate || 1.0; // attacks per second
        this.accuracy = config.accuracy || 0.8;

        // Economy
        this.cost = config.cost || 100;
        this.currency = config.currency || 'coins';

        // Durability system
        this.maxDurability = config.maxDurability || 100;
        this.currentDurability = this.maxDurability;
        this.durabilityCost = config.durabilityCost || 1; // durability consumed per shot

        // Visual
        this.model = config.model || this.createDefaultModel();
        this.projectileSpeed = config.projectileSpeed || 30;

        // Effects
        this.effects = config.effects || [];

        // Ammo system (for ranged weapons)
        this.maxAmmo = config.maxAmmo || -1; // -1 = infinite
        this.currentAmmo = this.maxAmmo;

        console.log(`🔫 Created weapon: ${this.name} (${this.type}) - ${this.cost} ${this.currency}`);
    }

    // Create default weapon model
    createDefaultModel() {
        const group = new THREE.Group();

        switch (this.type) {
            case 'melee':
                // Sword-like weapon
                const bladeGeometry = new THREE.BoxGeometry(0.1, 2, 0.02);
                const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.position.y = 1;

                const hiltGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
                const hiltMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
                hilt.position.y = -0.2;

                group.add(blade, hilt);
                break;

            case 'ranged':
                // Gun-like weapon
                const gunGeometry = new THREE.BoxGeometry(0.3, 0.8, 1.5);
                const gunMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
                const gun = new THREE.Mesh(gunGeometry, gunMaterial);

                const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
                const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x34495E });
                const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
                barrel.position.z = 0.8;

                group.add(gun, barrel);
                break;

            case 'magic':
                // Staff-like weapon
                const staffGeometry = new THREE.CylinderGeometry(0.1, 0.15, 3, 8);
                const staffMaterial = new THREE.MeshLambertMaterial({ color: 0x8E44AD });
                const staff = new THREE.Mesh(staffGeometry, staffMaterial);

                // Glowing orb at the top
                const orbGeometry = new THREE.SphereGeometry(0.2, 12, 12);
                const orbMaterial = new THREE.MeshBasicMaterial({
                    color: 0x9B59B6,
                    transparent: true,
                    opacity: 0.8
                });
                const orb = new THREE.Mesh(orbGeometry, orbMaterial);
                orb.position.y = 1.6;

                group.add(staff, orb);
                break;

            case 'support':
                // Healing/support weapon
                const supportGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.8);
                const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x27AE60 });
                const support = new THREE.Mesh(supportGeometry, supportMaterial);

                group.add(support);
                break;

            case 'environmental':
                // Trap/turret weapon
                const trapGeometry = new THREE.CylinderGeometry(0.5, 0.3, 0.2, 8);
                const trapMaterial = new THREE.MeshLambertMaterial({ color: 0xE74C3C });
                const trap = new THREE.Mesh(trapGeometry, trapMaterial);

                group.add(trap);
                break;
        }

        return group;
    }

    // Fire weapon (create projectile or apply effect)
    fire(fromPosition, direction, targetPosition = null) {
        if (!this.canFire()) return null;

        // Consume durability/ammo
        this.consumeAmmo();

        let projectile;

        switch (this.type) {
            case 'melee':
                projectile = this.createMeleeAttack(fromPosition, direction);
                break;
            case 'ranged':
                projectile = this.createRangedProjectile(fromPosition, direction);
                break;
            case 'magic':
                projectile = this.createMagicProjectile(fromPosition, direction);
                break;
            case 'support':
                projectile = this.createSupportEffect(fromPosition, direction);
                break;
            case 'environmental':
                projectile = this.createEnvironmentalTrap(fromPosition);
                break;
        }

        return projectile;
    }

    // Check if weapon can fire
    canFire() {
        if (this.currentDurability <= 0) return false;
        if (this.maxAmmo > 0 && this.currentAmmo <= 0) return false;
        return true;
    }

    // Consume ammo/durability
    consumeAmmo() {
        if (this.maxAmmo > 0) {
            this.currentAmmo = Math.max(0, this.currentAmmo - 1);
        }

        this.currentDurability = Math.max(0, this.currentDurability - this.durabilityCost);
    }

    // Create melee attack
    createMeleeAttack(position, direction) {
        // Melee attacks are instant - just return attack data
        return {
            type: 'melee',
            position: position.clone(),
            direction: direction.clone(),
            damage: this.damage,
            range: this.range,
            weaponId: this.id
        };
    }

    // Create ranged projectile
    createRangedProjectile(position, direction) {
        const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.8
        });

        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(position);
        projectile.position.y += 1; // Eye level

        // Set projectile velocity
        projectile.userData = {
            velocity: direction.clone().multiplyScalar(this.projectileSpeed),
            damage: this.damage,
            range: this.range,
            weaponId: this.id,
            distanceTraveled: 0,
            maxDistance: this.range
        };

        return projectile;
    }

    // Create magic projectile
    createMagicProjectile(position, direction) {
        const projectileGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0x9B59B6,
            transparent: true,
            opacity: 0.7
        });

        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(position);
        projectile.position.y += 1;

        projectile.userData = {
            velocity: direction.clone().multiplyScalar(this.projectileSpeed * 0.8), // Slightly slower
            damage: this.damage,
            range: this.range,
            weaponId: this.id,
            distanceTraveled: 0,
            maxDistance: this.range,
            magic: true // Special magic effects
        };

        return projectile;
    }

    // Create support effect
    createSupportEffect(position, direction) {
        // Support weapons create area effects rather than projectiles
        return {
            type: 'support',
            position: position.clone(),
            direction: direction.clone(),
            effect: 'heal', // or 'buff', 'shield', etc.
            radius: 10,
            duration: 5000, // 5 seconds
            weaponId: this.id
        };
    }

    // Create environmental trap
    createEnvironmentalTrap(position) {
        const trapGeometry = new THREE.CylinderGeometry(2, 2, 0.5, 16);
        const trapMaterial = new THREE.MeshLambertMaterial({
            color: 0xE74C3C,
            transparent: true,
            opacity: 0.8
        });

        const trap = new THREE.Mesh(trapGeometry, trapMaterial);
        trap.position.copy(position);
        trap.position.y = 0.25; // Slightly above ground

        trap.userData = {
            type: 'trap',
            damage: this.damage,
            radius: 4,
            duration: 10000, // 10 seconds
            weaponId: this.id,
            active: true
        };

        return trap;
    }

    // Repair weapon durability
    repair(amount) {
        this.currentDurability = Math.min(this.maxDurability, this.currentDurability + amount);
    }

    // Reload weapon ammo
    reload(amount) {
        if (this.maxAmmo > 0) {
            this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + amount);
        }
    }

    // Get weapon stats for UI
    getStats() {
        return {
            name: this.name,
            type: this.type,
            damage: this.damage,
            range: this.range,
            durability: `${this.currentDurability}/${this.maxDurability}`,
            ammo: this.maxAmmo > 0 ? `${this.currentAmmo}/${this.maxAmmo}` : '∞',
            cost: this.cost,
            currency: this.currency
        };
    }
}

// Weapon Shop System
export class WeaponShop {
    constructor(playerInventory) {
        this.playerInventory = playerInventory;
        this.availableWeapons = this.initializeShopWeapons();
        this.shopUI = null;

        console.log('🛒 Weapon shop initialized with', this.availableWeapons.length, 'weapons');
    }

    // Initialize shop inventory
    initializeShopWeapons() {
        return [
            // Melee Weapons
            new Weapon({
                id: 'sword_basic',
                name: 'Iron Sword',
                type: 'melee',
                category: 'melee',
                damage: 35,
                range: 6,
                cost: 150,
                maxDurability: 120,
                durabilityCost: 2
            }),

            new Weapon({
                id: 'hammer_heavy',
                name: 'War Hammer',
                type: 'melee',
                category: 'melee',
                damage: 50,
                range: 5,
                cost: 300,
                maxDurability: 80,
                durabilityCost: 3
            }),

            new Weapon({
                id: 'blade_energy',
                name: 'Energy Blade',
                type: 'melee',
                category: 'melee',
                damage: 45,
                range: 7,
                cost: 500,
                maxDurability: 100,
                durabilityCost: 2,
                effects: ['electric']
            }),

            // Ranged Weapons
            new Weapon({
                id: 'pistol_basic',
                name: 'Laser Pistol',
                type: 'ranged',
                category: 'ranged',
                damage: 25,
                range: 25,
                fireRate: 2.0,
                cost: 200,
                maxDurability: 150,
                durabilityCost: 1,
                maxAmmo: 30,
                projectileSpeed: 35
            }),

            new Weapon({
                id: 'rifle_sniper',
                name: 'Sniper Rifle',
                type: 'ranged',
                category: 'ranged',
                damage: 80,
                range: 50,
                fireRate: 0.5,
                accuracy: 0.95,
                cost: 800,
                maxDurability: 100,
                durabilityCost: 2,
                maxAmmo: 10,
                projectileSpeed: 40
            }),

            new Weapon({
                id: 'bow_magic',
                name: 'Magic Bow',
                type: 'ranged',
                category: 'magic',
                damage: 30,
                range: 30,
                fireRate: 1.5,
                cost: 400,
                maxDurability: 120,
                durabilityCost: 1,
                maxAmmo: 20,
                projectileSpeed: 25,
                effects: ['homing']
            }),

            // Magic Weapons
            new Weapon({
                id: 'staff_fire',
                name: 'Fire Staff',
                type: 'magic',
                category: 'magic',
                damage: 40,
                range: 20,
                fireRate: 1.0,
                cost: 600,
                maxDurability: 100,
                durabilityCost: 3,
                projectileSpeed: 20,
                effects: ['burning', 'explosive']
            }),

            new Weapon({
                id: 'wand_healing',
                name: 'Healing Wand',
                type: 'magic',
                category: 'support',
                damage: 0,
                range: 15,
                cost: 350,
                maxDurability: 200,
                durabilityCost: 5,
                effects: ['healing', 'buff']
            }),

            // Support Weapons
            new Weapon({
                id: 'gun_heal',
                name: 'Healing Gun',
                type: 'support',
                category: 'support',
                damage: 0,
                range: 12,
                fireRate: 1.0,
                cost: 250,
                maxDurability: 180,
                durabilityCost: 2,
                effects: ['healing', 'regeneration']
            }),

            // Environmental Weapons
            new Weapon({
                id: 'trap_spike',
                name: 'Spike Trap',
                type: 'environmental',
                category: 'environmental',
                damage: 60,
                range: 4,
                cost: 180,
                maxDurability: 50,
                durabilityCost: 10,
                effects: ['immobilize']
            })
        ];
    }

    // Purchase weapon for player
    purchaseWeapon(weaponId, playerCoins) {
        const weapon = this.availableWeapons.find(w => w.id === weaponId);
        if (!weapon) {
            return { success: false, error: 'Weapon not found' };
        }

        if (playerCoins < weapon.cost) {
            return { success: false, error: 'Insufficient coins' };
        }

        // Add weapon to player inventory
        this.playerInventory.addWeapon(weapon);

        return {
            success: true,
            weapon: weapon,
            remainingCoins: playerCoins - weapon.cost
        };
    }

    // Get shop inventory for UI
    getShopInventory() {
        return this.availableWeapons.map(weapon => ({
            id: weapon.id,
            name: weapon.name,
            type: weapon.type,
            category: weapon.category,
            damage: weapon.damage,
            range: weapon.range,
            cost: weapon.cost,
            currency: weapon.currency,
            description: this.getWeaponDescription(weapon)
        }));
    }

    // Get weapon description
    getWeaponDescription(weapon) {
        const descriptions = {
            melee: 'Close-range combat weapon for direct attacks',
            ranged: 'Long-range weapon for attacking from distance',
            magic: 'Mystical weapon with special magical effects',
            support: 'Support weapon for healing and buffing allies',
            environmental: 'Trap weapon for area control and defense'
        };

        return descriptions[weapon.category] || 'Standard combat weapon';
    }

    // Get recommended weapons based on player level
    getRecommendedWeapons(playerLevel) {
        return this.availableWeapons.filter(weapon => {
            const recommendedLevel = weapon.cost / 100; // Rough estimate
            return recommendedLevel <= playerLevel + 2;
        }).slice(0, 5); // Top 5 recommendations
    }
}

// Player Inventory System
export class PlayerInventory {
    constructor() {
        this.weapons = new Map();
        this.equippedWeapon = null;
        this.coins = 0;
        this.maxWeapons = 10;
    }

    // Add weapon to inventory
    addWeapon(weapon) {
        if (this.weapons.size >= this.maxWeapons) {
            return { success: false, error: 'Inventory full' };
        }

        this.weapons.set(weapon.id, weapon);

        // Auto-equip if no weapon is equipped
        if (!this.equippedWeapon) {
            this.equipWeapon(weapon.id);
        }

        return { success: true };
    }

    // Remove weapon from inventory
    removeWeapon(weaponId) {
        if (!this.weapons.has(weaponId)) {
            return { success: false, error: 'Weapon not found' };
        }

        const wasEquipped = this.equippedWeapon && this.equippedWeapon.id === weaponId;

        this.weapons.delete(weaponId);

        // If removed weapon was equipped, equip another one
        if (wasEquipped && this.weapons.size > 0) {
            const firstWeapon = this.weapons.values().next().value;
            this.equipWeapon(firstWeapon.id);
        }

        return { success: true };
    }

    // Equip weapon
    equipWeapon(weaponId) {
        if (!this.weapons.has(weaponId)) {
            return { success: false, error: 'Weapon not in inventory' };
        }

        this.equippedWeapon = this.weapons.get(weaponId);
        return { success: true };
    }

    // Get inventory for UI
    getInventory() {
        return Array.from(this.weapons.values()).map(weapon => ({
            id: weapon.id,
            name: weapon.name,
            type: weapon.type,
            equipped: this.equippedWeapon && this.equippedWeapon.id === weapon.id,
            stats: weapon.getStats()
        }));
    }

    // Add coins
    addCoins(amount) {
        this.coins += amount;
    }

    // Spend coins
    spendCoins(amount) {
        if (this.coins < amount) {
            return { success: false, error: 'Insufficient coins' };
        }

        this.coins -= amount;
        return { success: true, remainingCoins: this.coins };
    }

    // Get inventory summary
    getSummary() {
        return {
            weaponCount: this.weapons.size,
            equippedWeapon: this.equippedWeapon ? this.equippedWeapon.name : 'None',
            coins: this.coins,
            maxWeapons: this.maxWeapons
        };
    }
}

// Advanced Weapon with Special Abilities
export class AdvancedWeapon extends Weapon {
    constructor(config) {
        super(config);

        this.specialAbilities = config.specialAbilities || [];
        this.ultimateAbility = config.ultimateAbility || null;
        this.synergyEffects = config.synergyEffects || [];
        this.craftingMaterials = config.craftingMaterials || {};
        this.evolutionLevel = config.evolutionLevel || 1;
        this.maxEvolutionLevel = config.maxEvolutionLevel || 5;

        // Fusion system
        this.fusionComponents = config.fusionComponents || [];
        this.fusionResult = config.fusionResult || null;
    }

    // Use special ability
    useSpecialAbility(targetPosition = null) {
        if (this.specialAbilities.length === 0) return null;

        // Find available special ability
        const availableAbilities = this.specialAbilities.filter(ability =>
            !ability.onCooldown && ability.energyCost <= this.currentEnergy
        );

        if (availableAbilities.length === 0) return null;

        const ability = availableAbilities[0];

        // Consume energy
        this.currentEnergy = Math.max(0, this.currentEnergy - ability.energyCost);

        // Put ability on cooldown
        ability.onCooldown = true;
        ability.cooldownRemaining = ability.cooldown;

        // Execute ability
        return this.executeSpecialAbility(ability, targetPosition);
    }

    // Execute special ability effect
    executeSpecialAbility(ability, targetPosition) {
        switch (ability.type) {
            case 'teleport':
                return {
                    type: 'teleport',
                    newPosition: targetPosition,
                    effect: 'Player teleports to target location'
                };

            case 'shield':
                return {
                    type: 'shield',
                    duration: ability.duration,
                    defense: ability.defense,
                    effect: 'Temporary damage immunity'
                };

            case 'heal':
                return {
                    type: 'heal',
                    amount: ability.amount,
                    effect: 'Restore player health'
                };

            case 'buff':
                return {
                    type: 'buff',
                    stat: ability.stat,
                    multiplier: ability.multiplier,
                    duration: ability.duration,
                    effect: `${ability.stat} increased by ${ability.multiplier}x`
                };

            case 'aoe_damage':
                return {
                    type: 'aoe_damage',
                    position: targetPosition,
                    radius: ability.radius,
                    damage: ability.damage,
                    effect: 'Area damage around target'
                };

            default:
                return null;
        }
    }

    // Use ultimate ability
    useUltimateAbility() {
        if (!this.ultimateAbility || this.ultimateAbility.onCooldown) return null;

        // Consume ultimate energy
        this.currentEnergy = Math.max(0, this.currentEnergy - this.ultimateAbility.energyCost);

        // Put ultimate on cooldown
        this.ultimateAbility.onCooldown = true;
        this.ultimateAbility.cooldownRemaining = this.ultimateAbility.cooldown;

        return this.executeUltimateAbility();
    }

    // Execute ultimate ability
    executeUltimateAbility() {
        switch (this.ultimateAbility.type) {
            case 'devastating_blast':
                return {
                    type: 'devastating_blast',
                    radius: 20,
                    damage: 200,
                    effect: 'Massive area damage'
                };

            case 'time_slow':
                return {
                    type: 'time_slow',
                    duration: 8000,
                    slowFactor: 0.3,
                    effect: 'Slow down time for enemies'
                };

            case 'invulnerability':
                return {
                    type: 'invulnerability',
                    duration: 5000,
                    effect: 'Complete damage immunity'
                };

            default:
                return null;
        }
    }

    // Update ability cooldowns
    updateCooldowns(deltaTime) {
        // Update special ability cooldowns
        this.specialAbilities.forEach(ability => {
            if (ability.onCooldown) {
                ability.cooldownRemaining -= deltaTime * 1000;
                if (ability.cooldownRemaining <= 0) {
                    ability.onCooldown = false;
                    ability.cooldownRemaining = 0;
                }
            }
        });

        // Update ultimate ability cooldown
        if (this.ultimateAbility && this.ultimateAbility.onCooldown) {
            this.ultimateAbility.cooldownRemaining -= deltaTime * 1000;
            if (this.ultimateAbility.cooldownRemaining <= 0) {
                this.ultimateAbility.onCooldown = false;
                this.ultimateAbility.cooldownRemaining = 0;
            }
        }
    }

    // Check team synergies
    checkTeamSynergies(teamWeapons) {
        const synergies = [];

        // Check for weapon type synergies
        const weaponTypes = teamWeapons.map(w => w.type);
        const hasMelee = weaponTypes.includes('melee');
        const hasRanged = weaponTypes.includes('ranged');
        const hasMagic = weaponTypes.includes('magic');
        const hasSupport = weaponTypes.includes('support');

        if (hasMelee && hasRanged) {
            synergies.push({
                type: 'melee_ranged_combo',
                effect: 'Melee attacks increase ranged damage by 25%',
                duration: 10000
            });
        }

        if (hasMagic && hasSupport) {
            synergies.push({
                type: 'magic_support_combo',
                effect: 'Support abilities restore magic energy',
                duration: 15000
            });
        }

        if (hasMelee && hasMagic && hasRanged && hasSupport) {
            synergies.push({
                type: 'perfect_team',
                effect: 'All abilities 50% more effective',
                duration: 20000
            });
        }

        return synergies;
    }

    // Evolve weapon
    evolve() {
        if (this.evolutionLevel >= this.maxEvolutionLevel) return false;

        // Check if player has required materials
        const hasMaterials = Object.entries(this.craftingMaterials).every(([material, amount]) => {
            return this.playerInventory && this.playerInventory.hasMaterial(material, amount);
        });

        if (!hasMaterials) return false;

        // Consume materials
        Object.entries(this.craftingMaterials).forEach(([material, amount]) => {
            if (this.playerInventory) {
                this.playerInventory.consumeMaterial(material, amount);
            }
        });

        // Evolve weapon
        this.evolutionLevel++;
        this.damage = Math.floor(this.damage * 1.3);
        this.name = `${this.name} +${this.evolutionLevel}`;

        console.log(`✨ Weapon evolved to level ${this.evolutionLevel}!`);
        return true;
    }

    // Get weapon stats for UI (including advanced features)
    getAdvancedStats() {
        const baseStats = this.getStats();

        return {
            ...baseStats,
            evolutionLevel: this.evolutionLevel,
            maxEvolutionLevel: this.maxEvolutionLevel,
            specialAbilities: this.specialAbilities.map(ability => ({
                name: ability.name,
                energyCost: ability.energyCost,
                cooldown: ability.cooldown,
                onCooldown: ability.onCooldown,
                cooldownRemaining: ability.cooldownRemaining
            })),
            ultimateAbility: this.ultimateAbility ? {
                name: this.ultimateAbility.name,
                energyCost: this.ultimateAbility.energyCost,
                cooldown: this.ultimateAbility.cooldown,
                onCooldown: this.ultimateAbility.onCooldown
            } : null,
            synergyEffects: this.synergyEffects,
            craftingMaterials: this.craftingMaterials
        };
    }
}

// Weapon Crafting System
export class WeaponCraftingSystem {
    constructor() {
        this.craftingRecipes = this.initializeCraftingRecipes();
        this.craftingQueue = [];
        this.craftingInProgress = false;
    }

    // Initialize crafting recipes
    initializeCraftingRecipes() {
        return [
            {
                id: 'sword_to_energy_blade',
                name: 'Energy Blade Upgrade',
                description: 'Upgrade Iron Sword to Energy Blade',
                inputWeapons: ['sword_basic'],
                inputMaterials: { 'energy_core': 2, 'steel_ingot': 3 },
                outputWeapon: {
                    id: 'blade_energy',
                    name: 'Energy Blade',
                    type: 'melee',
                    damage: 45,
                    range: 7,
                    cost: 500,
                    effects: ['electric']
                },
                craftingTime: 10000 // 10 seconds
            },
            {
                id: 'pistol_to_sniper',
                name: 'Sniper Rifle Assembly',
                description: 'Combine Laser Pistol with precision components',
                inputWeapons: ['pistol_basic'],
                inputMaterials: { 'precision_lens': 1, 'long_barrel': 2, 'stabilizer': 1 },
                outputWeapon: {
                    id: 'rifle_sniper',
                    name: 'Sniper Rifle',
                    type: 'ranged',
                    damage: 80,
                    range: 50,
                    accuracy: 0.95,
                    cost: 800
                },
                craftingTime: 15000 // 15 seconds
            },
            {
                id: 'staff_fire_ultimate',
                name: 'Ultimate Fire Staff',
                description: 'Create the legendary Fire Staff',
                inputWeapons: ['staff_fire'],
                inputMaterials: { 'phoenix_feather': 1, 'dragon_scale': 3, 'eternal_flame': 1 },
                outputWeapon: {
                    id: 'staff_phoenix',
                    name: 'Phoenix Staff',
                    type: 'magic',
                    damage: 60,
                    range: 25,
                    effects: ['burning', 'explosive', 'phoenix_rising']
                },
                craftingTime: 30000 // 30 seconds
            }
        ];
    }

    // Start crafting process
    startCrafting(recipeId, playerInventory) {
        const recipe = this.craftingRecipes.find(r => r.id === recipeId);
        if (!recipe) return { success: false, error: 'Recipe not found' };

        // Check input requirements
        const hasWeapons = recipe.inputWeapons.every(weaponId =>
            playerInventory.weapons.has(weaponId)
        );

        if (!hasWeapons) {
            return { success: false, error: 'Missing required weapons' };
        }

        // Check material requirements
        const hasMaterials = Object.entries(recipe.inputMaterials).every(([material, amount]) => {
            return playerInventory.hasMaterial(material, amount);
        });

        if (!hasMaterials) {
            return { success: false, error: 'Missing required materials' };
        }

        // Consume inputs
        recipe.inputWeapons.forEach(weaponId => {
            playerInventory.removeWeapon(weaponId);
        });

        Object.entries(recipe.inputMaterials).forEach(([material, amount]) => {
            playerInventory.consumeMaterial(material, amount);
        });

        // Start crafting
        const craftJob = {
            id: `craft_${Date.now()}`,
            recipe: recipe,
            startTime: Date.now(),
            endTime: Date.now() + recipe.craftingTime,
            progress: 0
        };

        this.craftingQueue.push(craftJob);

        if (!this.craftingInProgress) {
            this.startNextCraft();
        }

        return { success: true, craftJob: craftJob };
    }

    // Start next crafting job
    startNextCraft() {
        if (this.craftingQueue.length === 0) {
            this.craftingInProgress = false;
            return;
        }

        this.craftingInProgress = true;
        const currentCraft = this.craftingQueue[0];
        console.log(`🔨 Started crafting: ${currentCraft.recipe.name}`);
    }

    // Update crafting progress
    update(deltaTime) {
        if (!this.craftingInProgress || this.craftingQueue.length === 0) return;

        const currentCraft = this.craftingQueue[0];
        const elapsed = Date.now() - currentCraft.startTime;
        currentCraft.progress = Math.min(1, elapsed / currentCraft.recipe.craftingTime);

        if (elapsed >= currentCraft.recipe.craftingTime) {
            this.completeCraft(currentCraft);
        }
    }

    // Complete crafting job
    completeCraft(craftJob) {
        console.log(`✅ Completed crafting: ${craftJob.recipe.name}`);

        // Create output weapon
        const outputWeapon = new AdvancedWeapon(craftJob.recipe.outputWeapon);

        // Add to player inventory (this would need access to player inventory)
        // playerInventory.addWeapon(outputWeapon);

        // Remove from queue
        this.craftingQueue.shift();

        // Start next craft if available
        if (this.craftingQueue.length > 0) {
            this.startNextCraft();
        } else {
            this.craftingInProgress = false;
        }

        return outputWeapon;
    }

    // Get crafting queue status
    getCraftingStatus() {
        if (this.craftingQueue.length === 0) {
            return { status: 'idle', message: 'No crafting in progress' };
        }

        const currentCraft = this.craftingQueue[0];
        return {
            status: 'crafting',
            recipeName: currentCraft.recipe.name,
            progress: currentCraft.progress,
            timeRemaining: currentCraft.endTime - Date.now(),
            queueLength: this.craftingQueue.length
        };
    }

    // Get available recipes for player
    getAvailableRecipes(playerInventory) {
        return this.craftingRecipes.filter(recipe => {
            // Check if player has required weapons
            const hasWeapons = recipe.inputWeapons.every(weaponId =>
                playerInventory.weapons.has(weaponId)
            );

            // Check if player has required materials
            const hasMaterials = Object.entries(recipe.inputMaterials).every(([material, amount]) => {
                return playerInventory.hasMaterial(material, amount);
            });

            return hasWeapons && hasMaterials;
        });
    }
}

// Team Synergy System
export class TeamSynergySystem {
    constructor() {
        this.activeSynergies = new Map();
        this.synergyEffects = {
            'melee_ranged_combo': {
                name: 'Combat Harmony',
                description: 'Melee attacks boost ranged damage',
                duration: 10000,
                effects: [
                    { type: 'damage_boost', target: 'ranged', multiplier: 1.25 }
                ]
            },
            'magic_support_combo': {
                name: 'Arcane Support',
                description: 'Support abilities restore magic energy',
                duration: 15000,
                effects: [
                    { type: 'energy_regen', target: 'magic', rate: 2.0 }
                ]
            },
            'perfect_team': {
                name: 'Perfect Synergy',
                description: 'All abilities enhanced',
                duration: 20000,
                effects: [
                    { type: 'all_stats_boost', multiplier: 1.5 }
                ]
            }
        };
    }

    // Analyze team composition and activate synergies
    analyzeTeam(teamWeapons) {
        const synergies = [];

        // Check for weapon type combinations
        const weaponTypes = teamWeapons.map(w => w.type);
        const hasMelee = weaponTypes.includes('melee');
        const hasRanged = weaponTypes.includes('ranged');
        const hasMagic = weaponTypes.includes('magic');
        const hasSupport = weaponTypes.includes('support');

        if (hasMelee && hasRanged) {
            synergies.push(this.synergyEffects.melee_ranged_combo);
        }

        if (hasMagic && hasSupport) {
            synergies.push(this.synergyEffects.magic_support_combo);
        }

        if (hasMelee && hasMagic && hasRanged && hasSupport) {
            synergies.push(this.synergyEffects.perfect_team);
        }

        return synergies;
    }

    // Activate synergy effect
    activateSynergy(synergy, teamPlayers) {
        const synergyId = `synergy_${Date.now()}_${Math.random()}`;

        this.activeSynergies.set(synergyId, {
            ...synergy,
            startTime: Date.now(),
            endTime: Date.now() + synergy.duration,
            teamPlayers: teamPlayers
        });

        console.log(`✨ Team synergy activated: ${synergy.name}`);

        // Apply effects to team
        this.applySynergyEffects(synergyId, synergy.effects, teamPlayers);

        return synergyId;
    }

    // Apply synergy effects to players
    applySynergyEffects(synergyId, effects, teamPlayers) {
        effects.forEach(effect => {
            switch (effect.type) {
                case 'damage_boost':
                    teamPlayers.forEach(player => {
                        if (player.weapons.some(w => w.type === effect.target)) {
                            player.damageMultiplier = (player.damageMultiplier || 1) * effect.multiplier;
                        }
                    });
                    break;

                case 'energy_regen':
                    teamPlayers.forEach(player => {
                        if (player.weapons.some(w => w.type === effect.target)) {
                            player.energyRegenRate = (player.energyRegenRate || 1) * effect.rate;
                        }
                    });
                    break;

                case 'all_stats_boost':
                    teamPlayers.forEach(player => {
                        player.allStatsMultiplier = (player.allStatsMultiplier || 1) * effect.multiplier;
                    });
                    break;
            }
        });
    }

    // Update active synergies
    update(deltaTime) {
        const currentTime = Date.now();

        // Remove expired synergies
        for (const [synergyId, synergy] of this.activeSynergies.entries()) {
            if (currentTime >= synergy.endTime) {
                this.deactivateSynergy(synergyId, synergy);
            }
        }
    }

    // Deactivate synergy effect
    deactivateSynergy(synergyId, synergy) {
        this.activeSynergies.delete(synergyId);

        // Remove effects from team players
        this.removeSynergyEffects(synergy.effects, synergy.teamPlayers);

        console.log(`🔚 Team synergy expired: ${synergy.name}`);
    }

    // Remove synergy effects from players
    removeSynergyEffects(effects, teamPlayers) {
        effects.forEach(effect => {
            switch (effect.type) {
                case 'damage_boost':
                case 'all_stats_boost':
                    teamPlayers.forEach(player => {
                        if (player.damageMultiplier) player.damageMultiplier /= effect.multiplier;
                        if (player.allStatsMultiplier) player.allStatsMultiplier /= effect.multiplier;
                    });
                    break;

                case 'energy_regen':
                    teamPlayers.forEach(player => {
                        if (player.energyRegenRate) player.energyRegenRate /= effect.rate;
                    });
                    break;
            }
        });
    }

    // Get active synergies for UI
    getActiveSynergies() {
        return Array.from(this.activeSynergies.values()).map(synergy => ({
            name: synergy.name,
            description: synergy.description,
            timeRemaining: Math.max(0, synergy.endTime - Date.now()),
            effects: synergy.effects
        }));
    }
}
