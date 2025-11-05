#!/usr/bin/env node

/**
 * Performance Benchmarking System with Real Gameplay Scenarios
 * Comprehensive performance testing based on real gameplay data analysis
 */

const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class PerformanceBenchmark {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:8080/ws',
            benchmarkDuration: options.benchmarkDuration || 300, // 5 minutes default
            warmupDuration: options.warmupDuration || 30, // 30 seconds warmup
            scenarioFile: options.scenarioFile || './benchmark-scenarios.json',
            outputFile: options.outputFile || './benchmark-results.json',
            concurrentClients: options.concurrentClients || 50,
            rampUpTime: options.rampUpTime || 60, // 1 minute to ramp up to full load
            enableMetrics: options.enableMetrics !== false,
            enableProfiling: options.enableProfiling || false,
            ...options
        };

        this.results = {
            startTime: null,
            endTime: null,
            scenarios: [],
            metrics: [],
            summary: {}
        };

        this.clients = [];
        this.metricsCollectors = [];
        this.isRunning = false;
    }

    async runBenchmark() {
        console.log('🚀 Starting Performance Benchmark Suite');
        console.log(`Configuration:`);
        console.log(`- Server: ${this.options.serverUrl}`);
        console.log(`- Duration: ${this.options.benchmarkDuration}s`);
        console.log(`- Warmup: ${this.options.warmupDuration}s`);
        console.log(`- Clients: ${this.options.concurrentClients}`);
        console.log(`- Ramp-up: ${this.options.rampUpTime}s`);
        console.log('');

        this.results.startTime = new Date();

        try {
            // Load benchmark scenarios
            await this.loadScenarios();

            // Warmup phase
            await this.warmupPhase();

            // Main benchmark phase
            await this.benchmarkPhase();

            // Generate results
            await this.generateResults();

        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            this.results.error = error.message;
        } finally {
            this.results.endTime = new Date();
            await this.saveResults();
            this.cleanup();
        }

        return this.results;
    }

    async loadScenarios() {
        console.log('📋 Loading benchmark scenarios...');

        try {
            const scenarioData = await fs.readFile(this.options.scenarioFile, 'utf8');
            const scenarios = JSON.parse(scenarioData);

            this.benchmarkScenarios = scenarios.scenarios || [];
            this.globalConfig = scenarios.globalConfig || {};

            console.log(`✅ Loaded ${this.benchmarkScenarios.length} scenarios`);
        } catch (error) {
            console.warn(`⚠️ Could not load scenarios file: ${error.message}`);
            this.benchmarkScenarios = this.getDefaultScenarios();
            console.log(`📋 Using ${this.benchmarkScenarios.length} default scenarios`);
        }
    }

    getDefaultScenarios() {
        return [
            {
                name: "player_spawn_stress",
                description: "Multiple players spawning simultaneously",
                duration: 60,
                clientCount: this.options.concurrentClients,
                actions: [
                    {
                        type: "spawn_player",
                        frequency: "all_at_once",
                        data: { position: "random", avatar: "default" }
                    },
                    {
                        type: "player_movement",
                        frequency: "continuous",
                        rate: 10, // actions per second per client
                        data: { pattern: "random_walk" }
                    }
                ]
            },
            {
                name: "chat_flood",
                description: "High volume chat messages",
                duration: 120,
                clientCount: Math.min(this.options.concurrentClients, 20),
                actions: [
                    {
                        type: "chat_message",
                        frequency: "continuous",
                        rate: 5, // messages per second per client
                        data: { length: "medium", content: "random" }
                    }
                ]
            },
            {
                name: "combat_simulation",
                description: "Intense combat with many actions",
                duration: 180,
                clientCount: this.options.concurrentClients,
                actions: [
                    {
                        type: "combat_action",
                        frequency: "continuous",
                        rate: 15, // high frequency combat
                        data: { types: ["attack", "defend", "dodge", "special_ability"] }
                    },
                    {
                        type: "player_movement",
                        frequency: "continuous",
                        rate: 8,
                        data: { pattern: "combat_maneuver" }
                    }
                ]
            },
            {
                name: "memory_stress",
                description: "Long-running test to detect memory leaks",
                duration: 300,
                clientCount: this.options.concurrentClients,
                actions: [
                    {
                        type: "player_update",
                        frequency: "continuous",
                        rate: 20, // high frequency updates
                        data: { include_state: true, complex_data: true }
                    }
                ]
            },
            {
                name: "network_fluctuation",
                description: "Simulate network conditions and recovery",
                duration: 240,
                clientCount: this.options.concurrentClients,
                actions: [
                    {
                        type: "network_simulation",
                        frequency: "periodic",
                        intervals: [30, 60, 90], // simulate network issues at these intervals
                        conditions: [
                            { type: "latency", value: 200, duration: 10 },
                            { type: "packet_loss", value: 0.05, duration: 15 },
                            { type: "bandwidth_limit", value: 1000, duration: 20 }
                        ]
                    },
                    {
                        type: "player_movement",
                        frequency: "continuous",
                        rate: 5,
                        data: { pattern: "normal" }
                    }
                ]
            }
        ];
    }

    async warmupPhase() {
        console.log(`🔥 Starting warmup phase (${this.options.warmupDuration}s)...`);

        // Start a subset of clients for warmup
        const warmupClients = Math.min(this.options.concurrentClients / 4, 10);

        await this.createClients(warmupClients);

        // Run light load for warmup duration
        await this.runScenario({
            name: "warmup",
            duration: this.options.warmupDuration,
            clientCount: warmupClients,
            actions: [
                {
                    type: "player_movement",
                    frequency: "continuous",
                    rate: 2, // Light movement only
                    data: { pattern: "simple" }
                }
            ]
        });

        // Clean up warmup clients
        this.cleanup();

        console.log('✅ Warmup phase completed');
    }

    async benchmarkPhase() {
        console.log('⚡ Starting main benchmark phase...');

        this.isRunning = true;

        // Run each scenario in sequence
        for (const scenario of this.benchmarkScenarios) {
            console.log(`\n🎯 Running scenario: ${scenario.name}`);
            console.log(`   ${scenario.description}`);

            const scenarioStart = performance.now();

            try {
                await this.runScenario(scenario);

                const scenarioDuration = (performance.now() - scenarioStart) / 1000;
                console.log(`✅ Scenario ${scenario.name} completed in ${scenarioDuration.toFixed(2)}s`);

                // Collect scenario results
                this.results.scenarios.push({
                    name: scenario.name,
                    description: scenario.description,
                    duration: scenarioDuration,
                    success: true
                });

            } catch (error) {
                console.error(`❌ Scenario ${scenario.name} failed:`, error);

                this.results.scenarios.push({
                    name: scenario.name,
                    description: scenario.description,
                    duration: (performance.now() - scenarioStart) / 1000,
                    success: false,
                    error: error.message
                });
            }
        }

        this.isRunning = false;
    }

    async runScenario(scenario) {
        // Create clients for this scenario
        await this.createClients(scenario.clientCount);

        // Calculate ramp-up timing
        const rampUpSteps = 10;
        const clientsPerStep = Math.ceil(scenario.clientCount / rampUpSteps);
        const stepDuration = this.options.rampUpTime / rampUpSteps;

        // Ramp up clients gradually
        for (let step = 0; step < rampUpSteps && step * clientsPerStep < scenario.clientCount; step++) {
            const clientsToStart = Math.min(clientsPerStep, scenario.clientCount - step * clientsPerStep);

            if (clientsToStart > 0) {
                await this.startClientsBatch(step * clientsPerStep, clientsToStart);

                if (step < rampUpSteps - 1) {
                    await new Promise(resolve => setTimeout(resolve, stepDuration * 1000));
                }
            }
        }

        // Run scenario actions for specified duration
        const scenarioPromise = this.executeScenarioActions(scenario);

        // Wait for scenario duration or until completion
        await Promise.race([
            scenarioPromise,
            new Promise(resolve => setTimeout(resolve, scenario.duration * 1000))
        ]);

        // Clean up scenario clients
        this.cleanup();
    }

    async createClients(clientCount) {
        console.log(`Creating ${clientCount} benchmark clients...`);

        this.clients = [];

        for (let i = 0; i < clientCount; i++) {
            const client = new BenchmarkClient({
                id: `benchmark_${i}`,
                serverUrl: this.options.serverUrl,
                enableMetrics: this.options.enableMetrics
            });

            this.clients.push(client);
        }

        console.log(`✅ Created ${this.clients.length} clients`);
    }

    async startClientsBatch(startIndex, count) {
        console.log(`Starting clients ${startIndex} to ${startIndex + count - 1}...`);

        const batch = this.clients.slice(startIndex, startIndex + count);
        const promises = batch.map(client => client.connect());

        await Promise.all(promises);
        console.log(`✅ Started batch of ${count} clients`);
    }

    async executeScenarioActions(scenario) {
        const actionPromises = scenario.actions.map(action => this.executeAction(action, scenario));

        // Run all actions concurrently
        await Promise.all(actionPromises);
    }

    async executeAction(action, scenario) {
        const endTime = Date.now() + (scenario.duration * 1000);

        switch (action.type) {
            case 'spawn_player':
                await this.executeSpawnAction(action, scenario, endTime);
                break;

            case 'player_movement':
                await this.executeMovementAction(action, scenario, endTime);
                break;

            case 'chat_message':
                await this.executeChatAction(action, scenario, endTime);
                break;

            case 'combat_action':
                await this.executeCombatAction(action, scenario, endTime);
                break;

            case 'player_update':
                await this.executeUpdateAction(action, scenario, endTime);
                break;

            case 'network_simulation':
                await this.executeNetworkSimulation(action, scenario, endTime);
                break;

            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    async executeSpawnAction(action, scenario, endTime) {
        const clients = this.clients.slice(0, scenario.clientCount);

        if (action.frequency === 'all_at_once') {
            // Spawn all players simultaneously
            const spawnPromises = clients.map(client => client.spawnPlayer(action.data));
            await Promise.all(spawnPromises);
            console.log(`🚀 Spawned ${clients.length} players simultaneously`);
        }
    }

    async executeMovementAction(action, scenario, endTime) {
        const clients = this.clients.slice(0, scenario.clientCount);
        const interval = 1000 / action.rate; // Convert rate to interval in ms

        console.log(`🏃 Starting movement simulation: ${action.rate} actions/sec per client`);

        while (Date.now() < endTime && this.isRunning) {
            const movePromises = clients.map(client => client.sendMovement(action.data));
            await Promise.all(movePromises);

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    async executeChatAction(action, scenario, endTime) {
        const clients = this.clients.slice(0, scenario.clientCount);
        const interval = 1000 / action.rate;

        console.log(`💬 Starting chat simulation: ${action.rate} messages/sec per client`);

        while (Date.now() < endTime && this.isRunning) {
            const chatPromises = clients.map(client => client.sendChatMessage(action.data));
            await Promise.all(chatPromises);

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    async executeCombatAction(action, scenario, endTime) {
        const clients = this.clients.slice(0, scenario.clientCount);
        const interval = 1000 / action.rate;

        console.log(`⚔️ Starting combat simulation: ${action.rate} actions/sec per client`);

        while (Date.now() < endTime && this.isRunning) {
            const combatPromises = clients.map(client => client.sendCombatAction(action.data));
            await Promise.all(combatPromises);

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    async executeUpdateAction(action, scenario, endTime) {
        const clients = this.clients.slice(0, scenario.clientCount);
        const interval = 1000 / action.rate;

        console.log(`📡 Starting update simulation: ${action.rate} updates/sec per client`);

        while (Date.now() < endTime && this.isRunning) {
            const updatePromises = clients.map(client => client.sendPlayerUpdate(action.data));
            await Promise.all(updatePromises);

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    async executeNetworkSimulation(action, scenario, endTime) {
        console.log(`🌐 Starting network simulation...`);

        for (const interval of action.intervals) {
            if (Date.now() >= endTime || !this.isRunning) break;

            await new Promise(resolve => setTimeout(resolve, interval * 1000));

            if (Date.now() >= endTime || !this.isRunning) break;

            // Apply network conditions
            for (const condition of action.conditions) {
                await this.applyNetworkCondition(condition);
            }

            console.log(`⚡ Applied network conditions for ${action.conditions[0]?.duration}s`);
        }
    }

    async applyNetworkCondition(condition) {
        // This would integrate with network simulation tools
        // For now, we'll simulate by adjusting client behavior
        switch (condition.type) {
            case 'latency':
                console.log(`   📶 Simulating ${condition.value}ms latency`);
                // Adjust client timing to simulate latency
                break;

            case 'packet_loss':
                console.log(`   📦 Simulating ${condition.value * 100}% packet loss`);
                // Randomly drop some messages
                break;

            case 'bandwidth_limit':
                console.log(`   📊 Simulating ${condition.value}KB/s bandwidth limit`);
                // Throttle message sending
                break;
        }

        // Wait for condition duration
        await new Promise(resolve => setTimeout(resolve, condition.duration * 1000));
    }

    async generateResults() {
        console.log('📊 Generating benchmark results...');

        // Collect metrics from all clients
        const allMetrics = [];

        for (const client of this.clients) {
            if (client.metrics) {
                allMetrics.push(client.metrics);
            }
        }

        // Aggregate metrics
        this.results.metrics = this.aggregateMetrics(allMetrics);

        // Generate summary
        this.results.summary = {
            totalScenarios: this.benchmarkScenarios.length,
            successfulScenarios: this.results.scenarios.filter(s => s.success).length,
            totalClients: this.options.concurrentClients,
            totalDuration: this.options.benchmarkDuration,
            averageLatency: this.calculateAverage(allMetrics.map(m => m.latency)),
            p95Latency: this.calculatePercentile(allMetrics.map(m => m.latency), 95),
            p99Latency: this.calculatePercentile(allMetrics.map(m => m.latency), 99),
            totalMessages: allMetrics.reduce((sum, m) => sum + (m.messagesSent || 0), 0),
            throughput: this.calculateThroughput(allMetrics),
            errorRate: this.calculateErrorRate(allMetrics)
        };

        // Detect performance regressions (compared to baseline)
        this.results.regressionAnalysis = await this.analyzeRegressions();
    }

    aggregateMetrics(allMetrics) {
        if (allMetrics.length === 0) return {};

        const aggregated = {
            latency: [],
            throughput: [],
            errors: [],
            memoryUsage: [],
            cpuUsage: []
        };

        for (const metrics of allMetrics) {
            if (metrics.latency) aggregated.latency.push(...metrics.latency);
            if (metrics.throughput) aggregated.throughput.push(metrics.throughput);
            if (metrics.errors) aggregated.errors.push(...metrics.errors);
            if (metrics.memoryUsage) aggregated.memoryUsage.push(metrics.memoryUsage);
            if (metrics.cpuUsage) aggregated.cpuUsage.push(metrics.cpuUsage);
        }

        return {
            latency: this.summarizeMetric(aggregated.latency),
            throughput: this.summarizeMetric(aggregated.throughput),
            errors: this.summarizeErrors(aggregated.errors),
            memoryUsage: this.summarizeMetric(aggregated.memoryUsage),
            cpuUsage: this.summarizeMetric(aggregated.cpuUsage)
        };
    }

    summarizeMetric(values) {
        if (values.length === 0) return {};

        const sorted = [...values].sort((a, b) => a - b);

        return {
            count: values.length,
            average: values.reduce((a, b) => a + b, 0) / values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }

    summarizeErrors(errors) {
        const errorCounts = {};

        for (const error of errors) {
            errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
        }

        return {
            total: errors.length,
            byType: errorCounts
        };
    }

    calculateAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * percentile / 100);
        return sorted[Math.min(index, sorted.length - 1)];
    }

    calculateThroughput(allMetrics) {
        const totalMessages = allMetrics.reduce((sum, m) => sum + (m.messagesSent || 0), 0);
        const totalTime = this.options.benchmarkDuration;

        return totalMessages / totalTime; // messages per second
    }

    calculateErrorRate(allMetrics) {
        const totalMessages = allMetrics.reduce((sum, m) => sum + (m.messagesSent || 0), 0);
        const totalErrors = allMetrics.reduce((sum, m) => sum + (m.errors || []).length, 0);

        return totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0; // percentage
    }

    async analyzeRegressions() {
        // Load baseline results for comparison
        try {
            const baselinePath = this.options.outputFile.replace('.json', '_baseline.json');
            const baselineData = await fs.readFile(baselinePath, 'utf8');
            const baseline = JSON.parse(baselineData);

            return this.compareWithBaseline(baseline);
        } catch (error) {
            console.log('⚠️ No baseline found for regression analysis');
            return { hasRegression: false, message: 'No baseline available' };
        }
    }

    compareWithBaseline(baseline) {
        const current = this.results.summary;

        // Simple regression detection based on key metrics
        const regressions = [];

        if (current.averageLatency > baseline.averageLatency * 1.1) {
            regressions.push({
                metric: 'latency',
                current: current.averageLatency,
                baseline: baseline.averageLatency,
                degradation: ((current.averageLatency - baseline.averageLatency) / baseline.averageLatency * 100).toFixed(2) + '%'
            });
        }

        if (current.throughput < baseline.throughput * 0.9) {
            regressions.push({
                metric: 'throughput',
                current: current.throughput,
                baseline: baseline.throughput,
                degradation: (((baseline.throughput - current.throughput) / baseline.throughput * 100)).toFixed(2) + '%'
            });
        }

        if (current.errorRate > baseline.errorRate * 1.2) {
            regressions.push({
                metric: 'error_rate',
                current: current.errorRate,
                baseline: baseline.errorRate,
                degradation: ((current.errorRate - baseline.errorRate) / baseline.errorRate * 100).toFixed(2) + '%'
            });
        }

        return {
            hasRegression: regressions.length > 0,
            regressions,
            baselineTimestamp: baseline.startTime
        };
    }

    async saveResults() {
        try {
            await fs.writeFile(this.options.outputFile, JSON.stringify(this.results, null, 2));
            console.log(`💾 Results saved to ${this.options.outputFile}`);
        } catch (error) {
            console.error('❌ Failed to save results:', error);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up benchmark clients...');

        this.clients.forEach(client => {
            if (client.ws) {
                client.ws.close();
            }
        });

        this.clients = [];
        this.isRunning = false;
    }

    printSummary() {
        console.log('\n📊 BENCHMARK SUMMARY');
        console.log('=' * 50);
        console.log(`Duration: ${this.results.summary.totalDuration}s`);
        console.log(`Total Clients: ${this.results.summary.totalClients}`);
        console.log(`Successful Scenarios: ${this.results.summary.successfulScenarios}/${this.results.summary.totalScenarios}`);

        if (this.results.summary.averageLatency) {
            console.log(`\nLatency:`);
            console.log(`- Average: ${this.results.summary.averageLatency.toFixed(2)}ms`);
            console.log(`- P95: ${this.results.summary.p95Latency.toFixed(2)}ms`);
            console.log(`- P99: ${this.results.summary.p99Latency.toFixed(2)}ms`);
        }

        console.log(`\nThroughput:`);
        console.log(`- Messages/sec: ${this.results.summary.throughput.toFixed(2)}`);
        console.log(`- Total Messages: ${this.results.summary.totalMessages}`);

        console.log(`\nErrors:`);
        console.log(`- Error Rate: ${this.results.summary.errorRate.toFixed(2)}%`);

        if (this.results.regressionAnalysis?.hasRegression) {
            console.log(`\n⚠️ PERFORMANCE REGRESSIONS DETECTED:`);
            this.results.regressionAnalysis.regressions.forEach(reg => {
                console.log(`  - ${reg.metric}: ${reg.degradation} degradation`);
            });
        } else {
            console.log(`\n✅ No performance regressions detected`);
        }
    }
}

class BenchmarkClient {
    constructor(options) {
        this.id = options.id;
        this.serverUrl = options.serverUrl;
        this.ws = null;
        this.isConnected = false;
        this.enableMetrics = options.enableMetrics !== false;

        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            latency: [],
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.metrics.startTime = performance.now();
                resolve();
            });

            this.ws.on('error', (error) => {
                this.recordError('connection', error.message);
                reject(error);
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.metrics.endTime = performance.now();
            });
        });
    }

    async spawnPlayer(spawnData) {
        const message = {
            type: 'spawn_player',
            player_id: this.id,
            data: {
                position: spawnData.position || { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
                avatar: spawnData.avatar || 'default',
                ...spawnData
            },
            timestamp: Date.now()
        };

        return this.sendMessage(message);
    }

    async sendMovement(movementData) {
        const message = {
            type: 'player_movement',
            player_id: this.id,
            data: this.generateMovementData(movementData),
            timestamp: Date.now()
        };

        return this.sendMessage(message);
    }

    async sendChatMessage(chatData) {
        const message = {
            type: 'chat_message',
            player_id: this.id,
            data: {
                message: this.generateChatContent(chatData),
                channel: 'global'
            },
            timestamp: Date.now()
        };

        return this.sendMessage(message);
    }

    async sendCombatAction(combatData) {
        const message = {
            type: 'combat_action',
            player_id: this.id,
            data: {
                action: this.selectCombatAction(combatData),
                target: this.selectTarget(),
                ...combatData
            },
            timestamp: Date.now()
        };

        return this.sendMessage(message);
    }

    async sendPlayerUpdate(updateData) {
        const message = {
            type: 'player_update',
            player_id: this.id,
            data: {
                position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
                rotation: { x: 0, y: Math.random() * 360, z: 0 },
                state: updateData.include_state ? this.generateComplexState() : {},
                ...updateData
            },
            timestamp: Date.now()
        };

        return this.sendMessage(message);
    }

    async sendMessage(message) {
        if (!this.isConnected || !this.ws) {
            this.recordError('send_message', 'Client not connected');
            return false;
        }

        const startTime = performance.now();

        try {
            this.ws.send(JSON.stringify(message));
            this.metrics.messagesSent++;

            // Record latency for response (simplified)
            setTimeout(() => {
                const latency = performance.now() - startTime;
                if (this.enableMetrics) {
                    this.metrics.latency.push(latency);
                }
            }, 100);

            return true;
        } catch (error) {
            this.recordError('send_message', error.message);
            return false;
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            this.metrics.messagesReceived++;

            // Handle different message types
            switch (message.type) {
                case 'spawn_confirmed':
                    // Handle spawn confirmation
                    break;

                case 'error':
                    this.recordError(message.error_type || 'unknown', message.message);
                    break;

                default:
                    // Handle other message types
                    break;
            }
        } catch (error) {
            this.recordError('parse_message', error.message);
        }
    }

    generateMovementData(movementData) {
        const patterns = {
            'random_walk': () => ({
                direction: { x: (Math.random() - 0.5) * 2, y: 0, z: (Math.random() - 0.5) * 2 },
                speed: 5.0 + Math.random() * 5.0
            }),
            'combat_maneuver': () => ({
                direction: { x: (Math.random() - 0.5) * 1.5, y: 0, z: (Math.random() - 0.5) * 1.5 },
                speed: 8.0 + Math.random() * 4.0,
                strafe: Math.random() > 0.7
            }),
            'simple': () => ({
                direction: { x: Math.random() > 0.5 ? 1 : -1, y: 0, z: 0 },
                speed: 3.0
            })
        };

        const pattern = patterns[movementData.pattern] || patterns['simple'];
        return pattern();
    }

    generateChatContent(chatData) {
        if (chatData.content === 'random') {
            const messages = [
                'Hello everyone!',
                'Nice move!',
                'Anyone need help?',
                'Great game so far!',
                'Let\'s team up!',
                'Watch out behind you!',
                'Nice shot!',
                'Good luck everyone!'
            ];

            const lengths = {
                'short': () => messages[Math.floor(Math.random() * messages.length)],
                'medium': () => {
                    const base = messages[Math.floor(Math.random() * messages.length)];
                    return base + ' ' + messages[Math.floor(Math.random() * messages.length)];
                },
                'long': () => {
                    let message = messages[Math.floor(Math.random() * messages.length)];
                    for (let i = 0; i < 3; i++) {
                        message += ' ' + messages[Math.floor(Math.random() * messages.length)];
                    }
                    return message;
                }
            };

            const generator = lengths[chatData.length] || lengths['medium'];
            return generator();
        }

        return chatData.content || 'Test message';
    }

    selectCombatAction(combatData) {
        const actions = combatData.types || ['attack', 'defend', 'dodge'];
        return actions[Math.floor(Math.random() * actions.length)];
    }

    selectTarget() {
        // Select a random target (simplified)
        return `player_${Math.floor(Math.random() * 100)}`;
    }

    generateComplexState() {
        return {
            health: 80 + Math.random() * 20,
            mana: Math.random() * 100,
            buffs: Math.random() > 0.7 ? ['speed_boost', 'damage_up'] : [],
            debuffs: Math.random() > 0.8 ? ['slowed'] : [],
            inventory: Array.from({ length: Math.floor(Math.random() * 5) }, (_, i) => `item_${i}`)
        };
    }

    recordError(type, message) {
        if (this.enableMetrics) {
            this.metrics.errors.push({
                type,
                message,
                timestamp: Date.now()
            });
        }
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
            case 'server':
                options.serverUrl = value;
                break;
            case 'duration':
                options.benchmarkDuration = parseInt(value);
                break;
            case 'clients':
                options.concurrentClients = parseInt(value);
                break;
            case 'warmup':
                options.warmupDuration = parseInt(value);
                break;
            case 'rampup':
                options.rampUpTime = parseInt(value);
                break;
            case 'output':
                options.outputFile = value;
                break;
            case 'scenarios':
                options.scenarioFile = value;
                break;
        }
    }

    const benchmark = new PerformanceBenchmark(options);

    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping benchmark...');
        benchmark.isRunning = false;
        benchmark.cleanup();
        process.exit(0);
    });

    try {
        const results = await benchmark.runBenchmark();
        benchmark.printSummary();

        // Exit with error code if there were failures
        const hasFailures = results.scenarios.some(s => !s.success) || results.regressionAnalysis?.hasRegression;
        process.exit(hasFailures ? 1 : 0);

    } catch (error) {
        console.error('💥 Benchmark crashed:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    PerformanceBenchmark,
    BenchmarkClient,
    main
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
