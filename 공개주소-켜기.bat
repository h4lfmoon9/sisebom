@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server\public-tunnel.ps1"
pause
