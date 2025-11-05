@echo off
REM Setup PocketBase for Native Deployment (Windows)
REM Downloads and configures PocketBase for GameV1

echo 🚀 Setting up PocketBase for Native Deployment...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "POCKETBASE_VERSION=0.22.0"
set "POCKETBASE_URL=https://github.com/pocketbase/pocketbase/releases/download/v%POCKETBASE_VERSION%/pocketbase_%POCKETBASE_VERSION%_windows_amd64.zip"
set "POCKETBASE_DIR=pocketbase-native"
set "POCKETBASE_CONFIG=config\pocketbase-config.json"

echo %BLUE%1. Checking existing PocketBase installation...%NC%

REM Check if PocketBase already exists
if exist "%POCKETBASE_DIR%\pocketbase.exe" (
    echo %GREEN%✓ PocketBase already installed%NC%
    goto :CONFIGURE
)

REM Create directory
echo %BLUE%2. Creating PocketBase directory...%NC%
mkdir "%POCKETBASE_DIR%" 2>nul
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to create directory%NC%
    pause
    exit /b 1
)

echo %BLUE%3. Downloading PocketBase v%POCKETBASE_VERSION%...%NC%

REM Download PocketBase
powershell -Command "Invoke-WebRequest -Uri '%POCKETBASE_URL%' -OutFile 'pocketbase.zip'"
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to download PocketBase%NC%
    echo Please download manually from: https://github.com/pocketbase/pocketbase/releases
    pause
    exit /b 1
)

echo %BLUE%4. Extracting PocketBase...%NC%

REM Extract PocketBase
powershell -Command "Expand-Archive -Path 'pocketbase.zip' -DestinationPath '%POCKETBASE_DIR%'"
if %errorlevel% neq 0 (
    echo %RED%✗ Failed to extract PocketBase%NC%
    pause
    exit /b 1
)

REM Clean up
del pocketbase.zip 2>nul

echo %GREEN%✓ PocketBase downloaded and extracted%NC%

:CONFIGURE
echo.
echo %BLUE%5. Configuring PocketBase for GameV1...%NC%

REM Create configuration
if not exist "%POCKETBASE_CONFIG%" (
    echo Creating PocketBase configuration...

    echo { > "%POCKETBASE_CONFIG%"
    echo   "database": { >> "%POCKETBASE_CONFIG%"
    echo     "path": "./data/pb_data" >> "%POCKETBASE_CONFIG%"
    echo   }, >> "%POCKETBASE_CONFIG%"
    echo   "server": { >> "%POCKETBASE_CONFIG%"
    echo     "host": "0.0.0.0", >> "%POCKETBASE_CONFIG%"
    echo     "port": 8090, >> "%POCKETBASE_CONFIG%"
    echo     "cors": { >> "%POCKETBASE_CONFIG%"
    echo       "origins": ["*"] >> "%POCKETBASE_CONFIG%"
    echo     } >> "%POCKETBASE_CONFIG%"
    echo   }, >> "%POCKETBASE_CONFIG%"
    echo   "admin": { >> "%POCKETBASE_CONFIG%"
    echo     "email": "admin@gamev1.com", >> "%POCKETBASE_CONFIG%"
    echo     "password": "gamev1_admin_2024" >> "%POCKETBASE_CONFIG%"
    echo   } >> "%POCKETBASE_CONFIG%"
    echo } >> "%POCKETBASE_CONFIG%"

    echo %GREEN%✓ PocketBase configuration created%NC%
) else (
    echo %GREEN%✓ PocketBase configuration already exists%NC%
)

echo.
echo %BLUE%6. Creating data directories...%NC%

REM Create data directories
mkdir "%POCKETBASE_DIR%\data" 2>nul
mkdir "%POCKETBASE_DIR%\data\pb_data" 2>nul
mkdir "%POCKETBASE_DIR%\logs" 2>nul

echo %GREEN%✓ Data directories created%NC%

echo.
echo %BLUE%7. Setup complete!%NC%
echo.
echo %GREEN%To start PocketBase:%NC%
echo cd %POCKETBASE_DIR%
echo .\pocketbase.exe serve --config=../%POCKETBASE_CONFIG%
echo.
echo %YELLOW%Default admin credentials:%NC%
echo Email: admin@gamev1.com
echo Password: gamev1_admin_2024
echo.
echo %BLUE%Or use the startup script:%NC%
echo start-pocketbase.bat
echo.

echo %GREEN%✓ PocketBase setup completed successfully!%NC%
pause
