@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist ".git" (
  echo [오류] 이 파일을 sisebom 폴더 최상단에 넣고 실행하세요.
  pause
  exit /b 1
)

echo [1/4] 정상 CSS 복구...
git show f2417896f3807260424eb077f250aa430f309937:style.css > style.css
if errorlevel 1 goto :fail

echo.>> style.css
echo .listing-actions{display:flex;gap:8px;align-items:center}.text-btn:disabled{opacity:.55;cursor:wait}>> style.css

echo [2/4] 변경사항 추가...
git add style.css
if errorlevel 1 goto :fail

echo [3/4] 커밋...
git commit -m "시세봄 CSS 깨짐 복구"
if errorlevel 1 (
  echo 변경사항이 없거나 이미 복구된 상태일 수 있습니다.
)

echo [4/4] GitHub Push...
git push origin main
if errorlevel 1 goto :fail

echo.
echo 복구 완료.
echo GitHub Pages 반영까지 잠시 기다린 뒤 새로고침하세요.
echo.
pause
exit /b 0

:fail
echo.
echo 복구 실패. 이 창의 오류 내용을 캡처해서 보내주세요.
pause
exit /b 1
