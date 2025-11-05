#!/usr/bin/env node

/**
 * Complete Backend Optimization Suite Runner
 * Orchestrates all optimization testing and monitoring systems
 */

const { IntegrationTestFramework } = require('./gateway/src/integration_tests');
const { PerformanceBenchmark } = require('./performance-benchmarking');
const { StressTestSuite } = require('./stress-testing');
const fs = require('fs').promises;

class OptimizationSuiteRunner {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:8080/ws',
            enableAllTests: options.enableAllTests !== false,
            runIntegrationTests: options.runIntegrationTests !== false,
            runPerformanceBenchmark: options.runPerformanceBenchmark !== false,
            runStressTests: options.runStressTests !== false,
            outputDir: options.outputDir || './optimization-results',
            generateReport: options.generateReport !== false,
            ...options
        };

        this.results = {
            startTime: new Date(),
            suiteName: 'Backend Optimization Suite',
            tests: [],
            summary: {}
        };
    }

    async runCompleteSuite() {
        console.log('🚀 Starting Complete Backend Optimization Suite');
        console.log('=' * 60);

        try {
            // Ensure output directory exists
            await fs.mkdir(this.options.outputDir, { recursive: true });

            // Run integration tests
            if (this.options.runIntegrationTests) {
                await this.runIntegrationTests();
            }

            // Run performance benchmarking
            if (this.options.runPerformanceBenchmark) {
                await this.runPerformanceBenchmark();
            }

            // Run stress testing
            if (this.options.runStressTests) {
                await this.runStressTests();
            }

            // Generate comprehensive report
            if (this.options.generateReport) {
                await this.generateComprehensiveReport();
            }

        } catch (error) {
            console.error('❌ Optimization suite failed:', error);
            this.results.error = error.message;
        } finally {
            this.results.endTime = new Date();
            await this.saveSuiteResults();
        }

        this.printSuiteSummary();
        return this.results;
    }

    async runIntegrationTests() {
        console.log('\n🔧 Running Integration Tests...');

        try {
            const integrationTest = new IntegrationTestFramework({
                serverUrl: this.options.serverUrl
            });

            const results = await integrationTest.run_test_suite();

            this.results.tests.push({
                name: 'integration_tests',
                type: 'integration',
                results,
                success: results.passed_tests > 0 && results.failed_tests === 0
            });

            console.log(`✅ Integration Tests: ${results.passed_tests}/${results.total_tests} passed`);

        } catch (error) {
            console.error('❌ Integration tests failed:', error);
            this.results.tests.push({
                name: 'integration_tests',
                type: 'integration',
                error: error.message,
                success: false
            });
        }
    }

    async runPerformanceBenchmark() {
        console.log('\n📊 Running Performance Benchmark...');

        try {
            const benchmark = new PerformanceBenchmark({
                serverUrl: this.options.serverUrl,
                benchmarkDuration: 300, // 5 minutes
                concurrentClients: 100,
                outputFile: `${this.options.outputDir}/performance-benchmark.json`
            });

            const results = await benchmark.runBenchmark();

            this.results.tests.push({
                name: 'performance_benchmark',
                type: 'performance',
                results,
                success: results.summary.successRate > 80 // 80% success rate
            });

            console.log(`✅ Performance Benchmark completed`);

        } catch (error) {
            console.error('❌ Performance benchmark failed:', error);
            this.results.tests.push({
                name: 'performance_benchmark',
                type: 'performance',
                error: error.message,
                success: false
            });
        }
    }

    async runStressTests() {
        console.log('\n🔥 Running Stress Tests...');

        try {
            const stressTest = new StressTestSuite({
                serverUrl: this.options.serverUrl,
                maxClients: 500,
                testDuration: 900, // 15 minutes
                messagesPerSecond: 5000,
                outputFile: `${this.options.outputDir}/stress-test-results.json`
            });

            const results = await stressTest.runStressTest();

            this.results.tests.push({
                name: 'stress_tests',
                type: 'stress',
                results,
                success: results.stressAnalysis?.connectionStability?.stable &&
                         results.stressAnalysis?.memoryBehavior?.stable
            });

            console.log(`✅ Stress Tests completed`);

        } catch (error) {
            console.error('❌ Stress tests failed:', error);
            this.results.tests.push({
                name: 'stress_tests',
                type: 'stress',
                error: error.message,
                success: false
            });
        }
    }

    async generateComprehensiveReport() {
        console.log('\n📋 Generating Comprehensive Optimization Report...');

        const report = {
            suiteName: this.results.suiteName,
            executionTime: new Date(),
            totalDuration: (this.results.endTime - this.results.startTime) / 1000,
            testResults: this.results.tests,
            recommendations: this.generateRecommendations(),
            performanceInsights: this.generatePerformanceInsights(),
            optimizationOpportunities: this.generateOptimizationOpportunities()
        };

        // Save comprehensive report
        const reportPath = `${this.options.outputDir}/comprehensive-optimization-report.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log(`✅ Comprehensive report saved to ${reportPath}`);
    }

    generateRecommendations() {
        const recommendations = [];

        for (const test of this.results.tests) {
            if (!test.success) {
                switch (test.name) {
                    case 'integration_tests':
                        recommendations.push({
                            category: 'Integration',
                            priority: 'High',
                            issue: 'Integration test failures detected',
                            recommendation: 'Review and fix failing integration test cases'
                        });
                        break;

                    case 'performance_benchmark':
                        recommendations.push({
                            category: 'Performance',
                            priority: 'Medium',
                            issue: 'Performance benchmark issues',
                            recommendation: 'Optimize server performance based on benchmark results'
                        });
                        break;

                    case 'stress_tests':
                        recommendations.push({
                            category: 'Stability',
                            priority: 'High',
                            issue: 'Stress test failures indicate instability',
                            recommendation: 'Address system stability issues under high load'
                        });
                        break;
                }
            }
        }

        return recommendations;
    }

    generatePerformanceInsights() {
        const insights = [];

        for (const test of this.results.tests) {
            if (test.results?.summary) {
                const summary = test.results.summary;

                switch (test.type) {
                    case 'performance':
                        if (summary.averageLatency > 100) {
                            insights.push({
                                type: 'warning',
                                message: `High average latency detected: ${summary.averageLatency.toFixed(2)}ms`
                            });
                        }
                        if (summary.throughput < 1000) {
                            insights.push({
                                type: 'info',
                                message: `Low throughput: ${summary.throughput.toFixed(2)} messages/sec`
                            });
                        }
                        break;

                    case 'stress':
                        if (summary.totalFailures > 0) {
                            insights.push({
                                type: 'error',
                                message: `${summary.totalFailures} failures during stress testing`
                            });
                        }
                        if (summary.successRate < 90) {
                            insights.push({
                                type: 'warning',
                                message: `Low success rate: ${summary.successRate.toFixed(1)}%`
                            });
                        }
                        break;
                }
            }
        }

        return insights;
    }

    generateOptimizationOpportunities() {
        const opportunities = [];

        // Analyze test results for optimization opportunities
        for (const test of this.results.tests) {
            if (test.results?.regressionAnalysis?.hasRegression) {
                opportunities.push({
                    category: 'Performance Regression',
                    description: 'Performance regression detected compared to baseline',
                    impact: 'High',
                    action: 'Investigate and fix performance regression'
                });
            }
        }

        // Add general optimization opportunities
        opportunities.push(
            {
                category: 'Monitoring',
                description: 'Implement comprehensive performance monitoring',
                impact: 'Medium',
                action: 'Set up automated performance monitoring and alerting'
            },
            {
                category: 'Load Balancing',
                description: 'Implement advanced load balancing strategies',
                impact: 'High',
                action: 'Deploy load balancer for better resource distribution'
            },
            {
                category: 'Database Optimization',
                description: 'Optimize database queries and indexing',
                impact: 'Medium',
                action: 'Review and optimize database schema and queries'
            }
        );

        return opportunities;
    }

    async saveSuiteResults() {
        try {
            const resultsPath = `${this.options.outputDir}/optimization-suite-results.json`;
            await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
            console.log(`💾 Suite results saved to ${resultsPath}`);
        } catch (error) {
            console.error('❌ Failed to save suite results:', error);
        }
    }

    printSuiteSummary() {
        console.log('\n🎯 OPTIMIZATION SUITE SUMMARY');
        console.log('=' * 60);

        const totalTests = this.results.tests.length;
        const successfulTests = this.results.tests.filter(t => t.success).length;
        const totalDuration = (this.results.endTime - this.results.startTime) / 1000;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Successful Tests: ${successfulTests}`);
        console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);

        console.log('\nTest Results:');
        for (const test of this.results.tests) {
            const status = test.success ? '✅' : '❌';
            console.log(`  ${status} ${test.name} (${test.type})`);
        }

        if (this.results.tests.some(t => !t.success)) {
            console.log('\n❌ ISSUES DETECTED:');
            this.results.tests
                .filter(t => !t.success)
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error || 'Test failed'}`);
                });
        }

        const overallSuccess = successfulTests === totalTests;
        console.log(`\n🏁 OVERALL STATUS: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (overallSuccess) {
            console.log('\n🎉 Backend optimization suite completed successfully!');
            console.log('Your backend is ready for production deployment.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the results and address issues before deployment.');
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
            case 'output':
                options.outputDir = value;
                break;
            case 'integration':
                options.runIntegrationTests = value === 'true';
                break;
            case 'performance':
                options.runPerformanceBenchmark = value === 'true';
                break;
            case 'stress':
                options.runStressTests = value === 'true';
                break;
            case 'quick':
                // Quick mode - run only essential tests
                options.runIntegrationTests = true;
                options.runPerformanceBenchmark = true;
                options.runStressTests = false;
                break;
        }
    }

    // If no specific tests selected, run all
    if (!options.runIntegrationTests && !options.runPerformanceBenchmark && !options.runStressTests) {
        options.enableAllTests = true;
    }

    const suite = new OptimizationSuiteRunner(options);

    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping optimization suite...');
        process.exit(0);
    });

    try {
        await suite.runCompleteSuite();
    } catch (error) {
        console.error('💥 Optimization suite crashed:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    OptimizationSuiteRunner,
    main
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

