@echo off
REM Setup Basic Monitoring for Native Deployment (Windows)
REM Sets up monitoring without Docker using Windows tools

echo 🚀 Setting up Native Monitoring for GameV1...

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%1. Creating monitoring directories...%NC%

REM Create monitoring directories
mkdir "monitoring" 2>nul
mkdir "monitoring\logs" 2>nul
mkdir "monitoring\dashboards" 2>nul

echo %GREEN%✓ Monitoring directories created%NC%

echo.
echo %BLUE%2. Creating monitoring scripts...%NC%

REM Create health check script
echo @echo off > "monitoring\health-check.bat"
echo REM GameV1 Health Check Script >> "monitoring\health-check.bat"
echo echo GameV1 Services Health Check >> "monitoring\health-check.bat"
echo echo =============================== >> "monitoring\health-check.bat"
echo echo. >> "monitoring\health-check.bat"
echo echo Checking Gateway... >> "monitoring\health-check.bat"
echo curl -f -s http://localhost:8080/healthz ^>nul 2^>^&1 >> "monitoring\health-check.bat"
echo if %%errorlevel%% equ 0 ( >> "monitoring\health-check.bat"
echo     echo [OK] Gateway - http://localhost:8080 >> "monitoring\health-check.bat"
echo ) else ( >> "monitoring\health-check.bat"
echo     echo [FAIL] Gateway - http://localhost:8080 >> "monitoring\health-check.bat"
echo ) >> "monitoring\health-check.bat"
echo. >> "monitoring\health-check.bat"
echo echo Checking PocketBase... >> "monitoring\health-check.bat"
echo curl -f -s http://localhost:8090/api/health ^>nul 2^>^&1 >> "monitoring\health-check.bat"
echo if %%errorlevel%% equ 0 ( >> "monitoring\health-check.bat"
echo     echo [OK] PocketBase - http://localhost:8090 >> "monitoring\health-check.bat"
echo ) else ( >> "monitoring\health-check.bat"
echo     echo [FAIL] PocketBase - http://localhost:8090 >> "monitoring\health-check.bat"
echo ) >> "monitoring\health-check.bat"
echo. >> "monitoring\health-check.bat"
echo echo Checking Redis... >> "monitoring\health-check.bat"
echo netstat -ano ^| findstr "LISTENING" ^| findstr "6379" ^>nul >> "monitoring\health-check.bat"
echo if %%errorlevel%% equ 0 ( >> "monitoring\health-check.bat"
echo     echo [OK] Redis - localhost:6379 >> "monitoring\health-check.bat"
echo ) else ( >> "monitoring\health-check.bat"
echo     echo [FAIL] Redis - localhost:6379 >> "monitoring\health-check.bat"
echo ) >> "monitoring\health-check.bat"
echo. >> "monitoring\health-check.bat"
echo echo Health check completed at %%DATE%% %%TIME%% >> "monitoring\health-check.bat"

echo %GREEN%✓ Health check script created%NC%

REM Create performance monitor script
echo @echo off > "monitoring\performance-monitor.bat"
echo REM GameV1 Performance Monitor Script >> "monitoring\performance-monitor.bat"
echo echo GameV1 Performance Monitor >> "monitoring\performance-monitor.bat"
echo echo ========================= >> "monitoring\performance-monitor.bat"
echo echo. >> "monitoring\performance-monitor.bat"
echo echo System Performance: >> "monitoring\performance-monitor.bat"
echo systeminfo ^| findstr /C:"Total Physical Memory" /C:"Available Physical Memory" >> "monitoring\performance-monitor.bat"
echo. >> "monitoring\performance-monitor.bat"
echo echo Process Information: >> "monitoring\performance-monitor.bat"
echo tasklist ^| findstr "gateway\|worker\|room-manager\|pocketbase\|redis" >> "monitoring\performance-monitor.bat"
echo. >> "monitoring\performance-monitor.bat"
echo echo Network Connections: >> "monitoring\performance-monitor.bat"
echo netstat -ano ^| findstr "LISTENING" ^| findstr "8080\|50051\|8090\|6379" >> "monitoring\performance-monitor.bat"
echo. >> "monitoring\performance-monitor.bat"
echo echo Performance check completed at %%DATE%% %%TIME%% >> "monitoring\performance-monitor.bat"

echo %GREEN%✓ Performance monitor script created%NC%

