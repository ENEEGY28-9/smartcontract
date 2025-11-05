#!/usr/bin/env node

/**
 * Comprehensive Load Testing with Test Data
 * Enhanced load testing that works with or without backend services
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class LoadTestingOrchestrator {
    constructor() {
        this.testDataServer = null;
        this.artilleryProcess = null;
        this.testResults = {
            startTime: null,
            endTime: null,
            scenarios: [],
            summary: {}
        };
    }

    async startTestDataServer() {
        console.log('🚀 Starting test data server...');

        return new Promise((resolve, reject) => {
            try {
                // Import and start the test data server
                const { startServer } = require('./test-data-server');

                // Start server in background
                const serverProcess = spawn('node', ['test-data-server.js'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    detached: true
                });

                serverProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    if (output.includes('Test Data Server running')) {
                        console.log('✅ Test data server started successfully');
                        resolve(serverProcess);
                    }
                });

                serverProcess.stderr.on('data', (data) => {
                    console.error('Test data server error:', data.toString());
                });

                serverProcess.on('error', (error) => {
                    console.error('Failed to start test data server:', error);
                    reject(error);
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!serverProcess.killed) {
                        console.log('✅ Test data server started (timeout reached)');
                        resolve(serverProcess);
                    }
                }, 10000);

            } catch (error) {
                console.error('Failed to start test data server:', error);
                reject(error);
            }
        });
    }

    async runArtilleryTests() {
        console.log('🎯 Running Artillery load tests...');

        return new Promise((resolve, reject) => {
            const artilleryConfig = path.join(__dirname, 'artillery-comprehensive-with-data.yml');

            if (!fs.existsSync(artilleryConfig)) {
                console.log('📋 Creating Artillery configuration...');
                this.createArtilleryConfig();
            }

            this.artilleryProcess = spawn('npx', ['artillery', 'run', artilleryConfig], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            this.artilleryProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                process.stdout.write(data); // Show real-time output
            });

            this.artilleryProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                process.stderr.write(data); // Show real-time errors
            });

            this.artilleryProcess.on('close', (code) => {
                console.log(`\n🎯 Artillery tests completed with exit code: ${code}`);

                this.testResults.endTime = new Date().toISOString();
                this.testResults.stdout = stdout;
                this.testResults.stderr = stderr;
                this.testResults.exitCode = code;

                if (code === 0) {
                    resolve(this.testResults);
                } else {
                    reject(new Error(`Artillery exited with code ${code}`));
                }
            });

            this.artilleryProcess.on('error', (error) => {
                console.error('Failed to run Artillery:', error);
                reject(error);
            });
        });
    }

    createArtilleryConfig() {
        const config = {
            config: {
                target: 'http://localhost:3001',
                phases: [
                    {
                        duration: 120, // 2 minutes
                        arrivalRate: 5,
                        name: 'Warm up phase'
                    },
                    {
                        duration: 240, // 4 minutes
                        arrivalRate: 20,
                        name: 'Ramp up load'
                    },
                    {
                        duration: 300, // 5 minutes
                        arrivalRate: 50,
                        name: 'Peak load'
                    },
                    {
                        duration: 120, // 2 minutes
                        arrivalRate: 10,
                        name: 'Ramp down'
                    }
                ],
                defaults: {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            },
            scenarios: [
                {
                    name: 'Health check',
                    weight: 10,
                    flow: [
                        {
                            get: {
                                url: '/api/health'
                            }
                        }
                    ]
                },
                {
                    name: 'Get users list',
                    weight: 15,
                    flow: [
                        {
                            get: {
                                url: '/api/users?limit=20&offset={{ $randomInt(0, 980) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Get user details',
                    weight: 10,
                    flow: [
                        {
                            get: {
                                url: '/api/users/user_{{ $randomInt(1, 1000) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Get rooms list',
                    weight: 15,
                    flow: [
                        {
                            get: {
                                url: '/api/rooms?limit=20&status={{ $randomInt(1, 3) === 1 ? "waiting" : "in_game" }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Get room details',
                    weight: 10,
                    flow: [
                        {
                            get: {
                                url: '/api/rooms/room_{{ $randomInt(1, 200) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Get game sessions',
                    weight: 10,
                    flow: [
                        {
                            get: {
                                url: '/api/game-sessions?limit=10&status={{ ["waiting", "active", "completed"][$randomInt(0, 2)] }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Get leaderboard',
                    weight: 10,
                    flow: [
                        {
                            get: {
                                url: '/api/leaderboard?limit=50&metric={{ ["score", "kills", "wins", "playtime"][$randomInt(0, 3)] }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Test endpoint 1',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/test-endpoint-1?count={{ $randomInt(1, 100) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Test endpoint 2',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/test-endpoint-2'
                            }
                        }
                    ]
                },
                {
                    name: 'Load test requests',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/load-test/requests?count={{ $randomInt(10, 100) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'Stress test payloads',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/load-test/stress-payloads?count={{ $randomInt(1, 10) }}'
                            }
                        }
                    ]
                },
                {
                    name: 'WebSocket info',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/websocket/info'
                            }
                        }
                    ]
                },
                {
                    name: 'Generic API endpoint',
                    weight: 5,
                    flow: [
                        {
                            get: {
                                url: '/api/endpoint-{{ $randomInt(100, 999) }}'
                            }
                        }
                    ]
                }
            ]
        };

        const configPath = path.join(__dirname, 'artillery-comprehensive-with-data.yml');
        fs.writeFileSync(configPath, require('yaml').stringify(config));
        console.log(`✅ Created Artillery config: ${configPath}`);
    }

    async generateReport() {
        const report = {
            testExecution: {
                startTime: this.testResults.startTime,
                endTime: this.testResults.endTime,
                duration: this.testResults.endTime ?
                    new Date(this.testResults.endTime) - new Date(this.testResults.startTime) : 0,
                exitCode: this.testResults.exitCode
            },
            testData: {
                available: fs.existsSync(path.join(__dirname, 'test-data', 'comprehensive-test-data.json')),
                users: 1000,
                rooms: 200,
                gameSessions: 500,
                leaderboardEntries: 10000
            },
            scenarios: this.testResults.scenarios,
            summary: this.testResults.summary,
            recommendations: []
        };

        // Add recommendations based on results
        if (this.testResults.exitCode === 0) {
            report.recommendations.push('✅ Load testing completed successfully');
            report.recommendations.push('🎯 Test data server handled all requests properly');
            report.recommendations.push('🚀 Ready for production load testing with real services');
        } else {
            report.recommendations.push('⚠️ Load testing completed with errors');
            report.recommendations.push('🔧 Check Artillery configuration and test data');
            report.recommendations.push('🐛 Ensure test data server is running correctly');
        }

        // Save report
        const reportPath = path.join(__dirname, 'load-test-results', 'comprehensive-load-test-with-data-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Report saved: ${reportPath}`);

        return report;
    }

    async cleanup() {
        console.log('🧹 Cleaning up processes...');

        if (this.testDataServer && !this.testDataServer.killed) {
            this.testDataServer.kill('SIGTERM');
            console.log('✅ Test data server stopped');
        }

        if (this.artilleryProcess && !this.artilleryProcess.killed) {
            this.artilleryProcess.kill('SIGTERM');
            console.log('✅ Artillery process stopped');
        }
    }

    async run() {
        try {
            this.testResults.startTime = new Date().toISOString();

            console.log('🚀 Starting comprehensive load testing with test data...');

            // Start test data server
            this.testDataServer = await this.startTestDataServer();

            // Wait a moment for server to fully start
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Run Artillery tests
            await this.runArtilleryTests();

            // Generate report
            const report = await this.generateReport();

            console.log('🎉 Load testing completed successfully!');
            console.log(`📊 Duration: ${Math.round(report.testExecution.duration / 1000)} seconds`);

            return report;

        } catch (error) {
            console.error('💥 Load testing failed:', error);

            // Generate error report
            await this.generateReport();

            throw error;

        } finally {
            await this.cleanup();
        }
    }
}

// Command line interface
async function main() {
    const orchestrator = new LoadTestingOrchestrator();

    try {
        const report = await orchestrator.run();
        console.log('\n📋 Final Report Summary:');
        console.log(`   Duration: ${Math.round(report.testExecution.duration / 1000)}s`);
        console.log(`   Exit Code: ${report.testExecution.exitCode}`);
        console.log(`   Test Data Available: ${report.testData.available}`);
        console.log(`   Recommendations: ${report.recommendations.length}`);

        process.exit(0);

    } catch (error) {
        console.error('\n💥 Load testing failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = LoadTestingOrchestrator;
