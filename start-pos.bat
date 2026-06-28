@echo off
title Mesna POS System Launcher
echo ==========================================
echo        STARTING MESNA POS SYSTEM
echo        (100%% OFFLINE / LOCAL MODE)
echo ==========================================
echo.

echo [1/2] Starting Backend Database Server (Port 3001)...
cd /d "%~dp0backend"
start "Mesna POS Backend (DO NOT CLOSE)" cmd /k "node server.js"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Interface (Port 5173)...
cd /d "%~dp0frontend"
start "Mesna POS Frontend (DO NOT CLOSE)" cmd /k "npm run dev"

echo Waiting for frontend server...
timeout /t 3 /nobreak > nul

echo Opening Mesna POS in your default web browser...
start http://localhost:5173

echo.
echo ==========================================
echo   MESNA POS IS LIVE AND READY OFFLINE!
echo ==========================================
echo Note: Keep the two black command prompt windows open while using the POS.
echo To shut down the POS, simply close those windows.
echo.
pause
