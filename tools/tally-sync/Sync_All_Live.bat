@echo off
title Zorba Infotech - Full Live Sync (Stock & Customers)
cd /d "%~dp0"
echo ================================================================
echo        ZORBA INFOTECH - FULL LIVE SYNC (STOCK & CUSTOMERS)
echo ================================================================
echo.
echo Syncing all Stock Items and Customer Ledgers with Google Cloud...
echo.

ZorbaTallySync.exe -all

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorba.co.in/admin/tally-sync
echo ================================================================
pause
