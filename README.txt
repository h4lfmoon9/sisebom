시세봄 28단계 Render Playwright 설치 오류 수정

원인:
기존 installPlaywright.js가 require.resolve('playwright/cli')를 사용했는데,
현재 Playwright 패키지는 './cli' 서브패스를 exports로 공개하지 않아 Render 빌드가 실패했습니다.

수정:
- require.resolve('playwright/cli') 제거
- Render/Linux에서 npx playwright install chromium 실행
- PLAYWRIGHT_BROWSERS_PATH=0 유지
- Chromium은 node_modules 내부 로컬 브라우저 경로에 설치

적용:
1. ZIP 풀기
2. server/installPlaywright.js 를 기존 sisebom/server/installPlaywright.js 에 덮어쓰기
3. GitHub Desktop Summary:
   Render Playwright 설치 수정 28단계
4. Commit to main -> Push origin
5. Render 자동 배포 확인

정상 로그:
[시세봄] Playwright Chromium 설치 시작...
[시세봄] Chromium 설치 완료

GitHub Summary: Render Playwright 설치 수정 28단계
