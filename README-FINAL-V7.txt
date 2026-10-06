시세봄 FINAL V7 - iPhone 15 중고매물 검색 수정

적용법
1. ZIP 전체를 시세봄 저장소 최상단에 덮어쓰기
2. 터미널: node apply-final-v7.js
3. 테스트: cd server && node --test qa/v7Iphone15Search.test.js
4. GitHub Desktop에서 Commit / Push

핵심 수정
- iPhone 15 기본 검색: 아이폰 15 / 아이폰15 같은 넓은 모델명부터 검색
- 128GB 선택: 128GB 검색어만 사용
- 256GB 선택: 256GB 검색어만 사용
- 512GB 선택: 512GB 검색어만 사용
- 용량 미표기 카드도 '용량별 검색'에서 발견되면 해당 검색 용량으로 귀속
- 프론트 용량 필터도 exact match로 변경하여 용량 간 혼합 방지
- 검색 결과 0개 자동 재시도 때 refresh=1로 새 수집 강제
- iPhone 검색은 초반 몇 개 변형이 비어도 조기 종료하지 않음
- 대표이미지 자동 생성은 중단

추가 보강
- S24U / Fold6처럼 판매자가 줄여 쓰는 모델명 매칭 보강
- Xiaomi/Redmi/POCO 간 잘못된 교차 매칭 방지
- 매물 사진을 제품 대표이미지로 자동 채택하는 기능도 중단
