@echo off
title Mesna POS Application Builder
echo ===================================================
echo             BUILDING MESNA POS SYSTEM
echo ===================================================
echo.

set APP_ROOT=%CD%
set DIST_DIR=%APP_ROOT%\dist-pos

echo [1/5] Compiling clean SQLite Database (Prisma Migrations & Seeding)...
cd /d "%APP_ROOT%\backend"
if exist "%APP_ROOT%\backend\data\pos.db" (
    del /q "%APP_ROOT%\backend\data\pos.db"
)
if exist "%APP_ROOT%\backend\data\pos.db-journal" (
    del /q "%APP_ROOT%\backend\data\pos.db-journal"
)
call npx prisma migrate deploy
call npm run seed
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database setup/seeding failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/5] Compiling React Frontend (Vite production build)...
cd /d "%APP_ROOT%\frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Frontend Vite build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/5] Compiling Native C# Launcher (MesnaPOS.exe)...
cd /d "%APP_ROOT%"
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:MesnaPOS.exe launcher.cs
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] C# compilation failed!
    pause
    exit /b %ERRORLEVEL%
)
echo Compiled launcher successfully: MesnaPOS.exe

echo.
echo [4/5] Structuring Clean Distribution Directory (%DIST_DIR%)...
if exist "%DIST_DIR%" (
    echo Cleaning existing distribution folder...
    rmdir /s /q "%DIST_DIR%"
)
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\backend"
mkdir "%DIST_DIR%\backend\data"

echo.
echo [5/5] Copying Backend and Compiled Static Assets...
copy "%APP_ROOT%\MesnaPOS.exe" "%DIST_DIR%\"
copy "%APP_ROOT%\backend\server.js" "%DIST_DIR%\backend\"
copy "%APP_ROOT%\backend\package.json" "%DIST_DIR%\backend\"
copy "%APP_ROOT%\backend\.env" "%DIST_DIR%\backend\"
copy "%APP_ROOT%\backend\store_settings.json" "%DIST_DIR%\backend\"

if exist "%APP_ROOT%\Mesna_POS_Installation_Guide.pdf" (
    copy "%APP_ROOT%\Mesna_POS_Installation_Guide.pdf" "%DIST_DIR%\"
)

echo Copying clean database template files...
copy "%APP_ROOT%\backend\data\pos.db" "%DIST_DIR%\backend\data\pos.db"
copy "%APP_ROOT%\backend\data\pos.db" "%DIST_DIR%\backend\data\pos.db.template"

echo Copying backend core modules...
robocopy "%APP_ROOT%\backend\src" "%DIST_DIR%\backend\src" /E /NFL /NDL /NJH /NJS
robocopy "%APP_ROOT%\backend\prisma" "%DIST_DIR%\backend\prisma" /E /NFL /NDL /NJH /NJS
robocopy "%APP_ROOT%\backend\public" "%DIST_DIR%\backend\public" /E /NFL /NDL /NJH /NJS
robocopy "%APP_ROOT%\backend\node_modules" "%DIST_DIR%\backend\node_modules" /E /NFL /NDL /NJH /NJS /XD "%APP_ROOT%\backend\node_modules\.cache"

echo.
echo [6/5] Creating ZIP archive (dist-pos.zip)...
if exist "%APP_ROOT%\dist-pos.zip" (
    del /q "%APP_ROOT%\dist-pos.zip"
)

REM Use Windows native tar if available (supports long paths in node_modules and is fast)
where tar >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using native Windows tar to compress...
    tar -acf "%APP_ROOT%\dist-pos.zip" -C "%DIST_DIR%" .
) else (
    echo [WARNING] Native tar not found. Falling back to PowerShell (may fail on long node_modules paths)...
    powershell -command "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%APP_ROOT%\dist-pos.zip' -Force"
)

if exist "%APP_ROOT%\dist-pos.zip" (
    echo ZIP archive created successfully: %APP_ROOT%\dist-pos.zip
) else (
    echo [ERROR] Failed to create ZIP archive!
)

echo.
echo ===================================================
echo    MESNA POS DISTRIBUTION BUNDLED SUCCESSFULLY!
echo ===================================================
echo Target Location: %DIST_DIR%
echo Executable file: %DIST_DIR%\MesnaPOS.exe
echo ZIP package file: %APP_ROOT%\dist-pos.zip
echo.
pause
