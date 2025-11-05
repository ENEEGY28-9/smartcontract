/**
 * PhysicsEngine - Handles game physics simulation
 * Manages gravity, collisions, and physical interactions
 */

class PhysicsEngine {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.world = {
            gravity: -25.0,
            airResistance: 0.99,
            groundLevel: 0,
            ceilingLevel: 50
        };

        this.bodies = new Map();
        this.colliders = new Map();
        this.collisionPairs = [];

        this.settings = {
            collisionDetection: true,
            gravityEnabled: true,
            airResistanceEnabled: true,
            maxVelocity: 50
        };

        this.setupCollisionMatrix();
    }

    setupCollisionMatrix() {
        // Define which objects can collide with which
        this.collisionMatrix = {
            player: ['obstacle', 'coin', 'powerup', 'ground'],
            obstacle: ['player', 'ground'],
            coin: ['player'],
            powerup: ['player'],
            ground: ['player', 'obstacle']
        };
    }

    // Body management
    addBody(id, body) {
        this.bodies.set(id, {
            ...body,
            velocity: body.velocity || { x: 0, y: 0, z: 0 },
            acceleration: body.acceleration || { x: 0, y: 0, z: 0 },
            mass: body.mass || 1,
            drag: body.drag || 0.99,
            isStatic: body.isStatic || false,
            isKinematic: body.isKinematic || false
        });
    }

    removeBody(id) {
        this.bodies.delete(id);

        // Remove from colliders too
        if (this.colliders.has(id)) {
            this.colliders.delete(id);
        }
    }

    getBody(id) {
        return this.bodies.get(id);
    }

    // Collider management
    addCollider(id, collider) {
        this.colliders.set(id, {
            ...collider,
            bounds: collider.bounds || this.calculateBounds(collider.object)
        });
    }

    removeCollider(id) {
        this.colliders.delete(id);
    }

    calculateBounds(object) {
        if (!object || !object.geometry) return null;

        // Simple bounding box calculation for Three.js objects
        const box = new THREE.Box3().setFromObject(object);
        return {
            min: box.min,
            max: box.max,
            center: box.getCenter(new THREE.Vector3()),
            size: box.getSize(new THREE.Vector3())
        };
    }

    // Physics simulation
    update(deltaTime) {
        if (!this.settings.gravityEnabled && !this.settings.collisionDetection) {
            return;
        }

        // Update physics bodies
        this.updateBodies(deltaTime);

        // Check collisions
        if (this.settings.collisionDetection) {
            this.checkCollisions();
        }

        // Update collision pairs (for continuous collision detection)
        this.updateCollisionPairs(deltaTime);
    }

    updateBodies(deltaTime) {
        this.bodies.forEach((body, id) => {
            if (body.isStatic) return;

            // Apply forces
            this.applyForces(body, deltaTime);

            // Update velocity
            if (!body.isKinematic) {
                body.velocity.x += body.acceleration.x * deltaTime;
                body.velocity.y += body.acceleration.y * deltaTime;
                body.velocity.z += body.acceleration.z * deltaTime;

                // Apply air resistance
                if (this.settings.airResistanceEnabled) {
                    body.velocity.x *= body.drag;
                    body.velocity.y *= body.drag;
                    body.velocity.z *= body.drag;
                }

                // Limit velocity
                const speed = Math.sqrt(
                    body.velocity.x * body.velocity.x +
                    body.velocity.y * body.velocity.y +
                    body.velocity.z * body.velocity.z
                );

                if (speed > this.settings.maxVelocity) {
                    body.velocity.x = (body.velocity.x / speed) * this.settings.maxVelocity;
                    body.velocity.y = (body.velocity.y / speed) * this.settings.maxVelocity;
                    body.velocity.z = (body.velocity.z / speed) * this.settings.maxVelocity;
                }
            }

            // Update position
            if (body.object) {
                body.object.position.x += body.velocity.x * deltaTime;
                body.object.position.y += body.velocity.y * deltaTime;
                body.object.position.z += body.velocity.z * deltaTime;
            }

            // Update collider bounds if object moved
            if (this.colliders.has(id)) {
                this.colliders.get(id).bounds = this.calculateBounds(body.object);
            }
        });
    }

    applyForces(body, deltaTime) {
        if (!this.settings.gravityEnabled || body.isKinematic) return;

        // Apply gravity
        body.acceleration.y += this.world.gravity * body.mass;

        // Apply other forces can be added here
    }

    // Collision detection
    checkCollisions() {
        const bodies = Array.from(this.bodies.keys());
        const collisions = [];

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const bodyA = this.bodies.get(bodies[i]);
                const bodyB = this.bodies.get(bodies[j]);

                if (this.canCollide(bodyA, bodyB)) {
                    const collision = this.detectCollision(bodyA, bodyB);
                    if (collision) {
                        collisions.push({ bodyA, bodyB, collision });
                    }
                }
            }
        }

        // Resolve collisions
        collisions.forEach(({ bodyA, bodyB, collision }) => {
            this.resolveCollision(bodyA, bodyB, collision);
        });
    }

    // Update collision pairs for continuous collision detection
    updateCollisionPairs(deltaTime) {
        // This method would handle continuous collision detection
        // For now, it's a placeholder to prevent errors
        this.collisionPairs = [];
    }

    canCollide(bodyA, bodyB) {
        const typeA = bodyA.collisionType || 'default';
        const typeB = bodyB.collisionType || 'default';

        return this.collisionMatrix[typeA] &&
               this.collisionMatrix[typeA].includes(typeB);
    }

    detectCollision(bodyA, bodyB) {
        const colliderA = this.colliders.get(bodyA.id);
        const colliderB = this.colliders.get(bodyB.id);

        if (!colliderA || !colliderB) return null;

        // Simple AABB collision detection
        const boundsA = colliderA.bounds;
        const boundsB = colliderB.bounds;

        if (boundsA.max.x < boundsB.min.x || boundsA.min.x > boundsB.max.x) return null;
        if (boundsA.max.y < boundsB.min.y || boundsA.min.y > boundsB.max.y) return null;
        if (boundsA.max.z < boundsB.min.z || boundsA.min.z > boundsB.max.z) return null;

        // Calculate collision normal and penetration depth
        const overlapX = Math.min(boundsA.max.x, boundsB.max.x) - Math.max(boundsA.min.x, boundsB.min.x);
        const overlapY = Math.min(boundsA.max.y, boundsB.max.y) - Math.max(boundsA.min.y, boundsB.min.y);
        const overlapZ = Math.min(boundsA.max.z, boundsB.max.z) - Math.max(boundsA.min.z, boundsB.min.z);

        // Find minimum overlap axis
        let normal = { x: 0, y: 0, z: 0 };
        let depth = 0;

        if (overlapX < overlapY && overlapX < overlapZ) {
            normal.x = boundsA.min.x < boundsB.min.x ? -1 : 1;
            depth = overlapX;
        } else if (overlapY < overlapZ) {
            normal.y = boundsA.min.y < boundsB.min.y ? -1 : 1;
            depth = overlapY;
        } else {
            normal.z = boundsA.min.z < boundsB.min.z ? -1 : 1;
            depth = overlapZ;
        }

        return {
            point: boundsA.center.clone(),
            normal: normal,
            depth: depth,
            relativeVelocity: {
                x: bodyB.velocity.x - bodyA.velocity.x,
                y: bodyB.velocity.y - bodyA.velocity.y,
                z: bodyB.velocity.z - bodyA.velocity.z
            }
        };
    }

    resolveCollision(bodyA, bodyB, collision) {
        // Separate objects
        this.separateBodies(bodyA, bodyB, collision);

        // Apply collision response
        this.applyCollisionResponse(bodyA, bodyB, collision);

        // Trigger collision events
        this.triggerCollisionEvents(bodyA, bodyB, collision);
    }

    separateBodies(bodyA, bodyB, collision) {
        if (bodyA.isStatic && bodyB.isStatic) return;

        const totalMass = bodyA.mass + bodyB.mass;
        const separationDistance = collision.depth * 0.5;

        if (!bodyA.isStatic) {
            const separationA = {
                x: collision.normal.x * separationDistance * (bodyB.mass / totalMass),
                y: collision.normal.y * separationDistance * (bodyB.mass / totalMass),
                z: collision.normal.z * separationDistance * (bodyB.mass / totalMass)
            };

            if (bodyA.object) {
                bodyA.object.position.x += separationA.x;
                bodyA.object.position.y += separationA.y;
                bodyA.object.position.z += separationA.z;
            }
        }

        if (!bodyB.isStatic) {
            const separationB = {
                x: -collision.normal.x * separationDistance * (bodyA.mass / totalMass),
                y: -collision.normal.y * separationDistance * (bodyA.mass / totalMass),
                z: -collision.normal.z * separationDistance * (bodyA.mass / totalMass)
            };

            if (bodyB.object) {
                bodyB.object.position.x += separationB.x;
                bodyB.object.position.y += separationB.y;
                bodyB.object.position.z += separationB.z;
            }
        }
    }

    applyCollisionResponse(bodyA, bodyB, collision) {
        // Simple elastic collision response
        const relativeVelocity = collision.relativeVelocity;
        const normal = collision.normal;

        // Calculate relative velocity along collision normal
        const velocityAlongNormal = relativeVelocity.x * normal.x +
                                   relativeVelocity.y * normal.y +
                                   relativeVelocity.z * normal.z;

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = 0.3; // Adjust based on materials

        // Calculate impulse scalar
        const totalMass = bodyA.mass + bodyB.mass;
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / totalMass;

        // Apply impulse
        if (!bodyA.isStatic) {
            bodyA.velocity.x += impulseScalar * normal.x * bodyB.mass;
            bodyA.velocity.y += impulseScalar * normal.y * bodyB.mass;
            bodyA.velocity.z += impulseScalar * normal.z * bodyB.mass;
        }

        if (!bodyB.isStatic) {
            bodyB.velocity.x -= impulseScalar * normal.x * bodyA.mass;
            bodyB.velocity.y -= impulseScalar * normal.y * bodyA.mass;
            bodyB.velocity.z -= impulseScalar * normal.z * bodyA.mass;
        }
    }

    triggerCollisionEvents(bodyA, bodyB, collision) {
        // Trigger collision events for game logic
        const eventData = {
            bodyA: bodyA,
            bodyB: bodyB,
            collision: collision,
            normal: collision.normal,
            point: collision.point
        };

        this.gameCore.emit('physicsCollision', eventData);

        // Specific collision type events
        if (bodyA.collisionType === 'player' && bodyB.collisionType === 'coin') {
            this.gameCore.emit('coinCollision', { coin: bodyB, player: bodyA });
        } else if (bodyA.collisionType === 'player' && bodyB.collisionType === 'obstacle') {
            this.gameCore.emit('obstacleCollision', { obstacle: bodyB, player: bodyA });
        }
    }

    // Ray casting for advanced collision detection
    raycast(origin, direction, maxDistance = 100) {
        const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
        const intersects = [];

        // Check against all colliders
        this.colliders.forEach((collider, id) => {
            if (collider.object && collider.bounds) {
                // Simple ray-AABB intersection
                const intersectsAABB = raycaster.ray.intersectsBox(
                    new THREE.Box3(collider.bounds.min, collider.bounds.max)
                );

                if (intersectsAABB) {
                    intersects.push({
                        object: collider.object,
                        distance: origin.distanceTo(collider.bounds.center),
                        point: raycaster.ray.at(intersectsAABB[0]),
                        normal: new THREE.Vector3(0, 1, 0) // Simplified
                    });
                }
            }
        });

        return intersects.sort((a, b) => a.distance - b.distance);
    }

    // Constraint system (for future advanced physics)
    addConstraint(constraint) {
        // Joints, springs, etc.
        // Implementation would go here
    }

    // Ground collision handling
    handleGroundCollision(body) {
        if (body.object.position.y <= this.world.groundLevel) {
            body.object.position.y = this.world.groundLevel;
            body.velocity.y = 0;

            // Apply ground friction
            body.velocity.x *= 0.8;
            body.velocity.z *= 0.8;

            this.gameCore.emit('groundCollision', { body: body });
        }
    }

    // Debug methods
    getDebugInfo() {
        return {
            bodyCount: this.bodies.size,
            colliderCount: this.colliders.size,
            settings: this.settings,
            world: this.world,
            collisionPairs: this.collisionPairs.length
        };
    }

    // Performance methods
    optimize() {
        // Remove distant bodies from physics simulation
        const playerZ = this.gameCore.getDistance();

        this.bodies.forEach((body, id) => {
            if (body.object && body.object.position.z < playerZ - 50) {
                // Body is too far behind, remove from physics
                this.removeBody(id);
            }
        });
    }

    // Cleanup methods
    clear() {
        this.bodies.clear();
        this.colliders.clear();
        this.collisionPairs.length = 0;
    }

    destroy() {
        this.clear();
        console.log('PhysicsEngine destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
}

// Make PhysicsEngine available globally
if (typeof window !== 'undefined') {
    window.PhysicsEngine = PhysicsEngine;
}
