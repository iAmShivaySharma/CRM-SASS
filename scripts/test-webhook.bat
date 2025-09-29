@echo off
REM Webhook Testing Script for Windows
REM Usage: test-webhook.bat [webhook-id] [options]

if "%1"=="" (
    echo.
    echo 🔗 Webhook Testing Script
    echo.
    echo Usage: test-webhook.bat ^<webhook-id^> [options]
    echo.
    echo Examples:
    echo   test-webhook.bat abc123
    echo   test-webhook.bat abc123 --type facebook
    echo   test-webhook.bat abc123 --custom "{\"name\":\"John\",\"email\":\"john@test.com\"}"
    echo.
    goto :eof
)

node scripts/test-webhook.js %*
