@echo off
REM Build GameV1 Native Production Binaries
REM Optimized build for native deployment without Docker

echo 🚀 Building GameV1 Native Production Binaries...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "BUILD_TYPE=%1"
if "%BUILD_TYPE%"=="" set "BUILD_TYPE=release"

echo %BLUE%1. Checking Rust toolchain...%NC%

REM Check Rust installation
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ Rust not found!%NC%
    echo Please install Rust from: https://rustup.rs/
    pause
    exit /b 1
)

cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ Cargo not found!%NC%
    echo Please install Rust from: https://rustup.rs/
    pause
    exit /b 1
)

echo %GREEN%✓ Rust toolchain found%NC%
echo %BLUE%   Rust: %NC% & rustc --version
echo %BLUE%   Cargo: %NC% & cargo --version
echo.

REM Check if we need to update dependencies
echo %BLUE%2. Updating dependencies...%NC%
cargo update
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to update dependencies%NC%
    pause
    exit /b 1
)

echo %GREEN%✓ Dependencies updated%NC%
echo.

echo %BLUE%3. Setting optimization flags...%NC%

REM Set optimization flags for production
set "RUSTFLAGS=-C target-cpu=native -C opt-level=3 -C lto=fat -C codegen-units=1 -C panic=abort"
echo %BLUE%   RUSTFLAGS: %RUSTFLAGS%%NC%

REM Clean previous builds
echo.
echo %BLUE%4. Cleaning previous builds...%NC%
cargo clean
if %errorlevel% neq 0 (
    echo %YELLOW%⚠ Warning: Failed to clean previous builds%NC%
)

echo.
echo %BLUE%5. Building services with optimization...%NC%

REM Services to build
set "SERVICES=gateway worker room-manager services"

for %%s in (%SERVICES%) do (
    echo %BLUE%   Building %%s...%NC%

    cargo build --%BUILD_TYPE% -p %%s
    if %errorlevel% neq 0 (
        echo %RED%✗ Failed to build %%s%NC%
        pause
        exit /b 1
    )

    echo %GREEN%✓ %%s built successfully%NC%
)

echo.
echo %BLUE%6. Creating production directory...%NC%

REM Create production directory
set "PROD_DIR=target\production"
mkdir "%PROD_DIR%" 2>nul
mkdir "%PROD_DIR%\bin" 2>nul
mkdir "%PROD_DIR%\config" 2>nul

echo %GREEN%✓ Production directory created%NC%

echo.
echo %BLUE%7. Copying binaries and configurations...%NC%

REM Copy binaries
for %%s in (%SERVICES%) do (
    if exist "target\%BUILD_TYPE%\%%s.exe" (
        copy "target\%BUILD_TYPE%\%%s.exe" "%PROD_DIR%\bin\%%s.exe" >nul
        echo %GREEN%✓ Copied %%s.exe%NC%
    ) else (
        echo %YELLOW%⚠ %%s.exe not found%NC%
    )
)

REM Copy configuration files
if exist "config" (
    xcopy /E /I /Y "config" "%PROD_DIR%\config" >nul 2>&1
    echo %GREEN%✓ Configuration files copied%NC%
)

echo.
echo %BLUE%8. Creating startup scripts...%NC%

REM Create production startup script
echo @echo off > "%PROD_DIR%\start-production.bat"
echo REM GameV1 Production Startup Script >> "%PROD_DIR%\start-production.bat"
echo echo Starting GameV1 Production Services... >> "%PROD_DIR%\start-production.bat"
echo. >> "%PROD_DIR%\start-production.bat"
echo REM Start services in order >> "%PROD_DIR%\start-production.bat"
echo start /B .\bin\worker.exe >> "%PROD_DIR%\start-production.bat"
echo timeout /t 3 /nobreak ^>nul >> "%PROD_DIR%\start-production.bat"
echo start /B .\bin\room-manager.exe >> "%PROD_DIR%\start-production.bat"
echo timeout /t 3 /nobreak ^>nul >> "%PROD_DIR%\start-production.bat"
echo .\bin\gateway.exe >> "%PROD_DIR%\start-production.bat"
echo. >> "%PROD_DIR%\start-production.bat"
echo echo Services started. Press Ctrl+C to stop. >> "%PROD_DIR%\start-production.bat"

echo %GREEN%✓ Production startup script created%NC%

echo.
echo %BLUE%9. Generating build information...%NC%

REM Generate build info
echo GameV1 Native Production Build > "%PROD_DIR%\BUILD_INFO.txt"
echo =============================== >> "%PROD_DIR%\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "%PROD_DIR%\BUILD_INFO.txt"
echo Build Type: %BUILD_TYPE% >> "%PROD_DIR%\BUILD_INFO.txt"
echo Rust Version: >> "%PROD_DIR%\BUILD_INFO.txt"
rustc --version >> "%PROD_DIR%\BUILD_INFO.txt"
echo. >> "%PROD_DIR%\BUILD_INFO.txt"
echo Optimization: >> "%PROD_DIR%\BUILD_INFO.txt"
echo - target-cpu=native >> "%PROD_DIR%\BUILD_INFO.txt"
echo - opt-level=3 >> "%PROD_DIR%\BUILD_INFO.txt"
echo - lto=fat >> "%PROD_DIR%\BUILD_INFO.txt"
echo - codegen-units=1 >> "%PROD_DIR%\BUILD_INFO.txt"
echo - panic=abort >> "%PROD_DIR%\BUILD_INFO.txt"
echo. >> "%PROD_DIR%\BUILD_INFO.txt"
echo Services Built: %SERVICES% >> "%PROD_DIR%\BUILD_INFO.txt"

echo %GREEN%✓ Build information generated%NC%

echo.
echo %BLUE%10. Build completed!%NC%
echo.
echo %GREEN%Production binaries location: %PROD_DIR%%NC%
echo %GREEN%Start script: %PROD_DIR%\start-production.bat%NC%
echo.
echo %YELLOW%Next steps:%NC%
echo 1. Run setup-pocketbase-native.bat
echo 2. Run setup-redis-native.bat
echo 3. Run %PROD_DIR%\start-production.bat
echo.
echo %GREEN%✓ Native production build completed successfully!%NC%

pause
