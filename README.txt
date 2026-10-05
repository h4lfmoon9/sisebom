시세봄 FINAL V4 — 전체 모델 공통 완성형

이번 요청 반영
- 핸드폰 용량 선택 가능
  - 각 모델의 64 / 128 / 256 / 512GB 등
  - DB에 용량이 아직 없어도 128 / 256 / 512GB 기본 선택 제공
  - 1TB 이상은 '필터 선택지'에서 숨김
- 매물 한 페이지 = 9개
  - 데스크톱 가로 3 × 세로 3
  - 이전 / 다음
  - 페이지 번호 직접 선택
- iPhone 15에서 성공한 흐름을 전체 등록 모델에 동일 적용
- 갤럭시/샤오미/Redmi/POCO/Motorola 매물 0개 오탐 개선
  - 판매자가 "Galaxy S24 Ultra" 대신 "S24 울트라"
  - "Z Fold6" 대신 "폴드6"
  - "Redmi Note 14 Pro" 대신 "노트14 프로"
  - "POCO F6" 대신 "F6"
  - "motorola edge 50" 대신 "edge 50"
    처럼 써도 해당 모델로 인식
- 다른 변형 모델 섞임 방지
  - S24 검색에 S24 Ultra / S24+가 섞이지 않도록 유지
  - Xiaomi 14에 iPhone 14가 섞이지 않도록 유지
- 용량을 눌러 검색했는데 매물 카드에 용량 표기가 없는 경우:
  검색 자체가 해당 용량으로 수행됐으므로 결과에서 완전히 숨기지 않음
- 첫 검색 0개면 백그라운드 자동 재확인을 최대 4회까지 수행

적용 방법
1. ZIP을 sisebom 저장소 루트에 풀어서 덮어쓰기
2. PowerShell에서 딱 이것만 실행:
   node apply-final-v4.js
3. 아래 문구 확인:
   ✅ 시세봄 FINAL V4 전체 모델/용량/3x3 페이지 적용 완료
4. GitHub Desktop
   Summary: 전체모델 용량 3x3 페이지 FINAL V4
5. Commit to main -> Push origin
6. Render 최신 배포 초록 체크 확인

배포 후 추천 테스트
- 아이폰 12 / 13 / 14 / 15
- 갤럭시 S21 / S22 / S23 / S24
- 갤럭시 S24 울트라
- 갤럭시 A55
- 갤럭시 Z Fold6 / Z Flip6
- Xiaomi 14 / 샤오미 14 Pro
- Redmi Note 14 Pro
- POCO F6
- motorola edge 50

GitHub Summary: 전체모델 용량 3x3 페이지 FINAL V4
