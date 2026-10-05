@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

if not exist ".git" (
  echo [오류] 이 파일들을 sisebom 폴더 최상단에 넣고 실행하세요.
  pause
  exit /b 1
)

if not exist "payload\server\providers\tavilyIndex.js" (
  echo [오류] payload 파일이 없습니다.
  pause
  exit /b 1
)

echo [1/4] provider 파일 적용...
copy /Y "payload\server\providers\tavilyIndex.js" "server\providers\tavilyIndex.js" >nul
copy /Y "payload\server\providers\daangn.js" "server\providers\daangn.js" >nul
copy /Y "payload\server\providers\bunjang.js" "server\providers\bunjang.js" >nul
copy /Y "payload\server\providers\joongna.js" "server\providers\joongna.js" >nul

echo [2/4] Git 변경사항 추가...
git add server/providers/tavilyIndex.js server/providers/daangn.js server/providers/bunjang.js server/providers/joongna.js
if errorlevel 1 goto :fail

echo [3/4] 커밋...
git commit -m "Tavily 실제 매물 공급자 12단계"
if errorlevel 1 (
  echo 변경사항이 없거나 커밋할 내용이 없습니다.
)

echo [4/4] Push origin...
git push origin main
if errorlevel 1 goto :fail

echo.
echo 완료: GitHub 업로드까지 끝났습니다.
echo Render Auto-Deploy가 켜져 있으면 자동 배포됩니다.
echo.
pause
exit /b 0

:fail
echo.
echo 실패했습니다. GitHub Desktop이 아니라 이 창의 오류 문구를 캡처해서 보내주세요.
pause
exit /b 1
