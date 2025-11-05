/**
 * VisualEffects - Handles visual effects, particles, and post-processing
 * Manages particle systems, screen effects, and visual enhancements
 */

class VisualEffects {
    constructor(graphicsEngine) {
        this.graphics = graphicsEngine;
        this.scene = graphicsEngine.scene;
        this.camera = graphicsEngine.camera;

        this.particles = [];
        this.effects = new Map();
        this.trails = [];

        this.settings = {
            particleCount: 100,
            trailLength: 20,
            effectsEnabled: true,
            bloomIntensity: 1.0,
            chromaticAberration: 0.0
        };

        this.particlePool = new ObjectPool(
            ObjectPool.createParticleFactory(),
            ObjectPool.resetParticle,
            50,
            200
        );
    }

    // Particle system methods
    createParticleEffect(position, type = 'explosion', count = 20) {
        if (!this.settings.effectsEnabled) return [];

        const particles = [];

        for (let i = 0; i < count; i++) {
            const particle = this.particlePool.get();

            // Set random position around center
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.y += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 2;

            // Set random velocity
            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 10,
                y: Math.random() * 8 + 2,
                z: (Math.random() - 0.5) * 10
            };

            // Set lifetime
            particle.userData.lifetime = Math.random() * 2 + 1;
            particle.userData.age = 0;

            // Set color based on effect type
            const colors = {
                explosion: [0xff4444, 0xff8800, 0xffff00],
                collect: [0x44ff44, 0x88ff88, 0xffffff],
                powerup: [0x4444ff, 0x8888ff, 0xffffff],
                crash: [0x888888, 0x444444, 0x222222]
            };

            const colorSet = colors[type] || colors.explosion;
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];
            particle.material.color.setHex(color);

