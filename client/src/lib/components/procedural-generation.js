// Procedural Generation System for Endless Runner
// Implements track generation with curves and straight sections

import * as THREE from 'three';

export class ProceduralGenerator {
    constructor() {
        this.seed = Math.random() * 10000;
        this.trackSegments = [];
        this.currentDifficulty = 1;
        this.distanceTraveled = 0;
        this.lastCurveEnd = 0;
        this.curveProbability = 0.3; // 30% chance for curves
        this.minStraightLength = 3; // Minimum straight segments before curve
        this.maxStraightLength = 8; // Maximum straight segments before curve
    }

    // Simple seeded random for consistent generation
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Generate next track segment type
    generateNextSegmentType(currentZ) {
        // Increase curve probability as distance increases
        const adjustedCurveProbability = Math.min(0.7, this.curveProbability + (this.distanceTraveled / 1000) * 0.1);

        // Ensure minimum straight segments between curves
        if (currentZ - this.lastCurveEnd < this.minStraightLength * 25) {
            return 'straight';
        }

        // Random chance for curve vs straight
        const random = this.seededRandom(this.seed + currentZ * 0.01);
        return random < adjustedCurveProbability ? 'curve' : 'straight';
    }

    // Generate curve parameters
    generateCurveParams(z, segmentType) {
        if (segmentType === 'straight') {
            return {
                type: 'straight',
                length: 25,
                lanes: 3,
                curve: 0,
                startZ: z,
                endZ: z + 25
            };
        }

        // Curve parameters
        const curveDirection = Math.random() > 0.5 ? 1 : -1; // Left or right curve
        const curveIntensity = 0.5 + Math.random() * 0.8; // Curve tightness
        const curveLength = 25 + Math.random() * 15; // Curve length

        return {
            type: 'curve',
            length: curveLength,
            lanes: 3,
            curve: curveDirection * curveIntensity,
            startZ: z,
            endZ: z + curveLength,
            curveDirection: curveDirection,
            curveIntensity: curveIntensity
        };
    }

    // Generate track segment with procedural elements
    generateTrackSegment(z, segmentType = null) {
        const type = segmentType || this.generateNextSegmentType(z);
        const params = this.generateCurveParams(z, type);

        // Update tracking
        if (type === 'curve') {
            this.lastCurveEnd = z + params.length;
        }
        this.distanceTraveled = Math.max(this.distanceTraveled, z);

        return {
            id: `segment_${z}_${Date.now()}`,
            z: z,
            type: type,
            params: params,
            obstacles: [],
            pickups: [],
            decorations: [],
            generated: false
        };
    }

    // Generate obstacles for a track segment
    generateObstaclesForSegment(segment) {
        const obstacles = [];
        const { type, params, z } = segment;

        // Base obstacle spawn rate based on difficulty
        let baseSpawnRate = 0.15 + (this.currentDifficulty * 0.05);

        // Increase spawn rate for curves (more challenging)
        if (type === 'curve') {
            baseSpawnRate *= 1.5;
        }

        // Generate obstacles
        for (let lane = 0; lane < params.lanes; lane++) {
            if (Math.random() < baseSpawnRate) {
                const obstacleZ = z + (Math.random() * params.length);

                // Random obstacle type with weights
                const obstacleTypes = [
                    { type: 'train', weight: 0.3 },
                    { type: 'wall', weight: 0.25 },
                    { type: 'gap', weight: 0.2 },
                    { type: 'low_barrier', weight: 0.15 },
                    { type: 'spike', weight: 0.1 }
                ];

                let random = Math.random();
                let selectedType = 'wall'; // default

                for (const obstacleType of obstacleTypes) {
                    random -= obstacleType.weight;
                    if (random <= 0) {
                        selectedType = obstacleType.type;
                        break;
                    }
                }

                obstacles.push({
                    id: `obstacle_${z}_${lane}_${Date.now()}`,
                    type: selectedType,
                    lane: lane,
                    z: obstacleZ,
                    x: this.getLaneX(lane),
                    width: this.getObstacleWidth(selectedType),
                    height: this.getObstacleHeight(selectedType),
                    speed: this.getObstacleSpeed(selectedType),
                    moving: this.isMovingObstacle(selectedType)
                });
            }
        }

        return obstacles;
    }

