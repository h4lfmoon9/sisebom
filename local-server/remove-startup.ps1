
$Startup = [Environment]::GetFolderPath("Startup")
$Target = Join-Path $Startup "Sisebom-Local-Server.cmd"
Remove-Item $Target -Force -ErrorAction SilentlyContinue
Write-Host "시세봄 자동 실행을 제거했습니다." -ForegroundColor Green
Read-Host "엔터를 누르면 종료"
