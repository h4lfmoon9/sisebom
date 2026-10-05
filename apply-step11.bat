@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo [시세봄 11단계 적용]
echo.
node apply-step11.js
echo.
pause