    // Generate pickups for a track segment
    generatePickupsForSegment(segment) {
        const pickups = [];
        const { z, params } = segment;

        // Pickup spawn rate (lower than obstacles)
        const pickupSpawnRate = 0.08 + (this.currentDifficulty * 0.02);

        for (let lane = 0; lane < params.lanes; lane++) {
            if (Math.random() < pickupSpawnRate) {
                const pickupZ = z + 5 + (Math.random() * (params.length - 10));

                pickups.push({
                    id: `pickup_${z}_${lane}_${Date.now()}`,
                    type: 'coin',
                    lane: lane,
                    z: pickupZ,
                    x: this.getLaneX(lane),
                    value: 100,
                    floating: true
                });
            }
        }

        return pickups;
    }

    // Get lane X position
    getLaneX(laneIndex) {
        const lanes = [-4, 0, 4]; // Standard 3-lane setup
        return lanes[laneIndex] || 0;
    }

    // Get obstacle dimensions
    getObstacleWidth(obstacleType) {
        const widths = {
            'train': 8,
            'wall': 2,
            'gap': 6,
            'low_barrier': 3,
            'spike': 1
        };
        return widths[obstacleType] || 2;
    }

    getObstacleHeight(obstacleType) {
        const heights = {
            'train': 3,
            'wall': 4,
            'gap': 0,
            'low_barrier': 1.5,
            'spike': 2
        };
        return heights[obstacleType] || 2;
    }

    getObstacleSpeed(obstacleType) {
        const speeds = {
            'train': 2 + Math.random() * 3, // Moving trains
            'wall': 0,
            'gap': 0,
            'low_barrier': 0,
            'spike': 0
        };
        return speeds[obstacleType] || 0;
    }

    isMovingObstacle(obstacleType) {
        return obstacleType === 'train';
    }

    // Update difficulty based on distance
    updateDifficulty(distance) {
        this.distanceTraveled = distance;
        const newDifficulty = 1 + Math.floor(distance / 200); // Increase every 200 units

        if (newDifficulty !== this.currentDifficulty) {
            this.currentDifficulty = newDifficulty;
            console.log(`🎯 Difficulty increased to ${this.currentDifficulty}`);
        }
    }

    // Generate multiple segments ahead of player
    generateSegmentsAhead(playerZ, segmentsNeeded = 10) {
        const segments = [];
        let currentZ = playerZ;

        console.log(`🔧 Generating ${segmentsNeeded} segments ahead starting from z=${playerZ}`);
        console.log(`🔍 Segment length: ${this.segmentLength}`);

        for (let i = 0; i < segmentsNeeded; i++) {
            const segment = this.generateTrackSegment(currentZ);
            segment.obstacles = this.generateObstaclesForSegment(segment);
            segment.pickups = this.generatePickupsForSegment(segment);
            segment.generated = true;

            segments.push(segment);
            currentZ += segment.params.length; // Use actual segment length for proper spacing

            console.log(`  📦 Segment ${i}: z=${segment.z}, type=${segment.type}, length=${segment.params.length}, currentZ=${currentZ}`);
        }

        console.log(`✅ Generated ${segments.length} segments`);
        console.log(`🔍 Final currentZ: ${currentZ}`);
        return segments;
    }
}

