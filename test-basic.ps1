Write-Host "GameV1 System Test" -ForegroundColor Cyan

# Test 1: Check required files
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
        Write-Host "OK: $file" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $file not found" -ForegroundColor Red
    }
}

# Test 2: Check scripts
Write-Host "`n2. Checking Scripts..." -ForegroundColor Blue
$scripts = @("scripts/setup-grafana.bat", "build-and-start.bat", "start-monitoring.bat")
foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "OK: $script" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $script not found" -ForegroundColor Red
    }
}

# Test 3: Check Docker services
Write-Host "`n3. Checking Docker Services..." -ForegroundColor Blue
if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw
    if ($content -match "gamev1-prometheus") {
        Write-Host "OK: Prometheus service configured" -ForegroundColor Green
    }
    if ($content -match "gamev1-grafana") {
        Write-Host "OK: Grafana service configured" -ForegroundColor Green
    }
    if ($content -match "3100:3100") {
        Write-Host "OK: Worker metrics port configured" -ForegroundColor Green
    }
    if ($content -match "3201:3201") {
        Write-Host "OK: Room Manager metrics port configured" -ForegroundColor Green
    }
}

# Test 4: Check Prometheus jobs
Write-Host "`n4. Checking Prometheus Jobs..." -ForegroundColor Blue
if (Test-Path "config/prometheus.yml") {
    $content = Get-Content "config/prometheus.yml" -Raw
    if ($content -match "gamev1-gateway") {
        Write-Host "OK: Gateway scrape job configured" -ForegroundColor Green
    }
    if ($content -match "gamev1-worker") {
        Write-Host "OK: Worker scrape job configured" -ForegroundColor Green
    }
    if ($content -match "gamev1-room-manager") {
        Write-Host "OK: Room Manager scrape job configured" -ForegroundColor Green
    }
}

# Test 5: Check dashboards
Write-Host "`n5. Checking Dashboards..." -ForegroundColor Blue
$dashboardPath = "config/grafana/dashboards"
$dashboards = Get-ChildItem $dashboardPath -Name -Include "*.json"

foreach ($dashboard in $dashboards) {
    try {
        $json = Get-Content "$dashboardPath/$dashboard" -Raw | ConvertFrom-Json
        if ($json.dashboard.title) {
            Write-Host "OK: $dashboard - $($json.dashboard.title)" -ForegroundColor Green
        } else {
            Write-Host "ERROR: $dashboard - Invalid format" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR: $dashboard - Invalid JSON" -ForegroundColor Red
    }
}

Write-Host "`nSystem configuration test completed!" -ForegroundColor Green
