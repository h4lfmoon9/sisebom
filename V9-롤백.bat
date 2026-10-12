@echo off
cd /d "%~dp0"
node rollback-site-repair-v9.js
echo.
echo Rollback finished. Start the Sisebom server again.
pause