// Enhanced Track Segment Manager for optimal performance
export class TrackSegmentManager {
    constructor(scene) {
        this.scene = scene;
        this.activeSegments = [];
        this.segmentPool = [];
        this.obstaclePool = [];
        this.pickupPool = [];
        this.maxActiveSegments = 120; // Tăng để giữ nhiều segments hơn cho track liên tục và tránh mất map
        this.segmentLength = 25;
        this.poolSize = 300; // Tăng pool size để có đủ segments cho việc tạo segments bao quanh player

        this.initializePools();
    }

    // Create reusable segment mesh
    createSegmentMesh(segmentLength = 25) {
        const group = new THREE.Group();

        // Ground plane - Subway Surfers style
        const groundGeometry = new THREE.PlaneGeometry(20, segmentLength);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF6B35, // Orange neon như trong createProceduralTrackSegment
            emissive: 0xFF6B35,
            emissiveIntensity: 0.25,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.2, segmentLength / 2);
        ground.receiveShadow = true;
        group.add(ground);

        // Subway Surfers-style lane markers
        const extendedLanes = [-4, 0, 4]; // Standard 3-lane positions
        for (let i = 0; i < extendedLanes.length; i++) {
            const laneMarkerGeometry = new THREE.BoxGeometry(0.8, 0.3, segmentLength);
            const laneMarkerMaterial = new THREE.MeshStandardMaterial({
                color: 0x4ECDC4, // Cyan neon
                emissive: 0x4ECDC4,
                emissiveIntensity: 0.4,
                roughness: 0.3,
                metalness: 0.3
            });
            const laneMarker = new THREE.Mesh(laneMarkerGeometry, laneMarkerMaterial);
            laneMarker.position.set(extendedLanes[i], 0.15, segmentLength / 2);
            laneMarker.castShadow = true;
            group.add(laneMarker);
        }

