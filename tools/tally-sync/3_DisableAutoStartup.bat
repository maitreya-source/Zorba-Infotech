@echo off
title Zorba Infotech - Disable Automatic Startup
cd /d "%~dp0"

echo ================================================================
echo        ZORBA INFOTECH - DISABLE AUTOMATIC STARTUP
echo ================================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if exist "%STARTUP_FOLDER%\ZorbaTallySync.vbs" (
    del /f /q "%STARTUP_FOLDER%\ZorbaTallySync.vbs"
    echo Removed startup launcher from Windows Startup folder.
) else (
    echo No startup entry found in Startup folder.
)

if exist "%~dp0SilentRunner.vbs" (
    del /f /q "%~dp0SilentRunner.vbs"
)

echo Stopping any running ZorbaTallySync background instances...
taskkill /f /im ZorbaTallySync.exe >nul 2>&1

echo.
echo [SUCCESS] Automatic Startup disabled and background process stopped.
echo ================================================================
echo.
pause
