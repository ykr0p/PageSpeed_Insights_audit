@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :no_node

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
