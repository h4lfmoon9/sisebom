
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Tools = Join-Path $Root "tools"
$Logs = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $Tools | Out-Null
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

$Exe = Join-Path $Tools "cloudflared.exe"

if (-not (Test-Path $Exe)) {
    Write-Host "cloudflared 다운로드 중..."
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Invoke-WebRequest -Uri $url -OutFile $Exe -UseBasicParsing
}

Write-Host ""
Write-Host "시세봄 임시 공개 주소를 만드는 중..." -ForegroundColor Cyan
Write-Host "PC 또는 이 창을 끄면 공개 주소도 종료됩니다."
Write-Host ""

& $Exe tunnel --url http://127.0.0.1:3000
