@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server\launch-hidden.ps1"
timeout /t 2 >nul
echo 시세봄 서버 시작 요청 완료
echo http://localhost:3000
pause
