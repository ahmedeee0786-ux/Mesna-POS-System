@echo off
REM =============================================
REM Mesna POS Process Manager
REM Simple utility to start, stop, and check status
REM =============================================

setlocal

if "%1"=="" (
    echo.
    echo 📋 Mesna POS Process Manager
    echo.
    echo Usage: PROCESS_MANAGER.bat [command]
    echo.
    echo Commands:
    echo   start     - Start both backend and frontend
    echo   stop      - Stop all Mesna POS processes
    echo   restart   - Restart all processes
    echo   status    - Check if processes are running
    echo   logs      - View recent logs
    echo   backup    - Create database backup
    echo   health    - Run system health check
    echo.
    exit /b 0
)

set COMMAND=%1
shift

if /i "%COMMAND%"=="start" (
    call :do_start
) else if /i "%COMMAND%"=="stop" (
    call :do_stop
) else if /i "%COMMAND%"=="restart" (
    call :do_stop
    timeout /t 2 >nul
    call :do_start
) else if /i "%COMMAND%"=="status" (
    call :do_status
) else if /i "%COMMAND%"=="logs" (
    call :do_logs %*
) else if /i "%COMMAND%"=="backup" (
    call :do_backup
) else if /i "%COMMAND%"=="health" (
    call :do_health
) else (
    echo ❌ Unknown command: %COMMAND%
    echo Run PROCESS_MANAGER.bat without arguments for help.
    exit /b 1
)

exit /b 0

:do_start
echo.
echo 🚀 Starting Mesna POS System...
echo.

REM Check if already running
tasklist | find "node.exe" >nul
if not errorlevel 1 (
    echo ⚠️  Node.js processes already running.
    echo    Use 'PROCESS_MANAGER.bat stop' first if you want to restart.
    echo.
    pause
    exit /b 0
)

REM Start backend
echo 🔧 Starting backend...
cd /d "%~dp0backend"
start "" /b node server.js
set BACKEND_STARTED=true
timeout /t 3 >nul

REM Start frontend
echo 🎨 Starting frontend...
cd /d "%~dp0frontend"
start "" npm run dev
set FRONTEND_STARTED=true
timeout /t 5 >nul

REM Verify both started
tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo ❌ Failed to start processes! Check logs.
    echo.
    pause
    exit /b 1
)

echo ✅ Mesna POS started successfully!
echo.
echo 📝 Management tips:
echo   • View logs: PROCESS_MANAGER.bat logs
echo   • Create backup: PROCESS_MANAGER.bat backup
echo   • Health check: PROCESS_MANAGER.bat health
echo   • Stop system: PROCESS_MANAGER.bat stop
echo.
pause
goto :eof

:do_stop
echo.
echo 🛑 Stopping Mesna POS System...
echo.

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

timeout /t 2 >nul

tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo ✅ All Mesna POS processes stopped.
) else (
    echo ⚠️  Some processes may still be running.
    echo    Check Task Manager for node.exe or npm.exe processes.
)
echo.
pause
goto :eof

:do_status
echo.
echo 📊 Mesna POS Process Status
echo.

tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo ❌ No Node.js processes found.
    echo    System appears to be stopped.
) else (
    echo ✅ Node.js processes are running:
    tasklist | find "node.exe"
    echo.
    echo 💡 To see detailed logs: PROCESS_MANAGER.bat logs
    echo    To stop: PROCESS_MANAGER.bat stop
)
echo.
pause
goto :eof

:do_logs
echo.
echo 📄 Mesna POS Logs
echo.

if not exist "%~dp0backend\logs\pos.log" (
    echo ❌ Log file not found: backend\logs\pos.log
    echo    The log will be created when the backend starts.
    echo.
    pause
    goto :eof
)

REM Show last 30 lines and offer to follow
set /p choice=Show last 30 lines and follow? (y/n):
if /i "%choice%"=="y" (
    powershell -command "Get-Content -Path '%~dp0backend\logs\pos.log' -Tail 30 -Wait"
) else (
    more +%~dp0backend\logs\pos.log
)
echo.
pause
goto :eof

:do_backup
echo.
echo 💾 Creating Database Backup...
echo.

cd /d "%~dp0backend"
node scripts/backup.js
echo.
pause
goto :eof

:do_health
echo.
echo 🔍 Running Health Check...
echo.

cd /d "%~dp0backend"
node scripts/health-check.js
echo.
pause
goto :eof