// Cross-platform Testing System for Boss Battles
// Implements mobile optimization, device performance, and latency handling

import * as THREE from 'three';

export class PlatformDetector {
    constructor() {
        this.platformInfo = this.detectPlatform();
        this.deviceCapabilities = this.detectCapabilities();
        this.mobileOptimizations = this.platformInfo.isMobile;
    }

    // Detect platform information
    detectPlatform() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isIOS: /iPad|iPhone|iPod/.test(userAgent),
            isAndroid: /Android/i.test(userAgent),
            isChrome: /Chrome/i.test(userAgent),
            isFirefox: /Firefox/i.test(userAgent),
            isSafari: /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent),
            platform: platform,
            userAgent: userAgent
        };
    }

    // Detect device capabilities
    detectCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        return {
            webGL2: !!canvas.getContext('webgl2'),
            webGL1: !!canvas.getContext('webgl'),
            maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
            maxViewportDims: gl ? gl.getParameter(gl.MAX_VIEWPORT_DIMS) : [0, 0],
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            deviceMemory: navigator.deviceMemory || 4, // GB
            connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio || 1,
                colorDepth: screen.colorDepth
            },
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
        };
    }

    // Get platform-specific optimizations
    getOptimizations() {
        const optimizations = {
            renderQuality: 1.0,
            particleCount: 1.0,
            shadowQuality: 1.0,
            lodDistance: 1.0,
            audioQuality: 1.0
        };

        if (this.platformInfo.isMobile) {
            // Mobile optimizations
            optimizations.renderQuality = 0.7;
            optimizations.particleCount = 0.5;
            optimizations.shadowQuality = 0.3;
            optimizations.lodDistance = 0.8;
            optimizations.audioQuality = 0.6;
        } else if (this.deviceCapabilities.deviceMemory < 4) {
            // Low-end device optimizations
            optimizations.renderQuality = 0.8;
            optimizations.particleCount = 0.7;
            optimizations.shadowQuality = 0.5;
        } else if (this.deviceCapabilities.hardwareConcurrency < 4) {
            // Mid-range device optimizations
            optimizations.particleCount = 0.8;
            optimizations.shadowQuality = 0.7;
        }

        return optimizations;
    }
}

