@echo off
REM =============================================
REM Mesna POS Production Startup Script
REM More robust than the basic start-pos.bat
REM =============================================

setlocal

echo.
echo 🚀 Starting Mesna POS in Production Mode...
echo.

REM Check if we're in the right directory
if not exist "%~dp0backend\server.js" (
    echo ❌ Error: Please run this script from the Mesna POS root directory
    echo.
    pause
    exit /b 1
)

REM Set Node.js options for better performance
set NODE_OPTIONS=--max-old-space-size=1024

REM Load environment variables from .env if it exists
if exist "%~dp0backend\.env" (
    echo 📄 Loading environment configuration...
    for /f "usebackq delims=" %%a in ("%~dp0backend\.env") do (
        set "%%a"
    )
) else if exist "%~dp0backend\.env.example" (
    echo ⚠️  No .env file found. Using example configuration.
    echo    Copy backend\.env.example to backend\.env and customize as needed.
) else (
    echo ⚠️  No environment files found. Using built-in defaults.
)

REM Check and create necessary directories
if not exist "%~dp0backend\data" mkdir "%~dp0backend\data"
if not exist "%~dp0backend\logs" mkdir "%~dp0backend\logs"
if not exist "%~dp0backend\backups" mkdir "%~dp0backend\backups"

REM Start backend in background
echo.
echo 🔧 Starting backend server...
start "" /b node "%~dp0backend\server.js"
set BACKEND_PID=%!

REM Give backend time to start
timeout /t 3 >nul

REM Check if backend started successfully
tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo ❌ Backend failed to start! Check logs in backend\logs\pos.log
    echo.
    pause
    exit /b 1
)

echo ✅ Backend started (PID: !BACKEND_PID!)
echo    API available at: http://localhost:!PORT!:3001
echo.

REM Start frontend
echo 🎨 Starting frontend development server...
cd /d "%~dp0frontend"
start "" npm run dev
set FRONTEND_PID=%!

REM Give frontend time to start
timeout /t 5 >nul

tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo ❌ Frontend failed to start! Check frontend logs.
    echo.
    pause
    exit /b 1
)

echo ✅ Frontend started (PID: !FRONTEND_PID!)
echo    UI available at: http://localhost:5173
echo.

echo.
echo 🎉 Mesna POS is now running!
echo.
echo 📋 Management Commands:
echo   • To stop: Close this window or run: taskkill /f /im node.exe
echo   • To view logs: backend\logs\pos.log
echo   • To restart: Run this script again
echo   • Admin PIN: 1234 (change after first login!)
echo   • Cashier PIN: 0000
echo.
echo 💡 Tips:
echo   • For production builds: Run "npm run build" in frontend, then "npm run preview"
echo   • To disable voice AI: Set ENABLE_VOICE=false in backend\.env
echo   • All machines on same LAN will auto-discover via UDP port 41234
echo.
echo 🛑 Press any text key to stop all servers and exit...
echo.

:waitforkey
choice /n /c yn /t 1 >nul
if errorlevel 2 goto :waitforkey
if errorlevel 1 goto :shutdown
goto :waitforkey

:shutdown
echo.
echo 🛑 Stopping Mesna POS servers...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ All servers stopped.
echo.
endlocal
pause