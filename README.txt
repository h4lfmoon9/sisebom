시세봄 28단계 - 4대 제조사 공통 DB + 신제품 자동등록 기반

큰 마무리 1/3.

들어간 기능
- Apple / Samsung / Xiaomi(REDMI·POCO 포함) / Motorola 공통 카탈로그
- 기존 server/data의 모든 JSON을 한 카탈로그로 읽기
- 공식 공개 스마트폰 페이지를 하루 1회 자동 확인
- DB에 없는 제품명을 공식 페이지에서 발견하면 런타임 카탈로그에 자동 추가
- phones.js에 아직 없는 새 모델도 /api/phones?live=1을 통해 프론트에 자동 합류
- 새 모델도 기존 자체 중고매물 수집엔진을 그대로 사용
- iPhone뿐 아니라 Galaxy / Xiaomi / Redmi / POCO / Motorola 모델 정확 필터 추가
- 칩셋/카메라/프레임처럼 확실하지 않은 스펙은 추측하지 않고 '정보 확인 중'
- 신제품 이미지도 자동 임의 추가하지 않음
- 공식 페이지 스캔 실패 시 기존 DB로 자동 폴백
- Tavily/유료 AI API 필요 없음

적용
1. ZIP을 sisebom 저장소 루트에 풉니다.
2. server 폴더는 기존 server 폴더에 덮어씁니다.
3. apply-step28.js가 sisebom 루트에 있게 합니다.
4. PowerShell에서 sisebom 폴더로 들어가:
   node apply-step28.js
5. 성공 메시지 확인
6. GitHub Desktop Summary:
   4대 제조사 자동 제품DB 28단계
7. Commit to main -> Push origin

확인
https://sisebom.onrender.com/api/catalog/status
https://sisebom.onrender.com/api/phones?live=1

catalog/status에서 staticCount / discoveredCount / totalCount / perBrand 확인.

새 모델은:
공식 제조사 페이지에서 제품명 감지
→ 기존 DB와 중복검사
→ 런타임 카탈로그 추가
→ 사이트 검색에 자동 추가
→ 같은 자체 중고매물 수집기 사용
순서로 동작합니다.

Render 재시작 시 런타임 발견 목록은 초기화되지만,
다음 /api/phones?live=1 요청 때 공식 페이지를 다시 스캔해 복구합니다.

다음
29단계: AI 구매판단 + 시세 계산 + 검색/UI 최종 통합
30단계: 전체 QA + 모바일 + 속도 + Render 안정화 + 출시판

GitHub Summary: 4대 제조사 자동 제품DB 28단계
