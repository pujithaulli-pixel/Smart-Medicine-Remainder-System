@echo off
setlocal enabledelayedexpansion
title Stop Smart Medical Reminder System

echo ======================================================================
echo           STOPPING SMART MEDICAL REMINDER SYSTEM SERVICES
echo ======================================================================
echo.

:: 1. Forcefully release ports 3000 and 3001 using PowerShell
echo [INFO] Releasing ports 3000 and 3001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -Force -ErrorAction SilentlyContinue" >nul 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server/index.js*' -or $_.CommandLine -like '*vite*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo.
echo [SUCCESS] Both Frontend and Backend services have been stopped.
echo ======================================================================
echo.
pause
