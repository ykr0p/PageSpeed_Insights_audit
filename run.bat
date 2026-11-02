@echo off
cd /d "%~dp0"
node bin\psi-audit.mjs %*
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Audit finished with error.
)
echo.
pause
