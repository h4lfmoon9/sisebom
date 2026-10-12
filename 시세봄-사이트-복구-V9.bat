@echo off
cd /d "%~dp0"
node apply-z-site-repair-v9.js
echo.
echo If the repair succeeded, restart Sisebom server and open http://localhost:3000
pause
