시세봄 26단계 - Tavily 제거 / 자체 공개페이지 수집엔진

핵심
- 당근, 번개장터, 중고나라 매물 수집에서 Tavily를 사용하지 않습니다.
- 시세봄 서버가 Playwright Chromium으로 각 플랫폼의 공개 검색 페이지를 직접 엽니다.
- 공개 검색 페이지에 정상 표시되는 매물 링크/가격/용량/첫 카드 사진을 모읍니다.
- 무한스크롤과 공개 '더보기' UI가 있으면 정상 범위에서 계속 내려가며 후보를 늘립니다.
- 플랫폼당 기본 목표 후보 수는 200개입니다.
- 갤럭시/샤오미/모토롤라도 같은 수집엔진을 그대로 사용합니다.

하지 않는 것
- 로그인 우회
- CAPTCHA 우회
- 차단 우회
- 비공개 API 역공학

Render
- 기존 Build Command가 npm install이면 그대로 두면 됩니다.
- package.json의 postinstall이 Chromium을 자동 설치합니다.
- 첫 배포는 Chromium 다운로드 때문에 평소보다 오래 걸릴 수 있습니다.

설정
- 기본: 플랫폼당 최대 목표 200개
- Render 환경변수 SISEBOM_COLLECT_LIMIT=500 으로 올리면 500개 목표로 바꿀 수 있습니다.
- 다만 무료 Render 메모리/속도를 생각하면 우선 200을 권장합니다.
- 동일 검색은 10분 캐시합니다.
- refresh=1이면 기존 server.js 캐시를 건너뜁니다.

적용
1. ZIP 풀기
2. server 폴더를 기존 sisebom 폴더에 덮어쓰기
3. GitHub Desktop Summary:
   Tavily 제거 자체 매물수집 26단계
4. Commit to main -> Push origin
5. Render 배포 완료까지 기다리기

확인
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

정상일 때
- 각 매물에 browserCollected:true
- Tavily 없이 공개 검색 페이지에서 직접 수집
- 검색 페이지가 충분한 매물을 노출하면 기존 8개보다 훨씬 많이 나올 수 있음

주의
- 중고나라처럼 Render 서버에서 공개 페이지 자체가 403이면 해당 플랫폼은 실패할 수 있습니다.
- 이 경우 차단을 우회하지 않고 그대로 실패 표시합니다.
- 실제 수집 가능한 개수는 각 플랫폼이 공개 검색 페이지에 노출하는 개수에 따라 달라집니다.

GitHub Summary: Tavily 제거 자체 매물수집 26단계
