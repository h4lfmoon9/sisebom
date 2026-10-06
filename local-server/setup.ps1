
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $Root "server"
$RuntimeDir = Join-Path $Root "runtime"
$LogsDir = Join-Path $Root "logs"

Write-Host ""
Write-Host "=== 시세봄 로컬 서버 1회 설치 ===" -ForegroundColor Cyan

if (-not (Test-Path $ServerDir)) {
    Write-Host ""
    Write-Host "[오류] server 폴더를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "이 ZIP을 시세봄 프로젝트 최상단에 풀어주세요."
    Read-Host "엔터를 누르면 종료"
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "[오류] Node.js가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "Node.js LTS를 설치한 뒤 다시 실행하세요."
    Start-Process "https://nodejs.org/"
    Read-Host "엔터를 누르면 종료"
    exit 1
}

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Write-Host ""
Write-Host "Node.js: $(node -v)"
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "npm: $(npm -v)"
} else {
    Write-Host "[오류] npm을 찾을 수 없습니다." -ForegroundColor Red
    Read-Host "엔터를 누르면 종료"
    exit 1
}

Push-Location $ServerDir
try {
    if (Test-Path (Join-Path $ServerDir "package-lock.json")) {
        Write-Host ""
        Write-Host "npm ci 실행 중..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Host "npm ci 실패. npm install로 다시 시도합니다." -ForegroundColor Yellow
            npm install
        }
    } else {
        Write-Host ""
        Write-Host "npm install 실행 중..."
        npm install
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "설치 완료." -ForegroundColor Green
Write-Host "다음으로 '자동실행-설치.bat'를 실행하면 재부팅 후에도 자동으로 켜집니다."
Read-Host "엔터를 누르면 종료"