        // Subway Surfers-style side barriers - MUCH SMALLER for better visibility
        const barrierGeometry = new THREE.BoxGeometry(0.5, 1, segmentLength);
        const barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A148C, // Darker purple, less distracting
            emissive: 0x1A0033,
            emissiveIntensity: 0.1,
            roughness: 0.6,
            metalness: 0.1
        });

        const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        leftBarrier.position.set(-11, 0.5, segmentLength / 2);
        leftBarrier.castShadow = true;
        leftBarrier.receiveShadow = true;
        group.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        rightBarrier.position.set(11, 0.5, segmentLength / 2);
        rightBarrier.castShadow = true;
        rightBarrier.receiveShadow = true;
        group.add(rightBarrier);

        return group;
    }

    // Create reusable obstacle mesh
    createObstacleMesh() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        return new THREE.Mesh(geometry, material);
    }

    // Create reusable pickup mesh
    createPickupMesh() {
        const geometry = new THREE.OctahedronGeometry(0.6, 1);
        const material = new THREE.MeshLambertMaterial({
            color: 0xffd700,
            emissive: 0x442200,
            emissiveIntensity: 0.3
        });
        return new THREE.Mesh(geometry, material);
    }

    // Initialize object pools for better performance
    initializePools() {
        // Create segment pool - use maximum segment length (40) for all segments
        for (let i = 0; i < this.poolSize; i++) {
            const segment = this.createSegmentMesh(40); // Maximum segment length
            segment.visible = false;
            this.segmentPool.push(segment);
            this.scene.add(segment);
        }

        // Create obstacle pool
        for (let i = 0; i < this.poolSize * 3; i++) { // Tăng số obstacles
            const obstacle = this.createObstacleMesh();
            obstacle.visible = false;
            this.obstaclePool.push(obstacle);
            this.scene.add(obstacle);
        }

        // Create pickup pool
        for (let i = 0; i < this.poolSize * 2; i++) { // Tăng số pickups
            const pickup = this.createPickupMesh();
            pickup.visible = false;
            this.pickupPool.push(pickup);
            this.scene.add(pickup);
        }

        console.log(`✅ Initialized pools: ${this.segmentPool.length} segments, ${this.obstaclePool.length} obstacles, ${this.pickupPool.length} pickups`);
    }

    // Get pooled segment
    getPooledSegment() {
        const segment = this.segmentPool.find(s => !s.visible);
        if (segment) {
            segment.visible = true;
            console.log(`🔄 Got pooled segment from pool. Pool size: ${this.segmentPool.length}, available: ${this.segmentPool.filter(s => !s.visible).length}`);
            return segment;
        }

        // Nếu không có segment trong pool, tạo thêm
        console.warn(`⚠️ Pool segments cạn kiệt! Tạo thêm segments...`);
        this.expandPool();

        const newSegment = this.segmentPool.find(s => !s.visible);
        if (newSegment) {
            newSegment.visible = true;
            console.log(`✅ Đã tạo thêm segment từ pool mở rộng`);
            return newSegment;
        }

        console.error(`❌ Vẫn không có segment khả dụng sau khi mở rộng pool! Pool size: ${this.segmentPool.length}`);
        return null;
    }

    // Expand segment pool when needed
    expandPool() {
        const expandSize = 50;
        console.log(`📈 Mở rộng pool thêm ${expandSize} segments`);

        for (let i = 0; i < expandSize; i++) {
            const segment = this.createSegmentMesh(40);
            segment.visible = false;
            this.segmentPool.push(segment);
            this.scene.add(segment);
        }
    }

    // Get pooled obstacle
    getPooledObstacle() {
        const obstacle = this.obstaclePool.find(o => !o.visible);
        if (obstacle) {
            obstacle.visible = true;
            return obstacle;
        }
        return null;
    }

    // Get pooled pickup
    getPooledPickup() {
        const pickup = this.pickupPool.find(p => !p.visible);
        if (pickup) {
            pickup.visible = true;
            return pickup;
        }
        return null;
    }

    // Return segment to pool
    returnSegmentToPool(segment) {
        if (segment && segment.parent) {
            this.scene.remove(segment);
        }
        segment.visible = false;
        segment.position.set(0, 0, 0);
        segment.children.forEach(child => {
            if (child.position) child.position.set(0, 0, 0);
        });
        // Đặt lại các thuộc tính để tránh lỗi
        segment.userData = {};
        this.segmentPool.push(segment);
    }

    // Return obstacle to pool
    returnObstacleToPool(obstacle) {
        if (obstacle.parent) obstacle.parent.remove(obstacle);
        obstacle.visible = false;
        obstacle.position.set(0, 0, 0);
        this.obstaclePool.push(obstacle);
    }

    // Return pickup to pool
    returnPickupToPool(pickup) {
        if (pickup.parent) pickup.parent.remove(pickup);
        pickup.visible = false;
        pickup.position.set(0, 0, 0);
        this.pickupPool.push(pickup);
    }

    // Update active segments with efficient pooling
    updateSegments(playerZ, generator) {
        // Sort segments by Z position to ensure correct order
        this.activeSegments.sort((a, b) => a.z - b.z);

        // Remove segments that are too far behind (performance optimization)
        const segmentsToKeep = this.maxActiveSegments * 0.7; // Giảm từ 90% xuống 70% để giữ nhiều segments hơn phía sau
        const cutoffZ = playerZ - (segmentsToKeep * this.segmentLength);

        this.activeSegments = this.activeSegments.filter(segmentData => {
            if (segmentData.z < cutoffZ) {
                this.cleanupSegment(segmentData);
                return false;
            }
            return true;
        });

        // Add new segments ahead if needed - ĐẢM BẢO LUÔN CÓ ĐỦ SEGMENTS PHÍA TRƯỚC
        let lastSegmentZ = this.activeSegments.length > 0
            ? this.activeSegments[this.activeSegments.length - 1].z + this.activeSegments[this.activeSegments.length - 1].params.length
            : playerZ - this.segmentLength; // Start one segment behind player

        // Tính toán số segments cần thiết dựa trên khoảng cách từ player đến segments cuối cùng
        const distanceToLastSegment = Math.abs(lastSegmentZ - playerZ);
        const segmentsNeeded = Math.ceil(distanceToLastSegment / this.segmentLength) + 10; // Luôn tạo thêm 10 segments dự phòng
        const finalSegmentsNeeded = Math.min(segmentsNeeded, this.maxActiveSegments - this.activeSegments.length);

        for (let i = 0; i < finalSegmentsNeeded; i++) {
            const segmentData = generator.generateTrackSegment(lastSegmentZ);
            const visualSegment = this.getPooledSegment();

            console.log(`🏗️ Creating new segment ${i}: z=${lastSegmentZ}, type=${segmentData.type}`);
            console.log(`🔍 Pool info before getPooledSegment: available: ${this.segmentPool.filter(s => !s.visible).length}`);

            if (visualSegment) {
                visualSegment.position.set(0, 0, lastSegmentZ); // Đặt ở đầu segment để nhất quán với game loop
                this.scene.add(visualSegment); // Add segment to scene
                console.log(`✅ Got pooled segment for new segment at z=${lastSegmentZ}`);
                console.log(`🔍 New segment position: ${visualSegment.position.x}, ${visualSegment.position.y}, ${visualSegment.position.z}`);
                console.log(`🔍 New segment visible: ${visualSegment.visible}`);
                console.log(`🔍 New segment children count: ${visualSegment.children.length}`);

                // Update lastSegmentZ for next segment using actual segment length
                lastSegmentZ += segmentData.params.length;

                // Add obstacles using pooling
                if (segmentData.obstacles && segmentData.obstacles.length > 0) {
                    segmentData.obstacles.forEach(obstacleData => {
                        const obstacle = this.getPooledObstacle();
                        if (obstacle) {
                            this.setupObstacleMesh(obstacle, obstacleData);
                            visualSegment.add(obstacle);
                        }
                    });
                }

                // Add pickups using pooling
                if (segmentData.pickups && segmentData.pickups.length > 0) {
                    segmentData.pickups.forEach(pickupData => {
                        const pickup = this.getPooledPickup();
                        if (pickup) {
                            this.setupPickupMesh(pickup, pickupData);
                            visualSegment.add(pickup);
                        }
                    });
                }

                this.activeSegments.push({
                    ...segmentData,
                    visualElement: visualSegment,
                    pooledObstacles: segmentData.obstacles || [],
                    pooledPickups: segmentData.pickups || []
                });

                console.log(`✅ Added new segment to activeSegments. Total segments: ${this.activeSegments.length}`);
            } else {
                console.error(`❌ Failed to get pooled segment for new segment at z=${lastSegmentZ}`);
            }
        }

        console.log(`🏁 Finished creating segments. Total active segments: ${this.activeSegments.length}`);
    }

    // Setup obstacle mesh with data
    setupObstacleMesh(mesh, obstacleData) {
        mesh.position.set(obstacleData.x, obstacleData.height / 2, obstacleData.z);
        mesh.scale.set(obstacleData.width / 2, obstacleData.height / 2, 1);
        mesh.userData = {
            type: 'obstacle',
            obstacleType: obstacleData.type,
            lane: obstacleData.lane,
            segmentId: obstacleData.segmentId
        };
    }

    // Setup pickup mesh with data
    setupPickupMesh(mesh, pickupData) {
        mesh.position.set(pickupData.x, 1.5, pickupData.z);
        mesh.userData = {
            type: 'pickup',
            value: pickupData.value,
            startTime: Date.now(),
            floating: pickupData.floating
        };
    }

    // Create initial segment (for game startup)
    createInitialSegment(segment, generator) {
        console.log(`🎨 Creating initial segment at z=${segment.z}, type=${segment.type}`);
        console.log(`🔍 Pool info: ${this.segmentPool.length} segments, available: ${this.segmentPool.filter(s => !s.visible).length}`);

        const visualSegment = this.getPooledSegment();
        if (visualSegment) {
            visualSegment.position.set(0, 0, segment.z); // Đặt ở đầu segment
            this.scene.add(visualSegment); // Add segment to scene
            console.log(`✅ Got pooled segment, position set to z=${segment.z}, visible: ${visualSegment.visible}`);
            console.log(`🔍 Segment children count: ${visualSegment.children.length}`);
            console.log(`🔍 Segment position after adding to scene: ${visualSegment.position.x}, ${visualSegment.position.y}, ${visualSegment.position.z}`);

            // Add obstacles using pooling
            if (segment.obstacles && segment.obstacles.length > 0) {
                console.log(`🧱 Adding ${segment.obstacles.length} obstacles to segment`);
                segment.obstacles.forEach(obstacleData => {
                    const obstacle = this.getPooledObstacle();
                    if (obstacle) {
                        this.setupObstacleMesh(obstacle, obstacleData);
                        visualSegment.add(obstacle);
                    }
                });
            }

            // Add pickups using pooling
            if (segment.pickups && segment.pickups.length > 0) {
                console.log(`🪙 Adding ${segment.pickups.length} pickups to segment`);
                segment.pickups.forEach(pickupData => {
                    const pickup = this.getPooledPickup();
                    if (pickup) {
                        this.setupPickupMesh(pickup, pickupData);
                        visualSegment.add(pickup);
                    }
                });
            }

            this.activeSegments.push({
                ...segment,
                visualElement: visualSegment,
                pooledObstacles: segment.obstacles || [],
                pooledPickups: segment.pickups || []
            });

            console.log(`✅ Initial segment created and added to activeSegments. Total segments: ${this.activeSegments.length}`);
            console.log(`🔍 Added segment with visual element visible: ${visualSegment.visible}, position: ${visualSegment.position.z}`);
        } else {
            console.error(`❌ Failed to get pooled segment for initial segment at z=${segment.z}`);
            console.error(`🔍 Available segments in pool: ${this.segmentPool.filter(s => !s.visible).length}/${this.segmentPool.length}`);
        }
    }

    // Clean up segment and return objects to pools
    cleanupSegment(segmentData) {
        if (segmentData.visualElement) {
            // Return obstacles to pool
            if (segmentData.pooledObstacles) {
                segmentData.pooledObstacles.forEach(() => {
                    const obstacle = segmentData.visualElement.children.find(
                        child => child.userData && child.userData.type === 'obstacle'
                    );
                    if (obstacle) {
                        segmentData.visualElement.remove(obstacle);
                        this.returnObstacleToPool(obstacle);
                    }
                });
            }

            // Return pickups to pool
            if (segmentData.pooledPickups) {
                segmentData.pooledPickups.forEach(() => {
                    const pickup = segmentData.visualElement.children.find(
                        child => child.userData && child.userData.type === 'pickup'
                    );
                    if (pickup) {
                        segmentData.visualElement.remove(pickup);
                        this.returnPickupToPool(pickup);
                    }
                });
            }

            // Return segment to pool
            this.returnSegmentToPool(segmentData.visualElement);
        }
    }

    // Get all visible obstacles for collision detection
    getVisibleObstacles() {
        const obstacles = [];
        this.activeSegments.forEach(segment => {
            if (segment.visualElement) {
                segment.visualElement.children.forEach(child => {
                    if (child.userData && child.userData.type === 'obstacle') {
                        obstacles.push(child);
                    }
                });
            }
        });
        return obstacles;
    }

    // Get all visible pickups for collision detection
    getVisiblePickups() {
        const pickups = [];
        this.activeSegments.forEach(segment => {
            if (segment.visualElement) {
                segment.visualElement.children.forEach(child => {
                    if (child.userData && child.userData.type === 'pickup') {
                        pickups.push(child);
                    }
                });
            }
        });
        return pickups;
    }
}
