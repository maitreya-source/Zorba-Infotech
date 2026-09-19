@echo off
title Zorba Infotech - Configure Once-Daily After-Hours Sync (Zero Daytime Interference)
cd /d "%~dp0"

echo ================================================================
echo   ZORBA INFOTECH - ONCE-DAILY AFTER-HOURS SYNC CONFIGURATION
echo   (Zero Daytime Background Process — Protects Tally Print/WhatsApp)
echo ================================================================
echo.

:: 1. First, stop any running daytime daemon and remove Startup folder VBS so Port 9000 is 100% free during work hours
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_FOLDER%\ZorbaTallySync.vbs" (
    del /f /q "%STARTUP_FOLDER%\ZorbaTallySync.vbs" >nul 2>&1
)
if exist "%~dp0SilentRunner.vbs" (
    del /f /q "%~dp0SilentRunner.vbs" >nul 2>&1
)
taskkill /f /im ZorbaTallySync.exe >nul 2>&1

:: 2. Register a Windows Scheduled Task that runs ZorbaTallySync.exe ONCE a day at 10:00 PM (22:00) in 3-second One-Shot Mode
echo Registering Windows Daily Scheduled Task (Runs ONCE at 10:00 PM for 3 seconds, then exits)...
schtasks /create /tn "ZorbaTallyAfterHoursSync" /tr "\"%~dp0ZorbaTallySync.exe\" -all" /sc DAILY /st 22:00 /f >nul 2>&1

:: 3. Also place a 1-Click "End of Day - Sync Tally & Close" shortcut on the Desktop for when work finishes early/late
set "DESKTOP_SCRIPT=%USERPROFILE%\Desktop\End of Day - Sync Tally to Website.bat"
(
echo @echo off
echo title Zorba Infotech - End of Day Website Sync
echo cd /d "%~dp0"
echo echo Running 3-second End-of-Day Tally Sync [Stock + Customer Phones]...
echo "%~dp0ZorbaTallySync.exe" -all
echo echo.
echo echo [DONE] Website is synced! You may now safely close Tally or shut down your PC.
echo timeout /t 5
) > "%DESKTOP_SCRIPT%"

echo.
echo [SUCCESS] Configured for Zero Business-Hours Interference!
echo   1. Any daytime background process has been STOPPED (Tally Print ^& WhatsApp are 100%% free).
echo   2. Windows will automatically run a 3-second one-shot sync ONCE daily at 10:00 PM (22:00).
echo   3. Created "End of Day - Sync Tally to Website" on your Desktop for 1-click sync when finishing work.
echo ================================================================
echo.
pause
