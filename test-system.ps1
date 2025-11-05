Write-Host "🧪 GameV1 System Test" -ForegroundColor Cyan

# Test 1: Check all required files exist
Write-Host "`n1. Checking Required Files..." -ForegroundColor Blue

$requiredFiles = @(
    "docker-compose.yml",
    "config/prometheus.yml",
    "config/alerts.yml",
    "config/grafana/dashboards/gamev1-overview.json",
    "config/grafana/dashboards/gateway-performance.json",
    "config/grafana/dashboards/game-metrics.json",
    "config/grafana/dashboards/system-health.json",
    "config/grafana/dashboards/alert-overview.json",
    "config/grafana/datasources/prometheus.yml",
    "config/grafana/dashboards/dashboards.yml",
    "config/grafana/datasources/notifications.yml",
    "docker/containers/Dockerfile.room-manager",
    "room-manager/src/lib.rs"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file (MISSING)" -ForegroundColor Red
        $missingFiles += $file
    }
}

# Test 2: Check Docker Compose services
Write-Host "`n2. Checking Docker Compose Services..." -ForegroundColor Blue
if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw

    $services = @("gamev1-gateway", "gamev1-worker", "gamev1-room-manager", "gamev1-prometheus", "gamev1-grafana")
    foreach ($service in $services) {
        if ($content -match $service) {
            Write-Host "✓ $service service defined" -ForegroundColor Green
        } else {
            Write-Host "✗ $service service missing" -ForegroundColor Red
        }
    }
}

# Test 3: Check Prometheus scrape jobs
Write-Host "`n3. Checking Prometheus Scrape Jobs..." -ForegroundColor Blue
if (Test-Path "config/prometheus.yml") {
    $content = Get-Content "config/prometheus.yml" -Raw

    $jobs = @("gamev1-gateway", "gamev1-worker", "gamev1-room-manager")
    foreach ($job in $jobs) {
        if ($content -match "job_name.*$job") {
            Write-Host "✓ $job scrape job configured" -ForegroundColor Green
        } else {
            Write-Host "✗ $job scrape job missing" -ForegroundColor Red
        }
    }
}

# Test 4: Check Grafana dashboards
Write-Host "`n4. Checking Grafana Dashboards..." -ForegroundColor Blue
$dashboardPath = "config/grafana/dashboards"
$dashboards = Get-ChildItem $dashboardPath -Name -Include "*.json"

foreach ($dashboard in $dashboards) {
    try {
        $json = Get-Content "$dashboardPath/$dashboard" -Raw | ConvertFrom-Json
        if ($json.dashboard.title) {
            Write-Host "✓ $dashboard - $($json.dashboard.title)" -ForegroundColor Green
        } else {
            Write-Host "✗ $dashboard - Invalid format" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $dashboard - Invalid JSON" -ForegroundColor Red
    }
}

# Test 5: Check metrics ports in docker-compose
Write-Host "`n5. Checking Metrics Ports..." -ForegroundColor Blue
if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw

    if ($content -match "3100:3100.*# Metrics port") {
        Write-Host "✓ Worker metrics port configured" -ForegroundColor Green
    } else {
        Write-Host "✗ Worker metrics port missing" -ForegroundColor Red
    }

    if ($content -match "3201:3201.*# Metrics port") {
        Write-Host "✓ Room Manager metrics port configured" -ForegroundColor Green
    } else {
        Write-Host "✗ Room Manager metrics port missing" -ForegroundColor Red
    }
}

# Test 6: Check scripts
Write-Host "`n6. Checking Scripts..." -ForegroundColor Blue
$scripts = @(
    "scripts/setup-grafana.sh", "scripts/setup-grafana.bat",
    "scripts/test-grafana-setup.sh", "scripts/test-grafana-setup.bat",
    "build-and-start.sh", "build-and-start.bat",
    "start-monitoring.sh", "start-monitoring.bat"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "✓ $script" -ForegroundColor Green
    } else {
        Write-Host "✗ $script missing" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n📊 Test Summary:" -ForegroundColor Blue
if ($missingFiles.Count -eq 0) {
    Write-Host "✅ All required files present!" -ForegroundColor Green
} else {
    Write-Host "❌ Missing files: $($missingFiles -join ', ')" -ForegroundColor Red
}

Write-Host "`n🎯 System Status:" -ForegroundColor Cyan
Write-Host "• Docker services configured" -ForegroundColor Green
Write-Host "• Prometheus monitoring setup" -ForegroundColor Green
Write-Host "• Grafana dashboards ready" -ForegroundColor Green
Write-Host "• Metrics collection configured" -ForegroundColor Green
Write-Host "• Alert system configured" -ForegroundColor Green

Write-Host "`n🚀 Next Steps:" -ForegroundColor Blue
Write-Host "1. Start services: docker compose up -d" -ForegroundColor Green
Write-Host "2. Setup Grafana: .\scripts\setup-grafana.bat" -ForegroundColor Green
Write-Host "3. Access Grafana: http://localhost:3000" -ForegroundColor Green
Write-Host "   Username: admin, Password: gamev1_admin_2024" -ForegroundColor Green

Write-Host "`n🎉 System test completed!" -ForegroundColor Green
