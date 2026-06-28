@echo off
REM =============================================
REM Mesna POS Frontend Production Startup
REM =============================================

echo.
echo 🚀 Starting Mesna POS Frontend (Production Build)
echo.

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the frontend directory
    pause
    exit /b 1
)

REM Check if production build exists
if not exist "dist" (
    echo 📦 Production build not found. Building now...
    npm run build

    if errorlevel 1 (
        echo ❌ Build failed!
        pause
        exit /b 1
    )

    echo ✅ Build completed successfully!
) else (
    echo 📦 Using existing production build...
)

REM Start preview server
echo 🌐 Starting preview server...
npm run preview

echo.
echo 👋 Preview server stopped.
pause