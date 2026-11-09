@echo off
cd /d "%~dp0"

echo ========================================================
echo   PageSpeed and Lighthouse Toolkit - Auto Setup
echo ========================================================
echo Checking Node.js and npm...

where node >nul 2>nul
if errorlevel 1 goto :no_node

echo [OK] Node.js found.
echo Installing Lighthouse for offline use...
call npm install
echo.
echo ========================================================
echo   [OK] Setup complete! You can now run run.bat.
echo ========================================================
echo.
pause
goto :eof

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