REM Create log monitor script
echo @echo off > "monitoring\log-monitor.bat"
echo REM GameV1 Log Monitor Script >> "monitoring\log-monitor.bat"
echo echo GameV1 Log Monitor >> "monitoring\log-monitor.bat"
echo echo ================== >> "monitoring\log-monitor.bat"
echo echo. >> "monitoring\log-monitor.bat"
echo echo Recent Gateway logs: >> "monitoring\log-monitor.bat"
echo if exist "target\release\logs\gateway.log" ( >> "monitoring\log-monitor.bat"
echo     tail -n 20 "target\release\logs\gateway.log" 2^>nul >> "monitoring\log-monitor.bat"
echo ) else ( >> "monitoring\log-monitor.bat"
echo     echo No gateway logs found >> "monitoring\log-monitor.bat"
echo ) >> "monitoring\log-monitor.bat"
echo. >> "monitoring\log-monitor.bat"
echo echo Recent Worker logs: >> "monitoring\log-monitor.bat"
echo if exist "target\release\logs\worker.log" ( >> "monitoring\log-monitor.bat"
echo     tail -n 20 "target\release\logs\worker.log" 2^>nul >> "monitoring\log-monitor.bat"
echo ) else ( >> "monitoring\log-monitor.bat"
echo     echo No worker logs found >> "monitoring\log-monitor.bat"
echo ) >> "monitoring\log-monitor.bat"
echo. >> "monitoring\log-monitor.bat"
echo echo Log monitor completed at %%DATE%% %%TIME%% >> "monitoring\log-monitor.bat"

echo %GREEN%✓ Log monitor script created%NC%

REM Create comprehensive dashboard script
echo @echo off > "monitoring\dashboard.bat"
echo REM GameV1 Monitoring Dashboard >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo echo ^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^| >> "monitoring\dashboard.bat"
echo echo ^|                    GameV1 Dashboard                     ^| >> "monitoring\dashboard.bat"
echo echo ^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^| >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo echo [1] Health Check     - Check all services status >> "monitoring\dashboard.bat"
echo echo [2] Performance      - System performance metrics >> "monitoring\dashboard.bat"
echo echo [3] Logs             - View recent logs >> "monitoring\dashboard.bat"
echo echo [4] Processes        - Check running processes >> "monitoring\dashboard.bat"
echo echo [5] Network          - Check network connections >> "monitoring\dashboard.bat"
echo echo [6] Metrics          - View Prometheus metrics >> "monitoring\dashboard.bat"
echo echo [7] Exit             - Exit dashboard >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo set /p choice="Select option (1-7): " >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="1" goto health >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="2" goto performance >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="3" goto logs >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="4" goto processes >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="5" goto network >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="6" goto metrics >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="7" goto exit >> "monitoring\dashboard.bat"
echo goto end >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :health >> "monitoring\dashboard.bat"
echo call health-check.bat >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :performance >> "monitoring\dashboard.bat"
echo call performance-monitor.bat >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :logs >> "monitoring\dashboard.bat"
echo call log-monitor.bat >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :processes >> "monitoring\dashboard.bat"
echo tasklist ^| findstr "gateway\|worker\|room-manager\|pocketbase\|redis" >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :network >> "monitoring\dashboard.bat"
echo netstat -ano ^| findstr "LISTENING" ^| findstr "8080\|50051\|8090\|6379" >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :metrics >> "monitoring\dashboard.bat"
echo echo Gateway metrics: >> "monitoring\dashboard.bat"
echo curl -s http://localhost:8080/metrics 2^>nul ^| head -20 >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo echo Worker metrics: >> "monitoring\dashboard.bat"
echo curl -s http://localhost:3100/metrics 2^>nul ^| head -20 >> "monitoring\dashboard.bat"
echo pause >> "monitoring\dashboard.bat"
echo goto start >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :exit >> "monitoring\dashboard.bat"
echo exit >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :start >> "monitoring\dashboard.bat"
echo cls >> "monitoring\dashboard.bat"
echo goto dashboard >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :dashboard >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo echo ^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^| >> "monitoring\dashboard.bat"
echo echo ^|                    GameV1 Dashboard                     ^| >> "monitoring\dashboard.bat"
echo echo ^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^| >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo echo [1] Health Check     - Check all services status >> "monitoring\dashboard.bat"
echo echo [2] Performance      - System performance metrics >> "monitoring\dashboard.bat"
echo echo [3] Logs             - View recent logs >> "monitoring\dashboard.bat"
echo echo [4] Processes        - Check running processes >> "monitoring\dashboard.bat"
echo echo [5] Network          - Check network connections >> "monitoring\dashboard.bat"
echo echo [6] Metrics          - View Prometheus metrics >> "monitoring\dashboard.bat"
echo echo [7] Exit             - Exit dashboard >> "monitoring\dashboard.bat"
echo echo. >> "monitoring\dashboard.bat"
echo set /p choice="Select option (1-7): " >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="1" goto health >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="2" goto performance >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="3" goto logs >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="4" goto processes >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="5" goto network >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="6" goto metrics >> "monitoring\dashboard.bat"
echo if "%%choice%%"=="7" goto exit >> "monitoring\dashboard.bat"
echo goto end >> "monitoring\dashboard.bat"
echo. >> "monitoring\dashboard.bat"
echo :end >> "monitoring\dashboard.bat"

