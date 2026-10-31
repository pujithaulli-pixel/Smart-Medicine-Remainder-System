@echo off
setlocal enabledelayedexpansion
title Stop Smart Medical Reminder System

echo ======================================================================
echo           STOPPING SMART MEDICAL REMINDER SYSTEM SERVICES
echo ======================================================================
echo.

:: 1. Terminate processes on port 3000 (Frontend Vite)
echo [INFO] Checking for processes listening on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    if not "%%a"=="0" (
        echo Killing process PID %%a on port 3000...
        taskkill /F /PID %%a >nul 2>nul
    )
)

:: 2. Terminate processes on port 3001 (Backend API)
echo [INFO] Checking for processes listening on port 3001 (Backend API)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
    if not "%%a"=="0" (
        echo Killing process PID %%a on port 3001...
        taskkill /F /PID %%a >nul 2>nul
    )
)

echo.
echo [SUCCESS] Both Frontend and Backend services have been stopped.
echo ======================================================================
echo.
pause
