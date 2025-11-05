Write-Host "Grafana Dashboards Validation" -ForegroundColor Cyan

# Test JSON validity of all dashboards
Write-Host "`n1. Validating Dashboard JSON Files..." -ForegroundColor Blue

$dashboardPath = "config/grafana/dashboards"
$dashboards = Get-ChildItem $dashboardPath -Name -Include "*.json"

$validCount = 0
$totalCount = 0

foreach ($dashboard in $dashboards) {
    $totalCount++
    try {
        $json = Get-Content "$dashboardPath/$dashboard" -Raw | ConvertFrom-Json
        if ($json.dashboard.title) {
            Write-Host "VALID: $dashboard - $($json.dashboard.title)" -ForegroundColor Green

            # Check for panels
            if ($json.dashboard.panels) {
                $panelCount = $json.dashboard.panels.Count
                Write-Host "  Panels: $panelCount" -ForegroundColor Gray
            }

            # Check refresh interval
            if ($json.dashboard.refresh) {
                Write-Host "  Refresh: $($json.dashboard.refresh)" -ForegroundColor Gray
            }

            $validCount++
        } else {
            Write-Host "INVALID: $dashboard - Missing title" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR: $dashboard - Invalid JSON format" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nValidation Summary:" -ForegroundColor Blue
Write-Host "Total dashboards: $totalCount"
Write-Host "Valid dashboards: $validCount"

if ($validCount -eq $totalCount) {
    Write-Host "All dashboards are valid!" -ForegroundColor Green
} else {
    Write-Host "Some dashboards have issues!" -ForegroundColor Red
}

# Test 2: Check Grafana provisioning
Write-Host "`n2. Checking Grafana Provisioning..." -ForegroundColor Blue

if (Test-Path "config/grafana/datasources/prometheus.yml") {
    Write-Host "OK: Prometheus datasource config exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Prometheus datasource config missing" -ForegroundColor Red
}

if (Test-Path "config/grafana/dashboards/dashboards.yml") {
    Write-Host "OK: Dashboard provisioning config exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Dashboard provisioning config missing" -ForegroundColor Red
}

if (Test-Path "config/grafana/datasources/notifications.yml") {
    Write-Host "OK: Notification channels config exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: Notification channels config missing" -ForegroundColor Red
}

# Test 3: Check Prometheus configuration
Write-Host "`n3. Checking Prometheus Configuration..." -ForegroundColor Blue

if (Test-Path "config/prometheus.yml") {
    $content = Get-Content "config/prometheus.yml" -Raw

    # Check for required jobs
    $jobs = @("gamev1-gateway", "gamev1-worker", "gamev1-room-manager")
    foreach ($job in $jobs) {
        if ($content -match "job_name.*$job") {
            Write-Host "OK: $job scrape job configured" -ForegroundColor Green
        } else {
            Write-Host "ERROR: $job scrape job missing" -ForegroundColor Red
        }
    }

    # Check scrape interval
    if ($content -match "scrape_interval.*10s") {
        Write-Host "OK: Scrape interval set to 10s" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Scrape interval not optimal" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Prometheus config missing" -ForegroundColor Red
}

# Test 4: Check Docker Compose services
Write-Host "`n4. Checking Docker Compose Services..." -ForegroundColor Blue

if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw

    $services = @("gamev1-gateway", "gamev1-worker", "gamev1-room-manager", "gamev1-prometheus", "gamev1-grafana")
    foreach ($service in $services) {
        if ($content -match $service) {
            Write-Host "OK: $service defined" -ForegroundColor Green
        } else {
            Write-Host "ERROR: $service missing" -ForegroundColor Red
        }
    }

    # Check metrics ports
    if ($content -match "3100:3100.*Metrics port") {
        Write-Host "OK: Worker metrics port configured" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Worker metrics port missing" -ForegroundColor Red
    }

    if ($content -match "3201:3201.*Metrics port") {
        Write-Host "OK: Room Manager metrics port configured" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Room Manager metrics port missing" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: docker-compose.yml missing" -ForegroundColor Red
}

Write-Host "`nGrafana Dashboards validation completed!" -ForegroundColor Green
