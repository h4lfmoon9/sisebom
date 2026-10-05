시세봄 7단계 - 백엔드 통합 복구

이번 ZIP은 앞 단계에서 서로 따로 적용된 파일을 한 번에 맞추는 통합 패치입니다.

포함 파일
- index.html
- script.js
- style.css
- server/server.js
- server/package.json
- server/liveCache.js
- server/listingQuality.js
- server/providers/daangn.js
- server/providers/bunjang.js
- server/providers/joongna.js

적용 방법
1. ZIP 압축을 풉니다.
2. 안의 파일/폴더를 기존 sisebom 폴더에 그대로 덮어씁니다.
3. 기존 server/data 폴더, phones.js, images 폴더는 삭제하지 않습니다.
4. GitHub Desktop에서 변경사항을 Commit 후 Push origin 합니다.
5. Render가 새 커밋을 다시 배포한 뒤 사이트에서 매물 새로고침을 누릅니다.

추가 진단 주소
- https://sisebom.onrender.com/api/health
- https://sisebom.onrender.com/api/live/status

GitHub Summary
백엔드 3개 플랫폼 통합 복구 7단계
