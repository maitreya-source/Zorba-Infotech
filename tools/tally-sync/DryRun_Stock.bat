@echo off
title Zorba Infotech - Dry-Run Simulation (Stock Only)
cd /d "%~dp0"
echo ================================================================
echo     ZORBA INFOTECH - DRY-RUN SIMULATION (STOCK ONLY)
echo ================================================================
echo.
echo Running a zero-write simulation of stock inventory...
echo.

ZorbaTallySync.exe -dry-run -stock

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorbainfotech.in/admin/tally-sync
echo ================================================================
pause
