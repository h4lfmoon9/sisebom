시세봄 10단계 - 공개 검색 색인으로 매물 URL 탐색

덮어쓸 파일:
  server/liveDiagnostics.js

추가 패키지 설치는 필요 없습니다.

Render 설정:
1. Render > sisebom > Environment
2. 환경변수 추가
   Key: BRAVE_SEARCH_API_KEY
   Value: 본인의 Brave Search API 키
3. Save Changes
4. 최신 커밋 배포

주의:
- API 키는 GitHub 코드/.env 파일에 넣지 마세요.
- 이 단계는 검색 API가 공개적으로 색인한 URL만 찾습니다.
- 로그인, CloudFront/봇 차단 우회, 비공개 API 호출은 하지 않습니다.

테스트 주소:
https://sisebom.onrender.com/api/live/diagnose?q=아이폰%2015

정상 적용 확인:
"diagnosticsVersion": 3

키 설정 전:
searchDiscovery.configured = false

키 설정 후:
searchDiscovery.configured = true
searchDiscovery.results 안에서 당근/번개장터/중고나라별 검색 결과를 확인합니다.

GitHub Summary:
공개 검색 색인 매물 탐색 10단계
