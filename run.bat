@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo   [ОШИБКА] Node.js не найден на этом компьютере!
    echo ========================================================
    echo Для работы утилиты требуется среда выполнения Node.js (v18+).
    echo.
    echo 1. Скачайте официальный установщик Node.js LTS:
    echo    https://nodejs.org/
    echo 2. Установите Node.js и снова запустите run.bat.
    echo ========================================================
    echo.
    pause
    exit /b 1
)

node bin\psi-audit.mjs %*
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Audit finished with error.
)
echo.
pause
