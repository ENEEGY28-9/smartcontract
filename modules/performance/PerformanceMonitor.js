/**
 * PerformanceMonitor - Monitors game performance and provides optimization suggestions
 * Tracks FPS, memory usage, render calls, and other performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.isMonitoring = false;
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            textureMemory: 0,
            geometryCount: 0
        };

        this.history = {
            fps: [],
            frameTime: [],
            memoryUsage: []
        };

        this.maxHistorySize = 60; // 1 second at 60fps
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        this.optimizationSuggestions = [];
        this.performanceAlerts = [];
    }

    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        console.log('Performance monitoring started');
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        console.log('Performance monitoring stopped');
    }

    update() {
        if (!this.isMonitoring) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;

        this.frameCount++;

        // Update FPS
        if (deltaTime >= 1000) { // Update every second
            this.metrics.fps = (this.frameCount * 1000) / deltaTime;
            this.frameCount = 0;
            this.lastFrameTime = now;

            // Update other metrics
            this.updateMemoryUsage();
            this.updateRenderStats();

            // Store in history
            this.addToHistory();

            // Check for performance issues
            this.checkPerformanceIssues();

            // Generate optimization suggestions
            this.generateOptimizationSuggestions();
        }

        // Update frame time (smoother updates)
        this.metrics.frameTime = deltaTime;
    }

    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
    }

    updateRenderStats() {
        // This would need to be implemented with Three.js renderer info
        // For now, we'll estimate based on scene complexity

        if (window.game && window.game.modules && window.game.modules.graphics) {
            const graphics = window.game.modules.graphics;
            const scene = graphics.scene;

            if (scene) {
                this.metrics.geometryCount = this.countGeometries(scene);
                this.metrics.triangles = this.estimateTriangleCount(scene);
            }
        }
    }

    countGeometries(object) {
        let count = 0;

        if (object.geometry) {
            count++;
        }

        if (object.children) {
            object.children.forEach(child => {
                count += this.countGeometries(child);
            });
        }

        return count;
    }

    estimateTriangleCount(object) {
        let triangles = 0;

        if (object.geometry) {
            if (object.geometry.index) {
                triangles += object.geometry.index.count / 3;
            } else if (object.geometry.attributes.position) {
                triangles += object.geometry.attributes.position.count / 3;
            }
        }

        if (object.children) {
            object.children.forEach(child => {
                triangles += this.estimateTriangleCount(child);
            });
        }

        return Math.floor(triangles);
    }

    addToHistory() {
        // Add current metrics to history arrays
        this.history.fps.push(this.metrics.fps);
        this.history.frameTime.push(this.metrics.frameTime);
        this.history.memoryUsage.push(this.metrics.memoryUsage);

        // Keep only recent history
        if (this.history.fps.length > this.maxHistorySize) {
            this.history.fps.shift();
            this.history.frameTime.shift();
            this.history.memoryUsage.shift();
        }
    }

    checkPerformanceIssues() {
        this.performanceAlerts = [];

        // Check FPS
        if (this.metrics.fps < 30) {
            this.performanceAlerts.push({
                type: 'fps',
                severity: 'high',
                message: `Low FPS detected: ${this.metrics.fps.toFixed(1)}fps`
            });
        } else if (this.metrics.fps < 50) {
            this.performanceAlerts.push({
                type: 'fps',
                severity: 'medium',
                message: `Suboptimal FPS: ${this.metrics.fps.toFixed(1)}fps`
            });
        }

        // Check memory usage
        if (this.metrics.memoryUsage > 100) {
            this.performanceAlerts.push({
                type: 'memory',
                severity: 'high',
                message: `High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`
            });
        } else if (this.metrics.memoryUsage > 50) {
            this.performanceAlerts.push({
                type: 'memory',
                severity: 'medium',
                message: `Moderate memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`
            });
        }

        // Check frame time
        if (this.metrics.frameTime > 33) { // Less than 30fps
            this.performanceAlerts.push({
                type: 'frameTime',
                severity: 'high',
                message: `High frame time: ${this.metrics.frameTime.toFixed(1)}ms`
            });
        }

        // Log alerts
        if (this.performanceAlerts.length > 0) {
            console.warn('Performance alerts:', this.performanceAlerts);
        }
    }

    generateOptimizationSuggestions() {
        this.optimizationSuggestions = [];

        // FPS-based suggestions
        if (this.metrics.fps < 30) {
            this.optimizationSuggestions.push({
                category: 'graphics',
                priority: 'high',
                suggestion: 'Reduce shadow quality or disable shadows',
                action: 'reduceShadowQuality'
            });

            this.optimizationSuggestions.push({
                category: 'graphics',
                priority: 'high',
                suggestion: 'Lower texture resolution',
                action: 'reduceTextureQuality'
            });

            this.optimizationSuggestions.push({
                category: 'rendering',
                priority: 'medium',
                suggestion: 'Reduce render distance',
                action: 'reduceRenderDistance'
            });
        }

        // Memory-based suggestions
        if (this.metrics.memoryUsage > 80) {
            this.optimizationSuggestions.push({
                category: 'memory',
                priority: 'high',
                suggestion: 'Enable object pooling for frequently created objects',
                action: 'enableObjectPooling'
            });

            this.optimizationSuggestions.push({
                category: 'memory',
                priority: 'medium',
                suggestion: 'Reduce particle count',
                action: 'reduceParticleCount'
            });
        }

        // Geometry-based suggestions
        if (this.metrics.triangles > 100000) {
            this.optimizationSuggestions.push({
                category: 'geometry',
                priority: 'medium',
                suggestion: 'Enable LOD (Level of Detail) for distant objects',
                action: 'enableLOD'
            });

            this.optimizationSuggestions.push({
                category: 'geometry',
                priority: 'low',
                suggestion: 'Use simpler geometry for background objects',
                action: 'simplifyGeometry'
            });
        }
    }

    // Event tracking methods
    onGameStart() {
        this.resetMetrics();
        console.log('Performance tracking started for new game');
    }

    onGameEnd(gameData) {
        const sessionStats = {
            averageFPS: this.getAverageFPS(),
            peakMemoryUsage: Math.max(...this.history.memoryUsage),
            totalTriangles: this.metrics.triangles,
            sessionLength: gameData.distance / (gameData.score > 0 ? gameData.score : 1)
        };

        console.log('Game session performance:', sessionStats);
    }

    trackScore(score) {
        // Track performance at different score milestones
        if (score > 0 && score % 10000 === 0) {
            console.log(`Performance at score ${score}:`, this.getStats());
        }
    }

    trackCoins(coins) {
        // Track performance at coin milestones
        if (coins > 0 && coins % 100 === 0) {
            console.log(`Performance at ${coins} coins:`, this.getStats());
        }
    }

    // Data analysis methods
    getAverageFPS() {
        if (this.history.fps.length === 0) return 0;
        return this.history.fps.reduce((sum, fps) => sum + fps, 0) / this.history.fps.length;
    }

    getAverageFrameTime() {
        if (this.history.frameTime.length === 0) return 0;
        return this.history.frameTime.reduce((sum, time) => sum + time, 0) / this.history.frameTime.length;
    }

    getPeakMemoryUsage() {
        if (this.history.memoryUsage.length === 0) return 0;
        return Math.max(...this.history.memoryUsage);
    }

    getPerformanceTrend() {
        if (this.history.fps.length < 10) return 'insufficient_data';

        const recent = this.history.fps.slice(-10);
        const older = this.history.fps.slice(-20, -10);

        if (older.length === 0) return 'stable';

        const recentAvg = recent.reduce((sum, fps) => sum + fps, 0) / recent.length;
        const olderAvg = older.reduce((sum, fps) => sum + fps, 0) / older.length;

        const difference = recentAvg - olderAvg;

        if (difference > 5) return 'improving';
        if (difference < -5) return 'degrading';
        return 'stable';
    }

    // Public API methods
    getStats() {
        return {
            current: { ...this.metrics },
            average: {
                fps: this.getAverageFPS(),
                frameTime: this.getAverageFrameTime(),
                memoryUsage: this.getPeakMemoryUsage()
            },
            trend: this.getPerformanceTrend(),
            alerts: this.performanceAlerts.length,
            suggestions: this.optimizationSuggestions.length
        };
    }

    getDetailedReport() {
        return {
            metrics: this.metrics,
            history: this.history,
            alerts: this.performanceAlerts,
            suggestions: this.optimizationSuggestions,
            systemInfo: this.getSystemInfo()
        };
    }

    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screenResolution: `${screen.width}x${screen.height}`,
            pixelRatio: window.devicePixelRatio,
            webGLSupport: this.checkWebGLSupport()
        };
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    resetMetrics() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            textureMemory: 0,
            geometryCount: 0
        };

        this.history = {
            fps: [],
            frameTime: [],
            memoryUsage: []
        };

        this.optimizationSuggestions = [];
        this.performanceAlerts = [];
    }

    // Export methods for debugging
    exportPerformanceData() {
        const data = {
            timestamp: new Date().toISOString(),
            systemInfo: this.getSystemInfo(),
            performanceData: this.getDetailedReport()
        };

        Utils.downloadFile(
            JSON.stringify(data, null, 2),
            `performance-report-${new Date().toISOString().split('T')[0]}.json`,
            'application/json'
        );
    }

    // Debug methods
    getDebugInfo() {
        return {
            isMonitoring: this.isMonitoring,
            metrics: this.metrics,
            historySize: this.history.fps.length,
            alertsCount: this.performanceAlerts.length,
            suggestionsCount: this.optimizationSuggestions.length,
            trend: this.getPerformanceTrend()
        };
    }

    // Cleanup methods
    destroy() {
        this.stopMonitoring();
        this.resetMetrics();
        console.log('PerformanceMonitor destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}

// Make PerformanceMonitor available globally
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}
