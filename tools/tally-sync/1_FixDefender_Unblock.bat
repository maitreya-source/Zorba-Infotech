@echo off
title Zorba Infotech - One-Time Windows Defender & SmartScreen Fix
cd /d "%~dp0"

echo ================================================================
echo     ZORBA INFOTECH - ONE-TIME DEFENDER / SMARTSCREEN UNBLOCK
echo ================================================================
echo.
echo 1. Removing Windows Mark-of-the-Web quarantine flags...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%~dp0*' -Recurse | Unblock-File"

echo.
echo 2. Whitelisting sync directory in Windows Defender...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -Command Add-MpPreference -ExclusionPath ''%~dp0'''" 2>nul

echo.
echo ================================================================
echo [SUCCESS] Files unblocked! Windows Defender will no longer prompt.
echo ================================================================
echo.
pause
