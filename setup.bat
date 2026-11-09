@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo   PageSpeed & Lighthouse Toolkit - Автонастройка
echo ========================================================
echo Проверка Node.js и npm...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js не найден! Пожалуйста, скачайте его с https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js обнаружен.
echo Установка локального движка Lighthouse для 100%% автономной работы...
call npm install
echo.
echo ========================================================
echo   [✓] Все компоненты успешно настроены!
echo   Теперь запустите run.bat для начала аудита.
echo ========================================================
echo.
pause
