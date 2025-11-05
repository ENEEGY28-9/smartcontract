#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORTS_DIR = 'artillery-reports';
const HTML_DIR = 'artillery-html-reports';

function parseArtilleryReport(jsonFile) {
    try {
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

        return {
            metadata: {
                timestamp: data.metadata ? data.metadata.timestamp : new Date().toISOString(),
                duration: data.metadata ? data.metadata.duration : 0,
                scenarios: data.metadata ? data.metadata.scenarios : [],
                target: data.metadata ? data.metadata.target : 'unknown'
            },
            aggregate: data.aggregate || {},
            intermediate: data.intermediate || [],
            errors: data.errors || [],
            counters: data.counters || {},
            rates: data.rates || {}
        };
    } catch (error) {
        console.error(`Error parsing ${jsonFile}:`, error.message);
        return null;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

function generateHTMLReport(reportData, outputFile) {
    const timestamp = new Date(reportData.metadata.timestamp).toLocaleString();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artillery Load Test Report - ${reportData.metadata.target}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .subtitle {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #4facfe;
        }
        .metric-card.error {
            border-left-color: #dc3545;
        }
        .metric-card.warning {
            border-left-color: #ffc107;
        }
        .metric-card.success {
            border-left-color: #28a745;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .details {
            padding: 30px;
            border-top: 1px solid #eee;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h3 {
            color: #4facfe;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .chart-container {
            height: 300px;
            margin: 20px 0;
            background: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
        .error-list {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .error-item {
            background: white;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            border-left: 3px solid #e53e3e;
        }
        .code {
            background: #f7fafc;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            overflow-x: auto;
            margin: 10px 0;
        }
        .summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            margin-top: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-excellent { background: #28a745; }
        .status-good { background: #ffc107; color: #333; }
        .status-poor { background: #dc3545; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Artillery Load Test Report</h1>
            <div class="subtitle">${reportData.metadata.target}</div>
            <div class="subtitle">Generated on ${timestamp}</div>
        </div>

        <div class="metrics">
            <div class="metric-card ${getStatusClass(reportData.aggregate.errorRate || 0)}">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value">${((reportData.aggregate.errorRate || 0) * 100).toFixed(2)}%</div>
            </div>

            <div class="metric-card ${getStatusClass(reportData.aggregate.p95 || 0)}">
                <div class="metric-label">P95 Response Time</div>
                <div class="metric-value">${(reportData.aggregate.p95 || 0).toFixed(0)}ms</div>
            </div>

            <div class="metric-card success">
                <div class="metric-label">Requests/Second</div>
                <div class="metric-value">${(reportData.aggregate.rps || 0).toFixed(1)}</div>
            </div>

            <div class="metric-card success">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">${(reportData.aggregate.total || 0).toLocaleString()}</div>
            </div>
        </div>

        <div class="details">
            <div class="section">
                <h3>📊 Performance Metrics</h3>
                <table>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                    </tr>
                    <tr>
                        <td>Min Response Time</td>
                        <td>${(reportData.aggregate.min || 0).toFixed(0)}ms</td>
                        <td><span class="status-badge status-excellent">Excellent</span></td>
                    </tr>
                    <tr>
                        <td>Max Response Time</td>
                        <td>${(reportData.aggregate.max || 0).toFixed(0)}ms</td>
                        <td><span class="status-badge ${getStatusClass(reportData.aggregate.max || 0)}">${getStatusText(reportData.aggregate.max || 0)}</span></td>
                    </tr>
                    <tr>
                        <td>Median Response Time</td>
                        <td>${(reportData.aggregate.median || 0).toFixed(0)}ms</td>
                        <td><span class="status-badge ${getStatusClass(reportData.aggregate.median || 0)}">${getStatusText(reportData.aggregate.median || 0)}</span></td>
                    </tr>
                    <tr>
                        <td>P99 Response Time</td>
                        <td>${(reportData.aggregate.p99 || 0).toFixed(0)}ms</td>
                        <td><span class="status-badge ${getStatusClass(reportData.aggregate.p99 || 0)}">${getStatusText(reportData.aggregate.p99 || 0)}</span></td>
                    </tr>
                    <tr>
                        <td>Requests per Second</td>
                        <td>${(reportData.aggregate.rps || 0).toFixed(2)}</td>
                        <td><span class="status-badge status-excellent">Excellent</span></td>
                    </tr>
                    <tr>
                        <td>Total Requests</td>
                        <td>${(reportData.aggregate.total || 0).toLocaleString()}</td>
                        <td><span class="status-badge status-excellent">Excellent</span></td>
                    </tr>
                </table>
            </div>

            ${reportData.errors && reportData.errors.length > 0 ? `
            <div class="section">
                <h3>❌ Errors (${reportData.errors.length})</h3>
                <div class="error-list">
                    ${reportData.errors.map(error => `
                        <div class="error-item">
                            <strong>${error.name || 'Unknown Error'}</strong>
                            <div>${error.message || error.description || 'No description available'}</div>
                            <div class="code">${JSON.stringify(error, null, 2)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h3>📈 Response Time Distribution</h3>
                <div class="chart-container">
                    📊 Chart visualization would go here<br>
                    (Response time percentiles and distribution)
                </div>
            </div>

            <div class="section">
                <h3>🔗 Test Configuration</h3>
                <div class="code">${JSON.stringify(reportData.metadata, null, 2)}</div>
            </div>
        </div>

        <div class="summary">
            <h3>🎯 Test Summary</h3>
            <p>
                ${getOverallStatus(reportData.aggregate)}<br>
                Test completed in ${formatDuration(reportData.metadata.duration)} with
                ${(reportData.aggregate.total || 0).toLocaleString()} total requests.
            </p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(outputFile, html);
    return outputFile;
}

function getStatusClass(value) {
    if (typeof value !== 'number') return 'status-good';

    if (value < 50) return 'status-excellent';
    if (value < 200) return 'status-good';
    return 'status-poor';
}

function getStatusText(value) {
    if (value < 50) return 'Excellent';
    if (value < 200) return 'Good';
    return 'Needs Attention';
}

function getOverallStatus(aggregate) {
    const errorRate = aggregate.errorRate || 0;
    const p95 = aggregate.p95 || 0;

    if (errorRate < 0.01 && p95 < 100) {
        return '✅ Excellent performance! All metrics within acceptable ranges.';
    } else if (errorRate < 0.05 && p95 < 200) {
        return '⚠️ Good performance with minor issues. Monitor closely.';
    } else {
        return '❌ Performance issues detected. Review errors and optimize.';
    }
}

function generateAllReports() {
    if (!fs.existsSync(REPORTS_DIR)) {
        console.error(`❌ Reports directory not found: ${REPORTS_DIR}`);
        return;
    }

    if (!fs.existsSync(HTML_DIR)) {
        fs.mkdirSync(HTML_DIR, { recursive: true });
    }

    const jsonFiles = fs.readdirSync(REPORTS_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(REPORTS_DIR, file));

    console.log(`📊 Found ${jsonFiles.length} report files`);
    console.log('🔄 Generating HTML reports...\n');

    let successCount = 0;
    let errorCount = 0;

    jsonFiles.forEach(jsonFile => {
        const reportData = parseArtilleryReport(jsonFile);

        if (reportData) {
            const baseName = path.basename(jsonFile, '.json');
            const htmlFile = path.join(HTML_DIR, `${baseName}.html`);

            try {
                const outputFile = generateHTMLReport(reportData, htmlFile);
                console.log(`✅ Generated: ${path.relative(process.cwd(), outputFile)}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to generate report for ${jsonFile}:`, error.message);
                errorCount++;
            }
        } else {
            console.log(`⚠️  Skipped: ${path.relative(process.cwd(), jsonFile)} (parse error)`);
            errorCount++;
        }
    });

    console.log(`\n🎉 Report generation complete!`);
    console.log(`   ✅ Success: ${successCount} reports`);
    console.log(`   ❌ Errors: ${errorCount} reports`);

    if (successCount > 0) {
        console.log(`\n📂 HTML reports available in: ${HTML_DIR}/`);
        console.log(`🌐 Open reports in browser to view detailed results`);
    }
}

function generateSummaryReport() {
    if (!fs.existsSync(REPORTS_DIR)) {
        console.error(`❌ Reports directory not found: ${REPORTS_DIR}`);
        return;
    }

    const jsonFiles = fs.readdirSync(REPORTS_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(REPORTS_DIR, file));

    if (jsonFiles.length === 0) {
        console.log(`❌ No report files found in ${REPORTS_DIR}`);
        return;
    }

    console.log(`📊 Generating summary report from ${jsonFiles.length} test runs...\n`);

    const allReports = jsonFiles.map(file => {
        const data = parseArtilleryReport(file);
        return data ? {
            file: path.basename(file),
            data,
            timestamp: data.metadata.timestamp
        } : null;
    }).filter(Boolean);

    if (allReports.length === 0) {
        console.log(`❌ No valid reports found`);
        return;
    }

    // Sort by timestamp
    allReports.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const summary = {
        generated: new Date().toISOString(),
        totalTests: allReports.length,
        timeRange: {
            start: allReports[0].timestamp,
            end: allReports[allReports.length - 1].timestamp
        },
        results: allReports.map(report => ({
            timestamp: report.timestamp,
            file: report.file,
            target: report.data.metadata.target,
            duration: report.data.metadata.duration,
            errorRate: report.data.aggregate.errorRate || 0,
            p95: report.data.aggregate.p95 || 0,
            rps: report.data.aggregate.rps || 0,
            totalRequests: report.data.aggregate.total || 0
        }))
    };

    const summaryFile = path.join(REPORTS_DIR, `summary-${Date.now()}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`✅ Summary report generated: ${summaryFile}`);
    console.log(`\n📈 Test Summary:`);
    console.log(`   Total test runs: ${allReports.length}`);
    console.log(`   Time range: ${new Date(summary.timeRange.start).toLocaleString()} - ${new Date(summary.timeRange.end).toLocaleString()}`);

    // Calculate averages
    const avgErrorRate = summary.results.reduce((sum, r) => sum + r.errorRate, 0) / summary.results.length;
    const avgP95 = summary.results.reduce((sum, r) => sum + r.p95, 0) / summary.results.length;
    const avgRPS = summary.results.reduce((sum, r) => sum + r.rps, 0) / summary.results.length;
    const totalRequests = summary.results.reduce((sum, r) => sum + r.totalRequests, 0);

    console.log(`   Average error rate: ${(avgErrorRate * 100).toFixed(2)}%`);
    console.log(`   Average P95 response time: ${avgP95.toFixed(0)}ms`);
    console.log(`   Average RPS: ${avgRPS.toFixed(1)}`);
    console.log(`   Total requests across all tests: ${totalRequests.toLocaleString()}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🎯 Artillery Report Generator

Usage:
  node generate-artillery-report.js [options]

Options:
  --all              Generate HTML reports for all JSON files (default)
  --summary          Generate summary report only
  --help             Show this help message

Examples:
  node generate-artillery-report.js --all
  node generate-artillery-report.js --summary

Output:
  HTML reports are saved to: artillery-html-reports/
  Summary reports are saved to: artillery-reports/
`);
    process.exit(0);
}

if (args.includes('--summary')) {
    generateSummaryReport();
} else {
    generateAllReports();
}
