@echo off
title Zorba Infotech - Configure Automatic Startup Background Sync
cd /d "%~dp0"

echo ================================================================
echo    ZORBA INFOTECH - ENABLE AUTOMATIC BACKGROUND SYNC ON STARTUP
echo ================================================================
echo.
echo Creating silent background launcher...

:: Create silent VBS script to run without a black console window
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%~dp0"
echo WshShell.Run Chr(34^) ^& "%~dp0ZorbaTallySync.exe" ^& Chr(34^) ^& " -daemon -hours 4", 0, False
) > "%~dp0SilentRunner.vbs"

:: Place shortcut/script in Windows Startup folder
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /y "%~dp0SilentRunner.vbs" "%STARTUP_FOLDER%\ZorbaTallySync.vbs" >nul

echo.
echo [SUCCESS] Automatic Startup configured!
echo Zorba Tally Sync will now run automatically in the background 
echo whenever Windows boots up (Every 4 Hours, Zero Console Popups).
echo.
echo Starting background sync right now...
start "" wscript.exe "%~dp0SilentRunner.vbs"
echo Background sync is now active!
echo ================================================================
echo.
pause
