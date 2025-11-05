# GameV1 Configuration Test Script
# Tests all configurations without running Docker services

Write-Host "🧪 Testing GameV1 Configurations..." -ForegroundColor Cyan

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$NC = "White"

$errors = 0
$warnings = 0

# Test 1: Check Docker Compose Configuration
Write-Host "`n1. Checking Docker Compose Configuration..." -ForegroundColor $Blue
if (Test-Path "docker-compose.yml") {
    Write-Host "✓ docker-compose.yml exists" -ForegroundColor $Green
    $content = Get-Content "docker-compose.yml" -Raw

    # Check if room-manager service is defined
    if ($content -match "gamev1-room-manager:") {
        Write-Host "✓ Room Manager service defined" -ForegroundColor $Green
    } else {
        Write-Host "✗ Room Manager service missing" -ForegroundColor $Red
        $errors++
    }

    # Check if monitoring services are defined
    $monitoringServices = @("gamev1-prometheus", "gamev1-grafana")
    foreach ($service in $monitoringServices) {
        if ($content -match "$service`:") {
            Write-Host "✓ $service service defined" -ForegroundColor $Green
        } else {
            Write-Host "✗ $service service missing" -ForegroundColor $Red
            $errors++
        }
    }

    # Check metrics ports
    if ($content -match "3100:3100.*# Metrics port") {
        Write-Host "✓ Worker metrics port configured" -ForegroundColor $Green
    } else {
        Write-Host "✗ Worker metrics port missing" -ForegroundColor $Red
        $errors++
    }

    if ($content -match "3201:3201.*# Metrics port") {
        Write-Host "✓ Room Manager metrics port configured" -ForegroundColor $Green
    } else {
        Write-Host "✗ Room Manager metrics port missing" -ForegroundColor $Red
        $errors++
    }
} else {
    Write-Host "✗ docker-compose.yml not found" -ForegroundColor $Red
    $errors++
}

# Test 2: Check Grafana Dashboards
Write-Host "`n2. Checking Grafana Dashboards..." -ForegroundColor $Blue
$dashboardPath = "config/grafana/dashboards"
$requiredDashboards = @(
    "gamev1-overview.json",
    "gateway-performance.json",
    "game-metrics.json",
    "system-health.json",
    "alert-overview.json"
)

foreach ($dashboard in $requiredDashboards) {
    if (Test-Path "$dashboardPath/$dashboard") {
        Write-Host "✓ $dashboard exists" -ForegroundColor $Green

        # Validate JSON format
        try {
            $json = Get-Content "$dashboardPath/$dashboard" -Raw | ConvertFrom-Json
            if ($json.dashboard.title) {
                Write-Host "  - Valid JSON with title: $($json.dashboard.title)" -ForegroundColor $Green
            }
        } catch {
            Write-Host "  - Invalid JSON format" -ForegroundColor $Red
            $errors++
        }
    } else {
        Write-Host "✗ $dashboard missing" -ForegroundColor $Red
        $errors++
    }
}

# Test 3: Check Grafana Provisioning
Write-Host "`n3. Checking Grafana Provisioning..." -ForegroundColor $Blue
if (Test-Path "config/grafana/datasources/prometheus.yml") {
    Write-Host "✓ Prometheus datasource config exists" -ForegroundColor $Green
    $content = Get-Content "config/grafana/datasources/prometheus.yml" -Raw
    if ($content -match "localhost:9090") {
        Write-Host "  - Correct Prometheus URL configured" -ForegroundColor $Green
    } else {
        Write-Host "  - Incorrect Prometheus URL" -ForegroundColor $Yellow
        $warnings++
    }
} else {
    Write-Host "✗ Prometheus datasource config missing" -ForegroundColor $Red
    $errors++
}

if (Test-Path "config/grafana/dashboards/dashboards.yml") {
    Write-Host "✓ Dashboard provisioning config exists" -ForegroundColor $Green
} else {
    Write-Host "✗ Dashboard provisioning config missing" -ForegroundColor $Red
    $errors++
}

if (Test-Path "config/grafana/datasources/notifications.yml") {
    Write-Host "✓ Notification channels config exists" -ForegroundColor $Green
} else {
    Write-Host "✗ Notification channels config missing" -ForegroundColor $Red
    $errors++
}