echo %GREEN%✓ Dashboard script created%NC%

echo.
echo %BLUE%3. Creating Windows Performance Monitor configuration...%NC%

REM Create performance counter script
echo @echo off > "monitoring\setup-perfmon.bat"
echo REM Setup Windows Performance Monitor for GameV1 >> "monitoring\setup-perfmon.bat"
echo echo Setting up Windows Performance Monitor... >> "monitoring\setup-perfmon.bat"
echo. >> "monitoring\setup-perfmon.bat"
echo echo Adding GameV1 counters to Performance Monitor... >> "monitoring\setup-perfmon.bat"
echo. >> "monitoring\setup-perfmon.bat"
echo echo To add counters manually: >> "monitoring\setup-perfmon.bat"
echo echo 1. Open Performance Monitor (perfmon.msc) >> "monitoring\setup-perfmon.bat"
echo echo 2. Add counters for: >> "monitoring\setup-perfmon.bat"
echo echo    - Processor: %% Processor Time >> "monitoring\setup-perfmon.bat"
echo echo    - Memory: Available MBytes >> "monitoring\setup-perfmon.bat"
echo echo    - Network Interface: Bytes Total/sec >> "monitoring\setup-perfmon.bat"
echo echo    - Process: Handle Count (for gamev1 processes) >> "monitoring\setup-perfmon.bat"
echo echo    - TCPv4: Connections Established >> "monitoring\setup-perfmon.bat"
echo. >> "monitoring\setup-perfmon.bat"
echo echo Performance Monitor setup instructions created! >> "monitoring\setup-perfmon.bat"

echo %GREEN%✓ Performance Monitor setup created%NC%

echo.
echo %BLUE%4. Creating monitoring README...%NC%

REM Create monitoring README
echo # GameV1 Native Monitoring Setup > "monitoring\README.md"
echo. >> "monitoring\README.md"
echo This directory contains monitoring tools for native deployment without Docker. >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ## Available Tools >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ### Dashboard >> "monitoring\README.md"
echo Run `dashboard.bat` for interactive monitoring dashboard. >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ### Health Check >> "monitoring\README.md"
echo Run `health-check.bat` to check all services status. >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ### Performance Monitor >> "monitoring\README.md"
echo Run `performance-monitor.bat` to check system performance. >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ### Log Monitor >> "monitoring\README.md"
echo Run `log-monitor.bat` to view recent logs. >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ## Windows Performance Monitor >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo 1. Open Performance Monitor (perfmon.msc) >> "monitoring\README.md"
echo 2. Add counters for monitoring GameV1 performance >> "monitoring\README.md"
echo 3. Monitor CPU, Memory, Network, and Process metrics >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo ## Prometheus Metrics >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo GameV1 services expose Prometheus metrics at: >> "monitoring\README.md"
echo - Gateway: http://localhost:8080/metrics >> "monitoring\README.md"
echo - Worker: http://localhost:3100/metrics >> "monitoring\README.md"
echo - Room Manager: http://localhost:3201/metrics >> "monitoring\README.md"
echo. >> "monitoring\README.md"
echo You can view these metrics in any browser or use with Prometheus. >> "monitoring\README.md" >> "monitoring\README.md"

echo %GREEN%✓ Monitoring README created%NC%

echo.
echo %BLUE%5. Setup complete!%NC%
echo.
echo %GREEN%✓ Native monitoring setup completed!%NC%
echo.
echo %YELLOW%Available monitoring tools:%NC%
echo - dashboard.bat          - Interactive monitoring dashboard
echo - health-check.bat       - Check all services status
echo - performance-monitor.bat - System performance metrics
echo - log-monitor.bat        - View recent logs
echo - setup-perfmon.bat      - Windows Performance Monitor setup
echo.
echo %BLUE%Prometheus metrics available at:%NC%
echo - Gateway: http://localhost:8080/metrics
echo - Worker: http://localhost:3100/metrics
echo - Room Manager: http://localhost:3201/metrics
echo.
echo %YELLOW%Start monitoring:%NC%
echo cd monitoring
echo dashboard.bat
echo.

echo %GREEN%✓ Native monitoring setup completed successfully!%NC%
pause
