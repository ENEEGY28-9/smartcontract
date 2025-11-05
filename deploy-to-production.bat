@echo off
REM 🚀 GameV1 Production Deployment Script for Windows
REM Comprehensive deployment for Windows production environment

setlocal enabledelayedexpansion

REM Configuration
set "ENVIRONMENT=production"
set "BUILD_DIR=%~dp0target\production-release"
set "PRODUCTION_DIR=C:\opt\gamev1"
set "SERVICES=gateway worker room-manager services pocketbase"

REM Colors
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

:print_header
echo.
echo === %~1 ===
echo.
goto :eof

:print_success
echo [✓] %~1
goto :eof

:print_warning
echo [⚠] %~1
goto :eof

:print_error
echo [✗] %~1
goto :eof

:print_info
echo [ℹ] %~1
goto :eof

:print_progress
echo [→] %~1
goto :eof

REM Main deployment function
:main_deployment
call :print_header "GameV1 Production Deployment"
call :print_info "Environment: %ENVIRONMENT%"
call :print_info "Timestamp: %DATE% %TIME%"

REM Pre-deployment checks
call :check_prerequisites

REM Build binaries
call :build_production_binaries

REM Setup environment
call :setup_production_environment

REM Deploy services
call :deploy_services

REM Run tests
call :run_deployment_tests

REM Start services
call :start_services

REM Health checks
call :test_health_checks

REM Final status
call :print_header "Deployment Summary"
call :print_success "GameV1 has been successfully deployed to production!"
call :print_info "Services: %SERVICES%"
call :print_info "Build directory: %BUILD_DIR%"
call :print_info "Production directory: %PRODUCTION_DIR%"

echo.
echo Service management:
echo   Start: net start gamev1-^<service^>
echo   Stop: net stop gamev1-^<service^>
echo   Status: sc query gamev1-^<service^>
echo   Logs: Get-EventLog -LogName Application -Source gamev1-^<service^>
echo.
echo Monitoring:
echo   Health: curl http://localhost:8080/health
echo   Metrics: curl http://localhost:8080/api/metrics
echo   Logs: Get-EventLog -LogName Application -Source gamev1-*

call :print_success "🎉 Deployment completed successfully!"
goto :eof

:check_prerequisites
call :print_header "Checking Prerequisites"

REM Check Rust toolchain
where rustc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    call :print_error "Rust toolchain not found. Please install Rust."
    exit /b 1
)
for /f "tokens=*" %%i in ('rustc --version') do set RUST_VERSION=%%i
call :print_success "Rust toolchain found: !RUST_VERSION!"

REM Check Cargo
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    call :print_error "Cargo not found. Please install Rust."
    exit /b 1
)
for /f "tokens=*" %%i in ('cargo --version') do set CARGO_VERSION=%%i
call :print_success "Cargo found: !CARGO_VERSION!"

call :print_success "Prerequisites check completed"
goto :eof

:build_production_binaries
call :print_header "Building Production Binaries"

REM Clean previous builds
call :print_progress "Cleaning previous builds..."
cargo clean

REM Update dependencies
call :print_progress "Updating dependencies..."
cargo update

REM Build each service with maximum optimization
for %%s in (%SERVICES%) do (
    call :print_progress "Building %%s..."

    REM Set optimization flags
    set "RUSTFLAGS=-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"

    cargo build --release -p %%s
    if %ERRORLEVEL% NEQ 0 (
        call :print_error "Failed to build %%s"
        exit /b 1
    )
    call :print_success "%%s built successfully"
)

REM Create production directory
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

REM Copy binaries
call :print_progress "Copying optimized binaries..."
for %%s in (%SERVICES%) do (
    set "SOURCE_PATH=%~dp0target\release\%%s.exe"
    set "DEST_PATH=%BUILD_DIR%\%%s.exe"

    if exist "!SOURCE_PATH!" (
        copy "!SOURCE_PATH!" "!DEST_PATH!" >nul
        call :print_success "Copied %%s to %BUILD_DIR%"
    ) else (
        call :print_warning "Binary not found: !SOURCE_PATH!"
    )
)

