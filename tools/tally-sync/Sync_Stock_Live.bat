@echo off
title Zorba Infotech - Live Sync Stock Inventory
cd /d "%~dp0"
echo ================================================================
echo        ZORBA INFOTECH - LIVE SYNC STOCK INVENTORY ONLY
echo ================================================================
echo.
echo Syncing stock balances and product SKUs with Google Cloud...
echo.

ZorbaTallySync.exe -stock

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorba.co.in/admin/tally-sync
echo ================================================================
pause
