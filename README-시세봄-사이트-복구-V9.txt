시세봄 사이트 복구 V9

목표
- http://localhost:3000 을 열었을 때 API JSON만 보이던 문제를 수정합니다.
- 기존 API 서버가 시세봄 index.html / script.js / CSS 등 프론트 파일도 같이 제공하게 합니다.
- localhost와 trycloudflare 주소에서는 프론트가 같은 주소의 API를 사용하게 합니다.
- 기존 server.js와 script.js는 수정 전에 .bak 파일로 1회 백업합니다.

사용법 A - 시세봄 관리자 사용 중
1. 이 ZIP 자체를 시세봄 관리자(http://127.0.0.1:3131)의 '업데이트 ZIP'에서 선택
2. '업데이트 적용'
3. 관리자가 백업 -> 압축 적용 -> apply-z-site-repair-v9.js 실행 -> 서버 재시작
4. http://localhost:3000 접속

사용법 B - 직접 적용
1. ZIP을 시세봄 프로젝트 최상단(server 폴더와 index.html이 있는 위치)에 풉니다.
2. '시세봄-사이트-복구-V9.bat' 실행
3. 시세봄 서버 재시작
4. http://localhost:3000 접속

정상 결과
- localhost:3000 루트에서 {"name":"시세봄 API",...} 대신 시세봄 웹 화면이 표시됩니다.
- API 엔드포인트(/api/...)는 그대로 유지됩니다.
- trycloudflare.com 주소로 들어가도 같은 서버의 API를 사용합니다.

주의
- 프로젝트에 index.html 자체가 없으면 이 패치는 중단하고 파일을 바꾸지 않습니다.
- Express app 생성부를 찾지 못하면 server.js를 바꾸지 않고 오류를 표시합니다.
- 현재 작업과 무관한 매물 수집/GPT 기능은 건드리지 않습니다.