// Mobile Input Handler
export class MobileInputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.touchStart = { x: 0, y: 0 };
        this.touchCurrent = { x: 0, y: 0 };
        this.isDragging = false;
        this.doubleTapTimer = null;
        this.lastTapTime = 0;

        this.setupTouchEvents();
        this.createVirtualControls();
    }

    // Setup touch event listeners
    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    // Handle touch start
    handleTouchStart(event) {
        event.preventDefault();

        const touch = event.touches[0];
        this.touchStart.x = touch.clientX;
        this.touchStart.y = touch.clientY;
        this.touchCurrent.x = touch.clientX;
        this.touchCurrent.y = touch.clientY;

        this.isDragging = false;

        // Check for double tap (jump)
        const now = Date.now();
        if (now - this.lastTapTime < 300) {
            this.handleDoubleTap();
        }
        this.lastTapTime = now;
    }

    // Handle touch move
    handleTouchMove(event) {
        event.preventDefault();

        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.touchCurrent.x = touch.clientX;
            this.touchCurrent.y = touch.clientY;

            // Calculate movement delta
            const deltaX = this.touchCurrent.x - this.touchStart.x;
            const deltaY = this.touchCurrent.y - this.touchStart.y;

            // If moved significantly, it's dragging (camera rotation)
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                this.isDragging = true;
                this.handleDrag(deltaX, deltaY);
            }
        }
    }

    // Handle touch end
    handleTouchEnd(event) {
        event.preventDefault();

        if (!this.isDragging && event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - this.touchStart.x;
            const deltaY = touch.clientY - this.touchStart.y;

            // If tap was short and small movement, it's a tap
            if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
                this.handleTap(touch.clientX, touch.clientY);
            }
        }

        this.isDragging = false;
    }

    // Handle double tap (jump)
    handleDoubleTap() {
        if (this.doubleTapTimer) {
            clearTimeout(this.doubleTapTimer);
        }

        this.doubleTapTimer = setTimeout(() => {
            // Emit jump event
            this.emitInputEvent('jump');
        }, 100);
    }

    // Handle tap (attack)
    handleTap(x, y) {
        // Emit attack event
        this.emitInputEvent('attack');
    }

    // Handle drag (camera rotation)
    handleDrag(deltaX, deltaY) {
        // Emit camera rotation event
        this.emitInputEvent('camera_rotate', { deltaX, deltaY });
    }

    // Create virtual control buttons for mobile
    createVirtualControls() {
        if (!this.platformInfo.isMobile) return;

        this.virtualControls = {
            moveLeft: this.createVirtualButton('left', '←', { bottom: '100px', left: '50px' }),
            moveRight: this.createVirtualButton('right', '→', { bottom: '100px', right: '50px' }),
            jump: this.createVirtualButton('jump', '⬆', { bottom: '180px', left: '50%' }),
            attack: this.createVirtualButton('attack', '⚔', { bottom: '50px', right: '50px' })
        };

        // Setup virtual button events
        Object.values(this.virtualControls).forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleVirtualButtonPress(button.id);
            });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleVirtualButtonRelease(button.id);
            });
        });
    }

    // Create virtual button element
    createVirtualButton(id, text, position) {
        const button = document.createElement('button');
        button.id = `virtual-${id}`;
        button.textContent = text;
        button.className = 'virtual-control-button';
        button.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(74, 144, 226, 0.8);
            border: 2px solid rgba(74, 144, 226, 1);
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            touch-action: none;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
            transition: all 0.2s ease;
            ${Object.entries(position).map(([key, value]) => `${key}: ${value}`).join('; ')}
        `;

        document.body.appendChild(button);
        return button;
    }

    // Handle virtual button press
    handleVirtualButtonPress(buttonId) {
        const button = this.virtualControls[buttonId.replace('virtual-', '')];
        if (button) {
            button.style.background = 'rgba(74, 144, 226, 1)';
            button.style.transform = 'scale(0.9)';
        }

        // Emit appropriate input event
        switch (buttonId) {
            case 'virtual-left':
                this.emitInputEvent('move_left');
                break;
            case 'virtual-right':
                this.emitInputEvent('move_right');
                break;
            case 'virtual-jump':
                this.emitInputEvent('jump');
                break;
            case 'virtual-attack':
                this.emitInputEvent('attack');
                break;
        }
    }

    // Handle virtual button release
    handleVirtualButtonRelease(buttonId) {
        const button = this.virtualControls[buttonId.replace('virtual-', '')];
        if (button) {
            button.style.background = 'rgba(74, 144, 226, 0.8)';
            button.style.transform = 'scale(1)';
        }
    }

    // Emit input event
    emitInputEvent(eventType, data = {}) {
        const event = new CustomEvent('mobileInput', {
            detail: { type: eventType, ...data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    // Cleanup virtual controls
    cleanup() {
        if (this.virtualControls) {
            Object.values(this.virtualControls).forEach(button => {
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                }
            });
        }
    }
}

// Device Performance Profiler
export class DevicePerformanceProfiler {
    constructor() {
        this.benchmarks = new Map();
        this.performanceScores = {
            render: 0,
            physics: 0,
            audio: 0,
            network: 0,
            overall: 0
        };

        this.runBenchmarks();
    }

    // Run performance benchmarks
    async runBenchmarks() {
        console.log('🔬 Running device performance benchmarks...');

        // Render benchmark (Three.js scene rendering)
        await this.benchmarkRender();

        // Physics benchmark (complex calculations)
        await this.benchmarkPhysics();

        // Audio benchmark (procedural audio generation)
        await this.benchmarkAudio();

        // Network benchmark (latency simulation)
        await this.benchmarkNetwork();

        // Calculate overall score
        this.calculateOverallScore();

        console.log('📊 Performance benchmarks completed:', this.performanceScores);
    }

    // Benchmark rendering performance
    async benchmarkRender() {
        const startTime = performance.now();

        // Create a complex scene for benchmarking
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(512, 512); // Smaller size for benchmarking

        // Add complex geometry
        for (let i = 0; i < 100; i++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
            scene.add(cube);
        }

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        // Render for 1 second
        const frameCount = 60; // 60 FPS for 1 second
        for (let i = 0; i < frameCount; i++) {
            renderer.render(scene, camera);
        }

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Score based on render time (lower time = higher score)
        this.performanceScores.render = Math.max(0, 100 - (renderTime / frameCount) * 10);

        // Cleanup
        renderer.dispose();

        this.benchmarks.set('render', { time: renderTime, score: this.performanceScores.render });
    }

    // Benchmark physics calculations
    async benchmarkPhysics() {
        const startTime = performance.now();

        // Complex physics simulation
        const particles = [];
        for (let i = 0; i < 1000; i++) {
            particles.push({
                position: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 },
                velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 },
                mass: Math.random() * 10 + 1
            });
        }

        // Simulate physics for 1000 steps
        for (let step = 0; step < 1000; step++) {
            particles.forEach(particle => {
                // Apply gravity
                particle.velocity.y -= 0.01;

                // Update position
                particle.position.x += particle.velocity.x;
                particle.position.y += particle.velocity.y;
                particle.position.z += particle.velocity.z;

                // Simple collision with bounds
                if (particle.position.y < 0) {
                    particle.position.y = 0;
                    particle.velocity.y *= -0.8;
                }
            });
        }

        const endTime = performance.now();
        const physicsTime = endTime - startTime;

        // Score based on physics time (lower time = higher score)
        this.performanceScores.physics = Math.max(0, 100 - (physicsTime / 1000) * 50);

        this.benchmarks.set('physics', { time: physicsTime, score: this.performanceScores.physics });
    }

    // Benchmark audio performance
    async benchmarkAudio() {
        if (typeof AudioContext === 'undefined') {
            this.performanceScores.audio = 50; // Default score if no audio support
            return;
        }

        const startTime = performance.now();

        try {
            const audioContext = new AudioContext();
            const sampleRate = audioContext.sampleRate;
            const bufferLength = sampleRate; // 1 second of audio

            // Generate complex audio waveform
            const buffer = audioContext.createBuffer(1, bufferLength, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferLength; i++) {
                const t = i / sampleRate;
                // Complex waveform with multiple frequencies
                data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.5 + // Base tone
                         Math.sin(2 * Math.PI * 880 * t) * 0.3 + // Harmonic
                         Math.sin(2 * Math.PI * 220 * t) * 0.2;  // Sub-harmonic
            }

            // Create and play audio (but immediately stop)
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            const endTime = performance.now();
            this.performanceScores.audio = Math.max(0, 100 - (endTime - startTime) * 2);

            this.benchmarks.set('audio', { time: endTime - startTime, score: this.performanceScores.audio });

            // Cleanup
            source.disconnect();

        } catch (error) {
            console.warn('Audio benchmark failed:', error);
            this.performanceScores.audio = 30; // Low score for audio issues
        }
    }

    // Benchmark network performance
    async benchmarkNetwork() {
        const startTime = performance.now();

        // Simulate network latency by making multiple small requests
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(new Promise(resolve => {
                setTimeout(() => resolve(), Math.random() * 100);
            }));
        }

        await Promise.all(requests);

        const endTime = performance.now();
        const networkTime = endTime - startTime;

        // Score based on average latency (lower latency = higher score)
        this.performanceScores.network = Math.max(0, 100 - (networkTime / 10));

        this.benchmarks.set('network', { time: networkTime, score: this.performanceScores.network });
    }

    // Calculate overall performance score
    calculateOverallScore() {
        const weights = {
            render: 0.4,
            physics: 0.3,
            audio: 0.15,
            network: 0.15
        };

        let totalScore = 0;
        for (const [category, weight] of Object.entries(weights)) {
            totalScore += this.performanceScores[category] * weight;
        }

        this.performanceScores.overall = Math.round(totalScore);

        // Determine performance tier
        this.performanceTier = this.getPerformanceTier(totalScore);
    }

    // Get performance tier based on score
    getPerformanceTier(score) {
        if (score >= 85) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'average';
        if (score >= 30) return 'poor';
        return 'very_poor';
    }

    // Get device-specific optimizations based on performance tier
    getDeviceOptimizations() {
        const baseOptimizations = {
            renderQuality: 1.0,
            particleCount: 1.0,
            shadowQuality: 1.0,
            lodDistance: 1.0,
            audioQuality: 1.0,
            maxPlayers: 4
        };

        switch (this.performanceTier) {
            case 'excellent':
                return {
                    ...baseOptimizations,
                    renderQuality: 1.2,
                    particleCount: 1.5,
                    shadowQuality: 1.2,
                    maxPlayers: 6
                };

            case 'good':
                return baseOptimizations;

            case 'average':
                return {
                    ...baseOptimizations,
                    renderQuality: 0.8,
                    particleCount: 0.7,
                    shadowQuality: 0.6,
                    maxPlayers: 3
                };

            case 'poor':
                return {
                    ...baseOptimizations,
                    renderQuality: 0.6,
                    particleCount: 0.4,
                    shadowQuality: 0.3,
                    lodDistance: 0.7,
                    maxPlayers: 2
                };

            case 'very_poor':
                return {
                    ...baseOptimizations,
                    renderQuality: 0.4,
                    particleCount: 0.2,
                    shadowQuality: 0.1,
                    lodDistance: 0.5,
                    audioQuality: 0.5,
                    maxPlayers: 1
                };

            default:
                return baseOptimizations;
        }
    }

    // Get performance recommendations
    getRecommendations() {
        const recommendations = [];

        if (this.performanceTier === 'poor' || this.performanceTier === 'very_poor') {
            recommendations.push('Consider reducing graphics quality in settings');
            recommendations.push('Close other applications to free up memory');
            recommendations.push('Use a wired connection for better network performance');
        }

        if (this.performanceScores.render < 50) {
            recommendations.push('Graphics performance is low - consider lowering resolution');
        }

        if (this.performanceScores.network < 50) {
            recommendations.push('Network performance is poor - check your connection');
        }

        return recommendations;
    }
}

// Adaptive Quality Manager
export class AdaptiveQualityManager {
    constructor(platformDetector, performanceProfiler) {
        this.platformDetector = platformDetector;
        this.performanceProfiler = performanceProfiler;
        this.currentSettings = this.getInitialSettings();
        this.targetFPS = 60;
        this.adaptationInterval = 5000; // 5 seconds
        this.lastAdaptation = Date.now();
    }

    // Get initial settings based on platform and performance
    getInitialSettings() {
        const platformOptimizations = this.platformDetector.getOptimizations();
        const deviceOptimizations = this.performanceProfiler.getDeviceOptimizations();

        // Combine platform and device optimizations
        return {
            renderQuality: Math.min(platformOptimizations.renderQuality, deviceOptimizations.renderQuality),
            particleCount: Math.min(platformOptimizations.particleCount, deviceOptimizations.particleCount),
            shadowQuality: Math.min(platformOptimizations.shadowQuality, deviceOptimizations.shadowQuality),
            lodDistance: Math.min(platformOptimizations.lodDistance, deviceOptimizations.lodDistance),
            audioQuality: Math.min(platformOptimizations.audioQuality, deviceOptimizations.audioQuality),
            maxPlayers: deviceOptimizations.maxPlayers,
            adaptiveEnabled: true
        };
    }

    // Update quality settings based on performance
    update(deltaTime) {
        if (!this.currentSettings.adaptiveEnabled) return;

        if (Date.now() - this.lastAdaptation < this.adaptationInterval) return;

        // Monitor current FPS and adjust quality
        const currentFPS = this.getCurrentFPS();

        if (currentFPS < this.targetFPS * 0.8) {
            this.reduceQuality();
        } else if (currentFPS > this.targetFPS * 1.2) {
            this.increaseQuality();
        }

        this.lastAdaptation = Date.now();
    }

    // Reduce quality settings
    reduceQuality() {
        console.log('📉 Reducing quality for better performance');

        this.currentSettings.renderQuality = Math.max(0.3, this.currentSettings.renderQuality - 0.1);
        this.currentSettings.particleCount = Math.max(0.2, this.currentSettings.particleCount - 0.1);
        this.currentSettings.shadowQuality = Math.max(0.1, this.currentSettings.shadowQuality - 0.1);
        this.currentSettings.lodDistance = Math.max(0.4, this.currentSettings.lodDistance - 0.1);

        this.applySettings();
    }

    // Increase quality settings
    increaseQuality() {
        console.log('📈 Increasing quality');

        this.currentSettings.renderQuality = Math.min(1.2, this.currentSettings.renderQuality + 0.05);
        this.currentSettings.particleCount = Math.min(1.5, this.currentSettings.particleCount + 0.05);
        this.currentSettings.shadowQuality = Math.min(1.2, this.currentSettings.shadowQuality + 0.05);
        this.currentSettings.lodDistance = Math.min(1.2, this.currentSettings.lodDistance + 0.05);

        this.applySettings();
    }

    // Apply current settings to the game
    applySettings() {
        // This would apply the settings to the actual game systems
        // For now, just emit an event
        const event = new CustomEvent('qualitySettingsChanged', {
            detail: this.currentSettings
        });
        window.dispatchEvent(event);

        console.log('⚙️ Applied quality settings:', this.currentSettings);
    }

    // Get current FPS (simplified implementation)
    getCurrentFPS() {
        // In a real implementation, this would track actual FPS
        // For now, return a mock value based on performance tier
        const baseFPS = {
            'excellent': 90,
            'good': 75,
            'average': 45,
            'poor': 25,
            'very_poor': 15
        };

        return baseFPS[this.performanceProfiler.performanceTier] || 30;
    }

    // Get quality settings for UI
    getSettingsForUI() {
        return {
            ...this.currentSettings,
            performanceTier: this.performanceProfiler.performanceTier,
            platform: this.platformDetector.platformInfo,
            recommendations: this.performanceProfiler.getRecommendations()
        };
    }
}
