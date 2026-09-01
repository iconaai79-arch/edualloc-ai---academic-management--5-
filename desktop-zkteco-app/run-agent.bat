@echo off
title EduAI ZKTeco Attendance & Cloud Sync Agent
echo =======================================================
echo    EduAI ZKTeco Biometric Desktop Sync Agent
echo =======================================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo [INFO] Installing required dependencies...
    call npm install
)

echo [INFO] Launching Desktop Agent...
npm start
