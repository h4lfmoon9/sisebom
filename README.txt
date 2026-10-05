시세봄 26단계 Render Chromium 수정판

현재 오류 원인:
Render의 build 단계에서 Playwright Chromium이 기본 캐시(/opt/render/.cache/ms-playwright)에 설치되더라도
실제 runtime에서 그 캐시가 보이지 않아 browserType.launch가 실행 파일을 찾지 못했습니다.

수정:
- PLAYWRIGHT_BROWSERS_PATH=0 사용
- Chromium을 server/node_modules/playwright-core/.local-browsers 쪽에 설치
- 이 위치는 Render 배포 결과와 함께 runtime으로 넘어감
- browserCollector.js도 runtime에서 동일한 로컬 브라우저 경로를 사용
- Build Command는 기존 npm install 그대로 사용 가능

적용:
1. ZIP 풀기
2. server 폴더를 sisebom/server에 덮어쓰기
3. GitHub Desktop Summary:
   Render Chromium 경로 수정 26단계
4. Commit to main -> Push origin
5. Render 배포 로그에서
   [시세봄] Chromium 설치 완료
   가 보이는지 확인

배포 후 테스트:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

정상:
- browserType.launch 실행파일 없음 오류가 사라짐
- 매물에 browserCollected:true가 표시됨

GitHub Summary: Render Chromium 경로 수정 26단계