# Test 4: Check Prometheus Configuration
Write-Host "`n4. Checking Prometheus Configuration..." -ForegroundColor $Blue
if (Test-Path "config/prometheus.yml") {
    Write-Host "✓ Prometheus config exists" -ForegroundColor $Green
    $content = Get-Content "config/prometheus.yml" -Raw

    $jobNames = @("gamev1-gateway", "gamev1-worker", "gamev1-room-manager")
    foreach ($job in $jobNames) {
        if ($content -match "job_name: '$job'") {
            Write-Host "✓ $job scrape job configured" -ForegroundColor $Green
        } else {
            Write-Host "✗ $job scrape job missing" -ForegroundColor $Red
            $errors++
        }
    }

    # Check metrics paths
    if ($content -match "metrics_path: '/metrics'") {
        Write-Host "✓ Metrics path configured correctly" -ForegroundColor $Green
    } else {
        Write-Host "✗ Metrics path missing or incorrect" -ForegroundColor $Red
        $errors++
    }
} else {
    Write-Host "✗ Prometheus config missing" -ForegroundColor $Red
    $errors++
}

# Test 5: Check Scripts
Write-Host "`n5. Checking Setup Scripts..." -ForegroundColor $Blue
$requiredScripts = @(
    "scripts/setup-grafana.sh",
    "scripts/setup-grafana.bat",
    "scripts/test-grafana-setup.sh",
    "scripts/test-grafana-setup.bat",
    "build-and-start.sh",
    "build-and-start.bat",
    "start-monitoring.sh",
    "start-monitoring.bat"
)

foreach ($script in $requiredScripts) {
    if (Test-Path $script) {
        Write-Host "✓ $script exists" -ForegroundColor $Green
    } else {
        Write-Host "✗ $script missing" -ForegroundColor $Red
        $errors++
    }
}

# Test 6: Check Dockerfiles
Write-Host "`n6. Checking Dockerfiles..." -ForegroundColor $Blue
$dockerPath = "docker/containers"
$requiredDockerfiles = @(
    "Dockerfile.gateway",
    "Dockerfile.worker",
    "Dockerfile.room-manager",
    "Dockerfile.pocketbase",
    "Dockerfile.redis"
)

foreach ($dockerfile in $requiredDockerfiles) {
    if (Test-Path "$dockerPath/$dockerfile") {
        Write-Host "✓ $dockerfile exists" -ForegroundColor $Green
    } else {
        Write-Host "✗ $dockerfile missing" -ForegroundColor $Red
        $errors++
    }
}

# Test 7: Check Room Manager Code
Write-Host "`n7. Checking Room Manager Implementation..." -ForegroundColor $Blue
if (Test-Path "room-manager/src/lib.rs") {
    Write-Host "✓ Room Manager source code exists" -ForegroundColor $Green
    $content = Get-Content "room-manager/src/lib.rs" -Raw

    if ($content -match "metrics") {
        Write-Host "  - Metrics implementation found" -ForegroundColor $Green
    } else {
        Write-Host "  - Metrics implementation missing" -ForegroundColor $Yellow
        $warnings++
    }
} else {
    Write-Host "✗ Room Manager source code missing" -ForegroundColor $Red
    $errors++
}

# Test 8: Check Alert Configuration
Write-Host "`n8. Checking Alert Configuration..." -ForegroundColor $Blue
if (Test-Path "config/alerts.yml") {
    Write-Host "✓ Alert rules config exists" -ForegroundColor $Green
    $content = Get-Content "config/alerts.yml" -Raw

    $alertCount = ([regex]::Matches($content, "alert: ")).Count
    Write-Host "  - Found $alertCount alert rules" -ForegroundColor $Green
} else {
    Write-Host "✗ Alert rules config missing" -ForegroundColor $Red
    $errors++
}

# Summary
Write-Host "`n📊 Configuration Test Summary:" -ForegroundColor $Blue
Write-Host "Errors: $errors" -ForegroundColor $Red
Write-Host "Warnings: $warnings" -ForegroundColor $Yellow

if ($errors -eq 0) {
    Write-Host "`n✅ All configurations are valid!" -ForegroundColor $Green
    Write-Host "`nNext steps:" -ForegroundColor $Blue
    Write-Host "1. Start services: docker compose up -d" -ForegroundColor $Green
    Write-Host "2. Setup Grafana: .\scripts\setup-grafana.bat" -ForegroundColor $Green
    Write-Host "3. Test setup: .\scripts\test-grafana-setup.bat" -ForegroundColor $Green
    Write-Host "4. Access Grafana: http://localhost:3000" -ForegroundColor $Green
} else {
    Write-Host "`n❌ Found configuration errors. Please fix them before proceeding." -ForegroundColor $Red
}

Write-Host "`n🎉 Configuration test completed!" -ForegroundColor $Green
