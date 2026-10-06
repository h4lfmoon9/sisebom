
$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root "runtime"
$ServerPidFile = Join-Path $RuntimeDir "server.pid"
$WatchdogPidFile = Join-Path $RuntimeDir "watchdog.pid"

function CheckPidFile($path, $label) {
    if (-not (Test-Path $path)) {
        Write-Host "$label : 꺼짐"
        return
    }
    try {
        $p = [int](Get-Content $path)
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "$label : 실행 중 (PID $p)" -ForegroundColor Green
        } else {
            Write-Host "$label : 꺼짐 (남은 PID 파일)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "$label : 상태 확인 실패" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== 시세봄 로컬 서버 상태 ===" -ForegroundColor Cyan
CheckPidFile $WatchdogPidFile "자동복구"
CheckPidFile $ServerPidFile "Node 서버"

try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 4
    Write-Host "HTTP : 정상 ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "HTTP : 응답 없음" -ForegroundColor Red
}

Write-Host ""
Write-Host "로컬 주소: http://localhost:3000"
Read-Host "엔터를 누르면 종료"
