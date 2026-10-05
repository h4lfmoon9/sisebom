시세봄 27단계 - 자체수집기 대량수집/백그라운드 수집

이번 단계는 '4번 정도의 큰 단계로 완성' 계획 중 1/4입니다.

핵심 변경
- Tavily 없음 유지
- 플랫폼당 목표 후보 기본 200개
- 한 번 검색하고 끝내지 않고:
  아이폰 15
  아이폰15
  아이폰 15 128GB
  아이폰 15 256GB
  아이폰 15 512GB
  아이폰 15 64GB
  같은 공개 검색 변형을 자동으로 순회
- URL 기준 중복 제거
- 첫 응답은 server.js의 기존 9초 제한 안에 반환
- 그 뒤 자체 Chromium이 최대 약 70초 동안 백그라운드에서 계속 수집
- 12초 뒤 combined 캐시가 풀리므로 다시 검색/새로고침하면 더 많이 모인 결과를 받음
- 동일 모델의 심층수집 결과는 메모리에 최대 30분 재사용
- 공개 페이지가 403이면 우회하지 않음
- 갤럭시도 같은 수집엔진을 사용하도록 검색 변형 로직 포함

사용 방법
1. ZIP 풀기
2. server 폴더를 sisebom/server에 덮어쓰기
3. GitHub Desktop Summary:
   자체수집기 대량수집 27단계
4. Commit to main -> Push origin
5. Render 배포 완료 후 테스트

테스트 방법
첫 번째:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

약 15~30초 후 다시:
https://sisebom.onrender.com/api/live/combined?q=아이폰%2015&refresh=1

처음보다 rawCount/count가 늘어나면 백그라운드 심층수집이 정상입니다.
매물에는 browserCollected:true가 유지됩니다.

설정 가능
SISEBOM_COLLECT_LIMIT=200   기본 추천
SISEBOM_COLLECT_LIMIT=500   더 많이 시도 가능하지만 무료 Render 부담 큼
SISEBOM_DEEP_JOB_MAX_MS=70000
SISEBOM_BROWSER_CONCURRENCY=2

남은 큰 단계 계획
28단계: Apple/갤럭시/샤오미/모토롤라 공통 제품 DB + 신제품 자동등록 기반
29단계: AI 구매판단/시세 계산/검색 UI 완성
30단계: 전체 QA·모바일·속도·오류복구·배포 최종판

즉 27~30, 총 4개의 큰 단계로 끝내는 걸 목표로 합니다.
플랫폼 자체 차단이나 구조 변경이 있으면 해당 플랫폼 수정이 추가로 필요할 수는 있습니다.

GitHub Summary: 자체수집기 대량수집 27단계
