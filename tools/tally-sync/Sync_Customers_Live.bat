@echo off
title Zorba Infotech - Live Sync Customers & Debtors
cd /d "%~dp0"
echo ================================================================
echo        ZORBA INFOTECH - LIVE SYNC CUSTOMERS & DEBTORS ONLY
echo ================================================================
echo.
echo Syncing Sundry Debtors and Customer Ledgers with Google Cloud...
echo.

ZorbaTallySync.exe -customers

echo.
echo ================================================================
echo Check the Admin Dashboard at: https://zorbainfotech.in/admin/tally-sync
echo ================================================================
pause
