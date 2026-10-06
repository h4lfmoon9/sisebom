
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $Root "server"
$RuntimeDir = Join-Path $Root "runtime"
$LogsDir = Join-Path $Root "logs"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$WatchdogPidFile = Join-Path $RuntimeDir "watchdog.pid"
$ServerPidFile = Join-Path $RuntimeDir "server.pid"
$StopFlag = Join-Path $RuntimeDir "stop.flag"
$WatchdogLog = Join-Path $LogsDir "watchdog.log"
$StdOut = Join-Path $LogsDir "server-output.log"
$StdErr = Join-Path $LogsDir "server-error.log"

# Already running?
if (Test-Path $WatchdogPidFile) {
    try {
        $oldPid = [int](Get-Content $WatchdogPidFile -ErrorAction Stop)
        $old = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($old) {
            "$(Get-Date -Format s) already-running watchdog=$oldPid" | Out-File -Append -Encoding utf8 $WatchdogLog
            exit 0
        }
    } catch {}
}

Remove-Item $StopFlag -Force -ErrorAction SilentlyContinue
$PID | Out-File -Encoding ascii $WatchdogPidFile
"$(Get-Date -Format s) watchdog-start pid=$PID" | Out-File -Append -Encoding utf8 $WatchdogLog

if (-not (Test-Path $ServerDir)) {
    "$(Get-Date -Format s) ERROR server-folder-missing" | Out-File -Append -Encoding utf8 $WatchdogLog
    exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    "$(Get-Date -Format s) ERROR node-not-found" | Out-File -Append -Encoding utf8 $WatchdogLog
    exit 1
}

# Install dependencies if missing.
if (-not (Test-Path (Join-Path $ServerDir "node_modules"))) {
    "$(Get-Date -Format s) node_modules-missing -> npm install" | Out-File -Append -Encoding utf8 $WatchdogLog
    Push-Location $ServerDir
    try { npm install *> (Join-Path $LogsDir "npm-install.log") } catch {}
    Pop-Location
}

$env:PORT = "3000"
$env:NODE_ENV = "production"

while ($true) {
    if (Test-Path $StopFlag) {
        "$(Get-Date -Format s) stop-flag-detected" | Out-File -Append -Encoding utf8 $WatchdogLog
        break
    }

    $entry = Join-Path $ServerDir "server.js"
    if (-not (Test-Path $entry)) {
        "$(Get-Date -Format s) ERROR server.js-missing" | Out-File -Append -Encoding utf8 $WatchdogLog
        Start-Sleep -Seconds 10
        continue
    }

    "$(Get-Date -Format s) server-start" | Out-File -Append -Encoding utf8 $WatchdogLog

    try {
        $proc = Start-Process `
            -FilePath "node" `
            -ArgumentList @("server.js") `
            -WorkingDirectory $ServerDir `
            -RedirectStandardOutput $StdOut `
            -RedirectStandardError $StdErr `
            -WindowStyle Hidden `
            -PassThru

        $proc.Id | Out-File -Encoding ascii $ServerPidFile
        $proc.WaitForExit()
        $code = $proc.ExitCode
        "$(Get-Date -Format s) server-exit code=$code" | Out-File -Append -Encoding utf8 $WatchdogLog
    }
    catch {
        "$(Get-Date -Format s) server-start-error $($_.Exception.Message)" | Out-File -Append -Encoding utf8 $WatchdogLog
    }

    Remove-Item $ServerPidFile -Force -ErrorAction SilentlyContinue

    if (Test-Path $StopFlag) { break }
    "$(Get-Date -Format s) restart-in-5s" | Out-File -Append -Encoding utf8 $WatchdogLog
    Start-Sleep -Seconds 5
}

Remove-Item $ServerPidFile -Force -ErrorAction SilentlyContinue
Remove-Item $WatchdogPidFile -Force -ErrorAction SilentlyContinue
"$(Get-Date -Format s) watchdog-stop" | Out-File -Append -Encoding utf8 $WatchdogLog
