#!/usr/bin/env node

/**
 * Stress Testing System for High-Load Scenarios
 * Comprehensive stress testing with multiple concurrent clients and extreme conditions
 */

const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class StressTestSuite {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:8080/ws',
            maxClients: options.maxClients || 1000,
            rampUpTime: options.rampUpTime || 300, // 5 minutes to reach max clients
            testDuration: options.testDuration || 1800, // 30 minutes total test
            messagesPerSecond: options.messagesPerSecond || 10000, // 10k messages/sec total
            enableResourceMonitoring: options.enableResourceMonitoring !== false,
            stressScenarios: options.stressScenarios || [
                'connection_flood',
                'message_flood',
                'memory_exhaustion',
                'cpu_intensive_operations',
                'network_partition_simulation',
                'database_overload'
            ],
            outputFile: options.outputFile || './stress-test-results.json',
            ...options
        };

        this.results = {
            startTime: null,
            endTime: null,
            scenarios: [],
            metrics: {
                connections: [],
                messages: [],
                latency: [],
                errors: [],
                resourceUsage: []
            },
            summary: {},
            failures: []
        };

        this.clients = [];
        this.activeConnections = 0;
        this.totalMessagesSent = 0;
        this.isRunning = false;
    }

    async runStressTest() {
        console.log('🔥 Starting Extreme Stress Test Suite');
        console.log(`Configuration:`);
        console.log(`- Server: ${this.options.serverUrl}`);
        console.log(`- Max Clients: ${this.options.maxClients}`);
        console.log(`- Test Duration: ${this.options.testDuration}s`);
        console.log(`- Ramp-up Time: ${this.options.rampUpTime}s`);
        console.log(`- Target Messages/sec: ${this.options.messagesPerSecond}`);
        console.log(`- Stress Scenarios: ${this.options.stressScenarios.join(', ')}`);
        console.log('');

        this.results.startTime = new Date();

        try {
            // Initialize monitoring
            if (this.options.enableResourceMonitoring) {
                await this.startResourceMonitoring();
            }

            // Run stress scenarios in sequence
            for (const scenarioName of this.options.stressScenarios) {
                console.log(`\n🚨 Running stress scenario: ${scenarioName}`);
                await this.runStressScenario(scenarioName);
            }

            // Generate comprehensive results
            await this.generateStressResults();

        } catch (error) {
            console.error('❌ Stress test failed:', error);
            this.results.error = error.message;
            this.results.failures.push({
                type: 'stress_test_crash',
                message: error.message,
                timestamp: new Date()
            });
        } finally {
            this.results.endTime = new Date();
            await this.saveStressResults();
            this.cleanup();
        }

        return this.results;
    }

    async runStressScenario(scenarioName) {
        const scenarioStart = performance.now();

        try {
            switch (scenarioName) {
                case 'connection_flood':
                    await this.runConnectionFlood();
                    break;

                case 'message_flood':
                    await this.runMessageFlood();
                    break;

                case 'memory_exhaustion':
                    await this.runMemoryExhaustionTest();
                    break;

                case 'cpu_intensive_operations':
                    await this.runCpuIntensiveTest();
                    break;

                case 'network_partition_simulation':
                    await this.runNetworkPartitionTest();
                    break;

                case 'database_overload':
                    await this.runDatabaseOverloadTest();
                    break;

                default:
                    console.warn(`Unknown stress scenario: ${scenarioName}`);
            }

            const scenarioDuration = (performance.now() - scenarioStart) / 1000;
            console.log(`✅ Stress scenario ${scenarioName} completed in ${scenarioDuration.toFixed(2)}s`);

            this.results.scenarios.push({
                name: scenarioName,
                duration: scenarioDuration,
                success: true,
                metrics: this.getCurrentMetrics()
            });

        } catch (error) {
            console.error(`❌ Stress scenario ${scenarioName} failed:`, error);

            this.results.scenarios.push({
                name: scenarioName,
                duration: (performance.now() - scenarioStart) / 1000,
                success: false,
                error: error.message,
                metrics: this.getCurrentMetrics()
            });

            this.results.failures.push({
                type: 'scenario_failure',
                scenario: scenarioName,
                message: error.message,
                timestamp: new Date()
            });
        }
    }

    async runConnectionFlood() {
        console.log('🌊 Starting connection flood stress test...');

        const targetClients = this.options.maxClients;
        const rampUpSteps = 20;
        const clientsPerStep = Math.ceil(targetClients / rampUpSteps);
        const stepDuration = this.options.rampUpTime / rampUpSteps;

        for (let step = 0; step < rampUpSteps && this.activeConnections < targetClients; step++) {
            const clientsToCreate = Math.min(clientsPerStep, targetClients - this.activeConnections);

            console.log(`Creating ${clientsToCreate} connections (step ${step + 1}/${rampUpSteps})`);

            // Create clients in batches
            const batchPromises = [];
            for (let i = 0; i < clientsToCreate; i++) {
                const clientIndex = this.activeConnections + i;
                const client = new StressTestClient({
                    id: `stress_client_${clientIndex}`,
                    serverUrl: this.options.serverUrl,
                    behavior: 'connect_only'
                });

                batchPromises.push(this.connectStressClient(client));
            }

            await Promise.all(batchPromises);

            this.activeConnections += clientsToCreate;

            // Brief pause between steps to avoid overwhelming the system
            if (step < rampUpSteps - 1) {
                await new Promise(resolve => setTimeout(resolve, stepDuration * 1000));
            }
        }

        console.log(`✅ Connection flood completed: ${this.activeConnections} active connections`);

        // Maintain connections for a while
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    }

    async runMessageFlood() {
        console.log('📨 Starting message flood stress test...');

        const targetClients = Math.min(this.options.maxClients / 2, 500);
        const messagesPerClientPerSecond = Math.ceil(this.options.messagesPerSecond / targetClients);

        console.log(`Target: ${targetClients} clients sending ${messagesPerClientPerSecond} msg/sec each`);

        // Create message-sending clients
        const messageClients = [];
        for (let i = 0; i < targetClients; i++) {
            const client = new StressTestClient({
                id: `message_client_${i}`,
                serverUrl: this.options.serverUrl,
                behavior: 'message_flood',
                messagesPerSecond: messagesPerClientPerSecond,
                messageTypes: ['player_update', 'chat', 'action', 'system']
            });

            messageClients.push(client);
        }

        // Connect all message clients
        const connectPromises = messageClients.map(client => this.connectStressClient(client));
        await Promise.all(connectPromises);

        console.log(`✅ Message flood clients connected: ${messageClients.length}`);

        // Start message flooding
        const floodDuration = 300; // 5 minutes of intense messaging
        const endTime = Date.now() + (floodDuration * 1000);

        console.log(`📨 Starting ${floodDuration}s message flood...`);

        while (Date.now() < endTime && this.isRunning) {
            const messagePromises = messageClients.map(client => client.sendMessageFlood());
            await Promise.all(messagePromises);

            this.totalMessagesSent += messageClients.length;

            // Small delay to control message rate
            await new Promise(resolve => setTimeout(resolve, 100)); // 10ms between batches
        }

        console.log(`✅ Message flood completed: ${this.totalMessagesSent} total messages sent`);
    }

    async runMemoryExhaustionTest() {
        console.log('🧠 Starting memory exhaustion stress test...');

        const memoryClients = [];
        const targetClients = Math.min(this.options.maxClients, 200);

        // Create clients that will accumulate data in memory
        for (let i = 0; i < targetClients; i++) {
            const client = new StressTestClient({
                id: `memory_client_${i}`,
                serverUrl: this.options.serverUrl,
                behavior: 'memory_exhaustion',
                dataRetention: true,
                largeMessageSize: 1024 * 10, // 10KB per message
                messageHistory: 1000 // Keep 1000 messages in memory
            });

            memoryClients.push(client);
        }

        // Connect clients
        const connectPromises = memoryClients.map(client => this.connectStressClient(client));
        await Promise.all(connectPromises);

        console.log(`✅ Memory exhaustion clients connected: ${memoryClients.length}`);

        // Send large messages continuously for 10 minutes
        const testDuration = 600; // 10 minutes
        const endTime = Date.now() + (testDuration * 1000);

        while (Date.now() < endTime && this.isRunning) {
            const messagePromises = memoryClients.map(client => client.sendLargeMessage());
            await Promise.all(messagePromises);

            // Monitor memory usage every 30 seconds
            if (Math.floor(Date.now() / 1000) % 30 === 0) {
                await this.recordResourceMetrics();
            }

            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
        }

        console.log('✅ Memory exhaustion test completed');
    }

    async runCpuIntensiveTest() {
        console.log('⚡ Starting CPU intensive operations stress test...');

        const cpuClients = [];
        const targetClients = Math.min(this.options.maxClients / 4, 100);

        // Create clients that perform CPU-intensive operations
        for (let i = 0; i < targetClients; i++) {
            const client = new StressTestClient({
                id: `cpu_client_${i}`,
                serverUrl: this.options.serverUrl,
                behavior: 'cpu_intensive',
                computationComplexity: 'high',
                parallelOperations: 4
            });

            cpuClients.push(client);
        }

        // Connect clients
        const connectPromises = cpuClients.map(client => this.connectStressClient(client));
        await Promise.all(connectPromises);

        console.log(`✅ CPU intensive clients connected: ${cpuClients.length}`);

        // Run CPU-intensive operations for 5 minutes
        const testDuration = 300; // 5 minutes
        const endTime = Date.now() + (testDuration * 1000);

        while (Date.now() < endTime && this.isRunning) {
            const cpuPromises = cpuClients.map(client => client.performCpuIntensiveOperation());
            await Promise.all(cpuPromises);

            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between operations
        }

        console.log('✅ CPU intensive test completed');
    }

    async runNetworkPartitionTest() {
        console.log('🌐 Starting network partition simulation...');

        // Create clients that will simulate network issues
        const networkClients = [];
        const targetClients = Math.min(this.options.maxClients, 300);

        for (let i = 0; i < targetClients; i++) {
            const client = new StressTestClient({
                id: `network_client_${i}`,
                serverUrl: this.options.serverUrl,
                behavior: 'network_partition',
                partitionSimulation: {
                    enabled: true,
                    partitionProbability: 0.1, // 10% chance of partition per message
                    reconnectDelay: [1000, 5000], // 1-5 seconds
                    packetLossRate: 0.05 // 5% packet loss
                }
            });

            networkClients.push(client);
        }

        // Connect clients
        const connectPromises = networkClients.map(client => this.connectStressClient(client));
        await Promise.all(connectPromises);

        console.log(`✅ Network partition clients connected: ${networkClients.length}`);

        // Simulate network partitions for 8 minutes
        const testDuration = 480; // 8 minutes
        const endTime = Date.now() + (testDuration * 1000);

        while (Date.now() < endTime && this.isRunning) {
            const networkPromises = networkClients.map(client => client.simulateNetworkConditions());
            await Promise.all(networkPromises);

            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds between simulation steps
        }

        console.log('✅ Network partition test completed');
    }

    async runDatabaseOverloadTest() {
        console.log('💾 Starting database overload stress test...');

        const dbClients = [];
        const targetClients = Math.min(this.options.maxClients / 3, 150);

        // Create clients that perform database-intensive operations
        for (let i = 0; i < targetClients; i++) {
            const client = new StressTestClient({
                id: `db_client_${i}`,
                serverUrl: this.options.serverUrl,
                behavior: 'database_overload',
                queryTypes: ['complex_joins', 'large_aggregations', 'frequent_updates', 'bulk_inserts'],
                concurrentQueries: 5
            });

            dbClients.push(client);
        }

        // Connect clients
        const connectPromises = dbClients.map(client => this.connectStressClient(client));
        await Promise.all(connectPromises);

        console.log(`✅ Database overload clients connected: ${dbClients.length}`);

        // Perform database-intensive operations for 7 minutes
        const testDuration = 420; // 7 minutes
        const endTime = Date.now() + (testDuration * 1000);

        while (Date.now() < endTime && this.isRunning) {
            const dbPromises = dbClients.map(client => client.performDatabaseOperations());
            await Promise.all(dbPromises);

            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
        }

        console.log('✅ Database overload test completed');
    }

    async connectStressClient(client) {
        try {
            await client.connect();
            this.clients.push(client);
            return true;
        } catch (error) {
            console.error(`Failed to connect client ${client.id}:`, error);
            this.results.failures.push({
                type: 'connection_failure',
                clientId: client.id,
                message: error.message,
                timestamp: new Date()
            });
            return false;
        }
    }

    async startResourceMonitoring() {
        console.log('📊 Starting resource monitoring...');

        // Monitor system resources every 10 seconds
        this.resourceMonitoringInterval = setInterval(async () => {
            await this.recordResourceMetrics();
        }, 10000);

        // Initial resource recording
        await this.recordResourceMetrics();
    }

    async recordResourceMetrics() {
        const metrics = {
            timestamp: new Date(),
            activeConnections: this.activeConnections,
            totalMessagesSent: this.totalMessagesSent,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            uptime: process.uptime()
        };

        this.results.metrics.resourceUsage.push(metrics);
        console.log(`📊 Resource metrics: ${this.activeConnections} connections, ${this.totalMessagesSent} messages`);
    }

    getCurrentMetrics() {
        return {
            activeConnections: this.activeConnections,
            totalMessagesSent: this.totalMessagesSent,
            averageLatency: this.calculateAverageLatency(),
            errorCount: this.results.failures.length
        };
    }

    calculateAverageLatency() {
        // Calculate average latency from client metrics
        const allLatencies = this.clients.flatMap(client => client.latencySamples || []);
        if (allLatencies.length === 0) return 0;

        return allLatencies.reduce((sum, latency) => sum + latency, 0) / allLatencies.length;
    }

    async generateStressResults() {
        console.log('📊 Generating stress test results...');

        // Calculate final metrics
        const totalTestDuration = (this.results.endTime - this.results.startTime) / 1000;

        this.results.summary = {
            totalScenarios: this.options.stressScenarios.length,
            successfulScenarios: this.results.scenarios.filter(s => s.success).length,
            maxConcurrentClients: this.activeConnections,
            totalMessagesSent: this.totalMessagesSent,
            averageMessagesPerSecond: this.totalMessagesSent / totalTestDuration,
            totalTestDuration,
            averageLatency: this.calculateAverageLatency(),
            totalFailures: this.results.failures.length,
            successRate: ((this.results.scenarios.length - this.results.failures.length) / this.results.scenarios.length) * 100
        };

        // Analyze system behavior under stress
        this.results.stressAnalysis = this.analyzeStressBehavior();

        console.log(`✅ Stress test results generated`);
    }

    analyzeStressBehavior() {
        const analysis = {
            connectionStability: this.analyzeConnectionStability(),
            messageThroughput: this.analyzeMessageThroughput(),
            latencyUnderLoad: this.analyzeLatencyUnderLoad(),
            memoryBehavior: this.analyzeMemoryBehavior(),
            errorPatterns: this.analyzeErrorPatterns()
        };

        return analysis;
    }

    analyzeConnectionStability() {
        const resourceMetrics = this.results.metrics.resourceUsage;
        if (resourceMetrics.length < 2) return { stable: true };

        const connectionCounts = resourceMetrics.map(m => m.activeConnections);
        const maxConnections = Math.max(...connectionCounts);
        const minConnections = Math.min(...connectionCounts);
        const stability = 1 - (Math.abs(maxConnections - minConnections) / maxConnections);

        return {
            stable: stability > 0.9,
            maxConnections,
            minConnections,
            stabilityScore: stability
        };
    }

    analyzeMessageThroughput() {
        const resourceMetrics = this.results.metrics.resourceUsage;
        if (resourceMetrics.length < 2) return { consistent: true };

        const messageRates = resourceMetrics.map((m, index) => {
            if (index === 0) return 0;
            const timeDiff = (m.timestamp - resourceMetrics[index - 1].timestamp) / 1000;
            return (m.totalMessagesSent - resourceMetrics[index - 1].totalMessagesSent) / timeDiff;
        }).slice(1);

        const avgRate = messageRates.reduce((sum, rate) => sum + rate, 0) / messageRates.length;
        const variance = messageRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / messageRates.length;
        const consistency = 1 - (Math.sqrt(variance) / avgRate);

        return {
            consistent: consistency > 0.8,
            averageRate: avgRate,
            consistencyScore: consistency
        };
    }

    analyzeLatencyUnderLoad() {
        const latencies = this.clients.flatMap(client => client.latencySamples || []);
        if (latencies.length === 0) return { acceptable: true };

        const sortedLatencies = [...latencies].sort((a, b) => a - b);
        const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
        const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];

        return {
            acceptable: p95Latency < 200 && p99Latency < 500, // 200ms P95, 500ms P99
            p95Latency,
            p99Latency,
            averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        };
    }

    analyzeMemoryBehavior() {
        const resourceMetrics = this.results.metrics.resourceUsage;
        if (resourceMetrics.length < 2) return { stable: true };

        const memoryUsage = resourceMetrics.map(m => m.memoryUsage.heapUsed);
        const maxMemory = Math.max(...memoryUsage);
        const minMemory = Math.min(...memoryUsage);
        const memoryGrowth = (maxMemory - minMemory) / minMemory;

        return {
            stable: memoryGrowth < 0.5, // Less than 50% memory growth
            maxMemoryMB: Math.round(maxMemory / 1024 / 1024),
            memoryGrowthRate: memoryGrowth,
            hasMemoryLeak: memoryGrowth > 2.0 // More than 200% growth indicates leak
        };
    }

    analyzeErrorPatterns() {
        const errorsByType = {};

        for (const failure of this.results.failures) {
            errorsByType[failure.type] = (errorsByType[failure.type] || 0) + 1;
        }

        const totalErrors = this.results.failures.length;
        const errorRate = totalErrors / this.totalMessagesSent;

        return {
            totalErrors,
            errorRate,
            errorsByType,
            acceptableErrorRate: errorRate < 0.01 // Less than 1% error rate
        };
    }

    async saveStressResults() {
        try {
            await fs.writeFile(this.options.outputFile, JSON.stringify(this.results, null, 2));
            console.log(`💾 Stress test results saved to ${this.options.outputFile}`);
        } catch (error) {
            console.error('❌ Failed to save stress test results:', error);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up stress test clients...');

        if (this.resourceMonitoringInterval) {
            clearInterval(this.resourceMonitoringInterval);
        }

        this.clients.forEach(client => {
            if (client.ws) {
                client.ws.close();
            }
        });

        this.clients = [];
        this.activeConnections = 0;
        this.isRunning = false;
    }

    printStressSummary() {
        console.log('\n🔥 STRESS TEST SUMMARY');
        console.log('=' * 60);
        console.log(`Total Duration: ${this.results.summary.totalTestDuration.toFixed(2)}s`);
        console.log(`Max Concurrent Clients: ${this.results.summary.maxConcurrentClients}`);
        console.log(`Total Messages Sent: ${this.results.summary.totalMessagesSent}`);
        console.log(`Average Messages/sec: ${this.results.summary.averageMessagesPerSecond.toFixed(2)}`);

        if (this.results.summary.averageLatency) {
            console.log(`\nLatency Under Stress:`);
            console.log(`- Average: ${this.results.summary.averageLatency.toFixed(2)}ms`);
        }

        console.log(`\nStress Analysis:`);
        console.log(`- Connection Stability: ${this.results.stressAnalysis.connectionStability.stable ? '✅' : '❌'} (${(this.results.stressAnalysis.connectionStability.stabilityScore * 100).toFixed(1)}%)`);
        console.log(`- Throughput Consistency: ${this.results.stressAnalysis.messageThroughput.consistent ? '✅' : '❌'} (${(this.results.stressAnalysis.messageThroughput.consistencyScore * 100).toFixed(1)}%)`);
        console.log(`- Latency Under Load: ${this.results.stressAnalysis.latencyUnderLoad.acceptable ? '✅' : '❌'}`);
        console.log(`- Memory Stability: ${this.results.stressAnalysis.memoryBehavior.stable ? '✅' : '❌'} (${this.results.stressAnalysis.memoryBehavior.hasMemoryLeak ? 'Memory Leak Detected!' : 'No Memory Leaks'})`);
        console.log(`- Error Rate: ${this.results.stressAnalysis.errorPatterns.acceptableErrorRate ? '✅' : '❌'} (${(this.results.stressAnalysis.errorPatterns.errorRate * 100).toFixed(3)}%)`);

        console.log(`\nFailures:`);
        console.log(`- Total Failures: ${this.results.summary.totalFailures}`);
        console.log(`- Success Rate: ${this.results.summary.successRate.toFixed(1)}%`);

        if (this.results.failures.length > 0) {
            console.log(`\nTop Failure Types:`);
            const errorsByType = this.results.stressAnalysis.errorPatterns.errorsByType;
            Object.entries(errorsByType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .forEach(([type, count]) => {
                    console.log(`  - ${type}: ${count}`);
                });
        }

        // Overall assessment
        const isSystemStable = this.results.stressAnalysis.connectionStability.stable &&
                              this.results.stressAnalysis.messageThroughput.consistent &&
                              this.results.stressAnalysis.latencyUnderLoad.acceptable &&
                              this.results.stressAnalysis.memoryBehavior.stable &&
                              this.results.stressAnalysis.errorPatterns.acceptableErrorRate;

        console.log(`\n🏁 OVERALL ASSESSMENT: ${isSystemStable ? '✅ SYSTEM STABLE' : '❌ SYSTEM UNSTABLE'}`);
    }
}

class StressTestClient {
    constructor(options) {
        this.id = options.id;
        this.serverUrl = options.serverUrl;
        this.behavior = options.behavior || 'normal';
        this.ws = null;
        this.isConnected = false;

        // Behavior-specific options
        this.messagesPerSecond = options.messagesPerSecond || 10;
        this.messageTypes = options.messageTypes || ['player_update'];
        this.dataRetention = options.dataRetention || false;
        this.largeMessageSize = options.largeMessageSize || 1024;
        this.messageHistory = options.messageHistory || 100;
        this.computationComplexity = options.computationComplexity || 'normal';
        this.parallelOperations = options.parallelOperations || 1;

        // Network simulation options
        this.partitionSimulation = options.partitionSimulation || { enabled: false };

        // Metrics collection
        this.latencySamples = [];
        this.messageCount = 0;
        this.errorCount = 0;
        this.startTime = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.startTime = performance.now();
                console.log(`[${this.id}] Connected to server`);
                resolve();
            });

            this.ws.on('error', (error) => {
                this.errorCount++;
                console.error(`[${this.id}] Connection error:`, error);
                reject(error);
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                console.log(`[${this.id}] Disconnected`);
            });
        });
    }

    async sendMessageFlood() {
        if (!this.isConnected) return;

        const messageType = this.messageTypes[Math.floor(Math.random() * this.messageTypes.length)];
        const message = this.generateMessage(messageType);

        try {
            this.ws.send(JSON.stringify(message));
            this.messageCount++;

            // Record latency
            this.latencySamples.push(performance.now() - this.startTime);

            // Maintain message history if enabled
            if (this.dataRetention && this.messageHistory > 0) {
                // In a real implementation, you'd store message history
            }

        } catch (error) {
            this.errorCount++;
        }
    }

    async sendLargeMessage() {
        if (!this.isConnected) return;

        // Generate a large message to stress memory
        const largeData = 'x'.repeat(this.largeMessageSize);
        const message = {
            type: 'large_data',
            player_id: this.id,
            data: {
                content: largeData,
                metadata: this.generateMetadata(),
                timestamp: Date.now()
            }
        };

        try {
            this.ws.send(JSON.stringify(message));
            this.messageCount++;
        } catch (error) {
            this.errorCount++;
        }
    }

    async performCpuIntensiveOperation() {
        if (!this.isConnected) return;

        // Perform CPU-intensive computation
        const result = await this.intensiveComputation();

        const message = {
            type: 'cpu_result',
            player_id: this.id,
            data: {
                computation_result: result,
                complexity: this.computationComplexity,
                timestamp: Date.now()
            }
        };

        try {
            this.ws.send(JSON.stringify(message));
            this.messageCount++;
        } catch (error) {
            this.errorCount++;
        }
    }

    async simulateNetworkConditions() {
        if (!this.isConnected || !this.partitionSimulation.enabled) return;

        // Simulate network partition
        if (Math.random() < this.partitionSimulation.partitionProbability) {
            console.log(`[${this.id}] Simulating network partition`);

            // Close connection temporarily
            this.ws.close();

            // Reconnect after random delay
            const reconnectDelay = this.partitionSimulation.reconnectDelay[0] +
                Math.random() * (this.partitionSimulation.reconnectDelay[1] - this.partitionSimulation.reconnectDelay[0]);

            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    this.errorCount++;
                }
            }, reconnectDelay);
        }

        // Simulate packet loss
        if (Math.random() < this.partitionSimulation.packetLossRate) {
            // Drop this message (don't send it)
            return;
        }

        // Send normal message
        await this.sendMessageFlood();
    }

    async performDatabaseOperations() {
        if (!this.isConnected) return;

        const queryType = this.queryTypes[Math.floor(Math.random() * this.queryTypes.length)];
        const query = this.generateDatabaseQuery(queryType);

        const message = {
            type: 'database_operation',
            player_id: this.id,
            data: {
                query,
                concurrent: this.concurrentQueries,
                timestamp: Date.now()
            }
        };

        try {
            this.ws.send(JSON.stringify(message));
            this.messageCount++;
        } catch (error) {
            this.errorCount++;
        }
    }

    generateMessage(type) {
        const baseMessage = {
            player_id: this.id,
            timestamp: Date.now()
        };

        switch (type) {
            case 'player_update':
                return {
                    ...baseMessage,
                    type: 'player_update',
                    data: {
                        position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
                        rotation: { x: 0, y: Math.random() * 360, z: 0 },
                        velocity: { x: (Math.random() - 0.5) * 10, y: 0, z: (Math.random() - 0.5) * 10 }
                    }
                };

            case 'chat':
                return {
                    ...baseMessage,
                    type: 'chat_message',
                    data: {
                        message: `Stress test message from ${this.id}`,
                        channel: 'global'
                    }
                };

            case 'action':
                return {
                    ...baseMessage,
                    type: 'game_action',
                    data: {
                        action: ['jump', 'attack', 'defend', 'special'][Math.floor(Math.random() * 4)],
                        target: `player_${Math.floor(Math.random() * 1000)}`
                    }
                };

            case 'system':
                return {
                    ...baseMessage,
                    type: 'system_message',
                    data: {
                        event: 'heartbeat',
                        data: this.generateSystemData()
                    }
                };

            default:
                return baseMessage;
        }
    }

    generateMetadata() {
        return {
            tags: Array.from({ length: 10 }, (_, i) => `tag_${i}`),
            attributes: Array.from({ length: 5 }, (_, i) => ({ key: `attr_${i}`, value: `value_${i}` })),
            relationships: Array.from({ length: 3 }, (_, i) => ({ id: `related_${i}`, type: 'reference' }))
        };
    }

    async intensiveComputation() {
        // Perform CPU-intensive computation
        const complexity = {
            'low': 10000,
            'normal': 100000,
            'high': 1000000
        }[this.computationComplexity] || 100000;

        let result = 0;
        for (let i = 0; i < complexity; i++) {
            result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }

        return result;
    }

    generateDatabaseQuery(type) {
        switch (type) {
            case 'complex_joins':
                return 'SELECT * FROM players p JOIN rooms r ON p.room_id = r.id JOIN actions a ON p.id = a.player_id WHERE p.last_seen > NOW() - INTERVAL 1 HOUR';

            case 'large_aggregations':
                return 'SELECT room_id, COUNT(*) as player_count, AVG(score) as avg_score, MAX(score) as max_score FROM players GROUP BY room_id ORDER BY player_count DESC';

            case 'frequent_updates':
                return 'UPDATE players SET last_position = ?, last_action = ?, score = score + ? WHERE id = ?';

            case 'bulk_inserts':
                return 'INSERT INTO actions (player_id, action_type, data, timestamp) VALUES ' +
                       Array.from({ length: 10 }, (_, i) => `(?, ?, ?, NOW())`).join(', ');

            default:
                return 'SELECT COUNT(*) FROM players';
        }
    }

    generateSystemData() {
        return {
            cpu_usage: Math.random() * 100,
            memory_usage: Math.random() * 100,
            active_connections: Math.floor(Math.random() * 1000),
            error_count: Math.floor(Math.random() * 10)
        };
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            // Handle server responses
            switch (message.type) {
                case 'error':
                    this.errorCount++;
                    break;

                case 'ack':
                    // Message acknowledged
                    break;

                default:
                    // Handle other message types
                    break;
            }
        } catch (error) {
            this.errorCount++;
        }
    }
}

