$ErrorActionPreference="Stop"
$Root=Split-Path -Parent $PSScriptRoot;$R=Join-Path $PSScriptRoot "runtime";$L=Join-Path $PSScriptRoot "logs";New-Item -ItemType Directory -Force $R|Out-Null;New-Item -ItemType Directory -Force $L|Out-Null
$pf=Join-Path $R "manager.pid";if(Test-Path $pf){try{$p=[int](Get-Content $pf);if(Get-Process -Id $p -ErrorAction SilentlyContinue){Start-Process "http://127.0.0.1:3131";exit}}catch{}}
if(-not(Get-Command node -ErrorAction SilentlyContinue)){Write-Host "Node.js가 필요합니다.";Start-Process "https://nodejs.org/";Read-Host "설치 후 다시 실행";exit}
$o=Join-Path $L "manager-output.log";$e=Join-Path $L "manager-error.log";$p=Start-Process node -ArgumentList @("server.js") -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $o -RedirectStandardError $e -WindowStyle Hidden -PassThru;$p.Id|Out-File -Encoding ascii $pf;Start-Sleep 2;Start-Process "http://127.0.0.1:3131"