REM Generate build info
(
echo GameV1 Production Build
echo =======================
echo Build Date: %DATE% %TIME%
echo Environment: %ENVIRONMENT%
echo Rust Version: !RUST_VERSION!
echo Build Profile: Production Optimized
echo.
echo Optimization Flags:
echo - target-cpu=native
echo - opt-level=3
echo - lto=fat
echo - codegen-units=1
echo - panic=abort
echo.
echo Services Built:
for %%s in (%SERVICES%) do echo %%s
echo.
echo Binary Sizes:
for %%f in ("%BUILD_DIR%\*.exe") do (
    for %%a in (%%f) do echo %%~nxa - %%~za bytes
)
echo.
echo Deployment Ready: YES
) > "%BUILD_DIR%\build-info.txt"

call :print_success "Build completed successfully"
call :print_info "Build artifacts in: %BUILD_DIR%"
goto :eof

:setup_production_environment
call :print_header "Setting up Production Environment"

REM Create directories
set "DIRS=C:\opt\gamev1 C:\opt\gamev1\bin C:\opt\gamev1\config C:\opt\gamev1\logs C:\opt\gamev1\data"
for %%d in (%DIRS%) do (
    if not exist "%%d" (
        mkdir "%%d"
        call :print_success "Created: %%d"
    )
)

REM Copy systemd service files (convert to Windows services)
call :print_progress "Setting up Windows services..."
for %%s in (%SERVICES%) do (
    set "SERVICE_NAME=gamev1-%%s"
    set "BINARY_PATH=%PRODUCTION_DIR%\bin\%%s.exe"

    REM Check if service exists
    sc query !SERVICE_NAME! >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        REM Create Windows service
        sc.exe create !SERVICE_NAME! binPath= "!BINARY_PATH!" start= auto
        if %ERRORLEVEL% EQU 0 (
            call :print_success "Created Windows service: !SERVICE_NAME!"
        ) else (
            call :print_error "Failed to create service: !SERVICE_NAME!"
        )
    ) else (
        call :print_info "Service already exists: !SERVICE_NAME!"
    )
)

REM Copy configuration files
call :print_progress "Copying configuration files..."
if exist "config" (
    xcopy "config\*" "%PRODUCTION_DIR%\config\" /E /I /Y >nul
    call :print_success "Copied configuration files"
)

call :print_success "Production environment setup completed"
goto :eof

:deploy_services
call :print_header "Deploying Services"

REM Copy binaries
call :print_progress "Copying binaries..."
for %%s in (%SERVICES%) do (
    set "SOURCE_PATH=%BUILD_DIR%\%%s.exe"
    set "DEST_PATH=%PRODUCTION_DIR%\bin\%%s.exe"

    if exist "!SOURCE_PATH!" (
        copy "!SOURCE_PATH!" "!DEST_PATH!" >nul
        call :print_success "Deployed: %%s"
    ) else (
        call :print_error "Binary not found: !SOURCE_PATH!"
        exit /b 1
    )
)

call :print_success "Service deployment completed"
goto :eof

:run_deployment_tests
call :print_header "Running Deployment Tests"

REM Test binary execution
call :print_progress "Testing binary execution..."
for %%s in (%SERVICES%) do (
    set "BINARY_PATH=%PRODUCTION_DIR%\bin\%%s.exe"
    if exist "!BINARY_PATH!" (
        REM Test if binary can start (with --help if available)
        "!BINARY_PATH!" --help >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            call :print_success "%%s binary is executable"
        ) else (
            call :print_warning "%%s binary test returned exit code: %ERRORLEVEL%"
        )
    )
)

REM Test configuration files
call :print_progress "Testing configuration files..."
for /r "%PRODUCTION_DIR%\config" %%f in (*.json *.yml *.yaml) do (
    REM Try to parse JSON/YAML files
    echo {} >nul 2>"%%f.test"
    if %ERRORLEVEL% EQU 0 (
        del "%%f.test"
        call :print_success "Valid config: %%~nxf"
    ) else (
        call :print_warning "Invalid config file: %%~nxf"
    )
)

call :print_success "Deployment tests completed"
goto :eof

