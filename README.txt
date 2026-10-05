시세봄 - Tavily 전환 버전

1) 이 ZIP의 server 폴더를 기존 sisebom 폴더에 넣어서 병합/덮어쓰기하세요.
2) 최종 경로가 sisebom/server/liveDiagnostics.js 가 되어야 합니다.
3) Render > sisebom > Environment 에 아래 환경변수를 추가하세요.
   Key: TAVILY_API_KEY
   Value: Tavily 대시보드에서 발급한 API 키
4) BRAVE_SEARCH_API_KEY는 더 이상 필요하지 않습니다.
5) Commit/Push 후 Render 재배포가 끝나면 아래 주소를 확인하세요.
   https://sisebom.onrender.com/api/live/diagnose?q=아이폰%2015
6) 정상 적용이면 diagnosticsVersion: 4, searchDiscovery.provider: Tavily Search API 가 표시됩니다.
