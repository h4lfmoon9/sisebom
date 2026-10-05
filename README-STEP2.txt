시세봄 - 중고나라 + 번개장터 실제 매물 연결 2단계

덮어쓸 파일
- index.html
- script.js
- style.css
- server/server.js
- server/package.json
- server/providers/joongna.js
- server/providers/bunjang.js (신규)

변경 내용
1. 중고나라 실제 공개 검색 연결 유지
2. 번개장터 공개 키워드 검색 페이지 연결 추가
3. /api/live/combined 에서 두 사이트 결과를 합쳐 반환
4. 예약중 / 판매완료 / 거래완료 매물 제외
5. 삽니다·매입글 및 명백한 케이스/필름 매물 제외
6. 실제 가격·용량·썸네일·원본 링크 표시
7. 한 사이트가 일시 실패해도 다른 사이트 결과가 있으면 계속 표시
8. 사이트가 자동 요청을 막으면 로그인/차단 우회 없이 오류 상태로 표시

주의
- 공개 페이지 HTML 구조가 바뀌면 파서 업데이트가 필요합니다.
- 아직 당근은 연결하지 않았습니다. 다음 단계에서 진행합니다.
