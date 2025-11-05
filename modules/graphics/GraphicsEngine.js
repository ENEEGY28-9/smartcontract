/**
 * GraphicsEngine - Three.js rendering and scene management
 * Handles 3D scene setup, lighting, camera, and rendering
 */

class GraphicsEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;

        this.settings = {
            width: 800,
            height: 600,
            fov: 50, // FOV tối ưu cho góc nhìn Subway Surfers - tập trung hơn
            near: 0.1,
            far: 1000,
            antialias: true,
            shadowMap: true
        };

        this.lights = {
            ambient: null,
            directional: null,
            point: []
        };

        this.postProcessing = {
            composer: null,
            passes: []
        };

        this.isInitialized = false;
        this.animationId = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('resize', Utils.debounce(() => this.onWindowResize(), 250));
    }

    initialize() {
        if (this.isInitialized) {
            console.warn('GraphicsEngine already initialized');
            return true;
        }

        try {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                throw new Error(`Container element #${this.containerId} not found`);
            }

            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupPostProcessing();

            this.clock = new THREE.Clock();
            this.isInitialized = true;

            console.log('GraphicsEngine initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize GraphicsEngine:', error);
            return false;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Set scene background
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }

    setupCamera() {
        const { width, height, fov, near, far } = this.settings;

        this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);

        // Đặt camera giống góc nhìn Subway Surfers: từ phía sau và cao hơn
        this.camera.position.set(0, 12, 18); // Tăng độ cao và khoảng cách phía sau để góc nhìn rộng hơn
        this.camera.lookAt(0, 2, -8); // Nhìn xuống phía trước để thấy đường chạy rõ hơn

        this.scene.add(this.camera);
    }

    setupRenderer() {
        const { width, height, antialias, shadowMap } = this.settings;

        this.renderer = new THREE.WebGLRenderer({ antialias });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = shadowMap;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;

        // Set clear color
        this.renderer.setClearColor(0x87CEEB, 1);

        this.container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Ambient light for general illumination
        this.lights.ambient = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.lights.ambient);

        // Main directional light (sun)
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.8);
        this.lights.directional.position.set(-50, 50, 25);
        this.lights.directional.castShadow = true;

        // Configure shadow properties
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 200;
        this.lights.directional.shadow.camera.left = -50;
        this.lights.directional.shadow.camera.right = 50;
        this.lights.directional.shadow.camera.top = 50;
        this.lights.directional.shadow.camera.bottom = -50;

        this.scene.add(this.lights.directional);

        // Point lights for accent lighting
        const pointLightColors = [0xff0040, 0x0040ff, 0x80ff80, 0xffaa00];
        for (let i = 0; i < 4; i++) {
            const pointLight = new THREE.PointLight(pointLightColors[i], 0.5, 50);
            pointLight.position.set(
                (i - 1.5) * 20,
                10,
                (Math.random() - 0.5) * 40
            );
            this.lights.point.push(pointLight);
            this.scene.add(pointLight);
        }
    }

    setupPostProcessing() {
        // Basic post-processing setup (can be extended)
        try {
            // This would require additional Three.js post-processing libraries
            // For now, we'll skip detailed post-processing setup
            console.log('Post-processing setup skipped (requires additional libraries)');
        } catch (error) {
            console.warn('Post-processing setup failed:', error);
        }
    }

    startRenderLoop() {
        if (!this.isInitialized) {
            console.error('Cannot start render loop: GraphicsEngine not initialized');
            return;
        }

        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.render();
        };

        animate();
    }

    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    render() {
        if (!this.isInitialized) return;

        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // Update camera if following player
        this.updateCamera(deltaTime);

        // Update lights
        this.updateLights(deltaTime, elapsedTime);

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // Update performance stats if available
        if (window.performanceMonitor) {
            window.performanceMonitor.update();
        }
    }

    updateCamera(deltaTime) {
        // Camera theo sát player giống góc nhìn Subway Surfers

        if (window.gameCore && window.playerController && window.playerController.player) {
            const player = window.playerController.player;
            const playerPos = player.position.clone();

            // Tính toán vị trí camera phía sau và cao hơn player - góc nhìn Subway Surfers
            const cameraOffset = {
                x: 0,           // Camera ở giữa (cùng lane với player)
                y: 12,          // Cao hơn để có góc nhìn từ trên xuống rộng hơn
                z: 18           // Ở phía sau để thấy đường chạy và vật cản phía trước
            };

            // Vị trí mục tiêu của camera
            const targetPosition = playerPos.clone();
            targetPosition.x += cameraOffset.x;
            targetPosition.y += cameraOffset.y;
            targetPosition.z += cameraOffset.z;

            // Smooth camera movement với lerp
            const lerpFactor = deltaTime * 3; // Tăng tốc độ following để mượt hơn
            this.camera.position.lerp(targetPosition, lerpFactor);

            // Camera nhìn xuống phía trước player để thấy đường chạy - góc nhìn Subway Surfers
            const lookAtTarget = playerPos.clone();
            lookAtTarget.y += 3;  // Nhìn xuống một chút so với vị trí camera
            lookAtTarget.z -= 8;  // Nhìn về phía trước xa hơn để thấy vật cản

            this.camera.lookAt(lookAtTarget);
        }
    }

    updateLights(deltaTime, elapsedTime) {
        // Animate point lights for dynamic lighting
        this.lights.point.forEach((light, index) => {
            const time = elapsedTime * 0.5;
            light.position.x += Math.sin(time + index) * 0.1;
            light.position.y = 10 + Math.sin(time * 2 + index) * 2;
        });
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        this.settings.width = width;
        this.settings.height = height;
    }

    // Object management methods
    addToScene(object) {
        if (object && object.isObject3D) {
            this.scene.add(object);
            return true;
        }
        return false;
    }

    removeFromScene(object) {
        if (object && object.isObject3D) {
            this.scene.remove(object);
            return true;
        }
        return false;
    }

    // Utility methods
    createCube(size = 1, color = 0x00ff00) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({ color });
        const cube = new THREE.Mesh(geometry, material);

        cube.castShadow = true;
        cube.receiveShadow = true;

        return cube;
    }

    createSphere(radius = 1, color = 0xff0000) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshLambertMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);

        sphere.castShadow = true;
        sphere.receiveShadow = true;

        return sphere;
    }

    createPlane(width = 10, height = 10, color = 0x90EE90) {
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshLambertMaterial({ color });
        const plane = new THREE.Mesh(geometry, material);

        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;

        return plane;
    }

    // Camera controls
    setCameraPosition(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
        }
    }

    setCameraTarget(x, y, z) {
        if (this.camera) {
            this.camera.lookAt(x, y, z);
        }
    }

    // Lighting controls
    setAmbientLight(color, intensity) {
        if (this.lights.ambient) {
            this.lights.ambient.color.setHex(color);
            this.lights.ambient.intensity = intensity;
        }
    }

    setDirectionalLight(color, intensity) {
        if (this.lights.directional) {
            this.lights.directional.color.setHex(color);
            this.lights.directional.intensity = intensity;
        }
    }

    // Environment creation
    createBasicEnvironment() {
        // Ground plane
        const ground = this.createPlane(200, 200, 0x90EE90);
        this.addToScene(ground);

        // Some basic obstacles/buildings
        for (let i = 0; i < 10; i++) {
            const building = this.createCube(
                Utils.randomBetween(2, 5),
                Math.random() * 0xffffff
            );
            building.position.set(
                Utils.randomBetween(-20, 20),
                building.geometry.parameters.height / 2,
                Utils.randomBetween(-50, 50)
            );
            this.addToScene(building);
        }

        return { ground, buildings: [] };
    }

    // Debug methods
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            scene: {
                objects: this.scene ? this.scene.children.length : 0,
                fog: this.scene ? !!this.scene.fog : false
            },
            camera: this.camera ? {
                position: this.camera.position,
                fov: this.camera.fov,
                aspect: this.camera.aspect
            } : null,
            renderer: this.renderer ? {
                size: {
                    width: this.renderer.domElement.width,
                    height: this.renderer.domElement.height
                },
                pixelRatio: this.renderer.getPixelRatio(),
                shadowMap: this.renderer.shadowMap.enabled
            } : null,
            lights: {
                ambient: !!this.lights.ambient,
                directional: !!this.lights.directional,
                point: this.lights.point.length
            }
        };
    }

    // Performance methods
    optimizeForPerformance(targetFPS) {
        const qualitySettings = Utils.getOptimalQualitySettings();

        // Adjust shadow quality
        if (this.lights.directional) {
            this.lights.directional.shadow.mapSize.width = qualitySettings.shadowQuality === 'high' ? 2048 : 1024;
            this.lights.directional.shadow.mapSize.height = qualitySettings.shadowQuality === 'high' ? 2048 : 1024;
        }

        // Adjust renderer settings
        if (this.renderer) {
            this.renderer.setPixelRatio(qualitySettings.antialiasing ? window.devicePixelRatio : 1);
        }

        console.log('Performance optimization applied for target FPS:', targetFPS);
    }

    // Cleanup methods
    dispose() {
        this.stopRenderLoop();

        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }

        this.isInitialized = false;
        console.log('GraphicsEngine disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphicsEngine;
}

// Make GraphicsEngine available globally
if (typeof window !== 'undefined') {
    window.GraphicsEngine = GraphicsEngine;
}