// CLI interface for stress testing
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
            case 'clients':
                options.maxClients = parseInt(value);
                break;
            case 'duration':
                options.testDuration = parseInt(value);
                break;
            case 'rampup':
                options.rampUpTime = parseInt(value);
                break;
            case 'messages':
                options.messagesPerSecond = parseInt(value);
                break;
            case 'output':
                options.outputFile = value;
                break;
            case 'scenarios':
                options.stressScenarios = value.split(',');
                break;
        }
    }

    const stressTest = new StressTestSuite(options);

    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping stress test...');
        stressTest.isRunning = false;
        stressTest.cleanup();
        process.exit(0);
    });

    try {
        const results = await stressTest.runStressTest();
        stressTest.printStressSummary();

        // Exit with error code if system was unstable
        const isSystemStable = results.stressAnalysis?.connectionStability?.stable &&
                              results.stressAnalysis?.messageThroughput?.consistent &&
                              results.stressAnalysis?.latencyUnderLoad?.acceptable &&
                              results.stressAnalysis?.memoryBehavior?.stable &&
                              results.stressAnalysis?.errorPatterns?.acceptableErrorRate;

        process.exit(isSystemStable ? 0 : 1);

    } catch (error) {
        console.error('💥 Stress test crashed:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    StressTestSuite,
    StressTestClient,
    main
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