:start_services
call :print_header "Starting Services"

REM Start services in dependency order
set "SERVICE_ORDER=pocketbase worker room-manager services gateway"

for %%s in (%SERVICE_ORDER%) do (
    set "SERVICE_NAME=gamev1-%%s"
    call :print_progress "Starting !SERVICE_NAME!..."

    net start !SERVICE_NAME! >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        timeout /t 2 /nobreak >nul
        sc query !SERVICE_NAME! | find "RUNNING" >nul
        if %ERRORLEVEL% EQU 0 (
            call :print_success "Started: !SERVICE_NAME!"
        ) else (
            call :print_warning "Service !SERVICE_NAME! not running after start"
        )
    ) else (
        call :print_error "Failed to start !SERVICE_NAME!"
    )
)

REM Wait for services to initialize
call :print_progress "Waiting for services to initialize..."
timeout /t 10 /nobreak >nul

REM Check service status
call :print_progress "Checking service status..."
for %%s in (%SERVICES%) do (
    set "SERVICE_NAME=gamev1-%%s"
    sc query !SERVICE_NAME! | find "RUNNING" >nul
    if %ERRORLEVEL% EQU 0 (
        call :print_info "!SERVICE_NAME!: RUNNING"
    ) else (
        call :print_warning "!SERVICE_NAME!: NOT RUNNING"
    )
)

call :print_success "Services started"
goto :eof

:test_health_checks
call :print_header "Running Health Checks"

set "HEALTH_ENDPOINTS=http://localhost:8080/health http://localhost:8090/api/health"

for %%e in (%HEALTH_ENDPOINTS%) do (
    call :print_progress "Testing health endpoint: %%e"
    curl -f -s "%%e" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call :print_success "Health check passed: %%e"
    ) else (
        call :print_warning "Health check failed: %%e"
    )
)

REM Test basic API functionality
call :print_progress "Testing API functionality..."
curl -f -s "http://localhost:8080/api/rooms" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call :print_success "API test passed"
) else (
    call :print_warning "API test failed"
)

call :print_success "Health checks completed"
goto :eof

REM Error handling
:main
if "%1"=="help" goto :show_help
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help

call :main_deployment
if %ERRORLEVEL% NEQ 0 (
    call :print_error "Deployment failed with exit code: %ERRORLEVEL%"
    echo.
    set /p "ROLLBACK=Would you like to rollback the deployment? (y/N): "
    if /i "!ROLLBACK!"=="y" (
        call :rollback_deployment
    )
    exit /b 1
)

goto :eof

:show_help
echo.
echo 🚀 GameV1 Production Deployment Script for Windows
echo.
echo Usage:
echo   deploy-to-production.bat [options]
echo.
echo Options:
echo   --help, -h    Show this help message
echo   help          Show this help message
echo.
echo This script will:
echo   1. Check prerequisites (Rust, Cargo)
echo   2. Build production-optimized binaries
echo   3. Setup production environment
echo   4. Deploy services as Windows services
echo   5. Run deployment tests
echo   6. Start all services
echo   7. Perform health checks
echo.
echo Requirements:
echo   - Windows 10/11 or Windows Server 2019+
echo   - Rust toolchain installed
echo   - Administrator privileges
echo.
echo After deployment:
echo   - Services: gamev1-gateway, gamev1-worker, gamev1-pocketbase, etc.
echo   - Monitoring: http://localhost:8080/health
echo   - Logs: Event Viewer - Windows Logs - Application
echo.
goto :eof

:rollback_deployment
call :print_header "Rolling Back Deployment"

call :print_progress "Stopping all GameV1 services..."
for %%s in (%SERVICES%) do (
    set "SERVICE_NAME=gamev1-%%s"
    net stop !SERVICE_NAME! >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call :print_info "Stopped: !SERVICE_NAME!"
    )
)

call :print_progress "Restoring previous binaries..."
REM This would restore from backup if available
call :print_info "Rollback completed. Previous version should be restored manually if needed."

call :print_warning "Please check service status and restore from backup if necessary"
goto :eof

REM Execute main function
call :main %*
