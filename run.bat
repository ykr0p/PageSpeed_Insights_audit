@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "node_modules\.bin\lighthouse.cmd" (
    if not exist ".offline_engine" (
        echo ========================================================
        echo   First launch: checking components...
        echo ========================================================
        call npm install --no-audit --no-fund --fetch-timeout=3000 --fetch-retries=0 >nul 2>nul
        if errorlevel 1 (
            echo   [OK] npm registry is unreachable (proxy/offline).
            echo   [OK] Using Built-in Chromium CDP Engine (works 100%% offline).
            echo offline > ".offline_engine"
        )
        echo.
    )
)

node --no-deprecation bin\psi-audit.mjs %*
goto :end

:no_node
echo.
echo ========================================================
echo   [ERROR] Node.js is not found on this computer!
echo ========================================================
echo   Please install Node.js:
echo   Download: https://nodejs.org/
echo.
echo   After installing Node.js, run this file again.
echo ========================================================
echo.
pause
exit /b 1

:end
echo.
pause
