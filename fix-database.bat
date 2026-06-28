@echo off
title Mesna POS - Database Fix
color 0A
echo ==========================================
echo    MESNA POS - ORDER TABLE DB FIX
echo ==========================================
echo.
echo This will add missing columns to your database.
echo.

cd /d "%~dp0.."

echo Running database migration...
node scripts\apply-migration.js

echo.
echo ==========================================
echo If you see SUCCESS above, restart the POS.
echo If you see an error, contact support.
echo ==========================================
echo.
pause
