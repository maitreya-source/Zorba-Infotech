@echo off
title Zorba Infotech - Dry-Run Simulation (Customers Only)
cd /d "%~dp0"
echo ================================================================
echo     ZORBA INFOTECH - DRY-RUN SIMULATION (CUSTOMERS ONLY)
echo ================================================================
echo.
echo Running a zero-write simulation of customers...
echo.

ZorbaTallySync.exe -dry-run -customers

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorbainfotech.in/admin/tally-sync
echo ================================================================
pause
