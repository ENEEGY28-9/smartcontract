Write-Host "🧪 GameV1 System Test" -ForegroundColor Cyan

# Check required files
Write-Host "`n1. Checking Required Files..." -ForegroundColor Blue

$files = @(
    "docker-compose.yml",
    "config/prometheus.yml",
    "config/alerts.yml",
    "config/grafana/dashboards/gamev1-overview.json",
    "config/grafana/dashboards/gateway-performance.json",
    "config/grafana/dashboards/game-metrics.json",
    "config/grafana/dashboards/system-health.json",
    "config/grafana/dashboards/alert-overview.json"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file (MISSING)" -ForegroundColor Red
    }
}

# Check scripts
Write-Host "`n2. Checking Scripts..." -ForegroundColor Blue
$scripts = @("scripts/setup-grafana.bat", "build-and-start.bat", "start-monitoring.bat")
foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "✓ $script" -ForegroundColor Green
    } else {
        Write-Host "✗ $script (MISSING)" -ForegroundColor Red
    }
}

# Check Docker services
Write-Host "`n3. Checking Docker Services..." -ForegroundColor Blue
if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw
    if ($content -match "gamev1-prometheus") {
        Write-Host "✓ Prometheus service configured" -ForegroundColor Green
    }
    if ($content -match "gamev1-grafana") {
        Write-Host "✓ Grafana service configured" -ForegroundColor Green
    }
    if ($content -match "3100:3100") {
        Write-Host "✓ Worker metrics port configured" -ForegroundColor Green
    }
    if ($content -match "3201:3201") {
        Write-Host "✓ Room Manager metrics port configured" -ForegroundColor Green
    }
}

Write-Host "`n✅ System configuration test completed!" -ForegroundColor Green
