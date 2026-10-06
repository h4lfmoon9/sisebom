
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Startup = [Environment]::GetFolderPath("Startup")
$Target = Join-Path $Startup "Sisebom-Local-Server.cmd"
$Launcher = Join-Path $PSScriptRoot "launch-hidden.ps1"

$content = "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`"`r`n"
Set-Content -Path $Target -Value $content -Encoding ASCII

Write-Host ""
Write-Host "Windows 로그인 자동 실행 등록 완료." -ForegroundColor Green
Write-Host "등록 위치: $Target"

# Start now too.
& $Launcher

Write-Host ""
Write-Host "이제 PC를 재부팅해도 로그인 후 시세봄 서버가 다시 켜집니다."
Read-Host "엔터를 누르면 종료"
