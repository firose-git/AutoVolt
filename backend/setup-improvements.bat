@echo off
REM AutoVolt Architecture Fixes - Quick Setup Script
REM This script applies the architecture improvements to your AutoVolt project

echo ========================================== 
echo    AutoVolt Architecture Improvements Setup
echo ==========================================
echo.

REM Check if we're in the backend directory
if not exist "package.json" (
    echo Error: Please run this script from the backend directory
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Creating database indexes...
node scripts\createIndexes.js

echo.
echo ========================================== 
echo    Architecture improvements applied successfully!
echo ==========================================
echo.
echo What was improved:
echo   - Enhanced error handling with custom error classes
echo   - MQTT service refactored for better reliability
echo   - Database indexes optimized for performance
echo   - Message queuing for offline devices
echo   - Structured logging throughout the application
echo.
echo Next steps:
echo   1. Review backend\ARCHITECTURE_IMPROVEMENTS.md for details
echo   2. Update server.js to use the new MQTT service
echo   3. Test MQTT connectivity: npm run dev
echo   4. Monitor logs for any issues
echo.
echo New NPM scripts available:
echo   npm run db:indexes  - Create/update database indexes
echo   npm run db:migrate  - Run database migrations
echo.
pause
