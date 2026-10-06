@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server\launch-hidden.ps1"
timeout /t 2 >nul
echo Sisebom server start requested.
echo http://localhost:3000
pause
