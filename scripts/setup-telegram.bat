@echo off
echo ===========================================
echo    IoT Classroom Telegram Bot Setup
echo ===========================================
echo.
echo This script will help you set up Telegram notifications
echo for your IoT Classroom system.
echo.
echo Prerequisites:
echo 1. Create a Telegram bot via @BotFather
echo 2. Get your bot token
echo 3. Have your backend running
echo.
echo Press any key to continue...
pause >nul

echo.
echo Step 1: Create a Telegram Bot
echo -------------------------------
echo 1. Open Telegram and search for @BotFather
echo 2. Send /newbot command
echo 3. Follow the instructions to create your bot
echo 4. Copy the bot token (it looks like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
echo.
echo Press any key when you have your bot token...
pause >nul

echo.
set /p BOT_TOKEN="Enter your Telegram bot token: "

echo.
echo Step 2: Test Bot Connection
echo ----------------------------
echo Testing bot connection...
curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getMe" | findstr "ok.*true" >nul
if %errorlevel% neq 0 (
    echo ❌ Bot token is invalid or bot is not accessible.
    echo Please check your token and try again.
    pause
    exit /b 1
)
echo ✅ Bot connection successful!

echo.
echo Step 3: Get Your Chat ID
echo -------------------------
echo 1. Send a message to your bot
echo 2. We'll fetch your chat ID automatically
echo.
echo Send a message to your bot now, then press any key...
pause >nul

echo Fetching your chat ID...
for /f "tokens=*" %%i in ('curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getUpdates" ^| findstr "chat.*id"') do set CHAT_INFO=%%i
echo Chat info: %CHAT_INFO%

echo.
echo Step 4: Update Environment Variables
echo --------------------------------------
echo We need to update your .env file with the bot token.
echo.
set /p ENV_FILE="Enter the path to your .env file (default: ../backend/.env): "
if "%ENV_FILE%"=="" set ENV_FILE=../backend/.env

if not exist "%ENV_FILE%" (
    echo ❌ .env file not found at %ENV_FILE%
    echo Please make sure the path is correct.
    pause
    exit /b 1
)

echo Updating .env file...
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'TELEGRAM_BOT_TOKEN=.*', 'TELEGRAM_BOT_TOKEN=%BOT_TOKEN%' | Set-Content '%ENV_FILE%'"

echo.
echo Step 5: Set Webhook (Optional)
echo -------------------------------
echo For production use, you should set up a webhook URL.
echo This allows the bot to receive messages instantly.
echo.
echo Your webhook URL should be: https://your-domain.com/api/telegram/webhook
echo.
set /p WEBHOOK_URL="Enter your webhook URL (leave empty to skip): "

if not "%WEBHOOK_URL%"=="" (
    echo Setting webhook...
    curl -s "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook?url=%WEBHOOK_URL%" | findstr "ok.*true" >nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to set webhook. You can set it manually later.
    ) else (
        echo ✅ Webhook set successfully!
    )
)

echo.
echo Step 6: Restart Backend
echo ------------------------
echo You need to restart your backend server to apply the changes.
echo.
echo Run: docker-compose restart backend
echo.
set /p RESTART="Do you want to restart the backend now? (y/n): "

if /i "%RESTART%"=="y" (
    echo Restarting backend...
    docker-compose restart backend
    echo ✅ Backend restarted!
)

echo.
echo ===========================================
echo         Setup Complete!
echo ===========================================
echo.
echo Your Telegram bot is now configured!
echo.
echo Next steps:
echo 1. Users can register with: /register their-email@domain.com
echo 2. Test alerts with: /test-alert endpoint
echo 3. Monitor bot status at: /api/telegram/bot-info
echo.
echo Bot Commands:
echo /start - Welcome and registration info
echo /register <email> - Register with system account
echo /status - Check registration status
echo /subscribe <type> - Subscribe to alert types
echo /unsubscribe <type> - Unsubscribe from alert types
echo /help - Show all commands
echo.
echo Press any key to exit...
pause >nul