Write-Host "GameV1 API Validation Test" -ForegroundColor Cyan

# Test API configurations and schemas
Write-Host "`n1. Checking API Configurations..." -ForegroundColor Blue

# Check if gateway source exists
if (Test-Path "gateway/src/lib.rs") {
    Write-Host "OK: Gateway source code exists" -ForegroundColor Green
    $content = Get-Content "gateway/src/lib.rs" -Raw

    if ($content -match "metrics") {
        Write-Host "  Metrics implementation found" -ForegroundColor Green
    }
    if ($content -match "health") {
        Write-Host "  Health endpoint implemented" -ForegroundColor Green
    }
    if ($content -match "websocket") {
        Write-Host "  WebSocket support found" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Gateway source code missing" -ForegroundColor Red
}

# Check worker source
if (Test-Path "worker/src/lib.rs") {
    Write-Host "OK: Worker source code exists" -ForegroundColor Green
    $content = Get-Content "worker/src/lib.rs" -Raw

    if ($content -match "gameplay") {
        Write-Host "  Gameplay logic implemented" -ForegroundColor Green
    }
    if ($content -match "rpc") {
        Write-Host "  RPC communication found" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Worker source code missing" -ForegroundColor Red
}

# Check room manager source
if (Test-Path "room-manager/src/lib.rs") {
    Write-Host "OK: Room Manager source code exists" -ForegroundColor Green
    $content = Get-Content "room-manager/src/lib.rs" -Raw

    if ($content -match "room") {
        Write-Host "  Room management implemented" -ForegroundColor Green
    }
    if ($content -match "matchmaking") {
        Write-Host "  Matchmaking logic found" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Room Manager source code missing" -ForegroundColor Red
}

# Test 2: Check Cargo configurations
Write-Host "`n2. Checking Cargo Configurations..." -ForegroundColor Blue

$cargoFiles = @("Cargo.toml", "gateway/Cargo.toml", "worker/Cargo.toml", "room-manager/Cargo.toml")
foreach ($cargoFile in $cargoFiles) {
    if (Test-Path $cargoFile) {
        Write-Host "OK: $cargoFile exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $cargoFile missing" -ForegroundColor Red
    }
}

# Test 3: Check schema files
Write-Host "`n3. Checking Database Schemas..." -ForegroundColor Blue

if (Test-Path "schema/gamev1_schema.sql") {
    Write-Host "OK: Database schema exists" -ForegroundColor Green
    $schema = Get-Content "schema/gamev1_schema.sql" -Raw

    if ($schema -match "CREATE TABLE") {
        Write-Host "  Tables defined" -ForegroundColor Green
    }
    if ($schema -match "INDEX") {
        Write-Host "  Indexes defined" -ForegroundColor Green
    }
} else {
    Write-Host "WARNING: Database schema missing" -ForegroundColor Yellow
}

if (Test-Path "rooms-collection-schema.json") {
    Write-Host "OK: Rooms collection schema exists" -ForegroundColor Green
} else {
    Write-Host "WARNING: Rooms collection schema missing" -ForegroundColor Yellow
}

# Test 4: Check configuration files
Write-Host "`n4. Checking Configuration Files..." -ForegroundColor Blue

$configFiles = @(
    "config/prometheus.yml",
    "config/alerts.yml",
    "config/grafana/datasources/prometheus.yml",
    "config/grafana/dashboards/dashboards.yml"
)

foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        Write-Host "OK: $configFile exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $configFile missing" -ForegroundColor Red
    }
}

# Test 5: Check scripts
Write-Host "`n5. Checking Scripts..." -ForegroundColor Blue

$scripts = @(
    "scripts/setup-grafana.sh", "scripts/setup-grafana.bat",
    "build-and-start.sh", "build-and-start.bat",
    "start-monitoring.sh", "start-monitoring.bat",
    "scripts/test-health-endpoints.bat", "scripts/test-metrics-collection.bat",
    "scripts/demo-game-session.bat", "scripts/test-load-performance.bat"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "OK: $script exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $script missing" -ForegroundColor Red
    }
}

# Test 6: Check Dockerfiles
Write-Host "`n6. Checking Dockerfiles..." -ForegroundColor Blue

$dockerPath = "docker/containers"
$dockerfiles = @(
    "Dockerfile.gateway", "Dockerfile.worker",
    "Dockerfile.room-manager", "Dockerfile.pocketbase", "Dockerfile.redis"
)

foreach ($dockerfile in $dockerfiles) {
    if (Test-Path "$dockerPath/$dockerfile") {
        Write-Host "OK: $dockerfile exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $dockerfile missing" -ForegroundColor Red
    }
}

Write-Host "`nAPI Validation test completed!" -ForegroundColor Green
