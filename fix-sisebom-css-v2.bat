@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo [시세봄 CSS 복구 v2]
echo.

if not exist ".git" (
  echo [오류] 이 파일을 sisebom 폴더 최상단에 넣고 실행하세요.
  echo 현재 위치: %cd%
  pause
  exit /b 1
)

echo [1/6] GitHub 최신 상태 확인...
git fetch origin
if errorlevel 1 goto :fail

echo [2/6] main 브랜치 최신화...
git checkout main
if errorlevel 1 goto :fail
git pull --rebase origin main
if errorlevel 1 goto :fail

echo [3/6] 정상 CSS 버전 복구...
git checkout f2417896f3807260424eb077f250aa430f309937 -- style.css
if errorlevel 1 goto :fail

echo.>> style.css
echo .listing-actions{display:flex;gap:8px;align-items:center}.text-btn:disabled{opacity:.55;cursor:wait}>> style.css

echo [4/6] 복구 확인...
for %%A in (style.css) do echo style.css 크기: %%~zA bytes
findstr /C:":root{" style.css >nul
if errorlevel 1 (
  echo [오류] CSS 본문 복구에 실패했습니다.
  goto :fail
)

echo [5/6] 커밋...
git add style.css
git commit -m "시세봄 CSS 완전 복구"
if errorlevel 1 (
  echo 커밋할 변경사항이 없을 수 있습니다. Push는 계속 진행합니다.
)

echo [6/6] GitHub Push...
git push origin main
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo 복구 완료
echo GitHub Pages 반영 후 Ctrl+F5로 새로고침하세요.
echo ==========================================
echo.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo 복구 실패
echo 이 창 전체를 캡처해서 보내주세요.
echo ==========================================
echo.
pause
exit /b 1
