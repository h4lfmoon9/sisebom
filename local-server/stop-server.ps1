
$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root "runtime"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

$StopFlag = Join-Path $RuntimeDir "stop.flag"
$ServerPidFile = Join-Path $RuntimeDir "server.pid"
$WatchdogPidFile = Join-Path $RuntimeDir "watchdog.pid"

"stop" | Out-File -Encoding ascii $StopFlag

foreach ($pidFile in @($ServerPidFile, $WatchdogPidFile)) {
    if (Test-Path $pidFile) {
        try {
            $p = [int](Get-Content $pidFile)
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

Remove-Item $ServerPidFile -Force -ErrorAction SilentlyContinue
Remove-Item $WatchdogPidFile -Force -ErrorAction SilentlyContinue
Write-Host "시세봄 로컬 서버를 종료했습니다." -ForegroundColor Green
