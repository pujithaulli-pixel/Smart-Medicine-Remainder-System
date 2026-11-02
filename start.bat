@echo off
setlocal enabledelayedexpansion
title Smart Medical Reminder System

echo ======================================================================
echo           SMART MEDICAL REMINDER SYSTEM - STARTUP LAUNCHER
echo ======================================================================
echo.

:: Ensure working directory is the project directory
cd /d "%~dp0"

:: 1. Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if dependencies are installed
if not exist "node_modules\" (
    echo [INFO] First-time setup: Installing required project dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install project dependencies.
        pause
        exit /b 1
    )
)

:: 3. Free ports 3001 and 3000 if previously left running
echo [INFO] Ensuring ports 3001 and 3000 are available...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -Force -ErrorAction SilentlyContinue" >nul 2>nul
timeout /t 2 /nobreak >nul

:: 4. Launch the Backend Notification Service (Port 3001)
echo [1/3] Starting Backend API Server on port 3001...
start "Medical Reminder - Backend API" cmd /k node server/index.js

:: Wait 2 seconds for backend initialization
ping 127.0.0.1 -n 3 >nul

:: 5. Launch the Frontend Development Server (Port 3000)
echo [2/3] Starting Frontend Dev Server on port 3000...
start "Medical Reminder - Frontend UI" cmd /k npm run dev

:: Wait 3 seconds for Vite server to spin up
ping 127.0.0.1 -n 4 >nul

:: 6. Open browser at http://localhost:3000
echo [3/3] Opening application in your default web browser...
start "" "http://localhost:3000"

echo.
echo ======================================================================
echo   Application successfully started!
echo.
echo   * Frontend Web App:     http://localhost:3000
echo   * Backend REST API:     http://localhost:3001
echo   * Health Diagnostic:    http://localhost:3001/api/health
echo.
echo   Separate console windows are running the Frontend and Backend.
echo   To shut down, close those console windows or double-click stop.bat.
echo ======================================================================
echo.
pause