            this.scene.add(particle);
            particles.push(particle);
        }

        return particles;
    }

    updateParticles(deltaTime) {
        if (!this.settings.effectsEnabled) return;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            if (!particle.userData) continue;

            particle.userData.age += deltaTime;

            // Update position
            particle.position.x += particle.userData.velocity.x * deltaTime;
            particle.position.y += particle.userData.velocity.y * deltaTime;
            particle.position.z += particle.userData.velocity.z * deltaTime;

            // Apply gravity
            particle.userData.velocity.y -= 9.8 * deltaTime;

            // Fade out over time
            const lifeProgress = particle.userData.age / particle.userData.lifetime;
            particle.material.opacity = Math.max(0, 1 - lifeProgress);

            // Scale down as it ages
            const scale = Math.max(0.1, 1 - lifeProgress * 0.5);
            particle.scale.setScalar(scale);

            // Remove dead particles
            if (particle.userData.age >= particle.userData.lifetime || particle.position.y < -10) {
                this.scene.remove(particle);
                this.particlePool.release(particle);
                this.particles.splice(i, 1);
            }
        }
    }

    // Trail effects
    addTrailEffect(object, color = 0x4a9eff, length = 20) {
        if (!this.settings.effectsEnabled) return;

        const trail = {
            object: object,
            positions: [],
            maxLength: length,
            color: color,
            lastUpdate: Date.now()
        };

        this.trails.push(trail);
        return trail;
    }

    updateTrails(deltaTime) {
        if (!this.settings.effectsEnabled) return;

        const now = Date.now();

        this.trails.forEach((trail, trailIndex) => {
            if (!trail.object || !trail.object.position) {
                this.trails.splice(trailIndex, 1);
                return;
            }

            // Add current position to trail
            trail.positions.push(trail.object.position.clone());

            // Limit trail length
            if (trail.positions.length > trail.maxLength) {
                trail.positions.shift();
            }

            // Update trail mesh if it exists
            if (trail.mesh) {
                this.updateTrailMesh(trail);
            }
        });
    }

    updateTrailMesh(trail) {
        if (trail.positions.length < 2) return;

        const geometry = trail.mesh.geometry;
        const positions = geometry.attributes.position.array;

        for (let i = 0; i < trail.positions.length - 1; i++) {
            const current = trail.positions[i];
            const next = trail.positions[i + 1];

            // Create trail segments
            const segmentIndex = i * 6; // 2 triangles per segment

            positions[segmentIndex] = current.x;
            positions[segmentIndex + 1] = current.y;
            positions[segmentIndex + 2] = current.z;

            positions[segmentIndex + 3] = next.x;
            positions[segmentIndex + 4] = next.y;
            positions[segmentIndex + 5] = next.z;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    // Screen effects
    addScreenShake(intensity = 0.1, duration = 0.3) {
        if (!this.settings.effectsEnabled) return;

        const shake = {
            intensity: intensity,
            duration: duration,
            startTime: Date.now(),
            originalPosition: this.camera.position.clone()
        };

        this.effects.set('screenShake', shake);
    }

    updateScreenEffects(deltaTime) {
        const now = Date.now();

        // Update screen shake
        const shake = this.effects.get('screenShake');
        if (shake) {
            const elapsed = (now - shake.startTime) / 1000;
            const progress = Math.min(elapsed / shake.duration, 1);

            if (progress < 1) {
                // Shake camera
                const shakeX = (Math.random() - 0.5) * shake.intensity * (1 - progress);
                const shakeY = (Math.random() - 0.5) * shake.intensity * (1 - progress);

                this.camera.position.x = shake.originalPosition.x + shakeX;
                this.camera.position.y = shake.originalPosition.y + shakeY;
            } else {
                // Reset camera position
                this.camera.position.copy(shake.originalPosition);
                this.effects.delete('screenShake');
            }
        }

        // Update other screen effects...
    }

    // Weather effects
    createWeatherEffect(type, intensity = 1.0) {
        switch (type) {
            case 'rain':
                this.createRainEffect(intensity);
                break;
            case 'snow':
                this.createSnowEffect(intensity);
                break;
            case 'fog':
                this.createFogEffect(intensity);
                break;
        }
    }

    createRainEffect(intensity) {
        const particleCount = Math.floor(500 * intensity);

        for (let i = 0; i < particleCount; i++) {
            const particle = this.particlePool.get();

            particle.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 50 + 10,
                (Math.random() - 0.5) * 100
            );

            particle.userData.velocity = { x: 0, y: -Math.random() * 15 - 5, z: 0 };
            particle.userData.lifetime = 3;
            particle.userData.age = 0;

            particle.material.color.setHex(0x87CEEB);
            particle.material.opacity = 0.6;

            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    createSnowEffect(intensity) {
        const particleCount = Math.floor(300 * intensity);

        for (let i = 0; i < particleCount; i++) {
            const particle = this.particlePool.get();

            particle.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 50 + 10,
                (Math.random() - 0.5) * 100
            );

            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 2,
                y: -Math.random() * 3 - 1,
                z: (Math.random() - 0.5) * 2
            };
            particle.userData.lifetime = 10;
            particle.userData.age = 0;

            particle.material.color.setHex(0xffffff);
            particle.material.opacity = 0.8;

            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    createFogEffect(intensity) {
        // Create fog planes
        const fogPlanes = [];

        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.PlaneGeometry(200, 100);
            const material = new THREE.MeshBasicMaterial({
                color: 0xcccccc,
                transparent: true,
                opacity: 0.1 * intensity
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(0, 5, -20 - i * 40);
            plane.rotation.x = -Math.PI / 2;

            this.scene.add(plane);
            fogPlanes.push(plane);
        }

        this.effects.set('fog', { planes: fogPlanes, intensity: intensity });
    }

    // Effect triggers
    onCoinCollected(position) {
        this.createParticleEffect(position, 'collect', 15);
        this.addScreenShake(0.05, 0.2);
    }

    onPowerUpCollected(position, type) {
        this.createParticleEffect(position, 'powerup', 25);
        this.addScreenShake(0.1, 0.4);
    }

    onCrash(position) {
        this.createParticleEffect(position, 'crash', 30);
        this.addScreenShake(0.2, 0.6);
    }

    onJump() {
        // Add subtle jump effect
        this.addScreenShake(0.02, 0.1);
    }

    // Settings and configuration
    setEffectsEnabled(enabled) {
        this.settings.effectsEnabled = enabled;

        if (!enabled) {
            // Clean up all effects
            this.clearAllEffects();
        }
    }

    setParticleCount(count) {
        this.settings.particleCount = Math.max(10, Math.min(1000, count));
    }

    setTrailLength(length) {
        this.settings.trailLength = Math.max(5, Math.min(50, length));
    }

    // Cleanup methods
    clearAllEffects() {
        // Remove all particles
        this.particles.forEach(particle => {
            this.scene.remove(particle);
            this.particlePool.release(particle);
        });
        this.particles.length = 0;

        // Remove all trails
        this.trails.length = 0;

        // Remove all effects
        this.effects.clear();
    }

    update(deltaTime) {
        this.updateParticles(deltaTime);
        this.updateTrails(deltaTime);
        this.updateScreenEffects(deltaTime);
    }

    // Debug methods
    getDebugInfo() {
        return {
            effectsEnabled: this.settings.effectsEnabled,
            particleCount: this.particles.length,
            trailCount: this.trails.length,
            activeEffects: Array.from(this.effects.keys()),
            particlePool: this.particlePool.getStats()
        };
    }

    // Performance methods
    optimizeForPerformance(targetLevel) {
        switch (targetLevel) {
            case 'low':
                this.settings.particleCount = 50;
                this.settings.trailLength = 10;
                this.settings.bloomIntensity = 0.5;
                break;
            case 'medium':
                this.settings.particleCount = 100;
                this.settings.trailLength = 20;
                this.settings.bloomIntensity = 1.0;
                break;
            case 'high':
                this.settings.particleCount = 200;
                this.settings.trailLength = 30;
                this.settings.bloomIntensity = 1.5;
                break;
        }

        // Resize particle pool
        this.particlePool.resize(this.settings.particleCount * 2);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEffects;
}

// Make VisualEffects available globally
if (typeof window !== 'undefined') {
    window.VisualEffects = VisualEffects;
}
