@echo off
title Zorba Infotech - Tally & Cloud Connection Test
cd /d "%~dp0"
echo ================================================================
echo        ZORBA INFOTECH - PRE-FLIGHT CONNECTIVITY TEST
echo ================================================================
echo.

ZorbaTallySync.exe -test

echo.
echo ================================================================
pause
