@echo off
REM =============================================
REM Mesna POS Deployment Package Creator
REM Creates a ready-to-deploy ZIP file for multiple machines
REM =============================================

echo.
echo 📦 Creating Mesna POS Deployment Package...
echo.

REM Set variables
set PROJECT_ROOT=%~dp0..
set DEPLOY_DIR=%PROJECT_ROOT%\deployment\package
set ZIP_NAME=mesna-pos-deploy.zip
set TIMESTAMP=%DATE:~-4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%

REM Clean previous package
if exist "%DEPLOY_DIR%" (
    echo 🗑️  Cleaning previous package...
    rmdir /s /q "%DEPLOY_DIR%"
)

echo 📁 Creating package structure...
mkdir "%DEPLOY_DIR%\backend"
mkdir "%DEPLOY_DIR%\frontend"
mkdir "%DEPLOY_DIR%\docs"

REM Copy backend (excluding node_modules and large files)
echo 📋 Copying backend files...
xcopy "%PROJECT_ROOT%\backend" "%DEPLOY_DIR%\backend" /E /H /K /EXCLUDE:"%PROJECT_ROOT%\deployment\exclude.txt"

REM Copy frontend (excluding node_modules)
echo 📋 Copying frontend files...
xcopy "%PROJECT_ROOT%\frontend" "%DEPLOY_DIR%\frontend" /E /H /K /EXCLUDE:"%PROJECT_ROOT%\deployment\exclude.txt"

REM Copy root files
echo 📋 Copying root files...
xcopy "%PROJECT_ROOT%\start-pos.bat" "%DEPLOY_DIR%" /H /K
xcopy "%PROJECT_ROOT%\README.md" "%DEPLOY_DIR%\docs\" /H /K
xcopy "%PROJECT_ROOT%\Mesna_POS_Installation_Guide.pdf" "%DEPLOY_DIR%\docs\" /H /K
xcopy "%PROJECT_ROOT%\DEPLOY_GUIDE.md" "%DEPLOY_DIR%\docs\" /H /K

REM Create setup script for target machines
echo 📋 Creating setup script...
(
    echo @echo off
    echo.
    echo 🚀 Mesna POS Register Setup Script
    echo.
    echo This script will:
    echo 1. Install Node.js dependencies
    echo 2. Initialize the database
    echo 3. Create Windows Firewall rules
    echo 4. Create startup shortcut
    echo.
    echo ⚠️  Please run this script as Administrator!
    echo.
    pause
    echo.
    echo 📥 Setting up backend...
    cd /d "%~dp0backend"
    call npm install
    echo.
    echo 🗄️  Initializing database...
    call npx prisma migrate dev --name init
    call npm run seed
    echo.
    echo 📥 Setting up frontend...
    cd /d "%~dp0frontend"
    call npm install
    echo.
    echo 🔒 Configuring Windows Firewall...
    netsh advfirewall firewall add rule name="Mesna POS UDP Discovery" dir=in action=allow protocol=UDP localport=41234
    netsh advfirewall firewall add rule name="Mesna POS Backend API" dir=in action=allow protocol=TCP localport=3001
    netsh advfirewall firewall add rule name="Mesna POS Frontend Dev" dir=in action=allow protocol=TCP localport=5173
    echo.
    echo 🔺 Creating startup shortcut...
    set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
    if not exist "%STARTUP%" mkdir "%STARTUP%"
    powershell -command "$s = '%~dp0start-pos.bat'; $sh = New-Object -ComObject WScript.Shell; $ln = $sh.CreateShortcut('%STARTUP%\Mesna POS.lnk'); $ln.TargetPath = $s; $ln.WorkingDirectory = '%~dp0'; $ln.IconLocation = '%~dp0backend\public\favicon.ico'; $ln.Save()"
    echo.
    echo ✅ Setup complete!
    echo.
    echo 📝 Next steps:
    echo 1. Double-click "start-pos.bat" to launch the system
    echo 2. Backend will run on http://localhost:3001
    echo 3. Frontend will open at http://localhost:5173
    echo 4. Login: Admin (1234), Cashier (0000)
    echo.
    echo 💡 Tip: To disable voice AI (saves memory), edit backend\.env and set ENABLE_VOICE=false
    echo.
    pause
) > "%DEPLOY_DIR%\setup-register.bat"

REM Create exclude file for xcopy
(
    echo \node_modules\
    echo \.git\
    echo \.env
    echo data\pos.db
    echo \.vite\
    echo \dist\
    echo \.cache\
    echo \.tmp\
    echo Thumbs.db
    echo ehthumbs_vista.db
    echo *.log
    echo *.tmp
    echo *.temp
) > "%PROJECT_ROOT%\deployment\exclude.txt"

REM Create the ZIP file
echo.
echo 📦 Creating ZIP archive...
powershell -command "Compress-Archive -Path '%DEPLOY_DIR%\*' -DestinationPath '%PROJECT_ROOT%\mesna-pos-deploy-%TIMESTAMP%.zip' -Force"

REM Cleanup
echo 🧹 Cleaning up...
rmdir /s /q "%DEPLOY_DIR%"
del "%PROJECT_ROOT%\deployment\exclude.txt"

echo.
echo 🎉 Deployment package created successfully!
echo.
echo 📁 Output: mesna-pos-deploy-%TIMESTAMP%.zip
echo.
echo 📋 Contents:
echo   - Complete backend & frontend source
echo   - Automated setup script (setup-register.bat)
echo   - Documentation and guides
echo.
echo 🚀 To deploy:
echo   1. Copy the ZIP file to each target machine
echo   2. Extract it to a folder (e.g., C:\MesnaPOS)
echo   3. Run setup-register.bat as Administrator
echo   4. Launch with start-pos.bat
echo.
pause