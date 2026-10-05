시세봄 8단계 - 실제 수집 진단

덮어쓸 파일
- server/server.js
- server/liveDiagnostics.js (신규)

기존 파일은 삭제하지 마세요.
특히 server/data, server/providers, listingQuality.js, liveCache.js는 그대로 유지합니다.

GitHub Summary
실제 매물 수집 진단 8단계

배포 후 테스트 주소
https://sisebom.onrender.com/api/live/diagnose?q=아이폰%2015

이 주소의 JSON을 ChatGPT에 보내면
당근/번개장터/중고나라가 Render에서 실제로 어떤 HTML을 돌려주는지 구조를 보고
다음 단계에서 파서를 정확히 수정할 수 있습니다.

이 진단은 공개 검색 페이지만 확인하며 로그인/차단 우회를 하지 않습니다.
