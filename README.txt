시세봄 13단계 - Tavily 실제 통합매물 연결

이번 단계에서 실제로 바뀌는 파일:
server/providers/tavilyIndex.js
server/providers/daangn.js
server/providers/bunjang.js
server/providers/joongna.js

적용 방법:
1. ZIP을 풉니다.
2. 안의 server 폴더를 기존 sisebom 폴더에 복사합니다.
3. '파일을 바꾸시겠습니까?'가 나오면 교체합니다.
4. 최종 경로가 sisebom/server/providers/... 인지 확인합니다.
   sisebom/server/server/... 가 되면 안 됩니다.
5. GitHub Desktop에서 변경 파일 4개가 보이는지 확인합니다.
6. Summary: Tavily 실제 통합매물 연동 13단계
7. Commit to main -> Push origin

Render Auto-Deploy가 켜져 있으면 자동 배포됩니다.

배포 후 테스트:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

정상이라면 providers의 당근/번개장터/중고나라 중 일부가
ok:true 와 count 1 이상으로 나오고 listings 배열에 실제 매물 URL이 들어옵니다.

주의:
TAVILY_API_KEY는 코드나 GitHub에 넣지 않습니다.
Render Environment에 설정된 값만 사용합니다.
