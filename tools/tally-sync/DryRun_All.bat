@echo off
title Zorba Infotech - Dry-Run Simulation (Full)
cd /d "%~dp0"
echo ================================================================
echo     ZORBA INFOTECH - DRY-RUN SIMULATION (STOCK & CUSTOMERS)
echo ================================================================
echo.
echo Running a zero-write simulation against Google Cloud...
echo.

ZorbaTallySync.exe -dry-run -all

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorba.co.in/admin/tally-sync
echo to see the simulation report.
echo ================================================================
pause
