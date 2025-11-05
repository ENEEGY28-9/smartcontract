#!/usr/bin/env node

/**
 * Load Testing Monitor - Real-time Metrics Collection
 * Monitors system performance during load testing
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const os = require('os');

class LoadTestingMonitor {
    constructor(options = {}) {
        this.options = {
            gatewayUrl: options.gatewayUrl || 'http://localhost:8080',
            prometheusUrl: options.prometheusUrl || 'http://localhost:9090',
            grafanaUrl: options.grafanaUrl || 'http://localhost:3000',
            monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
            outputFile: options.outputFile || './load-testing-metrics.json',
            enableSystemMetrics: options.enableSystemMetrics !== false,
            enablePrometheusMetrics: options.enablePrometheusMetrics !== false,
            testDuration: options.testDuration || 300, // 5 minutes
            ...options
        };

        this.metrics = {
            startTime: null,
            endTime: null,
            samples: [],
            summary: {}
        };

        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    async startMonitoring() {
        console.log('📊 Starting Load Testing Monitor');
        console.log(`Configuration:`);
        console.log(`- Gateway URL: ${this.options.gatewayUrl}`);
        console.log(`- Monitoring Interval: ${this.options.monitoringInterval}ms`);
        console.log(`- Test Duration: ${this.options.testDuration}s`);
        console.log(`- System Metrics: ${this.options.enableSystemMetrics ? '✅' : '❌'}`);
        console.log(`- Prometheus Metrics: ${this.options.enablePrometheusMetrics ? '✅' : '❌'}`);
        console.log('');

        this.metrics.startTime = new Date();
        this.isMonitoring = true;

        // Start monitoring interval
        this.monitoringInterval = setInterval(async () => {
            await this.collectMetrics();
        }, this.options.monitoringInterval);

        // Initial metrics collection
        await this.collectMetrics();

        // Run for specified duration
        setTimeout(async () => {
            await this.stopMonitoring();
        }, this.options.testDuration * 1000);

        return this.metrics;
    }

    async stopMonitoring() {
        if (!this.isMonitoring) return;

        console.log('\n🛑 Stopping Load Testing Monitor...');
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.metrics.endTime = new Date();

        // Final metrics collection
        await this.collectMetrics();

        // Generate summary
        await this.generateSummary();

        // Save results
        await this.saveMetrics();

        this.printSummary();

        return this.metrics;
    }

    async collectMetrics() {
        const timestamp = new Date();
        const sample = {
            timestamp,
            system: {},
            gateway: {},
            prometheus: {},
            calculated: {}
        };

        try {
            // Collect system metrics
            if (this.options.enableSystemMetrics) {
                sample.system = await this.collectSystemMetrics();
            }

            // Collect gateway metrics
            sample.gateway = await this.collectGatewayMetrics();

            // Collect Prometheus metrics if available
            if (this.options.enablePrometheusMetrics) {
                sample.prometheus = await this.collectPrometheusMetrics();
            }

            // Calculate derived metrics
            sample.calculated = this.calculateDerivedMetrics(sample);

            // Store sample
            this.metrics.samples.push(sample);

            // Log real-time metrics
            this.logRealTimeMetrics(sample);

        } catch (error) {
            console.error('❌ Error collecting metrics:', error.message);
            sample.error = error.message;
            this.metrics.samples.push(sample);
        }
    }

    async collectSystemMetrics() {
        const metrics = {
            cpu: {},
            memory: {},
            network: {},
            disk: {}
        };

        // CPU metrics
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        metrics.cpu.usagePercent = (cpuPercent / os.cpus().length) * 100;
        metrics.cpu.loadAverage = os.loadavg();

        // Memory metrics
        const memUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        metrics.memory = {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            totalSystem: totalMemory,
            freeSystem: freeMemory,
            usedSystem: totalMemory - freeMemory,
            usagePercent: ((totalMemory - freeMemory) / totalMemory) * 100
        };

        // Network interfaces (simplified)
        const networkInterfaces = os.networkInterfaces();
        metrics.network.interfaces = Object.keys(networkInterfaces).length;

        // Disk usage (simplified)
        metrics.disk = {
            platform: os.platform(),
            arch: os.arch(),
            uptime: os.uptime()
        };

        return metrics;
    }

    async collectGatewayMetrics() {
        const metrics = {};

        try {
            // Health check
            const healthResponse = await axios.get(`${this.options.gatewayUrl}/health`, {
                timeout: 2000,
                validateStatus: (status) => status < 500
            });

            metrics.health = {
                status: healthResponse.status,
                responseTime: healthResponse.headers['x-response-time'] || 'unknown',
                timestamp: new Date()
            };

            // Metrics endpoint
            try {
                const metricsResponse = await axios.get(`${this.options.gatewayUrl}/metrics`, {
                    timeout: 2000,
                    validateStatus: (status) => status < 500
                });

                metrics.prometheus = {
                    status: metricsResponse.status,
                    contentLength: metricsResponse.headers['content-length'],
                    timestamp: new Date()
                };
            } catch (error) {
                metrics.prometheus = {
                    error: error.message,
                    timestamp: new Date()
                };
            }

            // API endpoints metrics
            const endpoints = ['/api/rooms', '/api/game/state', '/api/chat'];
            metrics.endpoints = {};

            for (const endpoint of endpoints) {
                try {
                    const startTime = performance.now();
                    const response = await axios.get(`${this.options.gatewayUrl}${endpoint}`, {
                        timeout: 2000,
                        validateStatus: (status) => status < 500
                    });
                    const responseTime = performance.now() - startTime;

                    metrics.endpoints[endpoint] = {
                        status: response.status,
                        responseTime,
                        timestamp: new Date()
                    };
                } catch (error) {
                    metrics.endpoints[endpoint] = {
                        error: error.message,
                        timestamp: new Date()
                    };
                }
            }

        } catch (error) {
            metrics.error = error.message;
        }

        return metrics;
    }

    async collectPrometheusMetrics() {
        const metrics = {};

        try {
            const response = await axios.get(`${this.options.prometheusUrl}/api/v1/query?query=up`, {
                timeout: 3000,
                validateStatus: (status) => status < 500
            });

            metrics.query = {
                status: response.status,
                responseTime: response.headers['x-response-time'] || 'unknown',
                data: response.data,
                timestamp: new Date()
            };

        } catch (error) {
            metrics.error = error.message;
        }

        return metrics;
    }

    calculateDerivedMetrics(sample) {
        const calculated = {
            timestamp: sample.timestamp,
            performance: {},
            health: {},
            trends: {}
        };

        // Performance indicators
        if (sample.gateway.health) {
            calculated.performance.gatewayHealth = sample.gateway.health.status === 200 ? 1 : 0;
        }

        if (sample.system.memory) {
            calculated.performance.memoryEfficiency = 100 - sample.system.memory.usagePercent;
        }

        if (sample.system.cpu) {
            calculated.performance.cpuEfficiency = 100 - sample.system.cpu.usagePercent;
        }

        // Health score (0-100)
        let healthScore = 100;
        if (sample.gateway.error) healthScore -= 30;
        if (sample.system.memory && sample.system.memory.usagePercent > 80) healthScore -= 20;
        if (sample.system.cpu && sample.system.cpu.usagePercent > 70) healthScore -= 15;
        if (sample.gateway.endpoints) {
            const endpointErrors = Object.values(sample.gateway.endpoints).filter(e => e.error).length;
            healthScore -= endpointErrors * 5;
        }
        calculated.health.score = Math.max(0, healthScore);

        // Trend analysis (compare with previous sample)
        if (this.metrics.samples.length > 1) {
            const previousSample = this.metrics.samples[this.metrics.samples.length - 2];
            calculated.trends = this.calculateTrends(sample, previousSample);
        }

        return calculated;
    }

    calculateTrends(current, previous) {
        const trends = {};

        // Memory trend
        if (current.system.memory && previous.system.memory) {
            const currentUsage = current.system.memory.usagePercent;
            const previousUsage = previous.system.memory.usagePercent;
            trends.memoryUsage = ((currentUsage - previousUsage) / previousUsage) * 100;
        }

        // CPU trend
        if (current.system.cpu && previous.system.cpu) {
            const currentUsage = current.system.cpu.usagePercent;
            const previousUsage = previous.system.cpu.usagePercent;
            trends.cpuUsage = ((currentUsage - previousUsage) / previousUsage) * 100;
        }

        // Gateway response time trend
        if (current.gateway.health && previous.gateway.health) {
            const currentTime = parseFloat(current.gateway.health.responseTime) || 0;
            const previousTime = parseFloat(previous.gateway.health.responseTime) || 0;
            if (previousTime > 0) {
                trends.gatewayResponseTime = ((currentTime - previousTime) / previousTime) * 100;
            }
        }

        return trends;
    }

    logRealTimeMetrics(sample) {
        const timestamp = sample.timestamp.toISOString();
        const memoryPercent = sample.system.memory?.usagePercent?.toFixed(1) || 'N/A';
        const cpuPercent = sample.system.cpu?.usagePercent?.toFixed(1) || 'N/A';
        const healthScore = sample.calculated.health.score?.toFixed(0) || 'N/A';
        const gatewayStatus = sample.gateway.health?.status || 'N/A';

        process.stdout.write(`\r[${timestamp}] CPU: ${cpuPercent}% | Mem: ${memoryPercent}% | Health: ${healthScore}% | Gateway: ${gatewayStatus}`);
    }

    async generateSummary() {
        console.log('\n📊 Generating Load Testing Summary...');

        if (this.metrics.samples.length === 0) {
            this.metrics.summary = { error: 'No metrics collected' };
            return;
        }

        const samples = this.metrics.samples;
        const systemMetrics = samples.filter(s => s.system.memory).map(s => s.system);
        const gatewayMetrics = samples.filter(s => s.gateway.health).map(s => s.gateway);
        const calculatedMetrics = samples.filter(s => s.calculated.health).map(s => s.calculated);

        this.metrics.summary = {
            totalSamples: samples.length,
            duration: (this.metrics.endTime - this.metrics.startTime) / 1000,

            system: {
                avgCpuUsage: this.average(systemMetrics.map(m => m.cpu.usagePercent)),
                avgMemoryUsage: this.average(systemMetrics.map(m => m.memory.usagePercent)),
                maxMemoryUsage: Math.max(...systemMetrics.map(m => m.memory.usagePercent)),
                avgLoadAverage: this.average(systemMetrics.map(m => m.cpu.loadAverage[0]))
            },

            gateway: {
                healthCheckSuccessRate: (gatewayMetrics.filter(m => m.health.status === 200).length / gatewayMetrics.length) * 100,
                avgResponseTime: this.average(gatewayMetrics.map(m => parseFloat(m.health.responseTime) || 0)),
                endpointsHealthRate: this.calculateEndpointsHealth(gatewayMetrics)
            },

            performance: {
                avgHealthScore: this.average(calculatedMetrics.map(m => m.health.score)),
                minHealthScore: Math.min(...calculatedMetrics.map(m => m.health.score)),
                efficiencyScore: this.calculateEfficiencyScore(calculatedMetrics)
            },

            trends: this.analyzeTrends(),
            recommendations: this.generateRecommendations()
        };
    }

    average(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateEndpointsHealth(gatewayMetrics) {
        const allEndpoints = {};

        gatewayMetrics.forEach(metric => {
            if (metric.endpoints) {
                Object.entries(metric.endpoints).forEach(([endpoint, data]) => {
                    if (!allEndpoints[endpoint]) {
                        allEndpoints[endpoint] = [];
                    }
                    allEndpoints[endpoint].push(data.status === 200 ? 1 : 0);
                });
            }
        });

        const healthRates = {};
        Object.entries(allEndpoints).forEach(([endpoint, results]) => {
            healthRates[endpoint] = (results.filter(r => r === 1).length / results.length) * 100;
        });

        return healthRates;
    }

    calculateEfficiencyScore(calculatedMetrics) {
        if (calculatedMetrics.length === 0) return 0;

        const avgHealth = this.average(calculatedMetrics.map(m => m.health.score));
        const avgPerformance = this.average(calculatedMetrics.map(m => m.performance.memoryEfficiency || 0));
        const avgCpuEfficiency = this.average(calculatedMetrics.map(m => m.performance.cpuEfficiency || 0));

        return (avgHealth + avgPerformance + avgCpuEfficiency) / 3;
    }

    analyzeTrends() {
        const trends = {
            memory: { direction: 'stable', rate: 0 },
            cpu: { direction: 'stable', rate: 0 },
            responseTime: { direction: 'stable', rate: 0 }
        };

        if (this.metrics.samples.length < 2) return trends;

        const recentSamples = this.metrics.samples.slice(-10); // Last 10 samples
        const olderSamples = this.metrics.samples.slice(-20, -10); // Previous 10 samples

        // Memory trend
        const recentMemory = this.average(recentSamples.filter(s => s.system.memory).map(s => s.system.memory.usagePercent));
        const olderMemory = this.average(olderSamples.filter(s => s.system.memory).map(s => s.system.memory.usagePercent));

        if (recentMemory > olderMemory * 1.05) {
            trends.memory.direction = 'increasing';
            trends.memory.rate = ((recentMemory - olderMemory) / olderMemory) * 100;
        } else if (recentMemory < olderMemory * 0.95) {
            trends.memory.direction = 'decreasing';
            trends.memory.rate = ((olderMemory - recentMemory) / olderMemory) * 100;
        }

        // CPU trend (similar logic)
        const recentCpu = this.average(recentSamples.filter(s => s.system.cpu).map(s => s.system.cpu.usagePercent));
        const olderCpu = this.average(olderSamples.filter(s => s.system.cpu).map(s => s.system.cpu.usagePercent));

        if (recentCpu > olderCpu * 1.05) {
            trends.cpu.direction = 'increasing';
            trends.cpu.rate = ((recentCpu - olderCpu) / olderCpu) * 100;
        } else if (recentCpu < olderCpu * 0.95) {
            trends.cpu.direction = 'decreasing';
            trends.cpu.rate = ((olderCpu - recentCpu) / olderCpu) * 100;
        }

        return trends;
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.metrics.summary;

        if (summary.system.avgCpuUsage > 70) {
            recommendations.push('⚠️ High CPU usage detected. Consider optimizing CPU-intensive operations or scaling horizontally.');
        }

        if (summary.system.avgMemoryUsage > 80) {
            recommendations.push('⚠️ High memory usage detected. Monitor for memory leaks and consider increasing memory limits.');
        }

        if (summary.gateway.healthCheckSuccessRate < 95) {
            recommendations.push('⚠️ Gateway health check failure rate is above 5%. Investigate gateway stability issues.');
        }

        if (summary.performance.avgHealthScore < 80) {
            recommendations.push('⚠️ Overall system health score is below 80%. Review system configuration and resource allocation.');
        }

        if (summary.gateway.avgResponseTime > 100) {
            recommendations.push('⚠️ Gateway response time is above 100ms. Consider optimizing gateway performance.');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ System performance looks good. No immediate recommendations.');
        }

        return recommendations;
    }

    async saveMetrics() {
        try {
            await fs.writeFile(this.options.outputFile, JSON.stringify(this.metrics, null, 2));
            console.log(`💾 Metrics saved to ${this.options.outputFile}`);
        } catch (error) {
            console.error('❌ Failed to save metrics:', error);
        }
    }

    printSummary() {
        console.log('\n📊 LOAD TESTING MONITORING SUMMARY');
        console.log('=' * 60);

        const summary = this.metrics.summary;

        console.log(`Test Duration: ${summary.duration.toFixed(2)}s`);
        console.log(`Total Samples: ${summary.totalSamples}`);

        console.log('\n🔧 System Performance:');
        console.log(`  CPU Usage: ${summary.system.avgCpuUsage.toFixed(1)}% avg, ${summary.system.avgLoadAverage.toFixed(2)} load`);
        console.log(`  Memory Usage: ${summary.system.avgMemoryUsage.toFixed(1)}% avg, ${summary.system.maxMemoryUsage.toFixed(1)}% max`);

        console.log('\n🌐 Gateway Performance:');
        console.log(`  Health Check Success: ${summary.gateway.healthCheckSuccessRate.toFixed(1)}%`);
        console.log(`  Avg Response Time: ${summary.gateway.avgResponseTime.toFixed(0)}ms`);

        console.log('\n💯 Overall Health:');
        console.log(`  Average Health Score: ${summary.performance.avgHealthScore.toFixed(1)}/100`);
        console.log(`  Minimum Health Score: ${summary.performance.minHealthScore.toFixed(1)}/100`);
        console.log(`  Efficiency Score: ${summary.performance.efficiencyScore.toFixed(1)}/100`);

        console.log('\n📈 Trends:');
        console.log(`  Memory: ${summary.trends.memory.direction} (${summary.trends.memory.rate > 0 ? '+' : ''}${summary.trends.memory.rate.toFixed(1)}%)`);
        console.log(`  CPU: ${summary.trends.cpu.direction} (${summary.trends.cpu.rate > 0 ? '+' : ''}${summary.trends.cpu.rate.toFixed(1)}%)`);

        console.log('\n💡 Recommendations:');
        summary.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];

        switch (key) {
            case 'gateway':
                options.gatewayUrl = value;
                break;
            case 'prometheus':
                options.prometheusUrl = value;
                break;
            case 'grafana':
                options.grafanaUrl = value;
                break;
            case 'interval':
                options.monitoringInterval = parseInt(value);
                break;
            case 'duration':
                options.testDuration = parseInt(value);
                break;
            case 'output':
                options.outputFile = value;
                break;
            case 'no-system':
                options.enableSystemMetrics = false;
                break;
            case 'no-prometheus':
                options.enablePrometheusMetrics = false;
                break;
        }
    }

    const monitor = new LoadTestingMonitor(options);

    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, stopping monitoring...');
        await monitor.stopMonitoring();
        process.exit(0);
    });

    try {
        await monitor.startMonitoring();

        // Keep process alive during monitoring
        return new Promise(() => {}); // Never resolves, keeps process alive

    } catch (error) {
        console.error('💥 Monitoring failed:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    LoadTestingMonitor,
    main
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

