
$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root "runtime"
$PidFile = Join-Path $RuntimeDir "watchdog.pid"

if (Test-Path $PidFile) {
    try {
        $p = [int](Get-Content $PidFile)
        if (Get-Process -Id $p -ErrorAction SilentlyContinue) { exit 0 }
    } catch {}
}

$script = Join-Path $PSScriptRoot "start-server.ps1"
Start-Process powershell.exe `
    -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","`"$script`"") `
    -WindowStyle Hidden
Start-Sleep -Seconds 2
