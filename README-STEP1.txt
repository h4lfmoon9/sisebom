시세봄 - 중고나라 실제 매물 연결 1단계

변경 파일
- index.html
- script.js
- style.css
- server/server.js
- server/providers/joongna.js (새 파일)
- server/package.json

기능
1. 중고나라 공개 검색 페이지의 실제 매물을 시세봄 서버에서 불러옵니다.
2. 예약중 / 판매완료 / 거래완료 / 종료 매물은 제외합니다.
3. 구매글(삽니다/구해요 등)과 명백한 케이스/필름류도 결과에서 제외합니다.
4. 가격/용량/작성시간/원본 링크/가능한 경우 썸네일을 표시합니다.
5. 매물 클릭 시 중고나라 원본 페이지로 이동합니다.
6. 당근/번개장터는 아직 연결하지 않았습니다.
7. 중고나라가 서버 요청을 차단하면 우회하지 않고 오류를 표시합니다.

적용
압축 안의 파일/폴더를 기존 sisebom 폴더에 그대로 덮어쓰세요.
새로 생기는 server/providers 폴더도 반드시 포함해야 합니다.
GitHub Desktop에서 Commit 후 Push origin 하세요.
Render는 기존 설정(Root Directory=server, Build Command=npm install, Start Command=node server.js)을 그대로 사용합니다.
