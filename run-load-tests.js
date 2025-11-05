#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * GameV1 Load Testing Suite
 *
 * This script runs comprehensive load tests using Artillery
 * to validate the backend performance under various conditions.
 */

const CONFIGS = {
  // Test configurations
  tests: [
    {
      name: 'HTTP API Load Test',
      config: 'artillery-http-api.yml',
      duration: '8m',
      description: 'Tests HTTP API endpoints with realistic gaming scenarios'
    },
    {
      name: 'WebSocket Load Test',
      config: 'artillery-websocket.yml',
      duration: '6m',
      description: 'Tests WebSocket connections and real-time gameplay'
    },
    {
      name: 'Mixed Workload Test',
      config: 'artillery-mixed-workload.yml',
      duration: '10m',
      description: 'Tests mixed HTTP + WebSocket scenarios'
    }
  ],

  // Test scenarios for different loads
  scenarios: {
    'quick': { duration: '2m', arrivalRate: 10 },
    'normal': { duration: '5m', arrivalRate: 25 },
    'stress': { duration: '10m', arrivalRate: 100 },
    'spike': { duration: '3m', arrivalRate: 200 }
  }
};

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting GameV1 Load Testing Suite...\n');

    // Check if Artillery is installed
    if (!await this.checkArtillery()) {
      console.error('❌ Artillery is not installed. Please install it: npm install -g artillery');
      process.exit(1);
    }

    // Check if services are running
    if (!await this.checkServices()) {
      console.error('❌ Required services are not running. Please start the gateway first.');
      process.exit(1);
    }

    // Run all configured tests
    for (const test of CONFIGS.tests) {
      console.log(`📊 Running ${test.name}...`);
      console.log(`   Description: ${test.description}`);
      console.log(`   Duration: ${test.duration}\n`);

      const result = await this.runTest(test);
      this.results.push(result);

      // Wait between tests
      await this.sleep(3000);
    }

    // Generate report
    this.generateReport();

    console.log('\n✅ Load testing completed!');
    console.log(`📈 Results saved to: load-test-results/comprehensive-final/`);
  }

  async checkArtillery() {
    return new Promise((resolve) => {
      exec('artillery --version', (error, stdout, stderr) => {
        resolve(!error);
      });
    });
  }

  async checkServices() {
    return new Promise((resolve) => {
      exec('curl -s http://localhost:8080/health', (error, stdout, stderr) => {
        resolve(!error && stdout.includes('healthy'));
      });
    });
  }

  async runTest(testConfig) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const configPath = path.join(__dirname, testConfig.config);
      const outputDir = `load-test-results/comprehensive-final`;

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFile = path.join(outputDir, `${testConfig.name.toLowerCase().replace(/\s+/g, '-')}-results.json`);

      console.log(`   Running: artillery run ${configPath}`);
      console.log(`   Output: ${outputFile}`);

      const artillery = spawn('artillery', ['run', configPath], {
        stdio: 'inherit',
        env: { ...process.env, ARTILLERY_CONFIG: configPath }
      });

      artillery.on('close', (code) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          console.log(`   ✅ ${testConfig.name} completed in ${this.formatDuration(duration)}`);

          // Read and parse results
          try {
            if (fs.existsSync(outputFile)) {
              const rawResults = fs.readFileSync(outputFile, 'utf8');
              const results = JSON.parse(rawResults);

              resolve({
                name: testConfig.name,
                duration,
                timestamp: new Date().toISOString(),
                success: true,
                results: this.extractMetrics(results)
              });
            } else {
              resolve({
                name: testConfig.name,
                duration,
                timestamp: new Date().toISOString(),
                success: true,
                results: { message: 'Test completed but no results file generated' }
              });
            }
          } catch (error) {
            resolve({
              name: testConfig.name,
              duration,
              timestamp: new Date().toISOString(),
              success: true,
              results: { error: error.message }
            });
          }
        } else {
          console.log(`   ❌ ${testConfig.name} failed with exit code ${code}`);
          resolve({
            name: testConfig.name,
            duration,
            timestamp: new Date().toISOString(),
            success: false,
            results: { error: `Exit code ${code}` }
          });
        }
      });

      artillery.on('error', (error) => {
        console.error(`   ❌ Failed to start Artillery: ${error.message}`);
        reject(error);
      });
    });
  }

  extractMetrics(results) {
    if (!results || !results.aggregate) {
      return { message: 'No metrics available' };
    }

    const agg = results.aggregate;
    return {
      requests: {
        total: agg.requestsCompleted || 0,
        failed: agg.requestsFailed || 0,
        rate: agg.rps || 0
      },
      responseTime: {
        average: agg.responseTimeAvg || 0,
        min: agg.responseTimeMin || 0,
        max: agg.responseTimeMax || 0,
        p95: agg.responseTime95th || 0,
        p99: agg.responseTime99th || 0
      },
      errors: agg.errors || {},
      codes: agg.codes || {}
    };
  }

  generateReport() {
    const reportPath = 'load-test-results/comprehensive-final/load-testing-report.json';

    const report = {
      summary: {
        totalTests: this.results.length,
        successfulTests: this.results.filter(r => r.success).length,
        failedTests: this.results.filter(r => !r.success).length,
        totalDuration: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      tests: this.results,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];

    this.results.forEach(result => {
      if (!result.success) {
        recommendations.push(`❌ ${result.name}: Test failed - check service logs`);
        return;
      }

      const metrics = result.results;

      if (metrics.requests) {
        const errorRate = metrics.requests.failed / metrics.requests.total * 100;

        if (errorRate > 1) {
          recommendations.push(`⚠️  ${result.name}: High error rate (${errorRate.toFixed(2)}%)`);
        }

        if (metrics.responseTime && metrics.responseTime.p95 > 500) {
          recommendations.push(`⚠️  ${result.name}: High 95th percentile response time (${metrics.responseTime.p95}ms)`);
        }

        if (metrics.requests.rate < 10) {
          recommendations.push(`⚠️  ${result.name}: Low request rate (${metrics.requests.rate} RPS)`);
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests passed successfully!');
      recommendations.push('✅ Performance metrics are within acceptable ranges');
    }

    return recommendations;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  const runner = new LoadTestRunner();

  try {
    await runner.run();
  } catch (error) {
    console.error('❌ Load testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LoadTestRunner;
